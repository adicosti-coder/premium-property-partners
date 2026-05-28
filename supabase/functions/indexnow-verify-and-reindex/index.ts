// Dual-purpose endpoint:
//   action=verify         -> probe URLs via Google "site:" search, update actual_indexing_status
//   action=reindex_queue  -> pop due rows from indexnow_reindex_queue and ping IndexNow
//   action=enqueue_missing-> insert any URL with status='missing' or stale into the queue
// Invoked by admin button (verify) and by pg_cron weekly (reindex_queue + enqueue_missing).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOST = "www.realtrust.ro";
// Daily soft cap to stay well under IndexNow's per-host quota.
const DAILY_REPING_CAP = 80;

type Action = "verify" | "reindex_queue" | "enqueue_missing";

async function probeIndexed(url: string): Promise<"indexed" | "missing" | "pending"> {
  // Lightweight check: query Google "site:" with the URL. If the page appears in the
  // SERP HTML, treat it as indexed. Not authoritative but a useful signal without GSC OAuth.
  try {
    const q = encodeURIComponent(`site:${url}`);
    const res = await fetch(`https://www.google.com/search?q=${q}&hl=ro&num=10`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RealTrustIndexBot/1.0; +https://www.realtrust.ro)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return "pending";
    const html = (await res.text()).toLowerCase();
    const needle = url.replace(/^https?:\/\//, "").toLowerCase();
    if (html.includes(needle)) return "indexed";
    if (html.includes("did not match any documents") || html.includes("nu corespunde niciunui document")) {
      return "missing";
    }
    return "pending";
  } catch {
    return "pending";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { action?: Action; urls?: string[]; limit?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const action: Action = body.action ?? "verify";

  try {
    if (action === "verify") {
      // Verify the most recent unique URLs (default 25) — admin button or after-batch QA.
      const limit = Math.min(body.limit ?? 25, 50);
      let urls: string[] = body.urls ?? [];
      if (urls.length === 0) {
        const { data } = await supabase
          .from("indexnow_pings")
          .select("url")
          .eq("success", true)
          .order("created_at", { ascending: false })
          .limit(200);
        urls = Array.from(new Set((data ?? []).map((r: any) => r.url))).slice(0, limit);
      }

      const results: Array<{ url: string; status: string }> = [];
      for (const url of urls) {
        const status = await probeIndexed(url);
        await supabase
          .from("indexnow_pings")
          .update({ actual_indexing_status: status, last_verified_at: new Date().toISOString() })
          .eq("url", url);
        results.push({ url, status });
        // gentle pacing to avoid Google throttling
        await new Promise((r) => setTimeout(r, 250));
      }
      return new Response(JSON.stringify({ ok: true, verified: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enqueue_missing") {
      // Pick URLs flagged 'missing' or that haven't been pinged in 30 days and add to queue.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stale } = await supabase
        .from("indexnow_pings")
        .select("url, actual_indexing_status, created_at")
        .or(`actual_indexing_status.eq.missing,created_at.lt.${thirtyDaysAgo}`)
        .order("created_at", { ascending: false })
        .limit(200);

      const unique = Array.from(new Set((stale ?? []).map((r: any) => r.url)));
      let added = 0;
      for (const url of unique) {
        const { error } = await supabase
          .from("indexnow_reindex_queue")
          .upsert(
            {
              url,
              priority: 5,
              reason: "auto_missing_or_stale",
              next_ping_after: new Date().toISOString(),
              active: true,
            },
            { onConflict: "url" },
          );
        if (!error) added++;
      }
      return new Response(JSON.stringify({ ok: true, enqueued: added }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reindex_queue") {
      const now = new Date().toISOString();
      const { data: due } = await supabase
        .from("indexnow_reindex_queue")
        .select("id, url, priority, ping_count")
        .eq("active", true)
        .lte("next_ping_after", now)
        .order("priority", { ascending: false })
        .order("next_ping_after", { ascending: true })
        .limit(DAILY_REPING_CAP);

      const urls = (due ?? []).map((r: any) => r.url);
      if (urls.length === 0) {
        return new Response(JSON.stringify({ ok: true, pinged: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delegate the actual ping to the existing indexnow-notify function.
      await supabase.functions.invoke("indexnow-notify", {
        body: { urls, triggered_by: "cron_weekly_reindex" },
      });

      // Reschedule each row: priority hubs every 7 days, normal every 14 days.
      const nextWeek = (days: number) =>
        new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      for (const row of due ?? []) {
        await supabase
          .from("indexnow_reindex_queue")
          .update({
            last_pinged_at: now,
            ping_count: (row.ping_count ?? 0) + 1,
            next_ping_after: nextWeek(row.priority >= 9 ? 7 : 14),
            updated_at: now,
          })
          .eq("id", row.id);
      }

      return new Response(JSON.stringify({ ok: true, pinged: urls.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
