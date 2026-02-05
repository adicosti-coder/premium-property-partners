// Lead Magnet Edge Function - v3.0 - Simplified imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadMagnetRequest {
  name: string;
  email: string;
  source: string;
  language: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, source, language } = await req.json() as LeadMagnetRequest;

    console.log("Lead magnet request received:", { name, email, source, language });

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 1. Save lead to leads table for admin tracking (direct REST API call)
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const leadResponse = await fetch(`${supabaseUrl}/rest/v1/leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            name,
            email,
            whatsapp_number: "",
            property_type: "investor_guide",
            property_area: 0,
            source: source || "lead_magnet_guide_2026",
            message: `Ghidul Investitorului - ${language === "ro" ? "Română" : "English"}`,
          }),
        });

        if (leadResponse.ok) {
          console.log("Lead saved to database successfully");
        } else {
          console.error("Lead insert error:", await leadResponse.text());
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
      }

      // 2. Also save to newsletter subscribers
      try {
        const newsletterResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify({ email, is_active: true }),
        });

        if (!newsletterResponse.ok) {
          console.error("Newsletter subscriber error:", await newsletterResponse.text());
        }
      } catch (nlError) {
        console.error("Newsletter error:", nlError);
      }
    }

    // 3. Send to Make.com webhook
    if (makeWebhookUrl) {
      try {
        const makeResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            source,
            language,
            type: "lead_magnet",
            guide: "ghid_investitor_timisoara_2026",
            timestamp: new Date().toISOString(),
          }),
        });

        console.log("Make.com webhook response:", makeResponse.status);
      } catch (makeError) {
        console.error("Make.com webhook error:", makeError);
      }
    } else {
      console.warn("MAKE_WEBHOOK_URL not configured");
    }

    // 4. Send notification email to admin
    if (resendApiKey) {
      try {
        const adminEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "RealTrust Leads <onboarding@resend.dev>",
            to: ["adicosti@gmail.com"],
            subject: `🎯 Lead Magnet: ${name} vrea Ghidul Investitorului 2026`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1e3a5f;">🎯 Lead Magnet Nou!</h1>
                <p><strong>Nume:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Sursă:</strong> ${source}</p>
                <p><strong>Limbă:</strong> ${language === "ro" ? "Română" : "English"}</p>
              </div>
            `,
          }),
        });

        console.log("Admin notification email response:", adminEmailResponse.status);
      } catch (emailError) {
        console.error("Admin email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead magnet processed successfully" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Lead magnet error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
