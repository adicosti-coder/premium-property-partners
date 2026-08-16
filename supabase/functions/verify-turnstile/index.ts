import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  token: string;
  formType?: string;
}

/**
 * Anonimizează IP-ul pentru audit GDPR:
 * - IPv4: ultimul octet devine 0 (ex. 86.120.44.17 -> 86.120.44.0)
 * - IPv6: păstrăm doar primele 3 grupuri (ex. 2a02:2f0e:... -> 2a02:2f0e:abcd::)
 */
const anonymizeIp = (ip: string): string => {
  if (!ip || ip === "unknown") return "unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean).slice(0, 3);
    return parts.length ? `${parts.join(":")}::` : "unknown";
  }
  const octets = ip.split(".");
  if (octets.length === 4) return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
  return "unknown";
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rawIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const ipAddress = anonymizeIp(rawIp);
  const userAgent = req.headers.get("user-agent") || "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const log = async (entry: Record<string, unknown>) => {
    try {
      await supabase.from("captcha_logs").insert(entry);
    } catch (e) {
      console.warn("captcha log failed:", (e as Error).message);
    }
  };

  // Rate limiting: max 3 verificări / minut / IP (protejează endpointul de formular).
  const limited = applyRateLimit(req, corsHeaders, { maxRequests: 3, windowMs: 60_000 });
  if (limited) {
    await log({
      form_type: "rate_limited",
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_codes: ["rate-limited"],
    });
    return limited;
  }

  try {
    const { token, formType = "unknown" }: VerifyRequest = await req.json();

    if (!token || typeof token !== "string") {
      await log({
        form_type: formType,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_codes: ["missing-input-response"],
      });

      return new Response(
        JSON.stringify({ success: false, error: "No captcha token provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");

    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY not configured");
      await log({
        form_type: formType,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_codes: ["missing-secret-key"],
      });
      // Fail-closed: fără secret nu putem valida → respingem.
      return new Response(
        JSON.stringify({ success: false, error: "Captcha verification unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: rawIp }),
    });

    const result = await verifyResponse.json();

    await log({
      form_type: formType,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: result.success === true,
      error_codes: result["error-codes"] || null,
      hostname: result.hostname || null,
    });

    if (result.success) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Captcha verification failed",
        codes: result["error-codes"],
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in verify-turnstile:", errorMessage);

    await log({
      form_type: "error",
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_codes: [errorMessage],
    });

    // Fail-closed: orice eroare neașteptată respinge cererea.
    return new Response(
      JSON.stringify({ success: false, error: "Captcha verification failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
