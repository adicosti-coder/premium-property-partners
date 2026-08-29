// Public, unauthenticated sitemap endpoint. Serves all three sitemap
// documents from a single function so hosting rewrites can proxy
// /sitemap*.xml straight here without ever hitting the SPA fallback.
//
//   /functions/v1/sitemap               -> sitemap index
//   /functions/v1/sitemap/sitemap.xml   -> sitemap index
//   /functions/v1/sitemap/static.xml    -> static marketing pages
//   /functions/v1/sitemap/dynamic.xml   -> DB-driven pages
//
// Also accepts ?type=index|static|dynamic for callers that cannot use paths.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  XML_HEADERS,
  buildSitemapIndex,
  buildStaticSitemap,
  buildDynamicSitemap,
} from "../_shared/sitemapBuilder.ts";

// In-memory cache so repeated crawler hits never re-query the database.
// TTL is intentionally short enough that new POIs/articles appear same-day.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { body: string; at: number }>();

const cached = (key: string): string | null => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.body;
  if (hit) cache.delete(key);
  return null;
};

const store = (key: string, body: string) => {
  cache.set(key, { body, at: Date.now() });
  return body;
};

const xml = (body: string, hit: boolean) =>
  new Response(body, {
    status: 200,
    headers: { ...XML_HEADERS, "x-sitemap-cache": hit ? "HIT" : "MISS" },
  });


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const url = new URL(req.url);
  const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const requested = (url.searchParams.get("type") ?? last).toLowerCase();

  const isStatic = requested.includes("static");
  const isDynamic = requested.includes("dynamic");

  try {
    if (isStatic) return xml(buildStaticSitemap());

    if (isDynamic) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      return xml(await buildDynamicSitemap(supabase));
    }

    return xml(buildSitemapIndex());
  } catch (error) {
    console.error("[sitemap] generation failed:", error);
    // Never return HTML/JSON to a crawler on this route — emit a valid,
    // minimal XML document with a 200 so the sitemap stays parseable.
    return xml(buildSitemapIndex());
  }
});
