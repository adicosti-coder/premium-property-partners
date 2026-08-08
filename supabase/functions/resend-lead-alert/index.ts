// resend-lead-alert — manual re-trigger for a failed WhatsApp/CRM lead alert.
// Admin-only. Re-uses lead-score-dispatch so the alert template stays in one place.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LEAD_COLUMNS =
  "id,name,email,whatsapp_number,property_type,property_area,calculated_net_profit,calculated_yearly_profit,source,created_at,lead_score,lead_grade,score_breakdown,simulation_data,engagement_status,touch_count";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: { lead_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const leadId = (body.lead_id || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "lead_id (uuid) required" }, 400);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: lead, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", leadId)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!lead) return json({ error: "Lead not found" }, 404);

  await supabase
    .from("leads")
    .update({ alert_status: "resending", alert_last_error: null })
    .eq("id", leadId);

  const res = await fetchWithRetry(
    `${supabaseUrl}/functions/v1/lead-score-dispatch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-webhook-secret": serviceKey,
      },
      body: JSON.stringify({ event: "lead.alert_resend", record: lead }),
    },
    { label: "resend-lead-alert", maxAttempts: 3, timeoutMs: 20_000 },
  );

  if (!res.ok) {
    await supabase
      .from("leads")
      .update({
        alert_status: "failed",
        alert_last_error: (res.error ?? `http_${res.status}`).slice(0, 500),
      })
      .eq("id", leadId);
    return json({ error: "dispatch_failed", status: res.status, attempts: res.attempts }, 502);
  }

  await supabase.from("communication_logs").insert({
    channel: "whatsapp",
    direction: "outbound",
    source: "resend-lead-alert",
    lead_id: leadId,
    status: "sent",
    outcome: "manual_resend",
    metadata: { admin_id: auth.userId, attempts: res.attempts },
  });

  return json({ ok: true, attempts: res.attempts });
});
