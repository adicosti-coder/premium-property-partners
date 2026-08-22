// admin-resend-email
// Admin-only retry for a stored notification in public.admin_email_failures.
// Re-sends the original HTML through the shared team-email sender (which keeps
// the verified-sender fallback) and records the retry outcome on the row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: { failure_id?: string; recipient_override?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const failureId = String(body.failure_id ?? "").trim();
  if (!UUID_RE.test(failureId)) return json({ error: "failure_id invalid" }, 400);

  const override = String(body.recipient_override ?? "").trim();
  if (override && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(override)) {
    return json({ error: "recipient_override invalid" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row, error } = await admin
    .from("admin_email_failures")
    .select("id, lead_id, contract_id, recipient, subject, html_body, retry_count, resent_at")
    .eq("id", failureId)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!row) return json({ error: "Înregistrarea nu există" }, 404);
  if (!row.html_body) return json({ error: "Conținutul e-mailului nu mai este disponibil" }, 422);

  const to = override || (row.recipient as string);

  // Pass `admin: null` so a second failure does NOT create a duplicate row —
  // the outcome is recorded on the existing row below.
  const result = await sendTeamEmail(
    {
      to,
      subject: row.subject as string,
      html: row.html_body as string,
      leadId: (row.lead_id as string | null) ?? null,
      contractId: (row.contract_id as string | null) ?? null,
      source: "admin-manual-retry",
    },
    null,
  );

  const now = new Date().toISOString();
  await admin
    .from("admin_email_failures")
    .update({
      retry_count: ((row.retry_count as number) ?? 0) + 1,
      last_retry_at: now,
      last_retry_error: result.sent ? null : (result.error ?? "Trimitere eșuată"),
      resent_at: result.sent ? now : null,
      acknowledged_at: result.sent ? now : null,
      recipient: to,
    })
    .eq("id", failureId);

  if (!result.sent) {
    console.error("admin-resend-email failed:", result.status, result.error);
    return json({ sent: false, status: result.status ?? null, error: result.error }, 502);
  }

  return json({ sent: true, from: result.from, to });
});
