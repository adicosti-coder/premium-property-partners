import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimulationUser {
  user_id: string;
  email: string;
  full_name: string | null;
  simulation_type: 'basic' | 'advanced';
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date 3 days ago (start and end of that day)
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const startOfDay = new Date(threeDaysAgo);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysAgo);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Checking simulations from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Get basic simulations from 3 days ago
    const { data: basicSimulations, error: basicError } = await supabase
      .from("user_simulations")
      .select("user_id, created_at")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (basicError) {
      console.error("Error fetching basic simulations:", basicError);
    }

    // Get advanced simulations from 3 days ago
    const { data: advancedSimulations, error: advancedError } = await supabase
      .from("advanced_simulations")
      .select("user_id, created_at")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (advancedError) {
      console.error("Error fetching advanced simulations:", advancedError);
    }

    // Combine and deduplicate user IDs
    const userSimulations: SimulationUser[] = [];
    const seenUsers = new Set<string>();

    for (const sim of basicSimulations || []) {
      if (!seenUsers.has(sim.user_id)) {
        seenUsers.add(sim.user_id);
        userSimulations.push({
          user_id: sim.user_id,
          email: '',
          full_name: null,
          simulation_type: 'basic',
          created_at: sim.created_at
        });
      }
    }

    for (const sim of advancedSimulations || []) {
      if (!seenUsers.has(sim.user_id)) {
        seenUsers.add(sim.user_id);
        userSimulations.push({
          user_id: sim.user_id,
          email: '',
          full_name: null,
          simulation_type: 'advanced',
          created_at: sim.created_at
        });
      }
    }

    console.log(`Found ${userSimulations.length} users with simulations from 3 days ago`);

    if (userSimulations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No simulations from 3 days ago", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profiles
    const userIds = userSimulations.map(u => u.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Map profiles to simulations
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    for (const sim of userSimulations) {
      const profile = profileMap.get(sim.user_id);
      if (profile) {
        sim.email = profile.email || '';
        sim.full_name = profile.full_name;
      }
    }

    // Filter out users who already submitted a lead (check by email)
    const emails = userSimulations.filter(u => u.email).map(u => u.email);
    const { data: existingLeads, error: leadsError } = await supabase
      .from("leads")
      .select("email")
      .in("email", emails);

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
    }

    const leadEmails = new Set(existingLeads?.map(l => l.email) || []);
    const usersWithoutLeads = userSimulations.filter(u => u.email && !leadEmails.has(u.email));

    console.log(`${usersWithoutLeads.length} users haven't submitted a lead yet`);

    // Check which users already received this reminder (using simulation_followup_emails with email_type = '3day_reminder')
    const { data: existingReminders, error: remindersError } = await supabase
      .from("simulation_followup_emails")
      .select("user_id")
      .in("user_id", usersWithoutLeads.map(u => u.user_id))
      .eq("email_type", "3day_reminder");

    if (remindersError) {
      console.error("Error fetching existing reminders:", remindersError);
    }

    const remindedUsers = new Set(existingReminders?.map(r => r.user_id) || []);
    const usersToNotify = usersWithoutLeads.filter(u => !remindedUsers.has(u.user_id));

    console.log(`${usersToNotify.length} users will receive the 3-day reminder`);

    let emailsSent = 0;
    let notificationsSent = 0;

    for (const user of usersToNotify) {
      const firstName = user.full_name?.split(' ')[0] || 'Proprietar';

      // Create in-app notification
      const { error: notifError } = await supabase
        .from("user_notifications")
        .insert({
          user_id: user.user_id,
          title: "Ești la un pas de a-ți maximiza veniturile! 🚀",
          message: `Ai salvat o simulare acum 3 zile. Vrei să discutăm despre cum putem transforma aceste cifre în realitate? Echipa noastră este gata să te ajute.`,
          type: "action",
          action_url: "/pentru-proprietari",
          action_label: "Contactează-ne"
        });

      if (notifError) {
        console.error(`Error creating notification for ${user.user_id}:`, notifError);
      } else {
        notificationsSent++;
      }

      // Send email if Resend is configured
      if (resendApiKey && user.email) {
        const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?user_id=${user.user_id}&email_type=3day_reminder`;
        const ctaUrl = `${supabaseUrl}/functions/v1/track-email-click?user_id=${user.user_id}&email_type=3day_reminder&link_type=cta&redirect=https://realtrustaparthotel.lovable.app/pentru-proprietari`;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #d4a853; margin: 0; font-size: 28px;">RealTrust</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 14px;">Administrare Profesională de Proprietăți</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1e3a5f; margin-top: 0;">Salut ${firstName}! 👋</h2>
              
              <p>Am observat că ai salvat o simulare de venit acum 3 zile, dar nu ai făcut următorul pas.</p>
              
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #d4a853;">
                <p style="margin: 0; font-weight: 600; color: #92400e;">💡 Știai că?</p>
                <p style="margin: 10px 0 0 0; color: #78350f;">Proprietarii care colaborează cu noi câștigă în medie cu <strong>40% mai mult</strong> decât prin închiriere tradițională.</p>
              </div>
              
              <p>Hai să discutăm despre cum putem transforma simularea ta în profit real:</p>
              
              <ul style="color: #475569;">
                <li>✅ Analiză gratuită a proprietății tale</li>
                <li>✅ Estimare personalizată de venit</li>
                <li>✅ Fără obligații sau costuri ascunse</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4a853 0%, #c49b4a 100%); color: #1e3a5f; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(212, 168, 83, 0.4);">
                  Vreau să discut cu un expert →
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">Sau ne poți contacta direct pe WhatsApp: <a href="https://wa.me/40733407507" style="color: #d4a853;">+40 733 407 507</a></p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
              <p>RealTrust Aparthotel | Brașov, România</p>
              <p>Acest email a fost trimis pentru că ai folosit calculatorul nostru de venit.</p>
            </div>
            
            <img src="${trackingPixelUrl}" width="1" height="1" style="display: none;" alt="" />
          </body>
          </html>
        `;

        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "RealTrust <noreply@realtrust.ro>",
              to: [user.email],
              subject: `${firstName}, ai uitat de simularea ta? 🏠`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            emailsSent++;
            console.log(`Email sent to ${user.email}`);
          } else {
            const errorText = await emailResponse.text();
            console.error(`Email failed for ${user.email}:`, errorText);
          }
        } catch (emailError) {
          console.error(`Email error for ${user.email}:`, emailError);
        }
      }

      // Record that we sent this reminder
      await supabase
        .from("simulation_followup_emails")
        .insert({
          user_id: user.user_id,
          email_type: "3day_reminder",
          sent_at: new Date().toISOString()
        });
    }

    console.log(`Completed: ${emailsSent} emails sent, ${notificationsSent} notifications created`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        notificationsSent,
        totalProcessed: usersToNotify.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-simulation-reminder:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
