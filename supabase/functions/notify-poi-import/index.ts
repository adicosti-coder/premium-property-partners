import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      .select('id, user_id, import_count')
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

    // Get push subscription for the original sharer
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', sharedLink.user_id);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      throw subscriptionsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found', sent: 0, importCount: sharedLink.import_count + 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification
    const name = importerName || 'Cineva';
    const count = importedCount || 'câteva';
    
    const payload: PushPayload = {
      title: '🎉 Locațiile tale au fost importate!',
      body: `${name} a importat ${count} locații din lista ta de favorite`,
      url: '/#ghid-local',
      tag: `poi-import-${shareCode}`,
    };

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of subscriptions) {
      const success = await sendPushNotification(
        subscription,
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      
      if (success) {
        sentCount++;
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

    console.log(`Successfully sent ${sentCount} notifications for import`);

    return new Response(
      JSON.stringify({ 
        message: 'Import notification sent',
        sent: sentCount,
        failed: failedEndpoints.length,
        importCount: sharedLink.import_count + 1
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
