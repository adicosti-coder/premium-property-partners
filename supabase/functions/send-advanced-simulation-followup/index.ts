import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate tracked URL with UTM parameters
function getTrackedUrl(
  userId: string,
  emailType: string,
  linkType: string,
  targetUrl: string,
  supabaseUrl: string
): string {
  const trackingUrl = new URL(`${supabaseUrl}/functions/v1/track-email-click`);
  trackingUrl.searchParams.set("user_id", userId);
  trackingUrl.searchParams.set("email_type", emailType);
  trackingUrl.searchParams.set("link_type", linkType);
  trackingUrl.searchParams.set("utm_source", "email");
  trackingUrl.searchParams.set("utm_medium", "followup");
  trackingUrl.searchParams.set("utm_campaign", emailType);
  trackingUrl.searchParams.set("utm_content", linkType);
  trackingUrl.searchParams.set("redirect", targetUrl);
  return trackingUrl.toString();
}

// Generate tracking pixel URL for open tracking
function getTrackingPixelUrl(
  userId: string,
  emailType: string,
  supabaseUrl: string
): string {
  const pixelUrl = new URL(`${supabaseUrl}/functions/v1/track-email-open`);
  pixelUrl.searchParams.set("user_id", userId);
  pixelUrl.searchParams.set("email_type", emailType);
  return pixelUrl.toString();
}

// Get follow-up email content for advanced simulation
function getAdvancedSimulationFollowupEmail(
  firstName: string,
  scenario: string,
  netWithSystem: number,
  diffVsClassic: number,
  percentVsClassic: number,
  userId: string,
  supabaseUrl: string,
  trackingPixelUrl: string
): { subject: string; html: string } {
  const whatsappUrl = getTrackedUrl(
    userId,
    "advanced_simulation_followup",
    "whatsapp_cta",
    `https://wa.me/40744566778?text=Salut!%20Am%20folosit%20calculatorul%20avansat%20și%20vreau%20mai%20multe%20detalii%20despre%20colaborare.`,
    supabaseUrl
  );
  const calculatorUrl = getTrackedUrl(
    userId,
    "advanced_simulation_followup",
    "calculator_cta",
    "https://realtrustaparthotel.lovable.app/pentru-proprietari#calculator",
    supabaseUrl
  );
  const websiteUrl = getTrackedUrl(
    userId,
    "advanced_simulation_followup",
    "website_footer",
    "https://realtrustaparthotel.lovable.app",
    supabaseUrl
  );

  const scenarioLabel = scenario === "piata" ? "La Piață" : scenario === "conservator" ? "Conservator" : "Optimist";
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

  return {
    subject: `${firstName}, simularea ta arată +${percentVsClassic.toFixed(0)}% față de chiria clasică – hai să discutăm!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        ${trackingPixel}
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">RealTrust</h1>
                    <p style="color: #a0a0a0; margin: 10px 0 0; font-size: 14px;">Property Management</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">${firstName}, a trecut o săptămână!</h2>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Acum 7 zile ai făcut o simulare detaliată în calculatorul nostru avansat. Rezultatele tale erau impresionante:
                    </p>
                    
                    <!-- Results Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="text-align: center; padding-bottom: 15px;">
                                <p style="color: #6c757d; margin: 0 0 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Scenariul: ${scenarioLabel}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="text-align: center;">
                                <p style="color: #6c757d; margin: 0 0 8px; font-size: 14px;">Venit NET lunar cu RealTrust</p>
                                <p style="color: #28a745; margin: 0; font-size: 36px; font-weight: 700;">${netWithSystem.toLocaleString('ro-RO')} €</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Comparison Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 12px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="color: #2e7d32; margin: 0 0 5px; font-size: 14px;">Față de chiria clasică:</p>
                          <p style="color: #1b5e20; margin: 0; font-size: 28px; font-weight: 700;">+${diffVsClassic.toLocaleString('ro-RO')} € / lună</p>
                          <p style="color: #388e3c; margin: 8px 0 0; font-size: 16px; font-weight: 600;">↑ ${percentVsClassic.toFixed(0)}% mai mult</p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                      Aceste cifre pot deveni realitate. Echipa noastră te poate ajuta cu:
                    </p>
                    
                    <ul style="color: #4a4a4a; font-size: 15px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                      <li><strong>Optimizare pricing</strong> în timp real pe baza cererii</li>
                      <li><strong>Listare profesională</strong> pe Airbnb, Booking.com și altele</li>
                      <li><strong>Management complet</strong> – de la comunicare la curățenie</li>
                      <li><strong>Dashboard proprietar</strong> – vezi totul în timp real</li>
                    </ul>
                    
                    <!-- CTA Buttons -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 20px;">
                          <a href="${whatsappUrl}" 
                             style="display: inline-block; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);">
                            💬 Hai să discutăm!
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 5px 0;">
                          <a href="${calculatorUrl}" 
                             style="display: inline-block; background: transparent; color: #1a1a2e; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 14px; border: 2px solid #1a1a2e;">
                            📊 Recalculează simularea
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                      Sau răspunde direct la acest email – suntem aici să te ajutăm.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                    <p style="color: #6c757d; font-size: 13px; margin: 0; text-align: center;">
                      RealTrust Property Management<br>
                      Timișoara, România<br>
                      <a href="${websiteUrl}" style="color: #1a1a2e; text-decoration: none;">realtrust.ro</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
}

// Send push notification
async function sendPushNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        url,
      }),
    });
    
    if (!response.ok) {
      console.log(`Push notification failed for user ${userId}`);
      return false;
    }
    
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (err) {
    console.error("Error sending push notification:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStart = new Date(sevenDaysAgo);
    sevenDaysAgoStart.setHours(0, 0, 0, 0);
    const sevenDaysAgoEnd = new Date(sevenDaysAgo);
    sevenDaysAgoEnd.setHours(23, 59, 59, 999);

    console.log(`Checking for advanced simulations created between ${sevenDaysAgoStart.toISOString()} and ${sevenDaysAgoEnd.toISOString()}`);

    // Get simulations that are exactly 7 days old (created on that day)
    const { data: simulations, error: simError } = await supabase
      .from("advanced_simulations")
      .select("*")
      .gte("created_at", sevenDaysAgoStart.toISOString())
      .lte("created_at", sevenDaysAgoEnd.toISOString());

    if (simError) {
      console.error("Error fetching simulations:", simError);
      throw simError;
    }

    if (!simulations || simulations.length === 0) {
      console.log("No advanced simulations from 7 days ago to process");
      return new Response(
        JSON.stringify({ success: true, message: "No simulations to process", emailsSent: 0, pushSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${simulations.length} simulations from 7 days ago`);

    // Group simulations by user (take the latest one per user)
    const userSimMap = new Map<string, typeof simulations[0]>();
    for (const sim of simulations) {
      const existing = userSimMap.get(sim.user_id);
      if (!existing || new Date(sim.created_at) > new Date(existing.created_at)) {
        userSimMap.set(sim.user_id, sim);
      }
    }

    const userIds = Array.from(userSimMap.keys());

    // Check which users already received this follow-up
    const { data: sentEmails, error: sentError } = await supabase
      .from("simulation_followup_emails")
      .select("user_id")
      .in("user_id", userIds)
      .eq("email_type", "advanced_simulation_followup");

    if (sentError) {
      console.error("Error checking sent emails:", sentError);
    }

    const alreadySentUserIds = new Set((sentEmails || []).map(e => e.user_id));

    // Get user profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    // Check which users submitted leads (skip those)
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("email");

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
    }

    const leadEmails = new Set((leads || []).map(l => l.email?.toLowerCase()).filter(Boolean));

    let emailsSent = 0;
    let pushSent = 0;
    const errors: string[] = [];
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (const profile of profiles || []) {
      const simulation = userSimMap.get(profile.id);
      if (!simulation) continue;

      // Skip if already sent follow-up
      if (alreadySentUserIds.has(profile.id)) {
        console.log(`Skipping user ${profile.id}: already received advanced simulation follow-up`);
        continue;
      }

      // Skip if user submitted a lead
      if (profile.email && leadEmails.has(profile.email.toLowerCase())) {
        console.log(`Skipping user ${profile.id}: already submitted lead`);
        continue;
      }

      const firstName = profile.full_name?.split(" ")[0] || "Salut";
      const netWithSystem = Number(simulation.net_with_system) || 0;
      const diffVsClassic = Number(simulation.diff_vs_classic) || 0;
      const percentVsClassic = Number(simulation.percent_vs_classic) || 0;

      // Skip if results are not meaningful
      if (netWithSystem <= 0 || diffVsClassic <= 0) {
        console.log(`Skipping user ${profile.id}: simulation results not meaningful`);
        continue;
      }

      // Send push notification first (always try if user has subscription)
      const pushTitle = "📊 Simularea ta de acum o săptămână";
      const pushBody = `${firstName}, ai calculat +${percentVsClassic.toFixed(0)}% față de chiria clasică. Hai să discutăm!`;
      const pushUrl = "https://realtrustaparthotel.lovable.app/pentru-proprietari#calculator";
      
      const pushResult = await sendPushNotification(
        supabaseUrl,
        supabaseServiceKey,
        profile.id,
        pushTitle,
        pushBody,
        pushUrl
      );
      
      if (pushResult) {
        pushSent++;
      }

      // Send email if configured
      if (resend && profile.email) {
        try {
          const trackingPixelUrl = getTrackingPixelUrl(
            profile.id,
            "advanced_simulation_followup",
            supabaseUrl
          );

          const emailContent = getAdvancedSimulationFollowupEmail(
            firstName,
            simulation.scenario,
            netWithSystem,
            diffVsClassic,
            percentVsClassic,
            profile.id,
            supabaseUrl,
            trackingPixelUrl
          );

          const { error: emailError } = await resend.emails.send({
            from: "RealTrust <contact@realtrust.ro>",
            to: [profile.email],
            subject: emailContent.subject,
            html: emailContent.html,
          });

          if (emailError) {
            console.error(`Error sending email to ${profile.email}:`, emailError);
            errors.push(`${profile.email}: ${emailError.message}`);
            continue;
          }

          // Record the sent email
          const { error: recordError } = await supabase
            .from("simulation_followup_emails")
            .insert({
              user_id: profile.id,
              simulation_id: simulation.id,
              email_type: "advanced_simulation_followup",
            });

          if (recordError) {
            console.error("Error recording followup email:", recordError);
          }

          emailsSent++;
          console.log(`Advanced simulation follow-up email sent to ${profile.email}`);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`Failed to send email to ${profile.email}:`, err);
          errors.push(`${profile.email}: ${errorMessage}`);
        }
      } else if (!profile.email) {
        console.log(`Skipping email for user ${profile.id}: no email address`);
      }
    }

    console.log(`Advanced simulation follow-up job complete. Emails: ${emailsSent}, Push: ${pushSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        pushSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-advanced-simulation-followup:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
