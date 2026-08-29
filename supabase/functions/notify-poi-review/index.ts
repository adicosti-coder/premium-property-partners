// Notifies the RealTrust admin (email + WhatsApp webhook) whenever a guest
// leaves a POI review that needs moderation. Called from a DB trigger on
// public.poi_reviews (internal call only — cron secret or service role key).
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { fetchWithRetry } from "../_shared/fetchRetry.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const ADMIN_PHONE = "+40799069256"; // RealTrust WhatsApp
const MODERATION_URL = "https://realtrust.ro/admin?tab=poi-reviews";

interface ReviewRecord {
  id: string;
  poi_id: string;
  rating: number;
  comment?: string | null;
  guest_name?: string | null;
  status?: string | null;
  created_at?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!(await isInternalCall(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const payload = await req.json();
    const record: ReviewRecord = payload.record || payload;
    if (!record?.id || !record?.poi_id) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (record.status && record.status !== "pending") {
      return new Response(JSON.stringify({ skipped: true, reason: "not_pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: poi } = await admin
      .from("points_of_interest")
      .select("name, category")
      .eq("id", record.poi_id)
      .maybeSingle();

    const poiName = (poi?.name as string) || "Locație necunoscută";
    const guest = record.guest_name || "Oaspete";
    const stars = "★".repeat(Math.max(1, Math.min(5, record.rating))) +
      "☆".repeat(Math.max(0, 5 - Math.max(1, Math.min(5, record.rating))));
    const comment = (record.comment || "").slice(0, 500);

    // 1) Email către admin (cu fallback pe sender verificat + admin_email_failures)
    const emailResult = await sendTeamEmail(
      {
        to: Deno.env.get("ADMIN_ALERT_EMAIL") || "info@realtrust.ro",
        subject: `Recenzie nouă de moderat — ${poiName} (${record.rating}/5)`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">
            <h2 style="color:#1e3a8a;margin-bottom:4px">Recenzie nouă în așteptare</h2>
            <p style="color:#475569;margin-top:0">Un oaspete a lăsat o recenzie care necesită moderare.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#64748b">Locație</td><td><strong>${escapeHtml(poiName)}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Oaspete</td><td>${escapeHtml(guest)}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Rating</td><td>${stars} (${record.rating}/5)</td></tr>
              ${comment ? `<tr><td style="padding:6px 0;color:#64748b">Comentariu</td><td>${escapeHtml(comment)}</td></tr>` : ""}
            </table>
            <p style="margin-top:20px">
              <a href="${MODERATION_URL}" style="background:#D4AF37;color:#111;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
                Moderează recenzia
              </a>
            </p>
          </div>`,
        source: "notify-poi-review",
      },
      admin,
    );

    // 2) Alertă WhatsApp prin webhook-ul configurat (Make/Zapier/relay)
    const webhookUrl = Deno.env.get("WHATSAPP_ALERT_WEBHOOK_URL") ||
      Deno.env.get("LEAD_WEBHOOK_URL");
    let waStatus: number | null = null;
    if (webhookUrl) {
      const message = [
        "⭐ *RECENZIE NOUĂ — necesită moderare*",
        "",
        `📍 *Locație:* ${poiName}`,
        `👤 *Oaspete:* ${guest}`,
        `⭐ *Rating:* ${record.rating}/5`,
        comment ? `💬 ${comment}` : null,
        "",
        `🔗 Moderează: ${MODERATION_URL}`,
      ].filter(Boolean).join("\n");

      const resp = await fetchWithRetry(
        webhookUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "poi_review_pending_moderation",
            timestamp: new Date().toISOString(),
            to: ADMIN_PHONE,
            message,
            review: {
              id: record.id,
              poi_id: record.poi_id,
              poi_name: poiName,
              rating: record.rating,
              guest_name: guest,
              created_at: record.created_at ?? new Date().toISOString(),
            },
          }),
        },
        { label: "notify-poi-review", maxAttempts: 3 },
      );
      waStatus = resp.status;
    }

    // 3) Jurnal notificări pentru panoul de admin
    await admin.from("poi_review_notifications").insert({
      review_id: record.id,
      poi_id: record.poi_id,
      poi_name: poiName,
      rating: record.rating,
      guest_name: guest,
      email_to: Deno.env.get("ADMIN_ALERT_EMAIL") || "info@realtrust.ro",
      email_sent: emailResult.sent,
      email_fallback: emailResult.storedFallback ?? false,
      whatsapp_configured: Boolean(webhookUrl),
      whatsapp_status: waStatus,
      error_message: emailResult.sent || emailResult.storedFallback
        ? (waStatus !== null && waStatus >= 300 ? `webhook status ${waStatus}` : null)
        : "email_failed",
    });

    return new Response(
      JSON.stringify({
        success: true,
        review_id: record.id,
        email_sent: emailResult.sent,
        email_stored_fallback: emailResult.storedFallback ?? false,
        whatsapp_status: waStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-poi-review error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
