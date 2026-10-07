// admin-manual-publish — un admin publică manual un anunț pe realtrust.ro când „DA” nu vine.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { sendWaText, ADMIN_INSPECTION_NUMBER } from "../_shared/listingInspection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response ?? json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => null);
  const prospectId = String(body?.prospect_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(prospectId)) return json({ error: "prospect_id invalid" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  await sb.from("admin_audit_log").insert({
    action: "manual_publish_override", actor_label: "admin", entity_type: "prospect_listing",
    entity_id: prospectId, details: { reason: "owner_consent_missing" }, severity: "warning",
  });

  const r = await fetch(`${url}/functions/v1/auto-publish-listing-worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ prospect_id: prospectId, admin_override: true, triggered_by: "admin_manual" }),
  });
  const out = await r.json().catch(() => ({}));
  if (r.ok && (out as any)?.published) {
    const { data: p } = await sb.from("prospect_listings").select("title, category").eq("id", prospectId).maybeSingle();
    const o = out as any;
    const link = o?.url || (o?.slug ? `https://realtrust.ro/proprietate/${o.slug}` : "");
    await sendWaText(ADMIN_INSPECTION_NUMBER,
      `ℹ️ Anunț publicat MANUAL pe realtrust.ro (acord obținut altfel decât „DA” pe WhatsApp):\n${p?.title ?? "Fără titlu"} · ${p?.category ?? "—"}${link ? `\n${link}` : ""}`,
    ).catch(() => null);
  }
  return json(out, r.ok ? 200 : 502);
});
