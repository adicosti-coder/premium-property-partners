import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= INPUT VALIDATION & SANITIZATION =============

// HTML escape function to prevent XSS in email templates
function escapeHtml(text: string | undefined | null): string {
  if (text === undefined || text === null) return '';
  const str = String(text);
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

// Validate and sanitize phone number
function sanitizePhone(phone: string | undefined): string {
  if (!phone) return '';
  // Remove all non-digit, non-plus characters for phone numbers
  return String(phone).replace(/[^\d+\s()-]/g, '').slice(0, 30);
}

// Validate date format (YYYY-MM-DD or ISO string)
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Validate string with max length
function validateString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength);
}

// Validate positive integer (for guests count)
function validateGuestsCount(value: unknown): string {
  const str = String(value || '1');
  const num = parseInt(str, 10);
  if (isNaN(num) || num < 1) return '1';
  if (num > 50) return '50';
  return String(num);
}

// ============= VALIDATION =============

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

  // Validate required fields
  if (!guestName || guestName.length < 1) {
    throw new Error("Numele este obligatoriu");
  }
  if (!guestEmail || !isValidEmail(guestEmail)) {
    throw new Error("Email invalid");
  }
  if (!guestPhone || guestPhone.length < 5) {
    throw new Error("Număr telefon invalid");
  }
  if (!checkIn || !isValidDate(checkIn)) {
    throw new Error("Data check-in invalidă");
  }
  if (!checkOut || !isValidDate(checkOut)) {
    throw new Error("Data check-out invalidă");
  }
  if (!propertyName || propertyName.length < 1) {
    throw new Error("Numele proprietății este obligatoriu");
  }

  // Validate check-out is after check-in
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (checkOutDate <= checkInDate) {
    throw new Error("Data check-out trebuie să fie după check-in");
  }

  return {
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    guests,
    country,
    message,
    propertyName,
  };
}

// ============= HANDLER =============

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    console.log("Raw booking notification request received");

    // Validate and sanitize input
    const data = validateBookingRequest(rawData);
    console.log("Validated booking data for:", escapeHtml(data.guestName));

    const {
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      guests,
      country,
      message,
      propertyName,
    } = data;

    // Format dates for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ro-RO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Clean phone for WhatsApp link (only digits)
    const phoneClean = guestPhone.replace(/[^0-9]/g, '');

    const sendEmail = async (to: string[], subject: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "RealTrust <onboarding@resend.dev>",
          to,
          subject,
          html,
        }),
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to send email: ${error}`);
      }
      
      return res.json();
    };

    // Send notification email to admin (with escaped HTML)
    const adminEmailResponse = await sendEmail(
      ["contact@realtrust.ro"],
      `🏠 Nouă Cerere de Rezervare - ${escapeHtml(guestName)}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a2e; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #c9a961 0%, #e8d5a3 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { color: #1a1a2e; margin: 0; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
            .info-label { font-weight: 600; color: #666; width: 140px; }
            .info-value { color: #1a1a2e; }
            .highlight-box { background: #f8f4e8; border-left: 4px solid #c9a961; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .footer { background: #1a1a2e; color: #ffffff; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; }
            .cta-button { display: inline-block; background: #c9a961; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Nouă Cerere de Rezervare</h1>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">Detalii Oaspete</h2>
              
              <div class="info-row">
                <span class="info-label">👤 Nume:</span>
                <span class="info-value">${escapeHtml(guestName)}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📧 Email:</span>
                <span class="info-value"><a href="mailto:${escapeHtml(guestEmail)}">${escapeHtml(guestEmail)}</a></span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📱 Telefon:</span>
                <span class="info-value"><a href="tel:${escapeHtml(guestPhone)}">${escapeHtml(guestPhone)}</a></span>
              </div>
              
              <div class="info-row">
                <span class="info-label">🌍 Țara:</span>
                <span class="info-value">${escapeHtml(country)}</span>
              </div>

              <h2>Detalii Rezervare</h2>
              
              <div class="info-row">
                <span class="info-label">🏡 Proprietate:</span>
                <span class="info-value">${escapeHtml(propertyName)}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📅 Check-in:</span>
                <span class="info-value">${escapeHtml(formatDate(checkIn))}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📅 Check-out:</span>
                <span class="info-value">${escapeHtml(formatDate(checkOut))}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">👥 Nr. Oaspeți:</span>
                <span class="info-value">${escapeHtml(guests)}</span>
              </div>

              ${message ? `
              <div class="highlight-box">
                <strong>💬 Mesaj de la oaspete:</strong><br>
                ${escapeHtml(message)}
              </div>
              ` : ''}

              <a href="https://wa.me/${phoneClean}" class="cta-button">
                📱 Contactează pe WhatsApp
              </a>
            </div>
            <div class="footer">
              <p style="margin: 0;">RealTrust - Administrare Profesională</p>
              <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">Acest email a fost generat automat</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Admin email sent successfully:", adminEmailResponse);

    // Send confirmation email to guest (with escaped HTML)
    const guestEmailResponse = await sendEmail(
      [guestEmail],
      "✅ Am primit cererea ta de rezervare - RealTrust",
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a2e; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #c9a961 0%, #e8d5a3 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { color: #1a1a2e; margin: 0; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .summary-box { background: #f8f4e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8d5a3; }
            .summary-row:last-child { border-bottom: none; }
            .footer { background: #1a1a2e; color: #ffffff; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Cerere Primită!</h1>
            </div>
            <div class="content">
              <h2 style="margin-top: 0;">Bună, ${escapeHtml(guestName)}!</h2>
              
              <p>Îți mulțumim pentru interesul acordat! Am primit cererea ta de rezervare și te vom contacta în cel mai scurt timp posibil pentru confirmare.</p>

              <div class="summary-box">
                <h3 style="margin-top: 0; color: #c9a961;">📋 Rezumat Cerere</h3>
                <div class="summary-row">
                  <span>Proprietate:</span>
                  <strong>${escapeHtml(propertyName)}</strong>
                </div>
                <div class="summary-row">
                  <span>Check-in:</span>
                  <strong>${escapeHtml(formatDate(checkIn))}</strong>
                </div>
                <div class="summary-row">
                  <span>Check-out:</span>
                  <strong>${escapeHtml(formatDate(checkOut))}</strong>
                </div>
                <div class="summary-row">
                  <span>Număr oaspeți:</span>
                  <strong>${escapeHtml(guests)}</strong>
                </div>
              </div>

              <p>Dacă ai întrebări sau dorești să ne contactezi, poți răspunde direct la acest email sau ne poți scrie pe WhatsApp.</p>

              <p style="margin-bottom: 0;">Cu drag,<br><strong>Echipa RealTrust</strong></p>
            </div>
            <div class="footer">
              <p style="margin: 0;">RealTrust - Administrare Profesională</p>
              <p style="margin: 5px 0 0; opacity: 0.7; font-size: 12px;">Timișoara, România</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Guest confirmation email sent successfully:", guestEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminEmail: adminEmailResponse, 
        guestEmail: guestEmailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
