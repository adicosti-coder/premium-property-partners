import { corsHeaders } from "@supabase/supabase-js/cors";

const INDEXNOW_KEY = "97f850c0625c43878fbeb66c5a399858";
const HOST = "www.realtrust.ro";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json() as { urls?: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "urls array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IndexNow batch API
    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls.map((u) =>
        u.startsWith("http") ? u : `https://${HOST}${u}`
      ),
    };

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const body = await response.text();

    return new Response(
      JSON.stringify({ ok: status >= 200 && status < 300, status, body }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
