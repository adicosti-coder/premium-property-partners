// Public endpoint for Make.com to PATCH indexing_status + last_google_check_at.
// Auth: shared secret via `x-api-secret-key` header OR `api_secret_key` in body.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-secret-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_STATUSES = new Set([
  "INDEXED",
  "CRAWLED_NOT_INDEXED",
  "NEUTRAL",
  "URL_NOT_ON_GOOGLE",
  "pending_check",
]);

const ALLOWED_TABLES = new Set(["properties", "prospect_listings"]);

type Payload = {
  listing_id?: string;
  status?: string;
  table?: string; // "properties" (default) | "prospect_listings"
  api_secret_key?: string;
  // Optional batch: [{listing_id, status, table?}, ...]
  items?: Array<{ listing_id: string; status: string; table?: string }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SECRET = Deno.env.get("GSC_UPDATE_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SECRET || !SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const providedSecret = req.headers.get("x-api-secret-key") ?? body.api_secret_key ?? "";
  if (providedSecret !== SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  const items =
    body.items && Array.isArray(body.items)
      ? body.items
      : body.listing_id && body.status
      ? [{ listing_id: body.listing_id, status: body.status, table: body.table }]
      : [];

  if (items.length === 0) return json({ error: "Missing listing_id/status or items[]" }, 400);
  if (items.length > 500) return json({ error: "Batch too large (max 500)" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();
  const results: Array<{ listing_id: string; ok: boolean; error?: string }> = [];

  for (const it of items) {
    const table = (it.table ?? body.table ?? "properties").trim();
    if (!ALLOWED_TABLES.has(table)) {
      results.push({ listing_id: it.listing_id, ok: false, error: "invalid_table" });
      continue;
    }
    if (!it.listing_id || typeof it.listing_id !== "string") {
      results.push({ listing_id: String(it.listing_id), ok: false, error: "invalid_listing_id" });
      continue;
    }
    if (!ALLOWED_STATUSES.has(it.status)) {
      results.push({ listing_id: it.listing_id, ok: false, error: "invalid_status" });
      continue;
    }

    const { error } = await sb
      .from(table)
      .update({ indexing_status: it.status, last_google_check_at: now })
      .eq("id", it.listing_id);

    if (error) results.push({ listing_id: it.listing_id, ok: false, error: error.message });
    else results.push({ listing_id: it.listing_id, ok: true });
  }

  const okCount = results.filter((r) => r.ok).length;
  return json({ updated: okCount, failed: results.length - okCount, results });
});
