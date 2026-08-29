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

// Two-level cache so crawler hits don't re-run the full multi-table query:
//   1. per-isolate memory cache (free, but lost on cold start)
//   2. `sitemap_cache` table — one tiny row read instead of a full rebuild
// TTL stays short enough that new POIs/articles appear the same day.
const CACHE_TTL_MS = 30 * 60 * 1000;
const memCache = new Map<string, { body: string; at: number }>();

const memGet = (key: string): string | null => {
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.body;
  if (hit) memCache.delete(key);
  return null;
};

const xml = (body: string, cacheState: "HIT" | "DB" | "MISS") =>
  new Response(body, {
    status: 200,
    headers: { ...XML_HEADERS, "x-sitemap-cache": cacheState },
  });

// deno-lint-ignore no-explicit-any
type Client = any;

const serviceClient = (): Client =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

const dbGet = async (client: Client, key: string): Promise<string | null> => {
  const { data, error } = await client
    .from("sitemap_cache")
    .select("body, generated_at")
    .eq("cache_key", key)
    .maybeSingle();
  if (error || !data) return null;
  const age = Date.now() - new Date(data.generated_at).getTime();
  return age < CACHE_TTL_MS ? (data.body as string) : null;
};

const dbPut = async (client: Client, key: string, body: string) => {
  await client
    .from("sitemap_cache")
    .upsert(
      { cache_key: key, body, generated_at: new Date().toISOString() },
      { onConflict: "cache_key" },
    );
};

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
  const key = isStatic ? "static" : isDynamic ? "dynamic" : "index";
  // ?fresh=1 forces a rebuild (used by the admin SEO redeploy panel).
  const bypass = url.searchParams.get("fresh") === "1";

  if (!bypass) {
    const hit = memGet(key);
    if (hit) return xml(hit, "HIT");
  }

  try {
    // Static + index documents are pure string builders — no DB round trip.
    if (isStatic || !isDynamic) {
      const body = isStatic ? buildStaticSitemap() : buildSitemapIndex();
      memCache.set(key, { body, at: Date.now() });
      return xml(body, "MISS");
    }

    const client = serviceClient();

    if (!bypass) {
      const dbHit = await dbGet(client, key);
      if (dbHit) {
        memCache.set(key, { body: dbHit, at: Date.now() });
        return xml(dbHit, "DB");
      }
    }

    const body = await buildDynamicSitemap(client);
    memCache.set(key, { body, at: Date.now() });
    await dbPut(client, key, body);
    return xml(body, "MISS");
  } catch (error) {
    console.error("[sitemap] generation failed:", error);
    // Never return HTML/JSON to a crawler on this route — emit a valid,
    // minimal XML document with a 200 so the sitemap stays parseable.
    return xml(buildSitemapIndex(), "MISS");
  }
});

