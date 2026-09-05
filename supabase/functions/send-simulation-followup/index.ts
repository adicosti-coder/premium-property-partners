import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { signTrackingPayload } from "../_shared/trackingToken.ts";

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
  const sig = signTrackingPayload({ user_id: userId, email_type: emailType, link_type: linkType });
  trackingUrl.searchParams.set("sig", sig);
  return trackingUrl.toString();
}

// Generate tracking pixel URL for open tracking
function getTrackingPixelUrl(
  userId: string,
  emailType: string,
  followupEmailId: string | null,
  abAssignmentId: string | null,
  supabaseUrl: string
): string {
  const pixelUrl = new URL(`${supabaseUrl}/functions/v1/track-email-open`);
  pixelUrl.searchParams.set("user_id", userId);
  pixelUrl.searchParams.set("email_type", emailType);
  if (followupEmailId) {
    pixelUrl.searchParams.set("followup_id", followupEmailId);
  }
  if (abAssignmentId) {
    pixelUrl.searchParams.set("ab_id", abAssignmentId);
  }
  const sig = signTrackingPayload({ user_id: userId, email_type: emailType });
  pixelUrl.searchParams.set("sig", sig);
  return pixelUrl.toString();
}

// Email templates
function getFirstFollowupEmail(
  firstName: string, 
  monthlyIncome: number, 
  yearlyIncome: number,
  userId: string,
  supabaseUrl: string,
  customSubject?: string,
  trackingPixelUrl?: string
): { subject: string; html: string } {
  const whatsappUrl = getTrackedUrl(
    userId,
    "first_followup",
    "whatsapp_cta",
    "https://wa.me/40744566778?text=Salut!%20Am%20folosit%20calculatorul%20și%20vreau%20mai%20multe%20detalii%20despre%20colaborare.",
    supabaseUrl
  );
  const websiteUrl = getTrackedUrl(
    userId,
    "first_followup",
    "website_footer",
    "https://realtrustaparthotel.lovable.app",
    supabaseUrl
  );

  const subject = customSubject || `${firstName}, ai calculat un venit de ${monthlyIncome.toLocaleString('ro-RO')} €/lună – hai să-l facem realitate!`;
  const trackingPixel = trackingPixelUrl 
    ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
    : '';

  return {
    subject,
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
                <tr>
                  <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">RealTrust</h1>
                    <p style="color: #a0a0a0; margin: 10px 0 0; font-size: 14px;">Property Management</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">${firstName}, ești aproape de pasul următor!</h2>
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Am observat că ai folosit calculatorul nostru și ai descoperit un potențial venit impresionant:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 25px; text-align: center;">
                          <p style="color: #6c757d; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Venit lunar estimat</p>
                          <p style="color: #28a745; margin: 0; font-size: 36px; font-weight: 700;">${monthlyIncome.toLocaleString('ro-RO')} €</p>
                          <p style="color: #6c757d; margin: 15px 0 0; font-size: 14px;">≈ ${yearlyIncome.toLocaleString('ro-RO')} € / an</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                      Suntem aici să te ajutăm să transformi această estimare în venituri reale. Echipa noastră oferă:
                    </p>
                    <ul style="color: #4a4a4a; font-size: 15px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                      <li><strong>Analiză gratuită</strong> a proprietății tale</li>
                      <li><strong>Strategii personalizate</strong> de optimizare a veniturilor</li>
                      <li><strong>Management complet</strong> – de la listare la check-out</li>
                      <li><strong>Transparență totală</strong> – acces la dashboard-ul proprietarului</li>
                    </ul>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px;">
                          <a href="${whatsappUrl}" 
                             style="display: inline-block; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);">
                            💬 Scrie-ne pe WhatsApp
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                      Sau răspunde direct la acest email – suntem aici să te ajutăm.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                    <p style="color: #6c757d; font-size: 13px; margin: 0; text-align: center;">
                      RealTrust · Imo Business Centrum SRL<br>
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

function getSecondFollowupEmail(
  firstName: string, 
  monthlyIncome: number, 
  yearlyIncome: number,
  userId: string,
  supabaseUrl: string,
  customSubject?: string,
  trackingPixelUrl?: string
): { subject: string; html: string } {
  const bonusAmount = Math.round(monthlyIncome * 0.1); // 10% bonus for first month
  
  const whatsappOfferUrl = getTrackedUrl(
    userId,
    "second_followup",
    "whatsapp_offer_cta",
    `https://wa.me/40744566778?text=Salut!%20Vreau%20să%20beneficiez%20de%20oferta%20specială%20cu%20${bonusAmount}€%20bonus!`,
    supabaseUrl
  );
  const whatsappQuestionsUrl = getTrackedUrl(
    userId,
    "second_followup",
    "whatsapp_questions",
    "https://wa.me/40744566778?text=Salut!%20Am%20câteva%20întrebări%20despre%20serviciile%20voastre.",
    supabaseUrl
  );
  const websiteUrl = getTrackedUrl(
    userId,
    "second_followup",
    "website_footer",
    "https://realtrustaparthotel.lovable.app",
    supabaseUrl
  );

  const subject = customSubject || `🎁 ${firstName}, ofertă exclusivă: ${bonusAmount}€ bonus la prima lună!`;
  const trackingPixel = trackingPixelUrl 
    ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
    : '';
  
  return {
    subject,
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
                <!-- Header with special offer banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 15px; text-align: center;">
                    <p style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
                      ⏰ OFERTĂ LIMITATĂ – VALABILĂ 7 ZILE
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">RealTrust</h1>
                    <p style="color: #a0a0a0; margin: 10px 0 0; font-size: 14px;">Property Management</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">${firstName}, ai o ofertă specială!</h2>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Știm că decizia de a încredința proprietatea ta cuiva necesită timp și încredere. De aceea, venim cu o ofertă exclusivă pentru tine:
                    </p>
                    
                    <!-- Special Offer Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-radius: 12px; margin: 25px 0; border: 2px dashed #ff6b35;">
                      <tr>
                        <td style="padding: 30px; text-align: center;">
                          <p style="color: #e65100; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">🎁 BONUS EXCLUSIV</p>
                          <p style="color: #e65100; margin: 0; font-size: 42px; font-weight: 800;">${bonusAmount}€</p>
                          <p style="color: #ff6b35; margin: 10px 0 0; font-size: 16px; font-weight: 500;">Credit pentru prima lună de management</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Income Reminder -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 12px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="color: #2e7d32; margin: 0 0 5px; font-size: 13px;">Venitul tău potențial:</p>
                          <p style="color: #1b5e20; margin: 0; font-size: 28px; font-weight: 700;">${monthlyIncome.toLocaleString('ro-RO')} €/lună</p>
                          <p style="color: #388e3c; margin: 5px 0 0; font-size: 14px;">≈ ${yearlyIncome.toLocaleString('ro-RO')} €/an</p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 15px;">
                      <strong>Ce primești dacă semnezi în următoarele 7 zile:</strong>
                    </p>
                    
                    <ul style="color: #4a4a4a; font-size: 15px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                      <li>✅ <strong>${bonusAmount}€ credit</strong> aplicat pe prima factură</li>
                      <li>✅ <strong>Ședință foto profesională GRATUITĂ</strong> (valoare 150€)</li>
                      <li>✅ <strong>Listare prioritară</strong> pe toate platformele</li>
                      <li>✅ <strong>Primul oaspete garantat</strong> în primele 30 zile</li>
                    </ul>
                    
                    <!-- Urgency Timer -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fce4ec; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="color: #c2185b; margin: 0; font-size: 14px;">
                            ⏳ Oferta expiră în <strong>7 zile</strong> – nu rata această oportunitate!
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Buttons -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 10px 0;">
                          <a href="${whatsappOfferUrl}" 
                             style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 8px; font-size: 17px; font-weight: 700; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);">
                            🎁 Vreau oferta specială!
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 15px 0 0;">
                          <a href="${whatsappQuestionsUrl}" 
                             style="display: inline-block; background: transparent; color: #1a1a2e; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 14px; border: 2px solid #1a1a2e;">
                            Am întrebări
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6c757d; font-size: 13px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                      Sau răspunde direct la acest email – suntem aici să te ajutăm.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                    <p style="color: #6c757d; font-size: 13px; margin: 0; text-align: center;">
                      RealTrust · Imo Business Centrum SRL<br>
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email send");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get active A/B tests
    const { data: abTests } = await supabase
      .from("email_ab_tests")
      .select("*")
      .eq("is_active", true);

    const abTestMap = new Map<string, { id: string; variant_a_subject: string; variant_b_subject: string }>();
    for (const test of abTests || []) {
      abTestMap.set(test.email_type, {
        id: test.id,
        variant_a_subject: test.variant_a_subject,
        variant_b_subject: test.variant_b_subject,
      });
    }

    // Get all simulations
    const { data: usersWithSimulations, error: simError } = await supabase
      .from("user_simulations")
      .select(`id, user_id, city, rooms, monthly_income, realtrurst_income, realtrust_yearly, created_at`)
      .order("created_at", { ascending: false });

    if (simError) {
      console.error("Error fetching simulations:", simError);
      throw simError;
    }

    if (!usersWithSimulations || usersWithSimulations.length === 0) {
      console.log("No simulations found");
      return new Response(
        JSON.stringify({ success: true, message: "No simulations to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group simulations by user
    const userSimulationsMap = new Map<string, typeof usersWithSimulations>();
    for (const sim of usersWithSimulations) {
      if (!userSimulationsMap.has(sim.user_id)) {
        userSimulationsMap.set(sim.user_id, []);
      }
      userSimulationsMap.get(sim.user_id)!.push(sim);
    }

    const userIds = Array.from(userSimulationsMap.keys());

    // Get profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profileError) throw profileError;

    // Get leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("whatsapp_number, email, name");

    if (leadsError) throw leadsError;

    // Get ALL sent follow-up emails (to determine which type to send)
    const { data: allSentEmails, error: sentError } = await supabase
      .from("simulation_followup_emails")
      .select("user_id, email_type, sent_at")
      .in("user_id", userIds);

    if (sentError) throw sentError;

    // Create maps for sent emails
    const userEmailHistory = new Map<string, { first?: Date; second?: Date }>();
    for (const email of allSentEmails || []) {
      if (!userEmailHistory.has(email.user_id)) {
        userEmailHistory.set(email.user_id, {});
      }
      const history = userEmailHistory.get(email.user_id)!;
      if (email.email_type === "first_followup") {
        history.first = new Date(email.sent_at);
      } else if (email.email_type === "second_followup") {
        history.second = new Date(email.sent_at);
      }
    }

    const leadEmails = new Set(leads?.map(l => l.email?.toLowerCase()).filter(Boolean) || []);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let firstEmailsSent = 0;
    let secondEmailsSent = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      if (!profile.email) {
        console.log(`Skipping user ${profile.id}: no email`);
        continue;
      }

      // Skip if user has already submitted a lead
      if (leadEmails.has(profile.email.toLowerCase())) {
        console.log(`Skipping user ${profile.id}: already submitted lead`);
        continue;
      }

      const userSims = userSimulationsMap.get(profile.id);
      if (!userSims || userSims.length === 0) continue;

      const latestSim = userSims[0];
      const simDate = new Date(latestSim.created_at);
      const history = userEmailHistory.get(profile.id) || {};

      const firstName = profile.full_name?.split(" ")[0] || "Salut";
      const monthlyIncome = latestSim.realtrurst_income || latestSim.monthly_income;
      const yearlyIncome = latestSim.realtrust_yearly || monthlyIncome * 12;

      let emailType: string | null = null;

      // Determine which email to send
      if (!history.first) {
        // Never received first email - check if simulation is old enough (24h)
        if (simDate <= oneDayAgo) {
          emailType = "first_followup";
        }
      } else if (!history.second) {
        // Received first email, check if eligible for second (14 days after first)
        if (history.first <= fourteenDaysAgo) {
          // Also ensure we haven't sent any email in the last 7 days
          if (history.first <= sevenDaysAgo) {
            emailType = "second_followup";
          }
        }
      } else {
        // Already received both emails
        console.log(`Skipping user ${profile.id}: already received both follow-ups`);
        continue;
      }

      if (!emailType) {
        console.log(`Skipping user ${profile.id}: not eligible for any email yet`);
        continue;
      }

      try {
        // Handle A/B testing for subject line
        let customSubject: string | undefined;
        let abAssignmentId: string | null = null;
        let variant: string | null = null;

        const abTest = abTestMap.get(emailType);
        if (abTest) {
          // Randomly assign variant (50/50 split)
          variant = Math.random() < 0.5 ? "A" : "B";
          customSubject = variant === "A" ? abTest.variant_a_subject : abTest.variant_b_subject;
          
          // Replace placeholders in subject
          customSubject = customSubject
            .replace("{firstName}", firstName)
            .replace("{monthlyIncome}", monthlyIncome.toLocaleString('ro-RO'))
            .replace("{yearlyIncome}", yearlyIncome.toLocaleString('ro-RO'))
            .replace("{bonusAmount}", Math.round(monthlyIncome * 0.1).toString());

          console.log(`A/B Test: User ${profile.id} assigned to variant ${variant} for ${emailType}`);
        }

        // Create followup email record first to get ID for tracking
        const { data: followupRecord, error: recordError } = await supabase
          .from("simulation_followup_emails")
          .insert({
            user_id: profile.id,
            simulation_id: latestSim.id || null,
            email_type: emailType,
          })
          .select("id")
          .single();

        if (recordError) {
          console.error("Error creating followup record:", recordError);
          continue;
        }

        // Create A/B assignment if applicable
        if (abTest && variant && customSubject) {
          const { data: abAssignment, error: abError } = await supabase
            .from("email_ab_assignments")
            .insert({
              user_id: profile.id,
              test_id: abTest.id,
              variant: variant,
              subject_used: customSubject,
            })
            .select("id")
            .single();

          if (!abError && abAssignment) {
            abAssignmentId = abAssignment.id;
          }
        }

        // Generate tracking pixel URL
        const trackingPixelUrl = getTrackingPixelUrl(
          profile.id,
          emailType,
          followupRecord?.id || null,
          abAssignmentId,
          supabaseUrl
        );

        // Get email content
        const emailContent = emailType === "first_followup"
          ? getFirstFollowupEmail(firstName, monthlyIncome, yearlyIncome, profile.id, supabaseUrl, customSubject, trackingPixelUrl)
          : getSecondFollowupEmail(firstName, monthlyIncome, yearlyIncome, profile.id, supabaseUrl, customSubject, trackingPixelUrl);

        const { error: emailError } = await resend.emails.send({
          from: "RealTrust <info@notify.realtrust.ro>",
          to: [profile.email],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errors.push(`${profile.email}: ${emailError.message}`);
          // Delete the followup record if email failed
          await supabase.from("simulation_followup_emails").delete().eq("id", followupRecord.id);
          continue;
        }

        if (emailType === "first_followup") {
          firstEmailsSent++;
          console.log(`First follow-up email sent to ${profile.email} (A/B: ${variant || 'N/A'})`);
        } else {
          secondEmailsSent++;
          console.log(`Second follow-up email (special offer) sent to ${profile.email} (A/B: ${variant || 'N/A'})`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Failed to send email to ${profile.email}:`, err);
        errors.push(`${profile.email}: ${errorMessage}`);
      }
    }

    console.log(`Follow-up job complete. First emails: ${firstEmailsSent}, Second emails: ${secondEmailsSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        firstEmailsSent,
        secondEmailsSent,
        totalSent: firstEmailsSent + secondEmailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-simulation-followup:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
