import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    // Process each due lead
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
                    text: `📅 Data follow-up: ${followUpDate.toLocaleDateString('ro-RO')}`
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

      // Send email notification if Resend is configured
      if (resendApiKey) {
        try {
          // Get admin emails (you might want to store these somewhere)
          // For now, we'll skip email as we need recipient addresses
          console.log('Email notification would be sent here if configured');
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }
    }

    console.log(`Processed ${dueLeads.length} leads, sent ${notificationsSent} notifications`);

    return new Response(
      JSON.stringify({ 
        message: 'Follow-up check complete',
        leadsProcessed: dueLeads.length,
        notificationsSent
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