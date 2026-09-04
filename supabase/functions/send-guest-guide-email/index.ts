import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "../_shared/rateLimiter.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const ipLimit = checkRateLimit(`guest-guide:ip:${ip}`, { maxRequests: 3, windowMs: 60_000 });
    if (!ipLimit.allowed) return rateLimitExceededResponse(ipLimit.resetAt, corsHeaders);

    const { email, language } = await req.json();

    if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const normalizedEmail = email.trim().toLowerCase();

    const emailLimit = checkRateLimit(`guest-guide:email:${normalizedEmail}`, { maxRequests: 2, windowMs: 3_600_000 });
    if (!emailLimit.allowed) return rateLimitExceededResponse(emailLimit.resetAt, corsHeaders);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isRo = language === "ro";
    const guideUrl = "https://www.realtrust.ro/blog/ghid-turistic-timisoara-atractii-activitati";
    const siteUrl = "https://www.realtrust.ro";

    const subject = isRo
      ? "🗺️ Ghidul Tău Turistic Timișoara — RealTrust ApArt Hotel"
      : "🗺️ Your Timișoara Tourist Guide — RealTrust ApArt Hotel";

    const html = `
<!DOCTYPE html>
<html lang="${isRo ? "ro" : "en"}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:8px 20px;background:linear-gradient(135deg,#10b981,#0d9488);border-radius:50px;color:#fff;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        ${isRo ? "🗺️ GHID TURISTIC GRATUIT" : "🗺️ FREE TOURIST GUIDE"}
      </div>
    </div>

    <!-- Main Card -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#065f46;">
        ${isRo ? "Bine ai venit în Timișoara! 🎉" : "Welcome to Timișoara! 🎉"}
      </h1>
      <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
        ${isRo
          ? "Mulțumim că ai ales să descarci ghidul nostru turistic! Aici găsești tot ce ai nevoie pentru o experiență de neuitat în Timișoara — atracții, restaurante, activități și sfaturi locale."
          : "Thank you for downloading our tourist guide! Here you'll find everything you need for an unforgettable experience in Timișoara — attractions, restaurants, activities and local tips."
        }
      </p>
      
      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${guideUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#10b981,#0d9488);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
          ${isRo ? "📖 Citește Ghidul Complet" : "📖 Read the Full Guide"}
        </a>
      </div>
    </div>

    <!-- Highlights -->
    <div style="margin-bottom:24px;">
      <h2 style="font-size:18px;color:#1f2937;margin:0 0 16px;">
        ${isRo ? "Ce vei descoperi:" : "What you'll discover:"}
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:8px;">
            <span style="font-size:20px;">🏛️</span>
            <span style="font-size:14px;color:#374151;margin-left:8px;">
              ${isRo ? "Cele mai importante atracții turistice" : "Top tourist attractions"}
            </span>
          </td>
        </tr>
        <tr><td style="padding:4px;"></td></tr>
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border-radius:8px;">
            <span style="font-size:20px;">🍽️</span>
            <span style="font-size:14px;color:#374151;margin-left:8px;">
              ${isRo ? "Restaurante și cafenele recomandate" : "Recommended restaurants & cafés"}
            </span>
          </td>
        </tr>
        <tr><td style="padding:4px;"></td></tr>
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border-radius:8px;">
            <span style="font-size:20px;">🎭</span>
            <span style="font-size:14px;color:#374151;margin-left:8px;">
              ${isRo ? "Activități și experiențe unice" : "Activities & unique experiences"}
            </span>
          </td>
        </tr>
        <tr><td style="padding:4px;"></td></tr>
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border-radius:8px;">
            <span style="font-size:20px;">💡</span>
            <span style="font-size:14px;color:#374151;margin-left:8px;">
              ${isRo ? "Sfaturi locale de insider" : "Insider local tips"}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Book CTA -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      <p style="color:#ffffff;font-size:16px;margin:0 0 16px;font-weight:600;">
        ${isRo
          ? "🏠 Cauți cazare premium în Timișoara?"
          : "🏠 Looking for premium accommodation in Timișoara?"
        }
      </p>
      <a href="${siteUrl}/cazare" style="display:inline-block;padding:12px 32px;background:#ffffff;color:#1e3a5f;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
        ${isRo ? "Vezi Apartamentele Noastre" : "View Our Apartments"}
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;margin:8px 0;">
        © ${new Date().getFullYear()} RealTrust ApArt Hotel · Timișoara, România
      </p>
      <p style="font-size:11px;color:#d1d5db;">
        ${isRo
          ? "Ai primit acest email pentru că ai solicitat ghidul turistic gratuit."
          : "You received this email because you requested the free tourist guide."
        }
      </p>
    </div>
  </div>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "RealTrust <info@notify.realtrust.ro>",
        to: [normalizedEmail],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Resend error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Tourist guide email sent");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send guide email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
