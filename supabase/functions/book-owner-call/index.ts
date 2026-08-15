// Books a 15-minute owner strategy call: validates input, stores the appointment
// with the service role, and sends the confirmation email (Resend) with calendar links.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const APPOINTMENT_TYPE = "call_15min_proprietar";
const SITE_URL = "https://realtrust.ro";

/** Romania is UTC+3 in summer / UTC+2 in winter; DST switch is the last Sunday of March/October. */
function romaniaOffsetHours(y: number, m: number, d: number): number {
  const lastSunday = (year: number, month: number) => {
    const last = new Date(Date.UTC(year, month + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
  };
  const afterMarch = m > 3 || (m === 3 && d >= lastSunday(y, 2));
  const beforeOctober = m < 10 || (m === 10 && d < lastSunday(y, 9));
  return afterMarch && beforeOctober ? 3 : 2;
}

/** Local Bucharest date+time → UTC Date. */
function toUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const offset = romaniaOffsetHours(y, m, d);
  return new Date(Date.UTC(y, m - 1, d, hh - offset, mm));
}

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ error: "Invalid body" }, 400);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const slot = typeof body.slot === "string" ? body.slot : "";
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
    const isRo = (typeof body.language === "string" ? body.language : "ro") !== "en";
    const attribution =
      body.attribution && typeof body.attribution === "object" ? (body.attribution as Record<string, unknown>) : {};

    if (name.length < 2 || name.length > 120) return json({ error: "invalid_name" }, 400);
    if (phone.replace(/\D/g, "").length < 8 || phone.length > 30) return json({ error: "invalid_phone" }, 400);
    if (email && !EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);
    if (!DATE_RE.test(date) || !TIME_RE.test(slot)) return json({ error: "invalid_slot" }, 400);

    const startUtc = toUtc(date, slot);
    if (Number.isNaN(startUtc.getTime())) return json({ error: "invalid_slot" }, 400);
    if (startUtc.getTime() < Date.now() - 60 * 60 * 1000) return json({ error: "slot_in_past" }, 400);
    const endUtc = new Date(startUtc.getTime() + 15 * 60 * 1000);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Simple duplicate guard: same phone, same day, same slot.
    const { data: existing } = await supabase
      .from("chatbot_appointments")
      .select("id")
      .eq("appointment_type", APPOINTMENT_TYPE)
      .eq("contact_phone", phone)
      .eq("preferred_time_slot", slot)
      .gte("preferred_date", `${date}T00:00:00Z`)
      .lte("preferred_date", `${date}T23:59:59Z`)
      .maybeSingle();

    let appointmentId = existing?.id as string | undefined;

    if (!appointmentId) {
      const notesWithAttribution = [
        notes,
        Object.keys(attribution).length ? `[attribution] ${JSON.stringify(attribution).slice(0, 400)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { data, error } = await supabase
        .from("chatbot_appointments")
        .insert({
          appointment_type: APPOINTMENT_TYPE,
          contact_name: name,
          contact_phone: phone,
          contact_email: email || null,
          preferred_date: startUtc.toISOString(),
          preferred_time_slot: slot,
          notes: notesWithAttribution || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.error("book-owner-call insert failed:", error.message);
        return json({ error: "insert_failed" }, 500);
      }
      appointmentId = data.id as string;
    }

    // Confirmation email (best effort — never blocks the booking).
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    if (resendApiKey && email) {
      const localDate = new Date(`${date}T${slot}:00`).toLocaleDateString(isRo ? "ro-RO" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        isRo ? "Call RealTrust — 15 min" : "RealTrust call — 15 min",
      )}&dates=${icsStamp(startUtc)}/${icsStamp(endUtc)}&details=${encodeURIComponent(
        isRo ? "Apel strategic de 15 minute cu RealTrust Timișoara." : "15-minute strategy call with RealTrust Timișoara.",
      )}`;

      const subject = isRo
        ? `✅ Apel confirmat: ${localDate}, ora ${slot}`
        : `✅ Call confirmed: ${localDate}, ${slot}`;

      const html = `<!DOCTYPE html><html lang="${isRo ? "ro" : "en"}"><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#fff;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:36px 24px;">
  <h1 style="font-family:Georgia,serif;font-size:24px;color:#1a1f36;margin:0 0 12px;">
    ${isRo ? "Apelul tău este confirmat" : "Your call is confirmed"}
  </h1>
  <p style="font-size:15px;line-height:1.6;">${isRo ? "Bună" : "Hi"} ${escapeHtml(name)},</p>
  <p style="font-size:15px;line-height:1.6;">
    ${isRo
      ? `Te sunăm <strong>${escapeHtml(localDate)}</strong>, la ora <strong>${escapeHtml(slot)}</strong> (ora României), pe numărul ${escapeHtml(phone)}. Durata: 15 minute.`
      : `We'll call you on <strong>${escapeHtml(localDate)}</strong> at <strong>${escapeHtml(slot)}</strong> (Romania time), on ${escapeHtml(phone)}. Duration: 15 minutes.`}
  </p>
  <p style="font-size:15px;line-height:1.6;">
    ${isRo
      ? "Ca să fie util pentru tine, pregătește: adresa/zona apartamentului, numărul de camere și suprafața, plus dacă e mobilat."
      : "To make it useful, have ready: the apartment's area, number of rooms and size, and whether it's furnished."}
  </p>
  <p style="margin:28px 0;">
    <a href="${gcal}" style="background:#D4AF37;color:#1a1f36;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;display:inline-block;">
      ${isRo ? "Adaugă în Google Calendar" : "Add to Google Calendar"}
    </a>
  </p>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;">
    ${isRo
      ? 'Dacă nu îți mai convine intervalul, scrie-ne pe WhatsApp la <a href="https://wa.me/40799069256">0799 069 256</a> și îl mutăm.'
      : 'If the slot no longer works, message us on WhatsApp at <a href="https://wa.me/40799069256">+40 799 069 256</a>.'}
  </p>
  <p style="font-size:13px;color:#9ca3af;">RealTrust Timișoara · <a href="${SITE_URL}" style="color:#9ca3af;">realtrust.ro</a></p>
</div></body></html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "RealTrust <contact@realtrust.ro>",
            to: [email],
            subject,
            html,
          }),
        });
        emailSent = res.ok;
        if (!res.ok) console.error("book-owner-call email failed:", await res.text());
      } catch (e) {
        console.error("book-owner-call email error:", (e as Error).message);
      }
    }

    if (emailSent) {
      await supabase
        .from("chatbot_appointments")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", appointmentId);
    }

    return json({
      success: true,
      appointment_id: appointmentId,
      start_utc: startUtc.toISOString(),
      end_utc: endUtc.toISOString(),
      email_sent: emailSent,
    });
  } catch (e) {
    console.error("book-owner-call error:", (e as Error).message);
    return json({ error: "unexpected_error" }, 500);
  }
});
