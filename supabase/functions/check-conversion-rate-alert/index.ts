import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get site settings for threshold
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("conversion_rate_threshold, conversion_alert_enabled, last_conversion_alert_at")
      .eq("id", "default")
      .single();

    if (settingsError) {
      console.log("No settings found, using defaults");
    }

    const threshold = settings?.conversion_rate_threshold ?? 10;
    const alertEnabled = settings?.conversion_alert_enabled ?? true;
    const lastAlertAt = settings?.last_conversion_alert_at ? new Date(settings.last_conversion_alert_at) : null;

    if (!alertEnabled) {
      console.log("Conversion rate alerts are disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Alerts disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Don't send more than one alert per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (lastAlertAt && lastAlertAt > oneDayAgo) {
      console.log("Alert already sent in the last 24 hours");
      return new Response(
        JSON.stringify({ success: true, message: "Alert cooldown active" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate current conversion rate
    const { data: followupEmails, error: emailsError } = await supabase
      .from("simulation_followup_emails")
      .select("user_id");

    if (emailsError) throw emailsError;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email");

    if (profilesError) throw profilesError;

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("email");

    if (leadsError) throw leadsError;

    // Calculate conversion rate
    const usersWithEmails = new Set(followupEmails?.map(e => e.user_id) || []);
    const emailedUserEmails = new Set(
      (profiles || [])
        .filter(p => usersWithEmails.has(p.id) && p.email)
        .map(p => p.email!.toLowerCase())
    );
    
    const leadsFromFollowups = (leads || []).filter(l => 
      l.email && emailedUserEmails.has(l.email.toLowerCase())
    );
    
    const conversionRate = usersWithEmails.size > 0 
      ? Math.round((leadsFromFollowups.length / usersWithEmails.size) * 100)
      : 0;

    console.log(`Current conversion rate: ${conversionRate}%, threshold: ${threshold}%`);

    // Only need at least 5 users contacted to have meaningful data
    if (usersWithEmails.size < 5) {
      console.log("Not enough data to calculate meaningful conversion rate");
      return new Response(
        JSON.stringify({ success: true, message: "Insufficient data", conversionRate, usersContacted: usersWithEmails.size }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if conversion rate is below threshold
    if (conversionRate >= threshold) {
      console.log("Conversion rate is above threshold, no alert needed");
      return new Response(
        JSON.stringify({ success: true, message: "Rate above threshold", conversionRate, threshold }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`⚠️ Conversion rate ${conversionRate}% is below threshold ${threshold}%! Sending alerts...`);

    // Get admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) throw adminError;

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Get push subscriptions for admins
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", adminUserIds);

    if (subsError) throw subsError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No admin push subscriptions found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin subscriptions", conversionRate, threshold }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notifications
    const payload: PushPayload = {
      title: "⚠️ Alertă Rată Conversie",
      body: `Rata de conversie follow-up a scăzut la ${conversionRate}% (prag: ${threshold}%). Verifică dashboard-ul!`,
      url: "/admin",
      tag: "conversion-rate-alert",
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
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    // Update last alert timestamp
    await supabase
      .from("site_settings")
      .upsert({
        id: "default",
        last_conversion_alert_at: new Date().toISOString(),
      }, { onConflict: "id" });

    console.log(`Sent ${sentCount} alert notifications to admins`);

    return new Response(
      JSON.stringify({
        success: true,
        alertSent: true,
        conversionRate,
        threshold,
        notificationsSent: sentCount,
        failed: failedEndpoints.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in check-conversion-rate-alert:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
