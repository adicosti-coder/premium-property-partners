import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "approved" | "rejected" | "winner";
  submissionId: string;
  submissionTitle: string;
  userEmail: string;
  userName: string;
  feedback?: string;
  prizeName?: string;
  contestName?: string;
}

const getApprovedEmailHtml = (userName: string, articleTitle: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">✅</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Articolul tău a fost aprobat!</h1>
    </div>
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Salut <strong>${userName}</strong>! 👋
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Vești excelente! Articolul tău <strong>"${articleTitle}"</strong> a fost revizuit și aprobat de echipa noastră.
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Articolul tău este acum vizibil pentru toată comunitatea și poate primi voturi. Cu cât primești mai multe voturi, cu atât ai șanse mai mari să câștigi premiul!
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://realtrustaparthotel.lovable.app/comunitate" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Vezi articolul tău
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        Mulțumim că faci parte din comunitatea RealTrust! 💚
      </p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
      © 2026 RealTrust. Toate drepturile rezervate.
    </p>
  </div>
</body>
</html>
`;

const getRejectedEmailHtml = (userName: string, articleTitle: string, feedback?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">📝</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Feedback pentru articolul tău</h1>
    </div>
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Salut <strong>${userName}</strong>! 👋
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Am revizuit articolul tău <strong>"${articleTitle}"</strong> și, din păcate, nu îndeplinește încă criteriile noastre de publicare.
      </p>
      ${feedback ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">Feedback de la echipă:</p>
        <p style="color: #78350f; font-size: 14px; line-height: 1.5; margin: 0;">${feedback}</p>
      </div>
      ` : ''}
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 24px;">
        Nu te descuraja! Poți trimite un nou articol oricând. Suntem nerăbdători să vedem ce mai scrii!
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://realtrustaparthotel.lovable.app/trimite-articol" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Trimite un nou articol
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        Cu respect,<br>Echipa RealTrust
      </p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
      © 2026 RealTrust. Toate drepturile rezervate.
    </p>
  </div>
</body>
</html>
`;

const getWinnerEmailHtml = (userName: string, articleTitle: string, contestName: string, prizeName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
      <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 48px;">🏆</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">FELICITĂRI!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 18px;">Ai câștigat concursul!</p>
    </div>
    <div style="background: white; border-radius: 0 0 16px 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Salut <strong>${userName}</strong>! 🎉
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Suntem încântați să îți anunțăm că articolul tău <strong>"${articleTitle}"</strong> a câștigat concursul <strong>"${contestName}"</strong>!
      </p>
      <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px solid #a855f7; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: #7c3aed; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Premiul tău</p>
        <p style="color: #6d28d9; font-size: 24px; font-weight: 700; margin: 0;">🎁 ${prizeName}</p>
      </div>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Echipa noastră te va contacta în curând pentru a aranja detaliile premiului tău. Mulțumim pentru contribuția ta valoroasă la comunitatea noastră!
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://realtrustaparthotel.lovable.app/comunitate" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Vezi articolul câștigător
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        Cu drag,<br>Echipa RealTrust 💜
      </p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
      © 2026 RealTrust. Toate drepturile rezervate.
    </p>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-article-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationRequest = await req.json();
    console.log("Notification payload:", payload);

    const { type, submissionTitle, userEmail, userName, feedback, prizeName, contestName } = payload;

    let subject: string;
    let html: string;

    switch (type) {
      case "approved":
        subject = `✅ Articolul tău "${submissionTitle}" a fost aprobat!`;
        html = getApprovedEmailHtml(userName, submissionTitle);
        break;
      case "rejected":
        subject = `📝 Feedback pentru articolul "${submissionTitle}"`;
        html = getRejectedEmailHtml(userName, submissionTitle, feedback);
        break;
      case "winner":
        subject = `🏆 FELICITĂRI! Ai câștigat concursul "${contestName}"!`;
        html = getWinnerEmailHtml(userName, submissionTitle, contestName || "Concurs RealTrust", prizeName || "1 noapte de cazare gratuită");
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    console.log(`Sending ${type} email to ${userEmail}`);

    const emailResponse = await resend.emails.send({
      from: "RealTrust <onboarding@resend.dev>",
      to: [userEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-article-notification function:", error);
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
