// „Alerta lunară de piață”: abonații din calculator + indicii timisoara_market_indices (vânzare, chirie clasică, regim hotelier) → webhook Make.com.
// Acțiuni: preview (fără trimitere), send (o cerere POST per abonat, o dată pe lună), unsubscribe (oprește alerta).
// Webhook: secretul MAKE_MONTHLY_ALERT_WEBHOOK. Acces: doar administratori sau apeluri interne.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { phoneVariants, toOutreachPhone } from "../_shared/waPhone.ts";
import {
  alertPeriodMonth,
  buildMonthlyAlertPayload,
  pickMarketIndex,
  previousValuesFromPayload,
  rowHasIndexValues,
  selectAlertSubscribers,
  type AlertLead,
  type AlertValues,
  type MarketIndexRow,
} from "../_shared/monthlyMarketAlert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview") }),
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("unsubscribe"), lead_id: z.string().uuid() }),
]);

const MAX_SENDS_PER_RUN = 150;
const WEBHOOK_TIMEOUT_MS = 10_000;

function webhookUrl(): string | null {
  const url = (Deno.env.get("MAKE_MONTHLY_ALERT_WEBHOOK") ?? "").trim();
  return /^https:\/\/[^\s]+$/i.test(url) ? url : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let triggeredBy: string | null = null;
  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response ?? json({ error: "Forbidden" }, 403);
    triggeredBy = auth.userId && !/^0{8}-/.test(auth.userId) ? auth.userId : null;
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (body.action === "unsubscribe") {
      const { data: lead, error } = await db.from("leads").select("id, simulation_data").eq("id", body.lead_id).maybeSingle();
      if (error) throw error;
      if (!lead) return json({ error: "Lead not found" }, 404);
      const sd = (lead.simulation_data ?? {}) as Record<string, unknown>;
      if (sd.market_alert_opt_in !== true) return json({ ok: true, changed: false });
      const at = typeof sd.market_alert_unsubscribed_at === "string" ? sd.market_alert_unsubscribed_at : new Date().toISOString();
      const { error: upErr } = await db.from("leads")
        .update({ simulation_data: { ...sd, market_alert_unsubscribed_at: at } })
        .eq("id", body.lead_id);
      if (upErr) throw upErr;
      return json({ ok: true, changed: true, unsubscribed_at: at });
    }

    const period = alertPeriodMonth();

    // 1. Abonații (acord bifat în calculator).
    const { data: leadRows, error: leadErr } = await db.from("leads")
      .select("id, name, whatsapp_number, email, property_type, created_at, archived_at, anonymized_at, simulation_data")
      .eq("simulation_data->>market_alert_opt_in", "true")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (leadErr) throw leadErr;
    const leads: AlertLead[] = (leadRows ?? []).map((l: any) => ({
      id: l.id, name: l.name, email: l.email, property_type: l.property_type, created_at: l.created_at,
      archived_at: l.archived_at, anonymized_at: l.anonymized_at,
      simulation_data: (l.simulation_data ?? null) as Record<string, unknown> | null,
      phone: toOutreachPhone(l.whatsapp_number),
    }));

    // 2. Opriri: lista DNC WhatsApp și e-mailurile blocate.
    const phones = [...new Set(leads.map((l) => l.phone).filter(Boolean) as string[])];
    const dncPhones = new Set<string>();
    const variantOwner = new Map<string, string>();
    for (const p of phones) for (const v of phoneVariants(p)) variantOwner.set(v, p);
    const variants = [...variantOwner.keys()];
    for (let i = 0; i < variants.length; i += 200) {
      const { data } = await db.from("wa_dnc_list").select("phone_normalized").in("phone_normalized", variants.slice(i, i + 200));
      for (const r of data ?? []) { const owner = variantOwner.get(r.phone_normalized); if (owner) dncPhones.add(owner); }
    }
    const emails = [...new Set(leads.map((l) => (l.email ?? "").trim().toLowerCase()).filter(Boolean))];
    const blockedEmails = new Set<string>();
    for (let i = 0; i < emails.length; i += 200) {
      const { data } = await db.from("suppressed_emails").select("email").in("email", emails.slice(i, i + 200));
      for (const r of data ?? []) blockedEmails.add(String(r.email).toLowerCase());
    }

    // 3. Indicii de piață (cele mai recente valori per zonă / camere).
    const { data: idxRows, error: idxErr } = await db.from("timisoara_market_indices")
      .select("zone_key, rooms, sale_eur_sqm, rent_eur_month, nightly_rate_eur, hotel_occupancy, hotel_net_min_eur_month, hotel_net_max_eur_month, hotel_source, source, source_url, period_month");
    if (idxErr) throw idxErr;
    const indices = (idxRows ?? []) as MarketIndexRow[];
    const indexedZones = new Set(indices.filter(rowHasIndexValues).map((r) => r.zone_key));

    const { eligible, excluded } = selectAlertSubscribers(leads, { indexedZones, dncPhones, blockedEmails });

    // 4. Istoric: ce s-a trimis luna aceasta și ultimele valori trimise fiecărui contact.
    const contactKeys = eligible.map((s) => s.contactKey);
    const sentThisMonth = new Set<string>();
    const lastValues = new Map<string, AlertValues>();
    for (let i = 0; i < contactKeys.length; i += 200) {
      const { data } = await db.from("market_alert_deliveries")
        .select("contact_key, period_month, status, payload")
        .in("contact_key", contactKeys.slice(i, i + 200))
        .order("period_month", { ascending: false });
      for (const r of data ?? []) {
        if (r.period_month === period && (r.status === "sent" || r.status === "sending")) sentThisMonth.add(r.contact_key);
        if (r.status === "sent" && r.period_month < period && !lastValues.has(r.contact_key)) {
          const v = previousValuesFromPayload((r.payload as any)?.Valori_Curente_Luna_Asta);
          if (v) lastValues.set(r.contact_key, v);
        }
      }
    }

    const pending = eligible.filter((s) => !sentThisMonth.has(s.contactKey));
    const payloads = pending.map((sub) => ({
      sub,
      payload: buildMonthlyAlertPayload({
        sub,
        current: pickMarketIndex(indices, sub.zoneKey, sub.rooms)!,
        previous: lastValues.get(sub.contactKey) ?? null,
        periodMonth: period,
      }),
    }));

    const excludedByReason: Record<string, number> = {};
    for (const e of excluded) excludedByReason[e.reason] = (excludedByReason[e.reason] ?? 0) + 1;
    const summary = {
      period_month: period,
      webhook_configured: webhookUrl() != null,
      subscribers_total: eligible.length,
      already_sent_this_month: eligible.length - pending.length,
      ready_to_send: pending.length,
      excluded_by_reason: excludedByReason,
    };

    if (body.action === "preview") {
      return json({ ok: true, ...summary, sample: payloads.slice(0, 3).map((p) => p.payload) });
    }

    // 5. Trimitere: o cerere POST per abonat; rândul din market_alert_deliveries e revendicarea atomică.
    const url = webhookUrl();
    if (!url) return json({ ok: false, error: "webhook_not_configured", ...summary }, 412);

    let sent = 0, failed = 0, skipped = 0;
    const errors: Array<{ lead_id: string; error: string }> = [];
    for (const { sub, payload } of payloads.slice(0, MAX_SENDS_PER_RUN)) {
      const claim = await db.from("market_alert_deliveries").insert({
        lead_id: sub.lead.id, period_month: period, contact_key: sub.contactKey, zone_key: sub.zoneKey,
        status: "sending", payload, triggered_by: triggeredBy,
      }).select("id");
      let claimedId: string | null = claim.data?.[0]?.id ?? null;
      if (!claimedId && claim.error?.code === "23505") {
        // Doar o trimitere eșuată definitiv poate fi reluată.
        const retry = await db.from("market_alert_deliveries")
          .update({ status: "sending", payload, error: null, http_status: null, triggered_by: triggeredBy })
          .eq("lead_id", sub.lead.id).eq("period_month", period).eq("status", "failed").select("id");
        claimedId = retry.data?.[0]?.id ?? null;
      } else if (claim.error) throw claim.error;
      if (!claimedId) { skipped++; continue; }

      let status = 0, error: string | null = null;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
        status = res.status;
        if (!res.ok) error = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
        else await res.body?.cancel();
      } catch (e) {
        error = e instanceof Error ? e.message.slice(0, 300) : "network_error";
      }
      const ok = error == null;
      await db.from("market_alert_deliveries").update({
        status: ok ? "sent" : "failed", http_status: status || null, error, sent_at: ok ? new Date().toISOString() : null,
      }).eq("id", claimedId);
      if (ok) sent++; else { failed++; errors.push({ lead_id: sub.lead.id, error: error! }); }
    }

    return json({
      ok: failed === 0,
      ...summary,
      sent, failed, skipped,
      remaining: Math.max(0, payloads.length - MAX_SENDS_PER_RUN),
      errors: errors.slice(0, 10),
    });
  } catch (e) {
    console.error("[process-monthly-alerts]", e);
    return json({ error: "internal_error" }, 500);
  }
});
