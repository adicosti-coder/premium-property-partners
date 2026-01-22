import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const emailType = url.searchParams.get("email_type");
    const followupEmailId = url.searchParams.get("followup_id");
    const abAssignmentId = url.searchParams.get("ab_id");

    console.log("Tracking email open:", { userId, emailType, followupEmailId, abAssignmentId });

    if (!userId || !emailType) {
      console.error("Missing required parameters");
      // Still return the pixel to not break email rendering
      return new Response(TRACKING_PIXEL, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...corsHeaders,
        },
      });
    }

    // Create Supabase client with service role for inserting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user agent and IP
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    // Check for duplicate opens (within 1 minute to avoid counting re-renders)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: existingOpen } = await supabase
      .from("email_open_tracking")
      .select("id")
      .eq("user_id", userId)
      .eq("email_type", emailType)
      .gte("opened_at", oneMinuteAgo)
      .limit(1);

    if (existingOpen && existingOpen.length > 0) {
      console.log("Duplicate open detected, skipping insert");
    } else {
      // Insert open tracking record
      const insertData: Record<string, unknown> = {
        user_id: userId,
        email_type: emailType,
        user_agent: userAgent,
        ip_address: ipAddress,
      };

      if (followupEmailId) {
        insertData.followup_email_id = followupEmailId;
      }
      if (abAssignmentId) {
        insertData.ab_assignment_id = abAssignmentId;
      }

      const { error: insertError } = await supabase
        .from("email_open_tracking")
        .insert(insertData);

      if (insertError) {
        console.error("Error inserting open tracking:", insertError);
      } else {
        console.log("Open tracking recorded successfully");
      }
    }

    // Always return the tracking pixel
    return new Response(TRACKING_PIXEL, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in track-email-open:", error);
    // Still return pixel on error
    return new Response(TRACKING_PIXEL, {
      headers: {
        "Content-Type": "image/gif",
        ...corsHeaders,
      },
    });
  }
});
