import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { calculatorEmailReceipt } from "../_shared/calculatorEmailDelivery.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceKey || !resendKey) return json({ error: "Unavailable" }, 503);
  const admin = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({})) as { lead_id?: string };

  let query = admin.from("leads")
    .select("id,email_message_id")
    .like("source", "calculator_unificat%")
    .in("email_status", ["pending", "accepted"])
    .not("email_message_id", "is", null)
    .order("email_status_checked_at", { ascending: true, nullsFirst: true })
    .limit(20);
  if (body.lead_id) query = query.eq("id", body.lead_id);
  else query = query.or(`email_status_checked_at.is.null,email_status_checked_at.lt.${new Date(Date.now() - 3600_000).toISOString()}`);
  const { data: leads, error } = await query;
  if (error) return json({ error: "Status query failed" }, 500);

  let updated = 0;
  let failedChecks = 0;
  for (const lead of leads ?? []) {
    try {
      const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(lead.email_message_id)}`, {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      if (response.ok) {
        const email = await response.json();
        const receipt = calculatorEmailReceipt(`email.${email.last_event}`, { email_id: lead.email_message_id, reason: email.last_event });
        if (receipt) {
          const { error: receiptError } = await admin.rpc("record_calculator_email_receipt", {
            p_message_id: receipt.messageId,
            p_status: receipt.status,
            p_error: receipt.status === "failed" ? `Resend ${email.last_event}` : receipt.error,
          });
          if (!receiptError) updated++;
        }
      } else {
        failedChecks++;
      }
    } catch {
      failedChecks++;
    }
    await admin.from("leads").update({ email_status_checked_at: new Date().toISOString() }).eq("id", lead.id);
  }
  return json({ ok: true, checked: leads?.length ?? 0, updated, failed_checks: failedChecks });
});
