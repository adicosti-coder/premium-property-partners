import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimulationUser {
  user_id: string;
  email: string;
  full_name: string | null;
  simulation_count: number;
  latest_simulation: {
    city: string;
    rooms: string;
    monthly_income: number;
    realtrust_income: number;
    created_at: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Get users with simulations who haven't submitted a lead
    // and haven't received a follow-up email in the last 7 days
    const { data: usersWithSimulations, error: simError } = await supabase
      .from("user_simulations")
      .select(`
        id,
        user_id,
        city,
        rooms,
        monthly_income,
        realtrurst_income,
        realtrust_yearly,
        created_at
      `)
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

    // Get profiles for these users
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    // Get leads to check which users have already submitted
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("whatsapp_number, email, name");

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      throw leadsError;
    }

    // Get already sent follow-up emails (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: sentEmails, error: sentError } = await supabase
      .from("simulation_followup_emails")
      .select("user_id, email_type, sent_at")
      .gte("sent_at", sevenDaysAgo.toISOString());

    if (sentError) {
      console.error("Error fetching sent emails:", sentError);
      throw sentError;
    }

    const sentEmailUserIds = new Set(sentEmails?.map(e => e.user_id) || []);
    const leadEmails = new Set(leads?.map(l => l.email?.toLowerCase()).filter(Boolean) || []);

    let emailsSent = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      // Skip if no email
      if (!profile.email) {
        console.log(`Skipping user ${profile.id}: no email`);
        continue;
      }

      // Skip if already sent email recently
      if (sentEmailUserIds.has(profile.id)) {
        console.log(`Skipping user ${profile.id}: already sent email recently`);
        continue;
      }

      // Skip if user has already submitted a lead
      if (leadEmails.has(profile.email.toLowerCase())) {
        console.log(`Skipping user ${profile.id}: already submitted lead`);
        continue;
      }

      const userSims = userSimulationsMap.get(profile.id);
      if (!userSims || userSims.length === 0) continue;

      // Get the latest simulation for this user
      const latestSim = userSims[0];
      
      // Check if simulation is at least 24 hours old (don't spam immediately)
      const simDate = new Date(latestSim.created_at);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      if (simDate > oneDayAgo) {
        console.log(`Skipping user ${profile.id}: simulation too recent`);
        continue;
      }

      const firstName = profile.full_name?.split(" ")[0] || "Salut";
      const monthlyIncome = latestSim.realtrurst_income || latestSim.monthly_income;
      const yearlyIncome = latestSim.realtrust_yearly || monthlyIncome * 12;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "RealTrust <contact@realtrust.ro>",
          to: [profile.email],
          subject: `${firstName}, ai calculat un venit de ${monthlyIncome.toLocaleString('ro-RO')} €/lună – hai să-l facem realitate!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
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
                          <h2 style="color: #1a1a2e; margin: 0 0 20px; font-size: 24px;">${firstName}, ești aproape de pasul următor!</h2>
                          
                          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                            Am observat că ai folosit calculatorul nostru și ai descoperit un potențial venit impresionant:
                          </p>
                          
                          <!-- Stats Box -->
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
                          
                          <!-- CTA Button -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 10px 0 30px;">
                                <a href="https://wa.me/40744566778?text=Salut!%20Am%20folosit%20calculatorul%20și%20vreau%20mai%20multe%20detalii%20despre%20colaborare." 
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
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                          <p style="color: #6c757d; font-size: 13px; margin: 0; text-align: center;">
                            RealTrust Property Management<br>
                            Timișoara, România<br>
                            <a href="https://realtrustaparthotel.lovable.app" style="color: #1a1a2e; text-decoration: none;">realtrust.ro</a>
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
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errors.push(`${profile.email}: ${emailError.message}`);
          continue;
        }

        // Record that we sent this email
        const { error: recordError } = await supabase
          .from("simulation_followup_emails")
          .insert({
            user_id: profile.id,
            simulation_id: latestSim.id || null,
            email_type: "first_followup",
          });

        if (recordError) {
          console.error("Error recording sent email:", recordError);
        }

        emailsSent++;
        console.log(`Follow-up email sent to ${profile.email}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Failed to send email to ${profile.email}:`, err);
        errors.push(`${profile.email}: ${errorMessage}`);
      }
    }

    console.log(`Follow-up job complete. Emails sent: ${emailsSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
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
