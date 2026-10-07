import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createLeadReportToken } from "../_shared/leadReportToken.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { beginIdempotent } from "../_shared/idempotency.ts";
import { applyRateLimit } from "../_shared/rateLimiter.ts";


function validateString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  // Strip HTML tags / control chars to prevent stored XSS in admin views & emails.
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
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
  "cerere_rapida", "Apartament", "city_of_mara",
];

const VALID_SOURCES = [
  "calculator", "quick_form", "lead_capture_form",
  "rental-calculator", "advanced-rental-calculator", "city_of_mara_landing",
  "pagina_contact", "apel_2_minute", "evaluare_gratuita",
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

  // Anti-spam: max 5 lead submissions / minute / IP.
  const limited = applyRateLimit(req, corsHeaders, { maxRequests: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Idempotency: a repeated / parallel call carrying the same
  // `x-idempotency-key` is answered from cache instead of inserting twice.
  const idem = await beginIdempotent(supabase, "submit-lead", req, corsHeaders);
  if (idem.replay) return idem.replay;

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
    const { data: insertedLead, error } = await supabase
      .from("leads")
      .insert({
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
      })
      .select("id")
      .single();

    if (error || !insertedLead) {
      console.error("Error inserting lead:", error);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadId = insertedLead.id;

    // --- Mirror into prospect_listings for the Unified Pipeline (best-effort) ---
    // Only when we have a zone selected (owner ROI calculator flow).
    const rawZone = validateString(body.zone, 120);
    if (rawZone) {
      try {
        const phoneNormalized = whatsappNumber.replace(/[^\d+]/g, "");
        const areaForKey = propertyArea || 0;
        const dedupKey = `owner:${phoneNormalized}:${rawZone.toLowerCase()}:${areaForKey}`;
        const now = new Date().toISOString();

        const { error: plError } = await supabase.from("prospect_listings").insert({
          source_platform: "owner_calculator",
          source_url: `https://realtrust.ro/#calculator?utm_source=${encodeURIComponent(source)}`,
          title: `Proprietar Timișoara — ${propertyType} ${areaForKey || ""}mp`.trim(),
          zone: rawZone,
          location: `Timișoara, ${rawZone}`,
          size: areaForKey || null,
          contact_name: name,
          contact_phone: whatsappNumber,
          phone_normalized: phoneNormalized || null,
          prospect_type: "proprietar",
          lifecycle_status: "new",
          status: "new",
          dedup_key: dedupKey,
          tags: ["owner_calculator", source],
          score_breakdown: {
            calculated_net_profit: calculatedNetProfit,
            calculated_yearly_profit: calculatedYearlyProfit,
            simulation: simulationData ?? null,
            submitted_at: now,
          },
        });

        if (plError && plError.code !== "23505") {
          console.error("prospect_listings insert non-fatal error:", plError);
        }
      } catch (mirrorErr) {
        console.error("prospect_listings mirror failed:", mirrorErr);
      }
    }

    // --- Send notification (best-effort, don't block response) ---
    if (body.send_notification !== false) {
      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name,
            email: email || undefined,
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

    // --- Cerere contact WhatsApp (pagina Contact): Hot Lead + alertă internă + e-mail vizitator ---
    if (source === "apel_2_minute") {
      try {
        await supabase.from("leads").update({ lead_grade: "hot", engagement_status: "hot_lead", lead_score: 90 }).eq("id", leadId);
        await supabase.functions.invoke("send-transactional-email", {
          headers: { "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" },
          body: {
            templateName: "chat-lead-alert",
            idempotencyKey: `contact-callback-alert-${leadId}`,
            templateData: { source: "contact", message: String(body.message ?? "").slice(0, 500), phone: whatsappNumber, email: email || undefined, page: "/contact" },
          },
        });
        if (email) {
          await supabase.functions.invoke("send-transactional-email", {
            headers: { "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" },
            body: {
              templateName: "hot-lead-followup",
              recipientEmail: email,
              idempotencyKey: `hot-lead-followup-${leadId}`,
              templateData: { name, intro: "Am primit cererea dvs. Vă scriem pe WhatsApp în intervalul ales — fără apeluri, doar mesaje." },
            },
          });
        }
      } catch (e) {
        console.error("callback follow-up failed:", e);
      }
    }

    const payload = { success: true, leadId, reportToken: await createLeadReportToken(leadId) };
    await idem.finish(payload);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-lead error:", err);
    // Release the claim so the user can genuinely retry after a failure.
    if (idem.key) {
      try {
        await supabase
          .from("request_idempotency")
          .delete()
          .eq("scope", "submit-lead")
          .eq("key", idem.key);
      } catch { /* best effort */ }
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

};

serve(handler);
