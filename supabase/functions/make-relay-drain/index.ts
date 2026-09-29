// make-relay-drain — „Trimite toate acum” din Admin / Coadă Make.com.
// Admin-only (sau intern). Repune mesajele eșuate în coadă și le trimite imediat.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { drainMakeRelayDlq } from "../_shared/makeRelay.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date().toISOString();
  await supabase
    .from("make_relay_dlq")
    .update({ status: "pending", attempts: 1, next_attempt_at: now, updated_at: now })
    .in("status", ["failed", "pending"]);

  const total = { retried: 0, delivered: 0, failed: 0 };
  const started = Date.now();
  // Loturi de 20, maxim ~40s ca să nu depășim timpul funcției.
  while (Date.now() - started < 40_000) {
    const r = await drainMakeRelayDlq(supabase, 20);
    total.retried += r.retried;
    total.delivered += r.delivered;
    total.failed += r.failed;
    if (r.retried === 0 || r.delivered === 0) break;
  }
  const { count: remaining } = await supabase
    .from("make_relay_dlq").select("id", { count: "exact", head: true }).eq("status", "pending");
  return json({ ok: true, ...total, remaining: remaining ?? 0 });
});
