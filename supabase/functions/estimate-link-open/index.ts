// estimate-link-open — înregistrează prima deschidere reală a linkului scurt
// https://realtrust.ro/e/<cod> și programează follow-up-ul unic la 24h.
//
// Public (pagina /e/<cod> o apelează din browser după ce estimarea e vizibilă).
// Boții de previzualizare (cardul Open Graph din WhatsApp, crawlere) sunt ignorați după
// User-Agent; ei oricum nu rulează JavaScript. Nu returnează date despre anunț.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  ESTIMATE_FOLLOWUP_BLOCK_LABELS, ESTIMATE_FOLLOWUP_LANGUAGE, ESTIMATE_FOLLOWUP_SOURCE, ESTIMATE_FOLLOWUP_TEMPLATE,
  estimateFollowupBlockReason, estimateFollowupDueAt, estimateFollowupParams, isPreviewBot,
} from "../_shared/estimateFollowup.ts";
import { canonicalWaPhone, phoneVariants } from "../_shared/waPhone.ts";
import { ensureEstimateFollowupTemplate } from "../_shared/estimateFollowupTemplate.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CODE_RE = /^[a-z0-9]{6,12}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { code?: unknown; action?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  // Admin / intern: verifică (și trimite la aprobare, dacă lipsește) șablonul Meta al follow-up-ului.
  if (body.action === "template_status") {
    const denied = await requireInternalOrAdmin(req, corsHeaders);
    if (denied) return denied;
    return json({ ok: true, template_status: await ensureEstimateFollowupTemplate() });
  }
  const code = String(body.code ?? "").trim().toLowerCase();
  if (!CODE_RE.test(code)) return json({ error: "invalid_code" }, 400);

  if (isPreviewBot(req.headers.get("user-agent"))) return json({ ok: true, counted: false });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: p, error } = await sb.from("prospect_listings")
    .select("id, zone, location, short_code, phone_normalized, contact_phone, seller_type, lead_score, agency_suspicion_score, owner_sentiment, prospect_type, contact_name, title, tags, outreach_status, do_not_call, is_active, estimate_followup_status, estimate_open_count")
    .eq("short_code", code).maybeSingle();
  if (error) { console.error("estimate-link-open lookup failed"); return json({ ok: false }, 500); }
  if (!p) return json({ ok: true, counted: false });

  const now = new Date();
  await sb.from("prospect_listings")
    .update({ estimate_last_opened_at: now.toISOString(), estimate_open_count: (p.estimate_open_count ?? 0) + 1 })
    .eq("id", p.id);

  // Doar prima deschidere poate programa follow-up-ul (claim atomic).
  const { data: first } = await sb.from("prospect_listings")
    .update({ estimate_opened_at: now.toISOString() })
    .eq("id", p.id).is("estimate_opened_at", null)
    .select("id").maybeSingle();
  if (!first) return json({ ok: true, counted: true, first_open: false });

  const variants = phoneVariants(p.phone_normalized || p.contact_phone);
  const [{ data: convs }, { data: dnc }] = variants.length
    ? await Promise.all([
      sb.from("wa_conversations").select("last_inbound_at, status").in("phone_normalized", variants),
      sb.from("wa_dnc_list").select("id").in("phone_normalized", variants).limit(1).maybeSingle(),
    ])
    : [{ data: [] as { last_inbound_at: string | null; status: string | null }[] }, { data: null }];
  const hasInbound = (convs ?? []).some((c) => !!c.last_inbound_at);
  const optedOut = !!dnc || (convs ?? []).some((c) => ["opted_out", "closed", "handoff"].includes(String(c.status ?? "")));

  const phone = canonicalWaPhone(p.phone_normalized || p.contact_phone);
  const block = phone ? estimateFollowupBlockReason({ prospect: p, hasInbound, optedOut }) : "opted_out";
  if (block) {
    await sb.from("prospect_listings")
      .update({ estimate_followup_status: `skipped:${block}`, estimate_followup_note: ESTIMATE_FOLLOWUP_BLOCK_LABELS[block] })
      .eq("id", p.id).is("estimate_followup_status", null);
    return json({ ok: true, counted: true, first_open: true, scheduled: false });
  }

  const params = estimateFollowupParams(p)!;
  const dueAt = estimateFollowupDueAt(now);
  // Marcăm întâi anunțul (un singur follow-up per anunț), apoi punem mesajul în coadă.
  const { data: claimed } = await sb.from("prospect_listings")
    .update({ estimate_followup_status: "scheduled", estimate_followup_at: dueAt.toISOString(), estimate_followup_note: null })
    .eq("id", p.id).is("estimate_followup_status", null)
    .select("id").maybeSingle();
  if (!claimed) return json({ ok: true, counted: true, first_open: true, scheduled: false });

  const { data: q, error: qErr } = await sb.from("wa_outbound_queue").insert({
    phone_normalized: phone,
    prospect_listing_id: p.id,
    template_name: ESTIMATE_FOLLOWUP_TEMPLATE,
    template_language: ESTIMATE_FOLLOWUP_LANGUAGE,
    template_params: params,
    status: "pending",
    priority: 6,
    source: ESTIMATE_FOLLOWUP_SOURCE,
    scheduled_at: dueAt.toISOString(),
  }).select("id").single();
  if (qErr || !q) {
    console.error("estimate-link-open queue insert failed");
    await sb.from("prospect_listings")
      .update({ estimate_followup_status: "cancelled", estimate_followup_note: "nu s-a putut pune în coadă" })
      .eq("id", p.id);
    return json({ ok: false }, 500);
  }
  await sb.from("prospect_listings").update({ estimate_followup_queue_id: q.id }).eq("id", p.id);
  return json({ ok: true, counted: true, first_open: true, scheduled: true });
});
