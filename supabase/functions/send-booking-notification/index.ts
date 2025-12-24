import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: BookingNotificationRequest = await req.json();
    console.log("Received booking notification request:", data);

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

    // Send notification email to admin
    const adminEmailResponse = await sendEmail(
      ["contact@realtrust.ro"],
      `🏠 Nouă Cerere de Rezervare - ${guestName}`,
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
                <span class="info-value">${guestName}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📧 Email:</span>
                <span class="info-value"><a href="mailto:${guestEmail}">${guestEmail}</a></span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📱 Telefon:</span>
                <span class="info-value"><a href="tel:${guestPhone}">${guestPhone}</a></span>
              </div>
              
              <div class="info-row">
                <span class="info-label">🌍 Țara:</span>
                <span class="info-value">${country}</span>
              </div>

              <h2>Detalii Rezervare</h2>
              
              <div class="info-row">
                <span class="info-label">🏡 Proprietate:</span>
                <span class="info-value">${propertyName}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📅 Check-in:</span>
                <span class="info-value">${formatDate(checkIn)}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">📅 Check-out:</span>
                <span class="info-value">${formatDate(checkOut)}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">👥 Nr. Oaspeți:</span>
                <span class="info-value">${guests}</span>
              </div>

              ${message ? `
              <div class="highlight-box">
                <strong>💬 Mesaj de la oaspete:</strong><br>
                ${message}
              </div>
              ` : ''}

              <a href="https://wa.me/${guestPhone.replace(/[^0-9]/g, '')}" class="cta-button">
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

    // Send confirmation email to guest
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
              <h2 style="margin-top: 0;">Bună, ${guestName}!</h2>
              
              <p>Îți mulțumim pentru interesul acordat! Am primit cererea ta de rezervare și te vom contacta în cel mai scurt timp posibil pentru confirmare.</p>

              <div class="summary-box">
                <h3 style="margin-top: 0; color: #c9a961;">📋 Rezumat Cerere</h3>
                <div class="summary-row">
                  <span>Proprietate:</span>
                  <strong>${propertyName}</strong>
                </div>
                <div class="summary-row">
                  <span>Check-in:</span>
                  <strong>${formatDate(checkIn)}</strong>
                </div>
                <div class="summary-row">
                  <span>Check-out:</span>
                  <strong>${formatDate(checkOut)}</strong>
                </div>
                <div class="summary-row">
                  <span>Număr oaspeți:</span>
                  <strong>${guests}</strong>
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
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);