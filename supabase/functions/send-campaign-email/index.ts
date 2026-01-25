import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  campaignId: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const wrapContentInTemplate = (content: string, subject: string, campaignId: string, recipientEmail: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?campaign_id=${campaignId}&email=${encodeURIComponent(recipientEmail)}`;
  const unsubscribeUrl = `https://realtrustaparthotel.lovable.app/setari?unsubscribe=true`;
  
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
      <h1 style="color: #d4af37; margin: 0; font-size: 24px; font-weight: 700;">
        RealTrust & ApArt Hotel
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 25px; text-align: center;">
      <p style="color: #64748b; margin: 0 0 15px 0; font-size: 14px;">
        Cu drag, Echipa RealTrust
      </p>
      
      <div style="margin: 15px 0;">
        <a href="https://wa.me/40723154520" style="color: #d4af37; text-decoration: none; margin: 0 10px; font-size: 13px;">
          WhatsApp
        </a>
        <span style="color: #cbd5e1;">|</span>
        <a href="https://realtrustaparthotel.lovable.app" style="color: #d4af37; text-decoration: none; margin: 0 10px; font-size: 13px;">
          Website
        </a>
      </div>

      <p style="color: #94a3b8; margin: 15px 0 0 0; font-size: 11px;">
        <a href="${unsubscribeUrl}" style="color: #94a3b8;">Dezabonare</a> · 
        Imo Business Centrum SRL · Timișoara, România
      </p>
    </div>
  </div>
  
  <!-- Tracking Pixel -->
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { campaignId }: CampaignRequest = await req.json();

    if (!campaignId) {
      throw new Error("Campaign ID is required");
    }

    console.log(`Starting campaign: ${campaignId}`);

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error(`Campaign cannot be sent. Current status: ${campaign.status}`);
    }

    // Update campaign status to 'sending'
    await supabase
      .from("email_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Get recipients based on filter
    const recipientFilter = campaign.recipient_filter || {};
    let query = supabase.from("newsletter_subscribers").select("email").eq("is_active", true);

    // Apply any filters (for future segmentation)
    if (recipientFilter.subscribedAfter) {
      query = query.gte("created_at", recipientFilter.subscribedAfter);
    }

    const { data: subscribers, error: subscribersError } = await query;

    if (subscribersError) {
      throw new Error("Failed to fetch subscribers");
    }

    // Also get registered users with email preferences
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("email, id")
      .eq("notifications_enabled", true)
      .not("email", "is", null);

    // Combine and deduplicate recipients
    const allEmails = new Set<string>();
    const recipientMap = new Map<string, string | null>(); // email -> user_id

    subscribers?.forEach((s) => {
      if (s.email) {
        allEmails.add(s.email);
        recipientMap.set(s.email, null);
      }
    });

    users?.forEach((u) => {
      if (u.email) {
        allEmails.add(u.email);
        recipientMap.set(u.email, u.id);
      }
    });

    const recipients = Array.from(allEmails);
    const totalRecipients = recipients.length;

    console.log(`Sending to ${totalRecipients} recipients`);

    // Update total recipients count
    await supabase
      .from("email_campaigns")
      .update({ total_recipients: totalRecipients })
      .eq("id", campaignId);

    let sentCount = 0;
    const batchSize = 10; // Send in batches to avoid rate limits

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (email) => {
          try {
            const htmlContent = wrapContentInTemplate(
              campaign.content,
              campaign.subject,
              campaignId,
              email
            );

            await resend.emails.send({
              from: "RealTrust <noreply@realtrustaparthotel.lovable.app>",
              to: [email],
              subject: campaign.subject,
              html: htmlContent,
            });

            // Record the send
            await supabase.from("email_campaign_sends").insert({
              campaign_id: campaignId,
              recipient_email: email,
              recipient_user_id: recipientMap.get(email) || null,
              status: "sent",
            });

            sentCount++;
          } catch (sendError) {
            console.error(`Failed to send to ${email}:`, sendError);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update campaign as sent
    await supabase
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
      })
      .eq("id", campaignId);

    console.log(`Campaign ${campaignId} completed. Sent: ${sentCount}/${totalRecipients}`);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        totalRecipients,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-campaign-email function:", error);

    // If there's a campaign ID, mark it as failed
    if (req.body) {
      try {
        const body = await req.clone().json();
        if (body.campaignId) {
          await supabase
            .from("email_campaigns")
            .update({ status: "draft" })
            .eq("id", body.campaignId);
        }
      } catch (e) {
        // Ignore
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
