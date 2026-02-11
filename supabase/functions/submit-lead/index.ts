import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";

function validateString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizePhone(value: unknown): string {
  if (typeof value !== "string") return "pending";
  const cleaned = value.replace(/[^\d+\s()-]/g, "").trim().slice(0, 30);
  return cleaned.length >= 4 ? cleaned : "pending";
}

function isValidUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return true; // optional field
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const VALID_PROPERTY_TYPES = [
  "apartament", "casa", "studio", "penthouse", "vila",
  "cerere_rapida", "Apartament",
];

const VALID_SOURCES = [
  "calculator", "quick_form", "lead_capture_form",
  "rental-calculator", "advanced-rental-calculator",
];

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();

    // --- Validate required fields ---
    const name = validateString(body.name, 200);
    if (!name || name.length < 1) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whatsappNumber = sanitizePhone(body.whatsapp_number);

    const propertyType = validateString(body.property_type, 50);
    if (!propertyType) {
      return new Response(JSON.stringify({ error: "Invalid property type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate property area (integer, 0-10000)
    let propertyArea = 0;
    if (body.property_area !== undefined && body.property_area !== null) {
      propertyArea = parseInt(String(body.property_area), 10);
      if (isNaN(propertyArea) || propertyArea < 0 || propertyArea > 10000) {
        propertyArea = 0;
      }
    }

    // --- Optional fields with validation ---
    const source = VALID_SOURCES.includes(body.source) ? body.source : "calculator";

    let calculatedNetProfit = 0;
    if (typeof body.calculated_net_profit === "number" && isFinite(body.calculated_net_profit)) {
      calculatedNetProfit = Math.round(body.calculated_net_profit);
    }

    let calculatedYearlyProfit = 0;
    if (typeof body.calculated_yearly_profit === "number" && isFinite(body.calculated_yearly_profit)) {
      calculatedYearlyProfit = Math.round(body.calculated_yearly_profit);
    }

    // Sanitize simulation_data — accept object only, limit size
    let simulationData = null;
    if (body.simulation_data && typeof body.simulation_data === "object") {
      const serialized = JSON.stringify(body.simulation_data);
      if (serialized.length <= 10000) {
        simulationData = body.simulation_data;
      }
    }

    // Validate listing URL in simulation_data
    if (simulationData?.listingUrl && !isValidUrl(simulationData.listingUrl)) {
      delete simulationData.listingUrl;
    }

    const email = body.email ? validateString(body.email, 255) : null;
    const message = body.message ? validateString(body.message, 2000) : null;

    // --- Turnstile CAPTCHA verification (if token provided) ---
    if (body.captcha_token) {
      const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
      if (turnstileSecret) {
        const formData = new FormData();
        formData.append("secret", turnstileSecret);
        formData.append("response", body.captcha_token);

        const captchaResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          body: formData,
        });
        const captchaResult = await captchaResp.json();

        if (!captchaResult.success) {
          return new Response(JSON.stringify({ error: "CAPTCHA verification failed" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // --- Insert lead with service role (bypasses RLS) ---
    const { error } = await supabase.from("leads").insert({
      name,
      whatsapp_number: whatsappNumber,
      property_area: propertyArea,
      property_type: propertyType,
      calculated_net_profit: calculatedNetProfit,
      calculated_yearly_profit: calculatedYearlyProfit,
      source,
      simulation_data: simulationData,
      email,
      message,
    });

    if (error) {
      console.error("Error inserting lead:", error);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Send notification (best-effort, don't block response) ---
    if (body.send_notification !== false) {
      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name,
            whatsappNumber: whatsappNumber,
            propertyArea,
            propertyType,
            listingUrl: simulationData?.listingUrl || undefined,
            calculatedNetProfit,
            calculatedYearlyProfit,
            simulationData,
            source,
          },
        });
      } catch (emailError) {
        console.error("Failed to send lead notification:", emailError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-lead error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
