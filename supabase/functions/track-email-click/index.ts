import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Get UTM parameters and tracking data from query params
    const userId = url.searchParams.get("user_id");
    const emailType = url.searchParams.get("email_type") || "unknown";
    const linkType = url.searchParams.get("link_type") || "unknown";
    const utmSource = url.searchParams.get("utm_source");
    const utmMedium = url.searchParams.get("utm_medium");
    const utmCampaign = url.searchParams.get("utm_campaign");
    const utmContent = url.searchParams.get("utm_content");
    const redirectUrl = url.searchParams.get("redirect");

    if (!userId) {
      console.log("Missing user_id, redirecting without tracking");
      if (redirectUrl) {
        return Response.redirect(redirectUrl, 302);
      }
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user agent and IP (anonymized for GDPR compliance)
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const rawIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
    // Anonymize IP by removing the last octet (GDPR compliant)
    const ipAddress = rawIp ? rawIp.replace(/\.\d+$/, ".0") : null;

    // Record the click
    const { error: insertError } = await supabase
      .from("email_click_tracking")
      .insert({
        user_id: userId,
        email_type: emailType,
        link_type: linkType,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        user_agent: userAgent,
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error("Error recording click:", insertError);
    } else {
      console.log(`Click recorded: user=${userId}, type=${emailType}, link=${linkType}`);
    }

    // Redirect to the target URL
    if (redirectUrl) {
      // Add UTM parameters to the redirect URL if they exist
      const targetUrl = new URL(redirectUrl);
      if (utmSource) targetUrl.searchParams.set("utm_source", utmSource);
      if (utmMedium) targetUrl.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) targetUrl.searchParams.set("utm_campaign", utmCampaign);
      if (utmContent) targetUrl.searchParams.set("utm_content", utmContent);
      
      return Response.redirect(targetUrl.toString(), 302);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Click tracked" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in track-email-click:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
