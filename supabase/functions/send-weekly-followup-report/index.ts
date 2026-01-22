import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyStats {
  totalEmailsSent: number;
  firstFollowups: number;
  secondFollowups: number;
  usersReached: number;
  conversions: number;
  conversionRate: number;
  totalClicks: number;
  uniqueClickers: number;
  clickRate: number;
  openRate: number;
  weekOverWeekChange: number;
}

function generateEmailHtml(stats: WeeklyStats, weekStart: string, weekEnd: string): string {
  const isPositiveTrend = stats.weekOverWeekChange >= 0;
  const trendColor = isPositiveTrend ? "#22c55e" : "#ef4444";
  const trendArrow = isPositiveTrend ? "↑" : "↓";

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raport Săptămânal Follow-up</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                📊 Raport Săptămânal Follow-up
              </h1>
              <p style="margin: 8px 0 0; color: #a5b4fc; font-size: 14px;">
                ${weekStart} - ${weekEnd}
              </p>
            </td>
          </tr>
          
          <!-- Conversion Rate Highlight -->
          <tr>
            <td style="padding: 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                Rată de Conversie
              </p>
              <p style="margin: 0; color: #1f2937; font-size: 48px; font-weight: 700;">
                ${stats.conversionRate}%
              </p>
              <p style="margin: 8px 0 0; color: ${trendColor}; font-size: 16px; font-weight: 500;">
                ${trendArrow} ${Math.abs(stats.weekOverWeekChange)}% față de săptămâna trecută
              </p>
            </td>
          </tr>
          
          <!-- Stats Grid -->
          <tr>
            <td style="padding: 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px; text-align: center; width: 50%; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Email-uri Trimise</p>
                    <p style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">${stats.totalEmailsSent}</p>
                    <p style="margin: 4px 0 0; color: #9ca3af; font-size: 11px;">
                      ${stats.firstFollowups} primare • ${stats.secondFollowups} ofertă
                    </p>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 50%; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Utilizatori Contactați</p>
                    <p style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">${stats.usersReached}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; text-align: center; width: 50%; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Conversii în Lead</p>
                    <p style="margin: 0; color: #22c55e; font-size: 28px; font-weight: 600;">${stats.conversions}</p>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 50%; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Rată Deschidere</p>
                    <p style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">${stats.openRate}%</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; text-align: center; width: 50%; border-right: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Click-uri Totale</p>
                    <p style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">${stats.totalClicks}</p>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 50%;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Rată Click</p>
                    <p style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 600;">${stats.clickRate}%</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <a href="https://realtrustaparthotel.lovable.app/admin" 
                 style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 14px;">
                Vezi Dashboard Complet →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Acest raport este generat automat de sistemul RealTrust.
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} RealTrust ApartHotel
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
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
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if weekly reports are enabled and get recipients
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("weekly_report_enabled, weekly_report_recipients")
      .eq("id", "default")
      .single();

    if (settingsError) {
      console.log("No settings found, using defaults");
    }

    const reportEnabled = settings?.weekly_report_enabled ?? true;
    const recipients: string[] = settings?.weekly_report_recipients ?? ["contact@realtrust.ro"];

    if (!reportEnabled) {
      console.log("Weekly reports are disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Weekly reports disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipients || recipients.length === 0) {
      console.log("No recipients configured");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending weekly report to ${recipients.length} recipients: ${recipients.join(", ")}`);

    // Calculate date range (last 7 days)
    const now = new Date();
    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const formatDisplayDate = (d: Date) => d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

    console.log(`Generating weekly report: ${formatDate(weekStart)} to ${formatDate(weekEnd)}`);

    // Fetch all required data
    const [emailsRes, leadsRes, profilesRes, clicksRes, opensRes] = await Promise.all([
      supabase.from("simulation_followup_emails").select("*"),
      supabase.from("leads").select("id, email, created_at"),
      supabase.from("profiles").select("id, email"),
      supabase.from("email_click_tracking").select("*"),
      supabase.from("email_open_tracking").select("*"),
    ]);

    const allEmails = emailsRes.data || [];
    const allLeads = leadsRes.data || [];
    const profiles = profilesRes.data || [];
    const allClicks = clicksRes.data || [];
    const allOpens = opensRes.data || [];

    // Filter for this week
    const thisWeekEmails = allEmails.filter(e => {
      const sentAt = new Date(e.sent_at);
      return sentAt >= weekStart && sentAt <= weekEnd;
    });

    const thisWeekClicks = allClicks.filter(c => {
      const clickedAt = new Date(c.clicked_at);
      return clickedAt >= weekStart && clickedAt <= weekEnd;
    });

    const thisWeekOpens = allOpens.filter(o => {
      const openedAt = new Date(o.opened_at);
      return openedAt >= weekStart && openedAt <= weekEnd;
    });

    // Previous week for comparison
    const prevWeekEmails = allEmails.filter(e => {
      const sentAt = new Date(e.sent_at);
      return sentAt >= previousWeekStart && sentAt < weekStart;
    });

    // Calculate stats
    const usersWithEmails = new Set(allEmails.map(e => e.user_id));
    const userEmailMap = new Map<string, string>();
    profiles.forEach(p => {
      if (p.email) userEmailMap.set(p.id, p.email.toLowerCase());
    });

    const emailedUserEmails = new Set(
      profiles
        .filter(p => usersWithEmails.has(p.id) && p.email)
        .map(p => p.email!.toLowerCase())
    );

    const leadsFromFollowups = allLeads.filter(l =>
      l.email && emailedUserEmails.has(l.email.toLowerCase())
    );

    // This week stats
    const totalEmailsSent = thisWeekEmails.length;
    const firstFollowups = thisWeekEmails.filter(e => e.email_type === "first_followup").length;
    const secondFollowups = thisWeekEmails.filter(e => e.email_type === "second_followup").length;
    const usersReached = new Set(thisWeekEmails.map(e => e.user_id)).size;

    // Conversions from this week's emails (leads created this week from emailed users)
    const thisWeekLeads = allLeads.filter(l => {
      const createdAt = new Date(l.created_at);
      return createdAt >= weekStart && createdAt <= weekEnd;
    });
    const conversions = thisWeekLeads.filter(l =>
      l.email && emailedUserEmails.has(l.email.toLowerCase())
    ).length;

    // Overall conversion rate
    const conversionRate = usersWithEmails.size > 0
      ? Math.round((leadsFromFollowups.length / usersWithEmails.size) * 100)
      : 0;

    // Click stats
    const totalClicks = thisWeekClicks.length;
    const uniqueClickers = new Set(thisWeekClicks.map(c => c.user_id)).size;
    const clickRate = usersReached > 0 ? Math.round((uniqueClickers / usersReached) * 100) : 0;

    // Open stats
    const uniqueOpens = new Set(thisWeekOpens.map(o => o.user_id)).size;
    const openRate = usersReached > 0 ? Math.round((uniqueOpens / usersReached) * 100) : 0;

    // Week over week change
    const prevWeekUsers = new Set(prevWeekEmails.map(e => e.user_id)).size;
    const prevWeekConversions = prevWeekEmails.length > 0 
      ? Math.round((leadsFromFollowups.length / Math.max(prevWeekUsers, 1)) * 100)
      : 0;
    const weekOverWeekChange = conversionRate - prevWeekConversions;

    const stats: WeeklyStats = {
      totalEmailsSent,
      firstFollowups,
      secondFollowups,
      usersReached,
      conversions,
      conversionRate,
      totalClicks,
      uniqueClickers,
      clickRate,
      openRate,
      weekOverWeekChange,
    };

    console.log("Weekly stats:", stats);

    // Generate email HTML
    const emailHtml = generateEmailHtml(
      stats,
      formatDisplayDate(weekStart),
      formatDisplayDate(weekEnd)
    );

    // Send email to admin using fetch to Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RealTrust Reports <onboarding@resend.dev>",
        to: recipients,
        subject: `📊 Raport Săptămânal Follow-up: ${stats.conversionRate}% conversie (${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)})`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(`Resend error: ${JSON.stringify(emailData)}`);
    }

    console.log("Email sent successfully to:", recipients);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        emailId: emailData.id,
        recipients,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-weekly-followup-report:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
