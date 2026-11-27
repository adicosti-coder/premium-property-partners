import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { inspectionReviewPolicy } from "../_shared/inspectionReviewPolicy.ts";
import { applyAdminDecisionToConsents } from "../_shared/ownerConsentApproval.ts";

const schema = z.object({ inspection_id: z.string().uuid(), action: z.enum(["approve", "reject"]) });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response ?? json({ error: "Forbidden" }, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Acțiune sau anunț invalid" }, 400);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const sb = createClient(url, key);
  const { inspection_id, action } = parsed.data;
  const { data: insp, error } = await sb.from("listing_inspections")
    .select("id, prospect_listing_id, status").eq("id", inspection_id).maybeSingle();
  if (error || !insp) return json({ error: "Anunțul nu a fost găsit" }, 404);
  const { data: consents, error: consentError } = await sb.from("wa_publish_consents")
    .select("status, revoked_at").eq("prospect_listing_id", insp.prospect_listing_id)
    .is("revoked_at", null).in("status", ["granted", "pending_approval", "published"]).limit(1);
  if (consentError) return json({ error: "Acordul nu a putut fi verificat" }, 500);
  const policy = inspectionReviewPolicy(insp.status, action, consents?.[0] ?? null);
  if (!policy.allowed) return json({ error: "Anunțul a fost deja procesat. Reîmprospătează lista." }, 409);
  const scope = "admin-review-inspection";
  await sb.from("request_idempotency").delete().eq("scope", scope).eq("key", inspection_id).lt("expires_at", new Date().toISOString());
  const { error: lockError } = await sb.from("request_idempotency").insert({ scope, key: inspection_id, expires_at: new Date(Date.now() + 180000).toISOString() });
  if (lockError) return json({ error: "Anunțul este deja procesat" }, 409);
  try {
    const { data: changed, error: saveError } = await sb.from("listing_inspections")
      .update({ status: policy.nextStatus, decided_at: new Date().toISOString() })
      .eq("id", inspection_id).eq("status", insp.status).select("id");
    if (saveError || !changed?.length) return json({ error: "Decizia nu a putut fi salvată" }, 409);
    await applyAdminDecisionToConsents(sb, insp.prospect_listing_id, action);
    const { error: auditError } = await sb.from("admin_audit_log").insert({ action: `inspection_${action}`, actor_user_id: auth.userId,
      actor_label: "admin", entity_type: "listing_inspection", entity_id: inspection_id, severity: "info",
      details: { prospect_id: insp.prospect_listing_id, previous_status: insp.status, next_status: policy.nextStatus } });
    if (auditError) return json({ error: "Decizia a fost salvată, dar jurnalizarea a eșuat. Verifică înainte de reluare." }, 500);
    if (action === "reject") {
      const { error: archiveError } = await sb.from("prospect_listings").update({ status: "archived" }).eq("id", insp.prospect_listing_id);
      if (archiveError) return json({ error: "Respingere salvată; arhivarea a eșuat" }, 500);
      return json({ success: true, rejected: true });
    }
    if (!policy.publish) return json({ success: true, waiting_consent: true });
    // Reuse the same per-prospect lock, consent checks, retries and publication audit as Publică acum.
    const response = await fetch(`${url}/functions/v1/publish-consented-listing`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ prospect_id: insp.prospect_listing_id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.published) {
      await sb.from("listing_inspections").update({ decision_note: String(result.reason || result.error || "publish_failed").slice(0, 300) }).eq("id", inspection_id);
      return json({ success: false, error: "Aprobat, dar publicarea nu a reușit. Poți reîncerca din listă." }, 502);
    }
    return json(result);
  } finally {
    await sb.from("request_idempotency").delete().eq("scope", scope).eq("key", inspection_id);
  }
});