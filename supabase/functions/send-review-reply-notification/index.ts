import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReviewReplyRequest {
  guestEmail: string;
  guestName: string;
  propertyName: string;
  reviewTitle?: string;
  reviewContent?: string;
  adminReply: string;
  rating: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-review-reply-notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      guestEmail, 
      guestName, 
      propertyName, 
      reviewTitle,
      reviewContent,
      adminReply,
      rating 
    }: ReviewReplyRequest = await req.json();

    console.log("Processing reply notification for:", guestEmail);

    if (!guestEmail) {
      console.log("No guest email provided, skipping notification");
      return new Response(
        JSON.stringify({ success: false, reason: "No guest email" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate star rating display
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Răspuns la recenzia ta</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 600;">RealTrust</h1>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Răspuns la recenzia ta</p>
    </div>
    
    <!-- Content -->
    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Dragă <strong>${guestName}</strong>,
      </p>
      
      <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
        Îți mulțumim pentru recenzia lăsată pentru <strong>${propertyName}</strong>! Am primit răspunsul echipei noastre:
      </p>
      
      <!-- Original Review -->
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d4af37;">
        <p style="color: #888888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Recenzia ta</p>
        <p style="color: #d4af37; font-size: 18px; margin: 0 0 10px 0; letter-spacing: 2px;">${stars}</p>
        ${reviewTitle ? `<p style="color: #333333; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">${reviewTitle}</p>` : ''}
        ${reviewContent ? `<p style="color: #555555; font-size: 14px; line-height: 1.5; margin: 0; font-style: italic;">"${reviewContent}"</p>` : ''}
      </div>
      
      <!-- Admin Reply -->
      <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; border-left: 4px solid #1a1a2e;">
        <p style="color: #888888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Răspunsul nostru</p>
        <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0;">${adminReply}</p>
      </div>
      
      <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 25px 0 0 0;">
        Îți mulțumim că ai ales RealTrust și așteptăm cu nerăbdare să te revedem!
      </p>
      
      <p style="color: #333333; font-size: 15px; margin: 25px 0 0 0;">
        Cu respect,<br>
        <strong style="color: #d4af37;">Echipa RealTrust</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #888888; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} RealTrust. Toate drepturile rezervate.
      </p>
      <p style="color: #888888; font-size: 12px; margin: 8px 0 0 0;">
        <a href="https://realtrustaparthotel.lovable.app" style="color: #d4af37; text-decoration: none;">realtrustaparthotel.lovable.app</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RealTrust <onboarding@resend.dev>",
        to: [guestEmail],
        subject: `Răspuns la recenzia ta pentru ${propertyName}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-review-reply-notification:", error);
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
