// wa-consent-reminder — un SINGUR memento pentru cererile de acord fără răspuns.
// action "preview": listează cererile eligibile (48h–30 zile, fără niciun mesaj
// primit după cerere, fără DNC/STOP, fără memento anterior). action "send":
// trimite mementoul doar pentru id-urile aprobate de admin. Admin-only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { isExpressOptOut } from "../_shared/dncPolicy.ts";
import { phoneVariants } from "../_shared/waPhone.ts";
import { preferredPublishConsentTemplate } from "../_shared/waPreferredTemplate.ts";
import { WA_PUBLISH_CONSENT_TEMPLATE, consentAnalysisUrl } from "../_shared/waPublishConsentTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MIN_H = 48;
const MAX_DAYS = 30;

export function reminderText(p: { title?: string | null; zone?: string | null }): string {
  const what = p.title ? `„${p.title.slice(0, 80)}”` : `anunțul dumneavoastră${p.zone ? ` din ${p.zone}` : ""}`;
  return `Bună ziua! Revin pe scurt cu privire la ${what}. Dacă doriți să îl prezentăm gratuit pe realtrust.ro, răspundeți DA pentru acord sau NU dacă nu doriți. Dacă nu, nu vă mai scriem pe acest subiect.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: { action?: string; consent_ids?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  // "auto" (cron zilnic): sincronizează starea mesajelor, trimite mementoul tuturor
  // eligibililor și pune în coada lui Andrei pe cei care tac și după memento.
  const auto = body.action === "auto";
  const action = body.action === "send" || auto ? "send" : "preview";
  const ids = Array.isArray(body.consent_ids)
    ? body.consent_ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 50)
    : [];
  if (action === "send" && !auto && ids.length === 0) return json({ error: "consent_ids required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const now = Date.now();
  let reconciled = 0, queuedForAndrei = 0;
  if (auto) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", hour12: false })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const h = Number(parts.hour);
    if (parts.weekday === "Sun" || h < 9 || h >= 20) return json({ ok: true, skipped: "outside_hours" });
    reconciled = await reconcilePending(sb);
    queuedForAndrei = await queueSilentForAndrei(sb, now);
  }

  let q = sb.from("wa_publish_consents")
    .select("id, phone_normalized, prospect_listing_id, requested_at, created_at")
    .eq("status", "requested").is("revoked_at", null).is("reminder_sent_at", null)
    .lte("requested_at", new Date(now - MIN_H * 3600_000).toISOString())
    .gte("requested_at", new Date(now - MAX_DAYS * 864e5).toISOString())
    .limit(100);
  if (action === "send" && !auto) q = q.in("id", ids);
  const { data: rows, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const eligible: Record<string, unknown>[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const results: { id: string; status: string }[] = [];

  for (const r of rows ?? []) {
    const variants = phoneVariants(r.phone_normalized);
    const { data: p } = r.prospect_listing_id
      ? await sb.from("prospect_listings").select("id, title, zone, rooms, source_url, do_not_call, do_not_call_reason")
        .eq("id", r.prospect_listing_id).maybeSingle()
      : { data: null };
    if (!p) { skipped.push({ id: r.id, reason: "anunț lipsă" }); continue; }
    if (p.do_not_call && isExpressOptOut(p.do_not_call_reason)) { skipped.push({ id: r.id, reason: "a cerut să nu fie contactat" }); continue; }
    const { data: dnc } = await sb.from("wa_dnc_list").select("id").in("phone_normalized", variants).limit(1).maybeSingle()
      .then((x) => x, () => ({ data: null }));
    if (dnc) { skipped.push({ id: r.id, reason: "STOP / DNC" }); continue; }
    const { data: conv } = await sb.from("wa_conversations").select("id, window_expires_at")
      .in("phone_normalized", variants).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (conv) {
      const { data: inbound } = await sb.from("wa_messages").select("id").eq("conversation_id", conv.id)
        .eq("direction", "inbound").gte("created_at", r.requested_at ?? r.created_at).limit(1).maybeSingle();
      if (inbound) { skipped.push({ id: r.id, reason: "a răspuns deja" }); continue; }
    }

    if (action === "preview") {
      eligible.push({ id: r.id, phone: r.phone_normalized, title: p.title, zone: p.zone, requested_at: r.requested_at, text: reminderText(p) });
      continue;
    }

    // Rezervare înainte de trimitere: un singur memento per cerere, chiar la apeluri paralele.
    const { error: lockErr } = await sb.from("request_idempotency").insert({
      scope: "publish-consent-reminder", key: r.id,
      expires_at: new Date(now + 365 * 864e5).toISOString(),
    });
    if (lockErr) { results.push({ id: r.id, status: "already_sent" }); continue; }

    const windowOpen = !!conv?.window_expires_at && new Date(conv.window_expires_at).getTime() > now;
    let status: string;
    if (conv?.id && windowOpen) {
      const resp = await fetch(`${url}/functions/v1/wa-andrei-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "" },
        body: JSON.stringify({ conversation_id: conv.id, text: reminderText(p), auto_kind: "publish_consent_reminder" }),
      });
      status = resp.ok ? "sent" : "send_failed";
    } else {
      const { data: pending } = await sb.from("wa_outbound_queue").select("id")
        .in("phone_normalized", variants).eq("status", "pending").limit(1).maybeSingle();
      if (pending) status = "already_queued";
      else {
        const templateName = await preferredPublishConsentTemplate();
        const { error: qErr } = await sb.from("wa_outbound_queue").insert({
          phone_normalized: r.phone_normalized, prospect_listing_id: p.id,
          template_name: templateName, template_language: "ro",
          template_params: templateName === WA_PUBLISH_CONSENT_TEMPLATE ? [consentAnalysisUrl(p)] : [],
          status: "pending", priority: 5, source: "publish_consent_reminder",
        });
        status = qErr ? "queue_failed" : "queued";
      }
    }
    if (status === "sent" || status === "queued") {
      await sb.from("wa_publish_consents").update({ reminder_sent_at: new Date().toISOString() }).eq("id", r.id);
    } else if (status !== "already_queued") {
      await sb.from("request_idempotency").delete().eq("scope", "publish-consent-reminder").eq("key", r.id);
    }
    results.push({ id: r.id, status });
  }

  return action === "preview" ? json({ ok: true, eligible, skipped }) : json({ ok: true, results, reconciled, queued_for_andrei: queuedForAndrei });
});

// Make nu raportează mereu înapoi: dacă există deja un mesaj trimis pe WhatsApp,
// anunțul nu mai e „în așteptare”.
async function reconcilePending(sb: any): Promise<number> {
  const { data: rows } = await sb.from("prospect_listings").select("id, phone_normalized, contact_phone")
    .eq("outreach_status", "outreach_pending").lte("outreach_status_at", new Date(Date.now() - 2 * 3600_000).toISOString()).limit(200);
  let n = 0;
  for (const r of rows ?? []) {
    const { data: c } = await sb.from("wa_conversations").select("last_outbound_at")
      .in("phone_normalized", phoneVariants(r.phone_normalized || r.contact_phone)).not("last_outbound_at", "is", null).limit(1).maybeSingle();
    if (!c) continue;
    await sb.from("prospect_listings").update({ outreach_status: "whatsapp_sent", outreach_status_at: c.last_outbound_at }).eq("id", r.id);
    n++;
  }
  return n;
}

// Cine nu răspunde nici la memento în 48h → un apel Andrei (o singură dată, doar privați, fără DNC).
async function queueSilentForAndrei(sb: any, now: number): Promise<number> {
  const { data: rows } = await sb.from("wa_publish_consents").select("id, phone_normalized, prospect_listing_id, reminder_sent_at")
    .eq("status", "requested").is("revoked_at", null).not("reminder_sent_at", "is", null)
    .lte("reminder_sent_at", new Date(now - 48 * 3600_000).toISOString())
    .gte("reminder_sent_at", new Date(now - 30 * 864e5).toISOString()).limit(100);
  let n = 0;
  for (const r of rows ?? []) {
    if (!r.prospect_listing_id) continue;
    const { data: p } = await sb.from("prospect_listings").select("id, tags, seller_type, do_not_call, is_active")
      .eq("id", r.prospect_listing_id).maybeSingle();
    const tags: string[] = p?.tags || [];
    if (!p || !p.is_active || p.do_not_call || p.seller_type !== "privat" || tags.includes("consent-no-reply")) continue;
    const variants = phoneVariants(r.phone_normalized);
    const { data: dnc } = await sb.from("wa_dnc_list").select("id").in("phone_normalized", variants).limit(1).maybeSingle();
    if (dnc) continue;
    const { data: conv } = await sb.from("wa_conversations").select("last_inbound_at").in("phone_normalized", variants)
      .order("last_inbound_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (conv?.last_inbound_at && new Date(conv.last_inbound_at).getTime() >= new Date(r.reminder_sent_at).getTime() - 864e5 * 30) {
      if (new Date(conv.last_inbound_at).getTime() > new Date(r.reminder_sent_at).getTime()) continue;
    }
    await sb.from("prospect_listings").update({ tags: [...new Set([...tags, "consent-no-reply"])] }).eq("id", p.id);
    n++;
  }
  return n;
}
