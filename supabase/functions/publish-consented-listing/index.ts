// publish-consented-listing — single safe entry point for „Publică Acum” in
// „Anunțuri Preluate Automat”. Verifies the WhatsApp consent, locks the prospect
// against double clicks, retries transient worker failures and audits the result.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response ?? json({ success: false, error: "Forbidden" }, 403);

  const body = await req.json().catch(() => null);
  const prospectId = String(body?.prospect_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(prospectId)) return json({ success: false, error: "prospect_id invalid" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: consent } = await sb.from("wa_publish_consents")
    .select("id, status, property_id").eq("prospect_listing_id", prospectId)
    .in("status", ["granted", "published"]).limit(1).maybeSingle();
  if (!consent) return json({ success: false, error: "Nu există acord „DA” pentru acest anunț" }, 409);

  // Already published? Return the existing page instead of publishing twice.
  const { data: existing } = consent.property_id
    ? await sb.from("properties").select("id, slug, is_active").eq("id", consent.property_id).eq("is_active", true).maybeSingle()
    : { data: null };
  const republish = body?.republish === true;
  if (existing?.slug && !republish) {
    return json({ success: true, published: true, already: true, property_id: existing.id, slug: existing.slug, url: `https://realtrust.ro/proprietate/${existing.slug}` });
  }

  // Lock: one publish per prospect per 3 minutes (double click / parallel tabs).
  const lockKey = `publish-consented:${prospectId}`;
  const scope = "publish-consented";
  await sb.from("request_idempotency").delete().eq("scope", scope).eq("key", lockKey).lt("expires_at", new Date().toISOString());
  const { error: lockErr } = await sb.from("request_idempotency")
    .insert({ scope, key: lockKey, expires_at: new Date(Date.now() + 180_000).toISOString() });
  if (lockErr) return json({ success: false, error: "Publicarea este deja în curs pentru acest anunț" }, 409);

  let last: { status: number; body: any } = { status: 0, body: null };
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(`${url}/functions/v1/auto-publish-listing-worker`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ prospect_id: prospectId, triggered_by: "admin_publish_now" }),
        });
        last = { status: r.status, body: await r.json().catch(() => ({})) };
        if (r.ok || r.status < 500) break; // 4xx / business result: don't retry
      } catch (e) {
        last = { status: 0, body: { error: String(e).slice(0, 300) } };
      }
      if (attempt < 3) await sleep(attempt * 2000);
    }
  } finally {
    await sb.from("request_idempotency").delete().eq("scope", scope).eq("key", lockKey);
  }

  await sb.from("admin_audit_log").insert({
    action: "publish_consented_listing", actor_label: "admin", entity_type: "prospect_listing",
    entity_id: prospectId, severity: last.body?.published ? "info" : "warning",
    details: { http_status: last.status, published: !!last.body?.published, reason: last.body?.reason ?? last.body?.error ?? null },
  });

  if (last.status >= 200 && last.status < 300) return json(last.body);
  return json({ success: false, error: last.body?.error || `Publicarea a eșuat (HTTP ${last.status || "rețea"})` }, 502);
});
