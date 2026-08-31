import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string | undefined | null): string {
  if (text === undefined || text === null) return '';
  const str = String(text);
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

function sanitizePhone(phone: string | undefined): string {
  if (!phone) return '';
  return String(phone).replace(/[^\d+\s()-]/g, '').slice(0, 30);
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return !isNaN(new Date(dateStr).getTime());
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validateString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength);
}

function validateGuestsCount(value: unknown): string {
  const num = parseInt(String(value || '1'), 10);
  if (isNaN(num) || num < 1) return '1';
  if (num > 50) return '50';
  return String(num);
}

interface BookingNotificationRequest {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  country: string;
  message?: string;
  propertyName: string;
  propertyImage?: string;
  parkingGpsLat?: string;
  parkingGpsLng?: string;
  guideUrl?: string;
}

function validateBookingRequest(data: any): BookingNotificationRequest {
  const guestName = validateString(data.guestName, 100);
  const guestEmail = validateString(data.guestEmail, 255);
  const guestPhone = sanitizePhone(data.guestPhone);
  const checkIn = validateString(data.checkIn, 50);
  const checkOut = validateString(data.checkOut, 50);
  const guests = validateGuestsCount(data.guests);
  const country = validateString(data.country, 100);
  const message = data.message ? validateString(data.message, 1000) : undefined;
  const propertyName = validateString(data.propertyName, 200);
  const propertyImage = data.propertyImage ? validateString(data.propertyImage, 500) : undefined;
  const parkingGpsLat = data.parkingGpsLat ? validateString(data.parkingGpsLat, 20) : undefined;
  const parkingGpsLng = data.parkingGpsLng ? validateString(data.parkingGpsLng, 20) : undefined;
  const guideUrl = data.guideUrl ? validateString(data.guideUrl, 500) : undefined;

  if (!guestName || guestName.length < 1) throw new Error("Numele este obligatoriu");
  if (!guestEmail || !isValidEmail(guestEmail)) throw new Error("Email invalid");
  if (!guestPhone || guestPhone.length < 5) throw new Error("Număr telefon invalid");
  if (!checkIn || !isValidDate(checkIn)) throw new Error("Data check-in invalidă");
  if (!checkOut || !isValidDate(checkOut)) throw new Error("Data check-out invalidă");
  if (!propertyName || propertyName.length < 1) throw new Error("Numele proprietății este obligatoriu");

  if (new Date(checkOut) <= new Date(checkIn)) throw new Error("Data check-out trebuie să fie după check-in");

  return { guestName, guestEmail, guestPhone, checkIn, checkOut, guests, country, message, propertyName, propertyImage, parkingGpsLat, parkingGpsLng, guideUrl };
}

// Calculate nights between two dates
function calcNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function formatDateRo(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateEn(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== LUXURY EMAIL TEMPLATE (Guest Confirmation) =====
function buildGuestEmail(data: BookingNotificationRequest): string {
  const nights = calcNights(data.checkIn, data.checkOut);
  const dateRo = { in: formatDateRo(data.checkIn), out: formatDateRo(data.checkOut) };
  const dateEn = { in: formatDateEn(data.checkIn), out: formatDateEn(data.checkOut) };
  
  const parkingSection = data.parkingGpsLat && data.parkingGpsLng
    ? `<tr><td style="padding:24px 32px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f0;border-radius:12px;overflow:hidden">
          <tr><td style="padding:20px 24px">
            <p style="margin:0 0 8px;font-size:13px;color:#8a7d6b;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">🅿️ Parcare / Parking</p>
            <p style="margin:0 0 12px;font-size:14px;color:#2d2a26;line-height:1.5">Locul de parcare este rezervat pentru dumneavoastră.<br><span style="color:#8a7d6b">Your parking spot is reserved.</span></p>
            <a href="https://www.google.com/maps?q=${data.parkingGpsLat},${data.parkingGpsLng}" target="_blank" style="display:inline-block;background:#2d2a26;color:#e8d5a3;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">📍 Deschide în Google Maps / Open Maps</a>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const guideSection = data.guideUrl
    ? `<tr><td style="padding:24px 32px 0">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#2d2a26 0%,#3d3832 100%);border-radius:12px;overflow:hidden">
          <tr><td style="padding:28px 24px;text-align:center">
            <p style="margin:0 0 6px;font-size:13px;color:#c9a961;text-transform:uppercase;letter-spacing:2px;font-weight:600">Ghidul Oaspetelui / Guest Guide</p>
            <p style="margin:0 0 16px;font-size:14px;color:#e8e0d0;line-height:1.5">PIN acces, Wi-Fi, instrucțiuni și suport 24/7<br><span style="opacity:0.7">Access PIN, Wi-Fi, instructions & 24/7 support</span></p>
            <a href="${escapeHtml(data.guideUrl)}" target="_blank" style="display:inline-block;background:#c9a961;color:#2d2a26;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.5px">📖 Deschide Ghidul / Open Guide</a>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const imageSection = data.propertyImage
    ? `<tr><td style="padding:0">
        <img src="${escapeHtml(data.propertyImage)}" alt="${escapeHtml(data.propertyName)}" width="600" style="display:block;width:100%;max-height:280px;object-fit:cover" />
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1eb;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#c9a961 0%,#e8d5a3 50%,#c9a961 100%);padding:32px 32px 24px;text-align:center">
    <p style="margin:0 0 4px;font-size:11px;color:#2d2a26;text-transform:uppercase;letter-spacing:3px;font-weight:600;opacity:0.7">RealTrust & ApArt Hotel</p>
    <h1 style="margin:0;font-size:22px;color:#2d2a26;font-weight:700">✨ Rezervare Confirmată</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#2d2a26;opacity:0.6">Booking Confirmed</p>
  </td></tr>

  <!-- Property Image -->
  ${imageSection}

  <!-- Greeting -->
  <tr><td style="padding:28px 32px 0">
    <h2 style="margin:0 0 8px;font-size:18px;color:#2d2a26">Bună, ${escapeHtml(data.guestName)}! 👋</h2>
    <p style="margin:0;font-size:14px;color:#6b6560;line-height:1.6">
      Vă mulțumim pentru rezervare! Mai jos găsiți toate detaliile sejurului dumneavoastră.<br>
      <span style="color:#8a7d6b;font-style:italic">Thank you for your booking! Below you'll find all the details of your stay.</span>
    </p>
  </td></tr>

  <!-- Booking Details Card -->
  <tr><td style="padding:24px 32px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e0d0;border-radius:12px;overflow:hidden">
      <tr><td style="background:#faf8f4;padding:16px 20px;border-bottom:1px solid #e8e0d0">
        <p style="margin:0;font-size:13px;color:#8a7d6b;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">📋 Detalii Sejur / Stay Details</p>
      </td></tr>
      <tr><td style="padding:0">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:13px;color:#8a7d6b;width:40%">🏡 Proprietate</td>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:14px;color:#2d2a26;font-weight:600">${escapeHtml(data.propertyName)}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:13px;color:#8a7d6b">📅 Check-in</td>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:14px;color:#2d2a26;font-weight:600">${escapeHtml(dateRo.in)}<br><span style="font-weight:400;color:#8a7d6b;font-size:12px">${escapeHtml(dateEn.in)}</span></td>
          </tr>
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:13px;color:#8a7d6b">📅 Check-out</td>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:14px;color:#2d2a26;font-weight:600">${escapeHtml(dateRo.out)}<br><span style="font-weight:400;color:#8a7d6b;font-size:12px">${escapeHtml(dateEn.out)}</span></td>
          </tr>
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:13px;color:#8a7d6b">🌙 Nopți / Nights</td>
            <td style="padding:14px 20px;border-bottom:1px solid #f0ece4;font-size:14px;color:#2d2a26;font-weight:600">${nights}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;font-size:13px;color:#8a7d6b">👥 Oaspeți / Guests</td>
            <td style="padding:14px 20px;font-size:14px;color:#2d2a26;font-weight:600">${escapeHtml(data.guests)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Parking GPS -->
  ${parkingSection}

  <!-- Guest Guide CTA -->
  ${guideSection}

  <!-- Guest Message -->
  ${data.message ? `
  <tr><td style="padding:24px 32px 0">
    <div style="background:#f8f6f0;border-left:4px solid #c9a961;padding:16px 20px;border-radius:0 12px 12px 0">
      <p style="margin:0 0 4px;font-size:12px;color:#8a7d6b;text-transform:uppercase;letter-spacing:1px;font-weight:600">💬 Mesajul dumneavoastră</p>
      <p style="margin:0;font-size:14px;color:#2d2a26;line-height:1.5">${escapeHtml(data.message)}</p>
    </div>
  </td></tr>` : ''}

  <!-- WhatsApp Support -->
  <tr><td style="padding:24px 32px;text-align:center">
    <p style="margin:0 0 12px;font-size:13px;color:#8a7d6b">Aveți întrebări? Suntem aici 24/7 / Questions? We're here 24/7</p>
    <a href="https://wa.me/${data.guestPhone.replace(/[^0-9]/g, '')}" target="_blank" style="display:inline-block;background:#25D366;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">💬 WhatsApp Support</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#2d2a26;padding:24px 32px;text-align:center">
    <p style="margin:0 0 4px;font-size:14px;color:#c9a961;font-weight:600">RealTrust & ApArt Hotel</p>
    <p style="margin:0;font-size:12px;color:#8a7d6b">Timișoara, România • info@realtrust.ro</p>
    <p style="margin:8px 0 0;font-size:11px;color:#5a5550">Administrare profesională • Professional management</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ===== ADMIN NOTIFICATION (kept concise) =====
function buildAdminEmail(data: BookingNotificationRequest): string {
  const nights = calcNights(data.checkIn, data.checkOut);
  const phoneClean = data.guestPhone.replace(/[^0-9]/g, '');
  
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f1eb;font-family:'Segoe UI',Arial,sans-serif">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
  <tr><td style="background:linear-gradient(135deg,#c9a961,#e8d5a3);padding:24px;text-align:center">
    <h1 style="margin:0;font-size:20px;color:#2d2a26">🏠 Nouă Cerere de Rezervare</h1>
  </td></tr>
  <tr><td style="padding:24px">
    <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:#2d2a26">
      <tr><td style="color:#8a7d6b;width:130px">👤 Nume</td><td style="font-weight:600">${escapeHtml(data.guestName)}</td></tr>
      <tr><td style="color:#8a7d6b">📧 Email</td><td><a href="mailto:${escapeHtml(data.guestEmail)}" style="color:#2d2a26">${escapeHtml(data.guestEmail)}</a></td></tr>
      <tr><td style="color:#8a7d6b">📱 Telefon</td><td><a href="tel:${escapeHtml(data.guestPhone)}" style="color:#2d2a26">${escapeHtml(data.guestPhone)}</a></td></tr>
      <tr><td style="color:#8a7d6b">🌍 Țara</td><td>${escapeHtml(data.country)}</td></tr>
      <tr><td colspan="2" style="border-top:1px solid #f0ece4;padding-top:12px"></td></tr>
      <tr><td style="color:#8a7d6b">🏡 Proprietate</td><td style="font-weight:600">${escapeHtml(data.propertyName)}</td></tr>
      <tr><td style="color:#8a7d6b">📅 Check-in</td><td>${escapeHtml(formatDateRo(data.checkIn))}</td></tr>
      <tr><td style="color:#8a7d6b">📅 Check-out</td><td>${escapeHtml(formatDateRo(data.checkOut))}</td></tr>
      <tr><td style="color:#8a7d6b">🌙 Nopți</td><td>${nights}</td></tr>
      <tr><td style="color:#8a7d6b">👥 Oaspeți</td><td>${escapeHtml(data.guests)}</td></tr>
    </table>
    ${data.message ? `<div style="margin-top:16px;background:#f8f6f0;border-left:4px solid #c9a961;padding:12px 16px;border-radius:0 8px 8px 0"><p style="margin:0 0 4px;font-size:12px;color:#8a7d6b;font-weight:600">💬 Mesaj:</p><p style="margin:0;font-size:14px;color:#2d2a26">${escapeHtml(data.message)}</p></div>` : ''}
    <div style="margin-top:20px;text-align:center">
      <a href="https://wa.me/${phoneClean}" style="display:inline-block;background:#25D366;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-right:8px">📱 WhatsApp</a>
      <a href="mailto:${escapeHtml(data.guestEmail)}" style="display:inline-block;background:#2d2a26;color:#c9a961;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">📧 Email</a>
    </div>
  </td></tr>
  <tr><td style="background:#2d2a26;padding:16px;text-align:center">
    <p style="margin:0;font-size:12px;color:#8a7d6b">RealTrust • Generat automat</p>
  </td></tr>
</table>
</body></html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    console.log("Booking notification request received");

    const data = validateBookingRequest(rawData);
    console.log("Validated booking for:", escapeHtml(data.guestName));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

    // Admin notification — falls back to the verified sender and, if the send
    // still fails, is stored in `admin_email_failures` for retry from /admin.
    const adminEmailResult = await sendTeamEmail(
      {
        to: "contact@realtrust.ro",
        subject: `🏠 Cerere Rezervare - ${data.guestName} | ${data.propertyName}`,
        html: buildAdminEmail(data),
        source: "booking-request-admin",
      },
      admin,
    );
    console.log("Admin booking email:", adminEmailResult.sent ? "sent" : adminEmailResult.error);

    // Luxury guest confirmation
    const guestEmailResult = await sendTeamEmail(
      {
        to: data.guestEmail,
        subject: `✨ Cerere de rezervare primită - ${data.propertyName} | RealTrust`,
        html: buildGuestEmail(data),
        source: "booking-request-guest",
      },
      admin,
    );
    console.log("Guest booking email:", guestEmailResult.sent ? "sent" : guestEmailResult.error);

    return new Response(
      JSON.stringify({
        success: true,
        adminEmailSent: adminEmailResult.sent,
        guestEmailSent: guestEmailResult.sent,
        storedForRetry: adminEmailResult.storedFallback || guestEmailResult.storedFallback || false,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
