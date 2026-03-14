import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  // Verify shared secret
  const webhookSecret = req.headers.get("x-webhook-secret");
  if (webhookSecret !== "Secret_Leads_2024_!_Sec") {
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid webhook secret" }),
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
