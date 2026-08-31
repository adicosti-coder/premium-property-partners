// Public endpoint for direct booking requests coming from the guest
// apartment pages. Saves the request in `public.booking_requests` (service
// role) and triggers the guest confirmation + admin notification emails.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { beginIdempotent } from "../_shared/idempotency.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const MAX_NIGHTS = 90;
const MAX_ADVANCE_DAYS = 730;

const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const phone = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+\s()-]/g, "").trim().slice(0, 30);
};

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255;

const parseDay = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return isNaN(date.getTime()) ? null : date;
};

const reference = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += chars[b % chars.length];
  return `RT-${out}`;
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(`booking-request:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return json({ error: "Prea multe cereri. Încearcă din nou în câteva minute." }, 429);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const idem = await beginIdempotent(supabase, "submit-booking-request", req, corsHeaders);
  if (idem.replay) return idem.replay;

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: pretend success without persisting anything.
    if (str(body.honeypot, 100)) {
      const payload = { success: true, reference: reference() };
      await idem.finish(payload);
      return json(payload);
    }

    const guestName = str(body.guestName, 100);
    const guestEmail = str(body.guestEmail, 255).toLowerCase();
    const guestPhone = phone(body.guestPhone);
    const country = str(body.country, 100) || null;
    const message = str(body.message, 1000) || null;
    const propertyName = str(body.propertyName, 200);
    const propertySlug = str(body.propertySlug, 200) || null;
    const discountCode = str(body.discountCode, 40).toUpperCase() || null;
    const source = str(body.source, 60) || "property_detail";
    const checkInRaw = str(body.checkIn, 10);
    const checkOutRaw = str(body.checkOut, 10);

    const guests = Math.min(Math.max(parseInt(String(body.guests ?? "1"), 10) || 1, 1), 30);
    const propertyRefId = Number.isInteger(body.propertyRefId) ? body.propertyRefId : null;
    const estimatedTotal =
      typeof body.estimatedTotal === "number" && isFinite(body.estimatedTotal) && body.estimatedTotal >= 0
        ? Math.round(body.estimatedTotal)
        : null;

    let utm: Record<string, unknown> | null = null;
    if (body.utm && typeof body.utm === "object") {
      const serialized = JSON.stringify(body.utm);
      if (serialized.length <= 2000) utm = body.utm;
    }

    if (guestName.length < 2) return json({ error: "Nume invalid" }, 400);
    if (!isEmail(guestEmail)) return json({ error: "Email invalid" }, 400);
    if (guestPhone.replace(/\D/g, "").length < 8) return json({ error: "Telefon invalid" }, 400);
    if (!propertyName) return json({ error: "Proprietate lipsă" }, 400);

    const checkIn = parseDay(checkInRaw);
    const checkOut = parseDay(checkOutRaw);
    if (!checkIn) return json({ error: "Data de check-in este invalidă" }, 400);
    if (!checkOut) return json({ error: "Data de check-out este invalidă" }, 400);

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
    if (nights < 1) return json({ error: "Check-out trebuie să fie după check-in" }, 400);
    if (nights > MAX_NIGHTS) return json({ error: `Sejur prea lung (max ${MAX_NIGHTS} nopți)` }, 400);

    const todayUtc = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    if (checkIn.getTime() < todayUtc.getTime()) {
      return json({ error: "Data de check-in este în trecut" }, 400);
    }
    if (checkIn.getTime() - todayUtc.getTime() > MAX_ADVANCE_DAYS * 86_400_000) {
      return json({ error: "Data de check-in este prea îndepărtată" }, 400);
    }

    // --- Turnstile (fail-closed when a secret is configured) ---
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (turnstileSecret) {
      const token = str(body.captchaToken, 2048);
      if (!token) return json({ error: "Verificare anti-spam lipsă" }, 403);
      const form = new FormData();
      form.append("secret", turnstileSecret);
      form.append("response", token);
      if (ip !== "unknown") form.append("remoteip", ip);
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });
      const verify = await verifyRes.json().catch(() => ({ success: false }));
      if (!verify.success) return json({ error: "Verificarea anti-spam a eșuat" }, 403);
    }

    // --- Persist the request (unique reference, retry on collision) ---
    let saved: { id: string; reference: string } | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const ref = reference();
      const { data, error } = await supabase
        .from("booking_requests")
        .insert({
          reference: ref,
          property_name: propertyName,
          property_slug: propertySlug,
          property_ref_id: propertyRefId,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          country,
          guests,
          check_in: checkInRaw,
          check_out: checkOutRaw,
          nights,
          message,
          discount_code: discountCode,
          estimated_total: estimatedTotal,
          source,
          utm,
        })
        .select("id, reference")
        .single();

      if (error) {
        lastError = error;
        if (error.code !== "23505") break;
        continue;
      }
      saved = data;
    }

    if (!saved) {
      console.error("booking_requests insert failed:", lastError);
      return json({ error: "Nu am putut salva cererea. Încearcă din nou." }, 500);
    }

    // --- Notifications (guest confirmation + admin alert) ---
    let notified = false;
    try {
      const { data: notifyData, error: notifyError } = await supabase.functions.invoke(
        "send-booking-notification",
        {
          body: {
            guestName,
            guestEmail,
            guestPhone,
            checkIn: checkInRaw,
            checkOut: checkOutRaw,
            guests: String(guests),
            country: country || "",
            message: message || undefined,
            propertyName,
          },
        },
      );
      if (notifyError) throw notifyError;
      notified = notifyData?.success === true;
    } catch (notifyErr) {
      console.error("send-booking-notification failed:", notifyErr);
    }

    await supabase
      .from("booking_requests")
      .update({
        admin_email_sent: notified,
        guest_email_sent: notified,
        notified_at: notified ? new Date().toISOString() : null,
      })
      .eq("id", saved.id);

    const payload = {
      success: true,
      requestId: saved.id,
      reference: saved.reference,
      nights,
      emailSent: notified,
    };
    await idem.finish(payload);
    return json(payload);
  } catch (err) {
    console.error("submit-booking-request error:", err);
    if (idem.key) {
      try {
        await supabase
          .from("request_idempotency")
          .delete()
          .eq("scope", "submit-booking-request")
          .eq("key", idem.key);
      } catch { /* best effort */ }
    }
    return json({ error: "Eroare internă" }, 500);
  }
};

serve(handler);
