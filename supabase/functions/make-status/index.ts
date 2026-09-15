// make-status — starea scenariului Make.com pentru Admin.
//
// Acțiuni:
//  - action: "status"       → ultima activitate, mesaje livrate / eșuate, config.
//  - action: "ping"         → re-run: retrimite un eveniment de test către Make.
//  - action: "retry_failed" → retrimite către Make evenimentele eșuate (24h).
//
// Acces: apel intern (x-cron-secret / service role) sau JWT de Admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { relayToMake, makeWebhookUrl } from "../_shared/makeRelay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: { action?: string } = {};
  try { body = await req.json(); } catch { /* default */ }
  const action = (body.action || "status").trim();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const configured = !!makeWebhookUrl();

  // ------------------------------------------------------------------- ping
  if (action === "ping") {
    const relay = await relayToMake("make_status_ping", {
      note: "Test manual din Admin (buton Re-run)",
    });
    await supabase.from("make_lead_events").insert({
      direction: "outbound",
      event: "make_status_ping",
      status: relay.ok ? "sent" : (relay.skipped ? "make_not_configured" : "failed"),
      error: relay.ok ? null : (relay.error || String(relay.skipped ?? "make_failed")),
      payload: { relay, triggered: "admin_button" },
    });
    return json({ ok: relay.ok, configured, relay });
  }

  // ------------------------------------------------------------ retry_failed
  if (action === "retry_failed") {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: failed } = await supabase
      .from("make_lead_events")
      .select("id, event, lead_id, prospect_listing_id, conversation_id, phone_normalized, message, wa_message_id")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(25);

    let resent = 0;
    let stillFailing = 0;
    for (const ev of failed ?? []) {
      const relay = await relayToMake(ev.event || "make_retry", {
        retry_of: ev.id,
        lead_id: ev.lead_id,
        prospect_listing_id: ev.prospect_listing_id,
        conversation_id: ev.conversation_id,
        phone: ev.phone_normalized,
        message: ev.message,
        wa_message_id: ev.wa_message_id,
      });
      if (relay.ok) resent++; else stillFailing++;
      await supabase.from("make_lead_events").insert({
        direction: "outbound",
        event: `${ev.event}_retry`,
        lead_id: ev.lead_id,
        prospect_listing_id: ev.prospect_listing_id,
        conversation_id: ev.conversation_id,
        phone_normalized: ev.phone_normalized,
        message: ev.message,
        status: relay.ok ? "sent" : (relay.skipped ? "make_not_configured" : "failed"),
        error: relay.ok ? null : (relay.error || String(relay.skipped ?? "make_failed")),
        payload: { relay, retry_of: ev.id },
      });
    }
    return json({ ok: true, configured, candidates: failed?.length ?? 0, resent, still_failing: stillFailing });
  }

  // ----------------------------------------------------------------- status
  const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [lastAny, lastOk, lastFail, recent, all7d] = await Promise.all([
    supabase.from("make_lead_events")
      .select("id, event, direction, status, error, phone_normalized, created_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("make_lead_events")
      .select("id, event, status, created_at")
      .in("status", ["sent", "sent_template", "sent_whatsapp_backup"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("make_lead_events")
      .select("id, event, status, error, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("make_lead_events")
      .select("id, event, direction, status, error, phone_normalized, message, created_at")
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("make_lead_events")
      .select("status, created_at")
      .gte("created_at", since7d).limit(5000),
  ]);

  const rows = (all7d.data ?? []) as { status: string; created_at: string }[];
  const okStatuses = ["sent", "sent_template", "sent_whatsapp_backup"];
  const tally = (from: string) => {
    const scoped = rows.filter((r) => r.created_at >= from);
    return {
      total: scoped.length,
      delivered: scoped.filter((r) => okStatuses.includes(r.status)).length,
      failed: scoped.filter((r) => r.status === "failed").length,
      not_configured: scoped.filter((r) => r.status === "make_not_configured").length,
    };
  };

  return json({
    ok: true,
    configured,
    last_event: lastAny.data ?? null,
    last_success: lastOk.data ?? null,
    last_failure: lastFail.data ?? null,
    last_24h: tally(since24),
    last_7d: tally(since7d),
    recent: recent.data ?? [],
  });
});
