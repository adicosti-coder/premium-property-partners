import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token using the admin client (service role) — avoids intermittent
    // "invalid claim: missing sub" errors seen when the anon client re-validates
    // right after a token refresh race.
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("verify-admin-otp: getUser failed", userError?.message, "token length:", token.length);
      return new Response(JSON.stringify({ error: "Invalid user", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("admin_otp_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP as used
    await supabaseAdmin
      .from("admin_otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Persist MFA verification server-side (source of truth for AdminMFAGuard).
    // 4 hours matches SESSION_DURATION_MS on the client.
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    // Delete any existing row first, then insert. Avoids upsert/onConflict edge cases
    // where the row silently fails to materialize (previously left mfa_sessions empty
    // and the client re-check via has_valid_admin_mfa returned false → "cod invalid").
    const { error: delError } = await supabaseAdmin
      .from("admin_mfa_sessions")
      .delete()
      .eq("user_id", user.id);
    if (delError) {
      console.error("MFA delete failed:", delError);
    }

    const { data: mfaRow, error: mfaError } = await supabaseAdmin
      .from("admin_mfa_sessions")
      .insert({
        user_id: user.id,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt,
        user_agent: req.headers.get("user-agent"),
      })
      .select()
      .single();
    if (mfaError || !mfaRow) {
      console.error("Failed to persist admin MFA session:", mfaError);
      return new Response(
        JSON.stringify({ error: "MFA session error", details: mfaError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log("MFA session persisted for user", user.id, "expires", expiresAt);

    return new Response(JSON.stringify({ valid: true, expires_at: expiresAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OTP verify error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
