// wa-queue-flush — „Procesează coada acum / Reîncearcă” din Admin.
// 1) mută mesajele pregătite (owner_outreach_messages auto_queued) în coada activă
//    prin wa-outbound-enqueue (șablon aprobat Meta, numere E.164, DNC);
// 2) repune în coadă mesajele eșuate recuperabile (nu și 131026 = fără WhatsApp,
//    nici cele „posibil trimise”, ca să nu dublăm mesaje);
// 3) pornește worker-ul.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NON_RETRYABLE = /131026|posibil trimis|duplicat|blocat|excludere|intern/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const call = async (fn: string, body: unknown) => {
    const r = await fetch(`${url}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "x-webhook-secret": key },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };

  // 1) Mesaje pregătite → coada activă
  const { data: prepared } = await sb.from("owner_outreach_messages")
    .select("id, prospect_listing_id").eq("status", "auto_queued").eq("channel", "whatsapp").limit(200);
  const pids = [...new Set((prepared ?? []).map((p) => p.prospect_listing_id).filter(Boolean))];
  let enqueue: any = { enqueued: 0, skipped: [] };
  if (pids.length) {
    const r = await call("wa-outbound-enqueue", { prospect_ids: pids, limit: 200 });
    enqueue = r.data;
    const skippedIds = new Set((r.data?.skipped ?? []).map((s: any) => s.id));
    const { data: inQueue } = await sb.from("wa_outbound_queue")
      .select("prospect_listing_id").in("prospect_listing_id", pids);
    const queued = new Set((inQueue ?? []).map((q) => q.prospect_listing_id));
    const ok = (prepared ?? []).filter((p) => queued.has(p.prospect_listing_id)).map((p) => p.id);
    const bad = (prepared ?? []).filter((p) => skippedIds.has(p.prospect_listing_id)).map((p) => p.id);
    if (ok.length) await sb.from("owner_outreach_messages").update({ status: "pending" }).in("id", ok);
    if (bad.length) await sb.from("owner_outreach_messages").update({ status: "skipped" }).in("id", bad);
  }

  // 2) Eșuate recuperabile → pending
  const { data: failed } = await sb.from("wa_outbound_queue").select("id, last_error").eq("status", "failed").limit(200);
  const retry = (failed ?? []).filter((f) => !NON_RETRYABLE.test(f.last_error ?? "")).map((f) => f.id);
  const definitive = (failed ?? []).length - retry.length;
  if (retry.length) {
    await sb.from("wa_outbound_queue")
      .update({ status: "pending", scheduled_at: new Date().toISOString() })
      .in("id", retry);
  }

  // 3) Worker
  const worker = await call("wa-outbound-queue-worker", { batch_size: 25 });

  return json({
    ok: true,
    prepared: prepared?.length ?? 0,
    enqueued: enqueue?.enqueued ?? 0,
    skipped: enqueue?.skipped ?? [],
    retried: retry.length,
    definitive_failed: definitive,
    worker: worker.data,
  });
});
