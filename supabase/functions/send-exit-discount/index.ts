import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExitDiscountRequest {
  email: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, language = "ro" }: ExitDiscountRequest = await req.json();
    
    console.log(`Sending exit discount email to: ${email}, language: ${language}`);

    const discountCode = "WELCOME10";
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 48);
    const formattedExpiry = expiryDate.toLocaleDateString(language === "ro" ? "ro-RO" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const content = language === "ro" ? {
      subject: "🎁 Codul tău de 10% reducere - Valabil 48 ore!",
      preheader: "Nu rata această ofertă exclusivă pentru prima ta rezervare",
      greeting: "Bună!",
      intro: "Îți mulțumim că ai vizitat ApArt Hotel Timișoara! Am pregătit o surpriză specială pentru tine:",
      discountTitle: "10% REDUCERE",
      discountSubtitle: "la prima ta rezervare",
      codeLabel: "Codul tău exclusiv:",
      validUntil: `Valid până la: ${formattedExpiry}`,
      howToUse: "Cum folosești codul:",
      step1: "Alege apartamentul preferat",
      step2: "Contactează-ne pe WhatsApp sau email",
      step3: "Menționează codul pentru a primi reducerea",
      ctaText: "Rezervă Acum",
      ctaUrl: "https://realtrustaparthotel.lovable.app/pentru-oaspeti",
      footer: "Cu drag, Echipa ApArt Hotel Timișoara",
      unsubscribe: "Dacă nu dorești să mai primești emailuri, te rugăm să ne contactezi.",
    } : {
      subject: "🎁 Your 10% Discount Code - Valid 48 hours!",
      preheader: "Don't miss this exclusive offer for your first booking",
      greeting: "Hello!",
      intro: "Thank you for visiting ApArt Hotel Timișoara! We've prepared a special surprise for you:",
      discountTitle: "10% OFF",
      discountSubtitle: "on your first booking",
      codeLabel: "Your exclusive code:",
      validUntil: `Valid until: ${formattedExpiry}`,
      howToUse: "How to use the code:",
      step1: "Choose your favorite apartment",
      step2: "Contact us via WhatsApp or email",
      step3: "Mention the code to receive your discount",
      ctaText: "Book Now",
      ctaUrl: "https://realtrustaparthotel.lovable.app/pentru-oaspeti",
      footer: "Best regards, ApArt Hotel Timișoara Team",
      unsubscribe: "If you don't want to receive emails, please contact us.",
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: bold;">ApArt Hotel</h1>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">Timișoara</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        ${content.greeting}
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        ${content.intro}
      </p>
      
      <!-- Discount Box -->
      <div style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <p style="color: #1a1a2e; font-size: 48px; font-weight: bold; margin: 0; letter-spacing: 2px;">
          ${content.discountTitle}
        </p>
        <p style="color: #1a1a2e; font-size: 18px; margin: 10px 0 0 0; opacity: 0.9;">
          ${content.discountSubtitle}
        </p>
      </div>
      
      <!-- Code Box -->
      <div style="background-color: #f8f9fa; border: 2px dashed #d4af37; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
          ${content.codeLabel}
        </p>
        <p style="color: #1a1a2e; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 4px;">
          ${discountCode}
        </p>
        <p style="color: #d4af37; font-size: 14px; margin: 15px 0 0 0; font-weight: 600;">
          ⏰ ${content.validUntil}
        </p>
      </div>
      
      <!-- How to use -->
      <div style="margin-bottom: 30px;">
        <p style="color: #333; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
          ${content.howToUse}
        </p>
        <div style="padding-left: 20px;">
          <p style="color: #555; font-size: 14px; margin: 8px 0;">✅ ${content.step1}</p>
          <p style="color: #555; font-size: 14px; margin: 8px 0;">✅ ${content.step2}</p>
          <p style="color: #555; font-size: 14px; margin: 8px 0;">✅ ${content.step3}</p>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${content.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          ${content.ctaText}
        </a>
      </div>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
        ${content.footer}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
      <p style="color: #888; font-size: 12px; margin: 0;">
        ${content.unsubscribe}
      </p>
      <p style="color: #666; font-size: 11px; margin: 10px 0 0 0;">
        © ${new Date().getFullYear()} ApArt Hotel Timișoara. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ApArt Hotel <noreply@realtrust.ro>",
        to: [email],
        subject: content.subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Exit discount email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-exit-discount function:", error);
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
