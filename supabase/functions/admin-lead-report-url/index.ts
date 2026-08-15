// admin-lead-report-url
// Returns a short-lived signed URL for the yield-report PDF attached to a lead.
// Admin-only: the `lead-reports` bucket is private and never exposed to clients.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { logLeadEvent } from "../_shared/leadEvents.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  try {
    const body = await req.json().catch(() => null);
    const leadId = (body as { leadId?: unknown } | null)?.leadId;
    if (typeof leadId !== "string" || !UUID_RE.test(leadId)) {
      return json({ error: "Invalid leadId" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error } = await admin
      .from("leads")
      .select("report_pdf_path")
      .eq("id", leadId)
      .maybeSingle();

    if (error) return json({ error: "lookup_failed" }, 500);
    if (!lead?.report_pdf_path) return json({ error: "no_report" }, 404);

    const { data: signed, error: signErr } = await admin.storage
      .from("lead-reports")
      .createSignedUrl(lead.report_pdf_path, 60 * 10);

    if (signErr || !signed?.signedUrl) return json({ error: "sign_failed" }, 500);

    await logLeadEvent({
      leadId,
      type: "report_viewed",
      status: "info",
      message: "Raportul PDF a fost deschis de un administrator",
      actor: "admin",
      metadata: { admin_user_id: auth.userId ?? null, ttl_seconds: 600 },
    }, admin);

    return json({ ok: true, url: signed.signedUrl });
  } catch (err) {
    console.error("admin-lead-report-url error:", err);
    return json({ error: "unexpected" }, 500);
  }
});
