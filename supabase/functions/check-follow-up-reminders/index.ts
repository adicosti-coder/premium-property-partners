import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  id: string;
  name: string;
  whatsapp_number: string;
  email: string | null;
  property_type: string;
  follow_up_date: string;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const webPush = await import("https://esm.sh/web-push@3.6.7");
    
    webPush.setVapidDetails(
      'mailto:contact@realtrust.ro',
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webPush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

async function sendEmailNotification(
  resend: InstanceType<typeof Resend>,
  leads: Lead[],
  isDigest: boolean = true
): Promise<boolean> {
  try {
    const overdueLeads = leads.filter(lead => {
      const followUpDate = new Date(lead.follow_up_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return followUpDate < today;
    });

    const todayLeads = leads.filter(lead => {
      const followUpDate = new Date(lead.follow_up_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return followUpDate >= today && followUpDate < tomorrow;
    });

    const formatLeadRow = (lead: Lead, isOverdue: boolean) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; ${isOverdue ? 'color: #dc2626;' : ''}">${lead.name}</td>
        <td style="padding: 12px;">${lead.whatsapp_number}</td>
        <td style="padding: 12px;">${lead.email || 'N/A'}</td>
        <td style="padding: 12px;">${lead.property_type}</td>
        <td style="padding: 12px; ${isOverdue ? 'color: #dc2626; font-weight: 600;' : ''}">${new Date(lead.follow_up_date).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' })}</td>
      </tr>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0D3B2F 0%, #1a5a47 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
          .content { background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; }
          .section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
          .overdue { color: #dc2626; }
          .today { color: #059669; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .badge-overdue { background: #fee2e2; color: #dc2626; }
          .badge-today { background: #d1fae5; color: #059669; }
          .cta { display: inline-block; background: #0D3B2F; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📅 Rezumat Follow-up Lead-uri</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="content">
            ${overdueLeads.length > 0 ? `
              <div class="section">
                <div class="section-title overdue">
                  ⚠️ Lead-uri întârziate 
                  <span class="badge badge-overdue">${overdueLeads.length}</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Nume</th>
                      <th>Telefon</th>
                      <th>Email</th>
                      <th>Tip</th>
                      <th>Data Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${overdueLeads.map(lead => formatLeadRow(lead, true)).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${todayLeads.length > 0 ? `
              <div class="section">
                <div class="section-title today">
                  📞 Follow-up programate pentru astăzi
                  <span class="badge badge-today">${todayLeads.length}</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Nume</th>
                      <th>Telefon</th>
                      <th>Email</th>
                      <th>Tip</th>
                      <th>Ora</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${todayLeads.map(lead => formatLeadRow(lead, false)).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div style="text-align: center;">
              <a href="https://realtrust.ro/admin?tab=leads" class="cta">
                Deschide panoul Admin →
              </a>
            </div>
          </div>

          <div class="footer">
            <p>Acest email a fost trimis automat de sistemul RealTrust.</p>
            <p>© ${new Date().getFullYear()} RealTrust - Property Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "RealTrust <onboarding@resend.dev>",
      to: ["contact@realtrust.ro"],
      subject: `📅 Follow-up: ${overdueLeads.length > 0 ? `${overdueLeads.length} întârziate, ` : ''}${todayLeads.length} pentru astăzi`,
      html: emailHtml,
    });

    console.log("Follow-up email sent successfully:", emailResponse);
    return true;
  } catch (error) {
    console.error("Error sending follow-up email:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for due follow-up reminders...');

    // Get current date at start of day
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // Find leads with follow_up_date that is today or past due
    const { data: dueLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, whatsapp_number, email, property_type, follow_up_date')
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', todayEnd)
      .order('follow_up_date', { ascending: true });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log(`Found ${dueLeads?.length || 0} leads with due follow-ups`);

    if (!dueLeads || dueLeads.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No due follow-ups', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notificationsSent = 0;
    let emailSent = false;

    // Get all admin users for push notifications
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
    }

    const adminUserIds = adminRoles?.map(r => r.user_id) || [];
    console.log(`Found ${adminUserIds.length} admin users`);

    // Get push subscriptions for admins
    let subscriptions: PushSubscription[] = [];
    if (adminUserIds.length > 0 && vapidPublicKey && vapidPrivateKey) {
      const { data: subs, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', adminUserIds);

      if (!subsError && subs) {
        subscriptions = subs;
        console.log(`Found ${subscriptions.length} admin push subscriptions`);
      }
    }

    // Send email digest notification if Resend is configured
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      emailSent = await sendEmailNotification(resend, dueLeads);
      if (emailSent) {
        notificationsSent++;
        console.log('Follow-up digest email sent successfully');
      }
    }

    // Process each due lead for Slack and Push notifications
    for (const lead of dueLeads) {
      const followUpDate = new Date(lead.follow_up_date);
      const isOverdue = followUpDate < new Date(todayStart);
      
      const notificationTitle = isOverdue 
        ? `⚠️ Follow-up întârziat: ${lead.name}`
        : `📅 Follow-up astăzi: ${lead.name}`;
      
      const notificationBody = `Lead: ${lead.name} | Tel: ${lead.whatsapp_number} | Tip: ${lead.property_type}`;

      // Send Slack notification if webhook is configured
      if (slackWebhookUrl) {
        try {
          const slackMessage = {
            text: notificationTitle,
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: notificationTitle,
                  emoji: true
                }
              },
              {
                type: "section",
                fields: [
                  {
                    type: "mrkdwn",
                    text: `*Nume:*\n${lead.name}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Telefon:*\n${lead.whatsapp_number}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Tip proprietate:*\n${lead.property_type}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Email:*\n${lead.email || 'N/A'}`
                  }
                ]
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `📅 Data follow-up: ${followUpDate.toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' })}`
                  }
                ]
              }
            ]
          };

          await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackMessage),
          });

          console.log(`Slack notification sent for lead: ${lead.name}`);
          notificationsSent++;
        } catch (slackError) {
          console.error('Error sending Slack notification:', slackError);
        }
      }

      // Send push notifications to all admin subscribers
      if (subscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
        const pushPayload: PushPayload = {
          title: notificationTitle,
          body: notificationBody,
          url: '/admin?tab=leads',
          tag: `follow-up-${lead.id}`,
        };

        for (const subscription of subscriptions) {
          const success = await sendPushNotification(
            subscription,
            pushPayload,
            vapidPublicKey,
            vapidPrivateKey
          );
          
          if (success) {
            notificationsSent++;
          }
        }
      }
    }

    console.log(`Processed ${dueLeads.length} leads, sent ${notificationsSent} notifications, email sent: ${emailSent}`);

    return new Response(
      JSON.stringify({ 
        message: 'Follow-up check complete',
        leadsProcessed: dueLeads.length,
        notificationsSent,
        emailSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-follow-up-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});