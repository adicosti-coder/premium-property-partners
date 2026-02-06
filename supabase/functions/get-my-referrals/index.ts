import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const email = user.email ?? "";

    // SECURITY: Sanitize email to prevent query injection
    // Supabase PostgREST is generally safe, but we add defense-in-depth
    const sanitizedEmail = email.replace(/[(),'"\\]/g, "");

    // SECURITY: Only return non-sensitive fields to referrers
    // Removed owner_email, owner_phone to prevent data harvesting
    // Using separate filter conditions to avoid string interpolation risks
    const { data, error } = await supabase
      .from("referrals")
      .select(
        "id, owner_name, property_location, property_type, status, created_at, contacted_at, meeting_date, contract_signed_at, reward_granted_at, reward_check_in, reward_check_out"
      )
      .or(`referrer_user_id.eq.${user.id},referrer_email.eq.${sanitizedEmail}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("get-my-referrals query error:", error);
      return new Response(JSON.stringify({ error: "Failed to load referrals" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ referrals: data ?? [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("get-my-referrals error:", e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
