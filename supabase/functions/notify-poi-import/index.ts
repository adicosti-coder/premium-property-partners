import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  resend: Resend,
  email: string,
  importerName: string,
  importedCount: number,
  shareCode: string
): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'RealTrust <notifications@realtrust.ro>',
      to: [email],
      subject: '🎉 Cineva a importat locațiile tale!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Vești bune!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
            <p style="font-size: 18px; margin-bottom: 20px;">
              <strong>${importerName}</strong> a importat <strong>${importedCount}</strong> locații din lista ta de favorite partajate!
            </p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                📍 Locațiile tale continuă să ajute alți călători să descopere cele mai bune locuri din Timișoara.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://realtrustaparthotel.lovable.app/pentru-oaspeti#ghid-local" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Vezi statisticile tale
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
              Acest email a fost trimis de RealTrust ApArt Hotel.<br>
              <a href="https://realtrustaparthotel.lovable.app" style="color: #667eea;">realtrustaparthotel.lovable.app</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    console.log(`Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { shareCode, importerName, importedCount, importerId } = await req.json();

    if (!shareCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: shareCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing import notification for share code: ${shareCode}`);

    // Get the shared link to find the original sharer
    const { data: sharedLink, error: linkError } = await supabase
      .from('shared_poi_links')
      .select('id, user_id, import_count, name')
      .eq('share_code', shareCode)
      .single();

    if (linkError || !sharedLink) {
      console.error('Error fetching shared link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Shared link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update import count
    const { error: updateError } = await supabase
      .from('shared_poi_links')
      .update({ 
        import_count: (sharedLink.import_count || 0) + 1,
        last_imported_at: new Date().toISOString()
      })
      .eq('share_code', shareCode);

    if (updateError) {
      console.error('Error updating import count:', updateError);
    }

    // Log import event for trends tracking (including importer user_id if authenticated)
    const importEventData: { shared_link_id: string; imported_count: number; imported_by?: string } = {
      shared_link_id: sharedLink.id,
      imported_count: importedCount || 1,
    };
    
    // Add importer user_id if provided (authenticated user)
    if (importerId) {
      importEventData.imported_by = importerId;
      console.log(`Import by authenticated user: ${importerId}`);
    } else {
      console.log('Import by anonymous user');
    }

    const { error: eventError } = await supabase
      .from('poi_import_events')
      .insert(importEventData);

    if (eventError) {
      console.error('Error logging import event:', eventError);
    }

    // Get the sharer's email from auth.users
    let sharerEmail: string | null = null;
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(sharedLink.user_id);
    
    if (!userError && userData?.user?.email) {
      sharerEmail = userData.user.email;
      console.log(`Found sharer email: ${sharerEmail}`);
    } else {
      console.log('Could not find sharer email:', userError);
    }

    // Get push subscription for the original sharer
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', sharedLink.user_id);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
    }

    // Prepare notification content
    const name = importerName || 'Cineva';
    const count = importedCount || 1;
    
    let pushSentCount = 0;
    let emailSent = false;
    const failedEndpoints: string[] = [];

    // Send push notifications
    if (subscriptions && subscriptions.length > 0) {
      const payload: PushPayload = {
        title: '🎉 Locațiile tale au fost importate!',
        body: `${name} a importat ${count} locații din lista ta de favorite`,
        url: '/#ghid-local',
        tag: `poi-import-${shareCode}`,
      };

      for (const subscription of subscriptions) {
        const success = await sendPushNotification(
          subscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        
        if (success) {
          pushSentCount++;
        } else {
          failedEndpoints.push(subscription.endpoint);
        }
      }

      // Clean up failed subscriptions
      if (failedEndpoints.length > 0) {
        console.log(`Removing ${failedEndpoints.length} failed subscriptions`);
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', failedEndpoints);
      }
    } else {
      console.log('No push subscriptions found for user');
    }

    // Check if user has email notifications enabled before sending
    if (resend && sharerEmail) {
      // Check user's notification preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', sharedLink.user_id)
        .single();
      
      const emailNotificationsEnabled = profile?.notifications_enabled ?? true; // Default to true if not set
      
      if (emailNotificationsEnabled) {
        emailSent = await sendEmailNotification(
          resend,
          sharerEmail,
          name,
          count,
          shareCode
        );
      } else {
        console.log('Email notifications disabled by user');
      }
    } else {
      console.log('Email notification skipped: no Resend API key or no sharer email');
    }

    console.log(`Notifications sent - Push: ${pushSentCount}, Email: ${emailSent}`);

    return new Response(
      JSON.stringify({ 
        message: 'Import notifications sent',
        pushSent: pushSentCount,
        pushFailed: failedEndpoints.length,
        emailSent,
        importCount: (sharedLink.import_count || 0) + 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notify-poi-import function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});