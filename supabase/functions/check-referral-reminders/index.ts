import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingReferral {
  id: string;
  referrer_name: string;
  referrer_email: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  property_location: string | null;
  property_type: string | null;
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

    console.log("Checking for pending referrals older than 48 hours...");

    // Calculate 48 hours ago
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Get pending referrals older than 48 hours
    const { data: pendingReferrals, error: referralsError } = await supabase
      .from("referrals")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", fortyEightHoursAgo.toISOString())
      .order("created_at", { ascending: true });

    if (referralsError) {
      console.error("Error fetching pending referrals:", referralsError);
      throw referralsError;
    }

    if (!pendingReferrals || pendingReferrals.length === 0) {
      console.log("No pending referrals older than 48 hours found.");
      return new Response(
        JSON.stringify({ message: "No pending referrals to remind about", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingReferrals.length} pending referrals older than 48 hours`);

    // Get admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
      throw adminError;
    }

    const adminUserIds = adminRoles?.map((r) => r.user_id) || [];
    console.log(`Found ${adminUserIds.length} admin users`);

    // Get admin emails from profiles
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
    }

    // Create in-app notifications for each admin
    const notifications = adminUserIds.map((adminId) => ({
      user_id: adminId,
      title: `⏰ ${pendingReferrals.length} recomandări în așteptare`,
      message: `Ai ${pendingReferrals.length} recomandări care așteaptă de mai mult de 48 de ore. Te rugăm să le procesezi cât mai curând.`,
      type: "warning",
      action_url: "/admin",
      action_label: "Vezi Recomandări",
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("user_notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating notifications:", notifError);
      } else {
        console.log(`Created ${notifications.length} in-app notifications`);
      }
    }

    // Send email to admins if Resend is configured
    if (resendApiKey && adminProfiles && adminProfiles.length > 0) {
      const adminEmails = adminProfiles
        .filter((p) => p.email)
        .map((p) => p.email);

      if (adminEmails.length > 0) {
        // Build referral list HTML
        const referralListHtml = (pendingReferrals as PendingReferral[])
          .map((ref) => {
            const hoursAgo = Math.round(
              (Date.now() - new Date(ref.created_at).getTime()) / (1000 * 60 * 60)
            );
            return `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; font-weight: 500;">${ref.owner_name}</td>
                <td style="padding: 12px;">${ref.owner_phone}</td>
                <td style="padding: 12px;">${ref.property_location || "-"}</td>
                <td style="padding: 12px;">${ref.referrer_name}</td>
                <td style="padding: 12px; color: #dc2626; font-weight: 500;">${hoursAgo}h</td>
              </tr>
            `;
          })
          .join("");

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
            <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ Recomandări în Așteptare</h1>
                <p style="color: #a0aec0; margin-top: 8px;">RealTrust Admin Alert</p>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <p style="margin: 0; color: #92400e; font-weight: 500;">
                    ⚠️ Ai <strong>${pendingReferrals.length}</strong> recomandări care așteaptă de mai mult de 48 de ore!
                  </p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Proprietar</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Telefon</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Locație</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Recomandat de</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Timp</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${referralListHtml}
                  </tbody>
                </table>

                <div style="text-align: center;">
                  <a href="https://realtrustaparthotel.lovable.app/admin" 
                     style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Procesează Recomandările
                  </a>
                </div>

                <p style="margin-top: 24px; color: #6b7280; font-size: 14px; text-align: center;">
                  Acest email a fost trimis automat de sistemul RealTrust.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "RealTrust <noreply@realtrust.ro>",
              to: adminEmails,
              subject: `⏰ ${pendingReferrals.length} recomandări în așteptare de 48+ ore`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            console.log(`Email sent successfully to ${adminEmails.length} admins`);
          } else {
            const errorText = await emailResponse.text();
            console.error("Error sending email:", errorText);
          }
        } catch (emailError) {
          console.error("Exception sending email:", emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Referral reminders processed",
        pendingCount: pendingReferrals.length,
        notifiedAdmins: adminUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-referral-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
