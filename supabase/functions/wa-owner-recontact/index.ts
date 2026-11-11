// wa-owner-recontact — un SINGUR mesaj de reluare („încă disponibil?”) pentru proprietarii
// care nu au răspuns la mesajul cu butoane, la 30 de zile după outreach, dacă anunțul e activ.
// Rulează zilnic prin orchestrator (job `wa.owner_recontact`); doar 09:00–19:30.
// action "preview" listează eligibilii; "ensure_template" trimite șablonul la Meta.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { phoneVariants, toOutreachPhone, reservePhoneSend, releasePhoneSend } from "../_shared/waPhone.ts";
import { isTestPhone } from "../_shared/testPhoneAllowlist.ts";
import { outreachWindow, OUTREACH_COOLDOWN_DAYS, OUTREACH_COOLDOWN_KIND } from "../_shared/ownerOutreachPolicy.ts";
import { ownerOutreachPreviewUrl, ownerOutreachZone } from "../_shared/waOwnerOutreachTemplate.ts";
import {
  ensureRecontactTemplate, recontactBlocker, OWNER_RECONTACT_AFTER_DAYS, OWNER_RECONTACT_SOURCE,
  WA_OWNER_RECONTACT_LANGUAGE, WA_OWNER_RECONTACT_TEMPLATE,
} from "../_shared/waOwnerRecontact.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const COLS = "id, title, zone, location, category, source_url, phone_normalized, contact_phone, outreach_status, outreach_status_at, outreach_recontact_at, lifecycle_status, expiry_check_status, do_not_call, auto_blacklisted_at, agency_suspicion_score, seller_type";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: { action?: string; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* corp gol = rulare normală */ }
  if (body.action === "ensure_template") return json({ template: WA_OWNER_RECONTACT_TEMPLATE, status: await ensureRecontactTemplate() });
  const preview = body.action === "preview" || body.dry_run === true;

  const win = outreachWindow(new Date());
  if (!preview && !win.open) return json({ ok: true, skipped: "outside_window" });
  const templateStatus = await ensureRecontactTemplate();
  if (!preview && templateStatus !== "APPROVED") return json({ ok: true, skipped: `template_${templateStatus.toLowerCase()}` });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - OWNER_RECONTACT_AFTER_DAYS * 86400000).toISOString();
  const { data: rows, error } = await sb.from("prospect_listings").select(COLS)
    .in("outreach_status", ["whatsapp_sent", "whatsapp_delivered", "whatsapp_read"])
    .lte("outreach_status_at", cutoff).is("outreach_recontact_at", null).eq("do_not_call", false)
    .order("outreach_status_at", { ascending: true }).limit(20);
  if (error) return json({ error: error.message }, 500);

  const results: { id: string; status: string }[] = [];
  for (const p of rows ?? []) {
    const blocker = recontactBlocker(p);
    if (blocker) { results.push({ id: p.id, status: blocker }); continue; }
    const phone = toOutreachPhone(p.phone_normalized || p.contact_phone);
    if (!phone) { results.push({ id: p.id, status: "not_mobile" }); continue; }
    const variants = phoneVariants(phone);
    const ors = variants.flatMap((v) => [`phone_normalized.eq.${v}`, `contact_phone.eq.${v}`]).join(",");

    const [{ data: dnc }, { data: convs }, { data: consent }, { count: unsub }, { count: queued }] = await Promise.all([
      sb.from("wa_dnc_list").select("id").in("phone_normalized", variants).limit(1).maybeSingle(),
      sb.from("wa_conversations").select("last_inbound_at, status").in("phone_normalized", variants),
      sb.from("wa_publish_consents").select("status").eq("prospect_listing_id", p.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("prospect_listings").select("id", { count: "exact", head: true }).or(ors).eq("outreach_status", "unsubscribed"),
      sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).in("phone_normalized", variants).in("status", ["pending", "sending"]),
    ]);
    if (dnc) { results.push({ id: p.id, status: "dnc" }); continue; }
    if ((convs ?? []).some((c) => c.last_inbound_at || ["closed", "handoff", "opted_out"].includes(String(c.status ?? "")))) {
      results.push({ id: p.id, status: "replied" }); continue;
    }
    if (consent && consent.status !== "requested") { results.push({ id: p.id, status: `consent_${consent.status}` }); continue; }
    if (unsub) { results.push({ id: p.id, status: "unsubscribed" }); continue; }
    if (queued) { results.push({ id: p.id, status: "already_queued" }); continue; }
    if (preview) { results.push({ id: p.id, status: "eligible" }); continue; }

    // Revendicare atomică: un singur mesaj de reluare per anunț, chiar la rulări paralele.
    const nowIso = new Date().toISOString();
    const { data: claimed } = await sb.from("prospect_listings").update({ outreach_recontact_at: nowIso })
      .eq("id", p.id).is("outreach_recontact_at", null).select("id");
    if (!claimed?.length) { results.push({ id: p.id, status: "already_recontacted" }); continue; }
    const test = isTestPhone(phone);
    if (!test && !await reservePhoneSend(sb, phone, OUTREACH_COOLDOWN_KIND, OUTREACH_COOLDOWN_DAYS * 86400000, { prospect_id: p.id, kind: "recontact" })) {
      await sb.from("prospect_listings").update({ outreach_recontact_at: null }).eq("id", p.id);
      results.push({ id: p.id, status: "recent_outreach_30d" }); continue;
    }
    const { error: qErr } = await sb.from("wa_outbound_queue").insert({
      phone_normalized: `+${phone}`, prospect_listing_id: p.id,
      template_name: WA_OWNER_RECONTACT_TEMPLATE, template_language: WA_OWNER_RECONTACT_LANGUAGE,
      template_params: [ownerOutreachZone(p), ownerOutreachPreviewUrl(p)],
      status: "pending", priority: 5, source: OWNER_RECONTACT_SOURCE,
    });
    if (qErr) {
      await sb.from("prospect_listings").update({ outreach_recontact_at: null }).eq("id", p.id);
      if (!test) await releasePhoneSend(sb, phone, OUTREACH_COOLDOWN_KIND);
      results.push({ id: p.id, status: "queue_failed" }); continue;
    }
    results.push({ id: p.id, status: "queued" });
  }
  return json({ ok: true, preview, template_status: templateStatus, window_open: win.open, results });
});
