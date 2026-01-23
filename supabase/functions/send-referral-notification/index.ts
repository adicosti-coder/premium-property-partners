import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "RealTrust <noreply@realtrust.ro>",
      to: [to],
      subject,
      html,
    }),
  });
  
  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Resend API error: ${errorData}`);
  }
  
  return res.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReferralNotificationRequest {
  referrerName: string;
  referrerEmail: string;
  ownerName: string;
  newStatus: string;
  oldStatus: string;
  propertyLocation?: string;
  rewardPropertyName?: string;
  rewardCheckIn?: string;
  rewardCheckOut?: string;
}

const statusLabels: Record<string, { ro: string; en: string }> = {
  pending: { ro: "În așteptare", en: "Pending" },
  contacted: { ro: "Contactat", en: "Contacted" },
  meeting_scheduled: { ro: "Întâlnire programată", en: "Meeting Scheduled" },
  contract_signed: { ro: "Contract semnat", en: "Contract Signed" },
  reward_granted: { ro: "Premiu acordat", en: "Reward Granted" },
  rejected: { ro: "Respins", en: "Rejected" },
};

const getEmailContent = (data: ReferralNotificationRequest) => {
  const statusLabel = statusLabels[data.newStatus]?.ro || data.newStatus;
  
  switch (data.newStatus) {
    case "contacted":
      return {
        subject: "🎉 Vești bune! Am contactat proprietarul recomandat",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: #d4af37; margin: 0 0 16px; font-size: 28px;">🎉 Vești bune, ${data.referrerName}!</h1>
                <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">Recomandarea ta avansează!</p>
              </div>
              
              <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Îți mulțumim pentru recomandarea făcută! Vrem să te anunțăm că am contactat pe <strong>${data.ownerName}</strong>
                  ${data.propertyLocation ? ` referitor la proprietatea din <strong>${data.propertyLocation}</strong>` : ""}.
                </p>
                
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                  <p style="color: #1e40af; margin: 0; font-size: 14px;">
                    <strong>Status actualizat:</strong> ${statusLabel}
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                  Te vom ține la curent cu evoluția discuțiilor. Dacă totul merge bine și se semnează un contract de administrare, 
                  vei primi premiul tău - un <strong>weekend gratuit</strong> într-una din proprietățile noastre! 🏠✨
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Cu drag,<br>Echipa RealTrust
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "meeting_scheduled":
      return {
        subject: "📅 Întâlnire programată cu proprietarul recomandat",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: #d4af37; margin: 0 0 16px; font-size: 28px;">📅 Progres excelent!</h1>
                <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">Întâlnire programată cu succes</p>
              </div>
              
              <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Dragă ${data.referrerName},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Avem vești foarte bune! Am programat o întâlnire cu <strong>${data.ownerName}</strong>
                  ${data.propertyLocation ? ` pentru a discuta despre proprietatea din <strong>${data.propertyLocation}</strong>` : ""}.
                </p>
                
                <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                  <p style="color: #6b21a8; margin: 0; font-size: 14px;">
                    <strong>Status actualizat:</strong> ${statusLabel}
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                  Suntem cu un pas mai aproape de finalizarea colaborării. Te vom anunța imediat ce avem noutăți despre rezultatul întâlnirii! 🤞
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Cu drag,<br>Echipa RealTrust
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "contract_signed":
      return {
        subject: "🎊 Felicitări! Contract semnat - Premiul tău te așteaptă!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: #fbbf24; margin: 0 0 16px; font-size: 32px;">🎊 FELICITĂRI!</h1>
                <p style="color: #ffffff; margin: 0; font-size: 18px;">Contractul a fost semnat cu succes!</p>
              </div>
              
              <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Dragă ${data.referrerName},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Avem cea mai bună veste posibilă! <strong>${data.ownerName}</strong> a semnat contractul de administrare 
                  cu RealTrust${data.propertyLocation ? ` pentru proprietatea din <strong>${data.propertyLocation}</strong>` : ""}!
                </p>
                
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="color: #92400e; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Premiul tău</p>
                  <p style="color: #78350f; margin: 0; font-size: 24px; font-weight: bold;">🏠 Weekend Gratuit</p>
                  <p style="color: #a16207; margin: 8px 0 0; font-size: 14px;">într-una din proprietățile noastre premium</p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                  Echipa noastră te va contacta în curând pentru a stabili detaliile weekendului tău gratuit. 
                  Mulțumim că ai fost parte din creșterea comunității RealTrust! 💛
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Cu recunoștință,<br>Echipa RealTrust
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "reward_granted":
      return {
        subject: "🎁 Premiul tău a fost acordat - Verifică detaliile!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ffffff; margin: 0 0 16px; font-size: 32px;">🎁 Premiul tău este gata!</h1>
                <p style="color: #ffffff; margin: 0; font-size: 18px; opacity: 0.95;">Weekend gratuit confirmat</p>
              </div>
              
              <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Dragă ${data.referrerName},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  Premiul tău pentru recomandarea lui <strong>${data.ownerName}</strong> a fost acordat! 
                  Iată detaliile weekendului tău gratuit:
                </p>
                
                ${data.rewardPropertyName || data.rewardCheckIn ? `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
                  ${data.rewardPropertyName ? `
                  <p style="color: #d4af37; margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Proprietate</p>
                  <p style="color: #ffffff; margin: 0 0 16px; font-size: 18px; font-weight: bold;">${data.rewardPropertyName}</p>
                  ` : ""}
                  ${data.rewardCheckIn && data.rewardCheckOut ? `
                  <p style="color: #d4af37; margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Perioada</p>
                  <p style="color: #ffffff; margin: 0; font-size: 16px;">${data.rewardCheckIn} - ${data.rewardCheckOut}</p>
                  ` : ""}
                </div>
                ` : `
                <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="color: #92400e; margin: 0; font-size: 16px;">
                    📞 Te vom contacta în curând pentru a stabili detaliile exacte ale sejurului tău!
                  </p>
                </div>
                `}
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                  Îți mulțumim din suflet pentru încrederea acordată! Sperăm să te bucuri de experiența RealTrust și 
                  așteptăm cu nerăbdare să te găzduim. 🏠💛
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://realtrustaparthotel.lovable.app" style="display: inline-block; background: #d4af37; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Vezi Proprietățile Noastre
                </a>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Cu recunoștință,<br>Echipa RealTrust
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "rejected":
      return {
        subject: "Actualizare referral - Informații importante",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ffffff; margin: 0 0 16px; font-size: 24px;">Actualizare Referral</h1>
              </div>
              
              <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Dragă ${data.referrerName},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Îți mulțumim pentru recomandarea făcută referitoare la <strong>${data.ownerName}</strong>. 
                  Din păcate, după analizarea situației, nu vom putea continua colaborarea în acest caz.
                </p>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                  Acest lucru se poate întâmpla din diverse motive - proprietatea nu corespunde criteriilor noastre, 
                  sau proprietarul a decis să nu continue discuțiile.
                </p>
                
                <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="color: #166534; margin: 0; font-size: 14px;">
                    💡 <strong>Nu te descuraja!</strong> Poți oricând să recomanzi alte persoane și să câștigi premiul - 
                    un weekend gratuit într-una din proprietățile noastre!
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://realtrustaparthotel.lovable.app/recomanda-proprietar" style="display: inline-block; background: #d4af37; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Recomandă Alt Proprietar
                </a>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Cu drag,<br>Echipa RealTrust
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ReferralNotificationRequest = await req.json();
    
    console.log("Received referral notification request:", {
      referrerEmail: data.referrerEmail,
      newStatus: data.newStatus,
      oldStatus: data.oldStatus,
    });

    // Don't send email if status hasn't changed
    if (data.newStatus === data.oldStatus) {
      console.log("Status unchanged, skipping email");
      return new Response(
        JSON.stringify({ message: "Status unchanged, no email sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get email content based on new status
    const emailContent = getEmailContent(data);
    
    if (!emailContent) {
      console.log("No email template for status:", data.newStatus);
      return new Response(
        JSON.stringify({ message: "No email template for this status" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email to referrer
    const emailResponse = await sendEmail(
      data.referrerEmail,
      emailContent.subject,
      emailContent.html
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification email sent",
        emailId: emailResponse.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending referral notification:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
