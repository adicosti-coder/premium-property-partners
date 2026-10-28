// Coada manuală „Trimite către Andrei”: adminul selectează proprietari, iar
// apelurile pleacă pe rând prin `voice-batch-campaign-tick` (un apel odată,
// L–S 09–20). Marcăm imediat anunțurile ca trimise ca să nu fie sunate de două ori.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { computeCallAfter, isRoMobileE164, toE164, type QueueSchedule } from "../_shared/andreiQueue.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = await requireAdmin(req, cors);
  if (!admin.ok) return admin.response!;
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.prospect_ids) ? body.prospect_ids.filter((x: unknown) => typeof x === "string" && UUID.test(x)) : [];
    const schedule: QueueSchedule = body.schedule === "10:00" ? "10:00" : "now";
    const scenario = typeof body.scenario === "string" ? body.scenario.slice(0, 80) : null;
    if (!ids.length) return json({ error: "Selectează cel puțin un anunț." }, 400);
    if (ids.length > 100) return json({ error: "Maxim 100 de anunțuri odată." }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rows, error } = await sb.from("prospect_listings")
      .select("id, phone_normalized, contact_phone, seller_type, do_not_call, is_active, lifecycle_status, tags, andrei_queued_at")
      .in("id", ids);
    if (error) throw error;

    const accepted: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    for (const r of rows ?? []) {
      const to = toE164(r.phone_normalized || r.contact_phone);
      const tags = (r.tags as string[] | null) ?? [];
      const reason = !isRoMobileE164(to) ? "telefon invalid (doar mobil 07…)"
        : r.seller_type !== "privat" ? "proprietar neconfirmat"
        : r.do_not_call ? "nu dorește apeluri"
        : !r.is_active ? "anunț inactiv"
        : !["new", "callback"].includes(r.lifecycle_status ?? "") ? "deja procesat"
        : r.andrei_queued_at || tags.includes("apelat-andrei") ? "deja trimis la Andrei"
        : null;
      if (reason) skipped.push({ id: r.id, reason }); else accepted.push(r.id);
    }

    const callAfter = computeCallAfter(schedule);
    const nowIso = new Date().toISOString();
    if (accepted.length) {
      // `is null` pe andrei_queued_at → două trimiteri simultane nu dublează coada.
      const { data: upd, error: uErr } = await sb.from("prospect_listings")
        .update({ andrei_queued_at: nowIso, andrei_call_after: callAfter.toISOString(), andrei_queue_scenario: scenario })
        .in("id", accepted).is("andrei_queued_at", null).select("id");
      if (uErr) throw uErr;
      const done = new Set((upd ?? []).map((u) => u.id));
      for (const id of accepted) if (!done.has(id)) skipped.push({ id, reason: "deja trimis la Andrei" });
      accepted.splice(0, accepted.length, ...done);
    }
    await sb.from("admin_audit_log").insert({
      action: "andrei_bulk_queue", actor_user_id: admin.userId ?? null, entity_type: "prospect_listings", severity: "info",
      details: { queued: accepted.length, skipped: skipped.length, schedule, scenario, call_after: callAfter.toISOString() },
    }).then(() => {}, () => {});

    return json({ success: true, queued: accepted.length, skipped, call_after: callAfter.toISOString() });
  } catch (e) {
    console.error("andrei-bulk-queue error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
