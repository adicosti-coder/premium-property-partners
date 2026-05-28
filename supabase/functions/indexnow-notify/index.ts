import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "97f850c0625c43878fbeb66c5a399858";
const HOST = "www.realtrust.ro";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const logPings = async (
    fullUrls: string[],
    status: number | null,
    success: boolean,
    body: string,
    triggeredBy: string,
    error?: string,
  ) => {
    try {
      const rows = fullUrls.map((u) => ({
        url: u,
        host: HOST,
        http_status: status,
        success,
        response_body: body.slice(0, 1000),
        triggered_by: triggeredBy.slice(0, 100),
        batch_size: fullUrls.length,
        error: error ?? null,
      }));
      await supabase.from("indexnow_pings").insert(rows);
    } catch (e) {
      console.warn("[indexnow] failed to log pings:", (e as Error).message);
    }
  };

  try {
    const { urls, triggered_by } = (await req.json()) as { urls?: string[]; triggered_by?: string };
    const trigger = triggered_by || "manual";

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "urls array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urlList = urls.map((u) => (u.startsWith("http") ? u : `https://${HOST}${u}`));

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    };

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const body = await response.text();
    const ok = status >= 200 && status < 300;

    await logPings(urlList, status, ok, body, trigger);

    return new Response(
      JSON.stringify({ ok, status, body, count: urlList.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = String(err);
    await logPings([], null, false, "", "error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
