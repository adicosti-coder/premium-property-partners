import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  fullName?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const getWelcomeEmailHtml = (fullName: string, language: string = "ro") => {
  const isRo = language === "ro";
  const name = fullName || (isRo ? "Drag prieten" : "Dear friend");
  
  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isRo ? "Bine ai venit la RealTrust!" : "Welcome to RealTrust!"}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 700;">
        RealTrust & ApArt Hotel
      </h1>
      <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">
        ${isRo ? "Vânzare · Administrare · Cazare" : "Sales · Management · Accommodation"}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 24px;">
        ${isRo ? `Bine ai venit, ${name}! 🎉` : `Welcome, ${name}! 🎉`}
      </h2>
      
      <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        ${isRo 
          ? "Suntem încântați să te avem alături! Contul tău este acum activ și pregătit pentru a explora toate serviciile noastre premium."
          : "We're thrilled to have you with us! Your account is now active and ready to explore all our premium services."}
      </p>

      <!-- Features Grid -->
      <div style="margin: 30px 0;">
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #d4af37;">
          <h3 style="color: #1a1a2e; margin: 0 0 8px 0; font-size: 16px;">
            📊 ${isRo ? "Calculator de Venit" : "Income Calculator"}
          </h3>
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            ${isRo 
              ? "Estimează câte poți câștiga cu proprietatea ta în regim hotelier."
              : "Estimate how much you can earn with your property in hotel mode."}
          </p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #d4af37;">
          <h3 style="color: #1a1a2e; margin: 0 0 8px 0; font-size: 16px;">
            🏠 ${isRo ? "Portofoliu Premium" : "Premium Portfolio"}
          </h3>
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            ${isRo 
              ? "Explorează apartamentele noastre gestionate în Timișoara."
              : "Explore our managed apartments in Timișoara."}
          </p>
        </div>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #d4af37;">
          <h3 style="color: #1a1a2e; margin: 0 0 8px 0; font-size: 16px;">
            🗺️ ${isRo ? "Ghid Timișoara" : "Timișoara Guide"}
          </h3>
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            ${isRo 
              ? "Descoperă cele mai bune locuri din oraș cu ghidul nostru interactiv."
              : "Discover the best places in town with our interactive guide."}
          </p>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://realtrustaparthotel.lovable.app" 
           style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d77a 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
          ${isRo ? "Explorează Platforma →" : "Explore Platform →"}
        </a>
      </div>

      <!-- Promo Code -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
        <p style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">
          ${isRo ? "🎁 Cod special pentru tine:" : "🎁 Special code for you:"}
        </p>
        <div style="background-color: #ffffff; display: inline-block; padding: 12px 30px; border-radius: 8px; border: 2px dashed #d4af37;">
          <span style="color: #1a1a2e; font-size: 24px; font-weight: 700; letter-spacing: 2px;">DIRECT5</span>
        </div>
        <p style="color: #92400e; margin: 10px 0 0 0; font-size: 13px;">
          ${isRo ? "5% reducere la rezervări directe" : "5% off direct bookings"}
        </p>
      </div>

      <p style="color: #475569; line-height: 1.6; margin: 0;">
        ${isRo 
          ? "Dacă ai întrebări, suntem la o distanță de un mesaj pe WhatsApp!"
          : "If you have any questions, we're just a WhatsApp message away!"}
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 30px; text-align: center;">
      <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">
        ${isRo ? "Cu drag," : "Best regards,"}
      </p>
      <p style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 16px; font-weight: 600;">
        Echipa RealTrust & ApArt Hotel
      </p>
      
      <div style="margin: 20px 0;">
        <a href="https://wa.me/40723154520" style="color: #d4af37; text-decoration: none; margin: 0 15px; font-size: 14px;">
          📱 WhatsApp
        </a>
        <a href="mailto:adicosti@gmail.com" style="color: #d4af37; text-decoration: none; margin: 0 15px; font-size: 14px;">
          ✉️ Email
        </a>
      </div>

      <p style="color: #94a3b8; margin: 20px 0 0 0; font-size: 12px;">
        Imo Business Centrum SRL | Timișoara, România
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Sending welcome email to: ${email}`);

    // Send welcome email
    const emailResponse = await resend.emails.send({
      from: "RealTrust <noreply@realtrustaparthotel.lovable.app>",
      to: [email],
      subject: "🎉 Bine ai venit la RealTrust & ApArt Hotel!",
      html: getWelcomeEmailHtml(fullName || "", "ro"),
    });

    console.log("Welcome email sent successfully:", emailResponse);

    // Log to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Track in campaign sends (optional - for welcome emails)
    await supabase.from("email_campaign_sends").insert({
      recipient_email: email,
      recipient_user_id: userId || null,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
