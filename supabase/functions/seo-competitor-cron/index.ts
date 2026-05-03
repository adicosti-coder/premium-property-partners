// Periodic competitor monitoring cron - runs schedules whose next_run_at <= now()
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function nextRun(freq: string, from: Date): Date {
  const d = new Date(from);
  if (freq === "daily") d.setDate(d.getDate() + 1);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 7);
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date();

    const { data: due, error } = await supa
      .from("seo_competitor_schedules")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now.toISOString())
      .limit(20);
    if (error) throw error;

    const results: any[] = [];
    for (const sched of due || []) {
      const competitor_urls = Array.isArray(sched.competitor_urls)
        ? sched.competitor_urls
        : [];
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/seo-competitor-snapshot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            our_url_path: sched.our_url_path,
            competitor_urls,
          }),
        });
        const ok = res.ok;
        await supa
          .from("seo_competitor_schedules")
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun(sched.frequency, now).toISOString(),
            last_run_status: ok ? "ok" : `error_${res.status}`,
          })
          .eq("id", sched.id);
        results.push({ id: sched.id, ok });
      } catch (e: any) {
        await supa
          .from("seo_competitor_schedules")
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun(sched.frequency, now).toISOString(),
            last_run_status: `error: ${e.message}`,
          })
          .eq("id", sched.id);
        results.push({ id: sched.id, ok: false, error: e.message });
      }
    }

    return json({ processed: results.length, results });
  } catch (e: any) {
    console.error("[seo-competitor-cron]", e);
    return json({ error: e.message }, 500);
  }
});
