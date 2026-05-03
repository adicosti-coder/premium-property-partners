import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Constant-time comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

interface LeadRecord {
  id: string;
  name: string;
  email?: string;
  whatsapp_number: string;
  property_type: string;
  property_area: number;
  calculated_net_profit?: number;
  simulation_data?: {
    scor?: number;
    max_scor?: number;
    zona?: string;
    roi_estimat?: string;
    tarif_noapte?: number;
    categorie?: string;
    note_consultant?: string;
    recomandari?: string[];
  };
  source?: string;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify shared secret against the Supabase service role key (sent by the DB trigger).
  const webhookSecret = req.headers.get("x-webhook-secret") || "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!expected || !timingSafeEqual(webhookSecret, expected)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();
    
    // Support both DB webhook format and manual trigger
    const record: LeadRecord = payload.record || payload;
    const simData = typeof record.simulation_data === "string" 
      ? JSON.parse(record.simulation_data) 
      : record.simulation_data;

    const scor = simData?.scor ?? 0;

    // Only forward if score >= 90
    if (scor < 90) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Score ${scor} < 90` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the webhook URL from secrets
    const webhookUrl = Deno.env.get("LEAD_WEBHOOK_URL");
    
    if (!webhookUrl) {
      console.warn("LEAD_WEBHOOK_URL not configured, skipping webhook");
      return new Response(
        JSON.stringify({ skipped: true, reason: "LEAD_WEBHOOK_URL not set" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward the high-score lead to the external webhook
    const webhookPayload = {
      event: "high_score_lead",
      timestamp: new Date().toISOString(),
      lead: {
        id: record.id,
        name: record.name,
        email: record.email,
        phone: record.whatsapp_number,
        property_type: record.property_type,
        property_area: record.property_area,
        net_profit: record.calculated_net_profit,
        source: record.source,
        created_at: record.created_at,
        hostscan: {
          scor: simData.scor,
          max_scor: simData.max_scor,
          zona: simData.zona,
          roi_estimat: simData.roi_estimat,
          tarif_noapte: simData.tarif_noapte,
          categorie: simData.categorie,
          note_consultant: simData.note_consultant,
          recomandari: simData.recomandari,
        },
      },
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    console.log(`Webhook sent for lead ${record.id} (score: ${scor}), status: ${response.status}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: record.id, 
        score: scor, 
        webhook_status: response.status 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lead webhook error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
