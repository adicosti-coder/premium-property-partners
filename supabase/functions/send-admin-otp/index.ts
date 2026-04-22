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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Not admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous codes
    await supabaseAdmin
      .from("admin_otp_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    // Store code
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("admin_otp_codes")
      .insert({ user_id: user.id, code, expires_at: expiresAt })
      .select("id")
      .single();

    if (insertErr) {
      console.error("OTP insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to store code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Resend directly (bypass Lovable Emails queue while DNS is still verifying)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #8B6914; font-family: Georgia, serif; margin: 0;">RealTrust</h1>
        </div>
        <h2 style="color: #1a1f36; font-size: 20px; margin: 0 0 16px;">Cod verificare Admin</h2>
        <p style="color: #55575d; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Folosește codul de mai jos pentru a accesa panoul de administrare. Codul expiră în 10 minute.
        </p>
        <div style="background: #f5efe4; border: 2px solid #8B6914; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #8B6914; font-family: monospace;">${code}</div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin: 24px 0 0;">
          Dacă nu ai cerut acest cod, ignoră acest email.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Use Resend's universal sandbox sender — works without domain verification.
        // Once realtrust.ro is verified in Resend, switch back to "noreply@realtrust.ro".
        from: "RealTrust Admin <onboarding@resend.dev>",
        to: [user.email],
        reply_to: "info@realtrust.ro",
        subject: `Cod admin RealTrust: ${code}`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, email: user.email?.replace(/(.{2}).*(@.*)/, "$1***$2") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OTP send error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
