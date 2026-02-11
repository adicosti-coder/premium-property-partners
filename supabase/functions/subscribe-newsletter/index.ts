import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, securityHeaders } from "../_shared/securityHeaders.ts";
import { applyRateLimit } from "../_shared/rateLimiter.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // Rate limit: 5 requests per minute per IP
  const rateLimited = applyRateLimit(req, cors, { maxRequests: 5, windowMs: 60000 });
  if (rateLimited) return rateLimited;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, captchaToken, captchaType, formType } = await req.json();

    // Validate email
    if (!email || typeof email !== "string" || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify CAPTCHA server-side if provided
    if (captchaToken) {
      let captchaValid = false;

      if (captchaType === "hcaptcha") {
        const secret = Deno.env.get("HCAPTCHA_SECRET_KEY");
        if (secret) {
          const verifyRes = await fetch("https://api.hcaptcha.com/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `response=${encodeURIComponent(captchaToken)}&secret=${encodeURIComponent(secret)}`,
          });
          const result = await verifyRes.json();
          captchaValid = result.success === true;
        }
      } else {
        // Turnstile (default)
        const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
        if (secret) {
          const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `response=${encodeURIComponent(captchaToken)}&secret=${encodeURIComponent(secret)}`,
          });
          const result = await verifyRes.json();
          captchaValid = result.success === true;
        }
      }

      if (!captchaValid) {
        return new Response(JSON.stringify({ error: "CAPTCHA verification failed" }), {
          status: 403,
          headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          status: 200,
          headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    // Log captcha if formType provided
    if (formType && captchaToken) {
      try {
        await supabase.from("captcha_logs").insert({
          form_type: formType,
          success: true,
        });
      } catch {
        // Non-critical, ignore
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});
