import { getCorsHeaders } from "../_shared/securityHeaders.ts";

/** Convert ArrayBuffer to base64 without exceeding call stack */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

async function fetchImage(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RealTrust/1.0)",
      Accept: "image/*",
    },
  });
  return response;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let url: string | null = null;

    // Support GET with ?url= query param — returns raw image binary
    if (req.method === "GET") {
      const params = new URL(req.url).searchParams;
      url = params.get("url");
      if (!url) {
        return new Response("Missing ?url= param", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const response = await fetchImage(url);
      if (!response.ok) {
        return new Response(`Upstream ${response.status}`, {
          status: 502,
          headers: corsHeaders,
        });
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const body = await response.arrayBuffer();

      return new Response(body, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Legacy POST — returns base64 JSON
    if (req.method === "POST") {
      const { url: postUrl } = await req.json();
      url = postUrl;
      if (!url || typeof url !== "string") {
        return new Response(JSON.stringify({ error: "URL required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetchImage(url);
      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Fetch failed: ${response.status}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      return new Response(
        JSON.stringify({ data: base64, contentType, size: arrayBuffer.byteLength }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
