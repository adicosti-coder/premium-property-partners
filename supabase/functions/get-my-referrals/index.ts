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

    // SECURITY: Query by user_id first (always safe - comes from verified JWT)
    const selectFields = "id, owner_name, property_location, property_type, status, created_at, contacted_at, meeting_date, contract_signed_at, reward_granted_at, reward_check_in, reward_check_out";
    
    // Query 1: Get referrals by authenticated user_id (safe - UUID from JWT)
    const { data: byUserId, error: error1 } = await supabase
      .from("referrals")
      .select(selectFields)
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error1) {
      console.error("get-my-referrals query error (by user_id):", error1);
      return new Response(JSON.stringify({ error: "Failed to load referrals" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Query 2: Get referrals by email (safe - using .eq() with parameterized value)
    // Only query if email exists and is valid
    let byEmail: typeof byUserId = [];
    if (email && email.includes("@")) {
      const { data: emailData, error: error2 } = await supabase
        .from("referrals")
        .select(selectFields)
        .eq("referrer_email", email)
        .order("created_at", { ascending: false });

      if (error2) {
        console.error("get-my-referrals query error (by email):", error2);
        // Continue with user_id results only - don't fail entirely
      } else {
        byEmail = emailData ?? [];
      }
    }

    // Merge and deduplicate results by id
    const allReferrals = [...(byUserId ?? []), ...byEmail];
    const uniqueReferrals = Array.from(
      new Map(allReferrals.map(r => [r.id, r])).values()
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ referrals: uniqueReferrals }), {
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
