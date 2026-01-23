import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    // Dynamic import for web-push
    const webPushModule = await import("https://esm.sh/web-push@3.6.7");
    const webpush = webPushModule.default || webPushModule;
    
    webpush.setVapidDetails(
      "mailto:admin@realtrust.ro",
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

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
    
    console.log(`Push notification sent to user ${subscription.user_id}`);
    return true;
  } catch (error) {
    console.error(`Failed to send push to ${subscription.user_id}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get spam alert settings
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("spam_alert_enabled, spam_rate_threshold, last_spam_alert_at")
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if alerts are enabled
    if (!settings?.spam_alert_enabled) {
      console.log("Spam alerts are disabled");
      return new Response(
        JSON.stringify({ status: "disabled", message: "Spam alerts are disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const threshold = settings.spam_rate_threshold || 20;
    const lastAlertAt = settings.last_spam_alert_at;

    // Check cooldown (24 hours)
    if (lastAlertAt) {
      const lastAlert = new Date(lastAlertAt);
      const now = new Date();
      const hoursSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastAlert < 24) {
        console.log(`Cooldown active. Last alert was ${hoursSinceLastAlert.toFixed(1)} hours ago`);
        return new Response(
          JSON.stringify({ 
            status: "cooldown", 
            message: `Alert cooldown active. Next alert possible in ${(24 - hoursSinceLastAlert).toFixed(1)} hours` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate spam rate from last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: captchaLogs, error: logsError } = await supabase
      .from("captcha_logs")
      .select("success")
      .gte("created_at", yesterday.toISOString());

    if (logsError) {
      console.error("Error fetching captcha logs:", logsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch captcha logs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!captchaLogs || captchaLogs.length < 5) {
      console.log(`Insufficient data: only ${captchaLogs?.length || 0} attempts in last 24h`);
      return new Response(
        JSON.stringify({ 
          status: "insufficient_data", 
          message: `Only ${captchaLogs?.length || 0} captcha attempts in last 24 hours, need at least 5` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAttempts = captchaLogs.length;
    const failedAttempts = captchaLogs.filter(log => !log.success).length;
    const spamRate = (failedAttempts / totalAttempts) * 100;

    console.log(`Spam rate: ${spamRate.toFixed(1)}% (${failedAttempts}/${totalAttempts}), threshold: ${threshold}%`);

    // Check if spam rate exceeds threshold
    if (spamRate < threshold) {
      return new Response(
        JSON.stringify({ 
          status: "ok", 
          spam_rate: spamRate.toFixed(1),
          threshold: threshold,
          message: "Spam rate is within acceptable limits" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Spam rate exceeded - send alerts to admins
    console.log(`⚠️ SPAM ALERT: Rate ${spamRate.toFixed(1)}% exceeds threshold ${threshold}%`);

    // Get admin user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch admin users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserIds = adminRoles?.map(r => r.user_id) || [];
    console.log(`Found ${adminUserIds.length} admin users`);

    if (adminUserIds.length === 0) {
      return new Response(
        JSON.stringify({ status: "no_admins", message: "No admin users found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for admins
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", adminUserIds);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
    }

    const pushPayload: PushPayload = {
      title: "⚠️ Alertă Spam Detectată!",
      body: `Rata de spam a ajuns la ${spamRate.toFixed(1)}% (${failedAttempts}/${totalAttempts} încercări eșuate în ultimele 24h). Verifică log-urile captcha.`,
      url: "/admin?tab=dashboard",
      tag: "spam-alert",
    };

    let pushSuccessCount = 0;
    const failedEndpoints: string[] = [];

    // Send push notifications
    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const success = await sendPushNotification(
          sub as PushSubscription,
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (success) {
          pushSuccessCount++;
        } else {
          failedEndpoints.push(sub.endpoint);
        }
      }

      // Clean up failed endpoints
      if (failedEndpoints.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("endpoint", failedEndpoints);
        console.log(`Cleaned up ${failedEndpoints.length} failed push endpoints`);
      }
    }

    // Create in-app notifications for admins
    const notifications = adminUserIds.map(userId => ({
      user_id: userId,
      title: "⚠️ Alertă Spam Detectată!",
      message: `Rata de spam a ajuns la ${spamRate.toFixed(1)}% (${failedAttempts}/${totalAttempts} încercări eșuate în ultimele 24h). Verifică log-urile captcha pentru detalii.`,
      type: "warning",
      action_url: "/admin",
      action_label: "Vezi Dashboard",
    }));

    const { error: notifError } = await supabase
      .from("user_notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    } else {
      console.log(`Created ${notifications.length} in-app notifications`);
    }

    // Update last alert timestamp
    const { error: updateError } = await supabase
      .from("site_settings")
      .update({ last_spam_alert_at: new Date().toISOString() })
      .not("id", "is", null);

    if (updateError) {
      console.error("Error updating last_spam_alert_at:", updateError);
    }

    return new Response(
      JSON.stringify({
        status: "alert_sent",
        spam_rate: spamRate.toFixed(1),
        threshold: threshold,
        total_attempts: totalAttempts,
        failed_attempts: failedAttempts,
        push_notifications_sent: pushSuccessCount,
        in_app_notifications_created: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-spam-rate-alert:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
