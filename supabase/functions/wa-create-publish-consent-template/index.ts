// Admin / intern: trimite la Meta șablonul de acord acord_publicare_proprietar_v4 (MARKETING, ro)
// dacă nu e deja înregistrat și raportează starea v4 și a lui v3 (folosit până la aprobarea v4).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { ensurePublishConsentTemplate, previousPublishConsentTemplateStatus } from "../_shared/waPublishConsentEnsure.ts";
import {
  WA_PUBLISH_CONSENT_BODY, WA_PUBLISH_CONSENT_CATEGORY, WA_PUBLISH_CONSENT_LANGUAGE,
  WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE, WA_PUBLISH_CONSENT_TEMPLATE,
} from "../_shared/waPublishConsentTemplate.ts";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const [status, previousStatus] = await Promise.all([ensurePublishConsentTemplate(), previousPublishConsentTemplateStatus()]);
  if (status === "missing_wa_token") return json({ error: "missing_credentials" }, 500);
  const failed = /^(check_failed|create_failed)/.test(status);
  if (failed) console.error("Consent template v4 ensure failed", status);
  return json({
    ok: !failed,
    template: WA_PUBLISH_CONSENT_TEMPLATE,
    status,
    category: WA_PUBLISH_CONSENT_CATEGORY,
    language: WA_PUBLISH_CONSENT_LANGUAGE,
    body: WA_PUBLISH_CONSENT_BODY,
    previous_template: WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE,
    previous_status: previousStatus,
    in_use: status === "APPROVED" ? WA_PUBLISH_CONSENT_TEMPLATE : previousStatus === "APPROVED" ? WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE : "prim contact (până la aprobare)",
  }, failed ? 502 : 200);
});
