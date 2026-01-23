import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  token: string;
  formType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("hCaptcha verification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client info for logging
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                    req.headers.get("x-real-ip") || 
                    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Initialize Supabase client for logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { token, formType = "unknown" }: VerifyRequest = await req.json();

    if (!token) {
      console.log("No token provided - potential spam attempt");
      
      // Log failed attempt (no token)
      await supabase.from("captcha_logs").insert({
        form_type: formType,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        error_codes: ["missing-input-response"],
      });

      return new Response(
        JSON.stringify({ success: false, error: "No captcha token provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const secretKey = Deno.env.get("HCAPTCHA_SECRET_KEY");
    
    if (!secretKey) {
      console.error("HCAPTCHA_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify with hCaptcha API
    const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const result = await verifyResponse.json();
    console.log("hCaptcha verification result:", JSON.stringify(result));

    // Log the verification attempt
    const logEntry = {
      form_type: formType,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: result.success,
      error_codes: result["error-codes"] || null,
      score: result.score || null,
      hostname: result.hostname || null,
    };
    
    const { error: logError } = await supabase.from("captcha_logs").insert(logEntry);
    if (logError) {
      console.error("Failed to log captcha verification:", logError);
    } else {
      console.log("Captcha verification logged:", logEntry);
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      console.log("hCaptcha verification failed - spam blocked:", result["error-codes"]);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Captcha verification failed",
          codes: result["error-codes"]
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in verify-hcaptcha:", error);
    
    // Log error
    await supabase.from("captcha_logs").insert({
      form_type: "error",
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_codes: [error.message],
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
