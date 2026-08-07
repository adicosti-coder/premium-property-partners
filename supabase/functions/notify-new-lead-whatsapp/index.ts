// Sends a WhatsApp alert (via configurable webhook) to the admin number
// every time a new lead is inserted. Triggered from the DB.
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const ADMIN_PHONE = "+40799069256"; // RealTrust WhatsApp


interface LeadRecord {
  id: string;
  name: string;
  email?: string | null;
  whatsapp_number: string;
  property_type: string;
  property_area: number;
  calculated_net_profit?: number | null;
  source?: string | null;
  created_at: string;
  simulation_data?: Record<string, unknown> | string | null;
}

function fmtPhone(p: string): string {
  return p.replace(/[^\d+]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify shared secret against Supabase service role key (sent by DB trigger)
  const secret = req.headers.get("x-webhook-secret") || "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!expected || !timingSafeEqual(secret, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const record: LeadRecord = payload.record || payload;
    const sim = typeof record.simulation_data === "string"
      ? JSON.parse(record.simulation_data)
      : (record.simulation_data || {});

    const phoneClean = fmtPhone(record.whatsapp_number || "");
    const phoneValid = phoneClean.length >= 8 && record.whatsapp_number !== "pending";

    // Build a rich, human-readable WhatsApp message
    const lines = [
      "🚨 *LEAD NOU — RealTrust*",
      "",
      `👤 *Nume:* ${record.name}`,
      `📞 *Telefon:* ${phoneValid ? record.whatsapp_number : "—"}`,
      record.email ? `✉️ *Email:* ${record.email}` : null,
      `🏠 *Proprietate:* ${record.property_type} (${record.property_area} m²)`,
      record.calculated_net_profit
        ? `💰 *Profit estimat:* ${record.calculated_net_profit.toLocaleString()} €/lună`
        : null,
      (sim as any)?.scor != null
        ? `⭐ *Scor HostScan:* ${(sim as any).scor}/${(sim as any).max_scor || 140}`
        : null,
      (sim as any)?.zona ? `📍 *Zonă:* ${(sim as any).zona}` : null,
      `🔗 *Sursă:* ${record.source || "necunoscut"}`,
      "",
      phoneValid
        ? `💬 Răspunde rapid: https://wa.me/${phoneClean.replace(/^\+/, "")}`
        : "⚠️ Lead fără telefon valid",
    ].filter(Boolean);

    const messageText = lines.join("\n");

    // Forward to configured webhook (Make/Zapier/Twilio relay/etc.)
    const webhookUrl = Deno.env.get("WHATSAPP_ALERT_WEBHOOK_URL")
      || Deno.env.get("LEAD_WEBHOOK_URL"); // graceful fallback

    if (!webhookUrl) {
      console.warn("WHATSAPP_ALERT_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ skipped: true, reason: "Webhook URL not set" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const webhookPayload = {
      event: "new_lead_whatsapp_alert",
      timestamp: new Date().toISOString(),
      to: ADMIN_PHONE,
      message: messageText,
      lead: {
        id: record.id,
        name: record.name,
        phone: record.whatsapp_number,
        phone_valid: phoneValid,
        email: record.email,
        property_type: record.property_type,
        property_area: record.property_area,
        net_profit: record.calculated_net_profit,
        source: record.source,
        score: (sim as any)?.scor ?? null,
        created_at: record.created_at,
      },
    };

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    console.log(`WhatsApp alert sent for lead ${record.id}, status: ${resp.status}`);

    return new Response(
      JSON.stringify({ success: true, lead_id: record.id, webhook_status: resp.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-new-lead-whatsapp error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
