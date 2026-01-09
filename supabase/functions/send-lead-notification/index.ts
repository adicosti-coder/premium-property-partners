import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProfitCalculatorLead {
  source: 'profit-calculator';
  name: string;
  whatsappNumber: string;
  propertyArea: number;
  propertyType: string;
  calculatedNetProfit: number;
  calculatedYearlyProfit: number;
  simulationData: {
    adr: number;
    occupancy: number;
    cleaningCost: number;
    managementFee: number;
    platformFee: number;
    avgStayDuration: number;
  };
}

interface RentalCalculatorLead {
  source: 'rental-calculator';
  simulationData: {
    city: string;
    cityName: string;
    rooms: string;
    roomName: string;
    locationType: string;
    locationName: string;
    multiplier: number;
    baseValue: number;
    estimatedMin: number;
    estimatedMax: number;
    estimatedBase: number;
    longTermRent: number;
    percentageIncrease: number;
    calculatedAt: string;
  };
}

interface QuickFormLead {
  source: 'quick_form';
  name: string;
  whatsappNumber: string;
  propertyType: string;
}

type LeadNotificationRequest = ProfitCalculatorLead | RentalCalculatorLead | QuickFormLead;

const propertyTypeLabels: Record<string, string> = {
  apartament: "Apartament",
  casa: "Casă",
  studio: "Studio",
  penthouse: "Penthouse",
  vila: "Vilă",
};

const generateProfitCalculatorEmail = (leadData: ProfitCalculatorLead): string => {
  const propertyTypeLabel = propertyTypeLabels[leadData.propertyType] || leadData.propertyType;
  const whatsappClean = leadData.whatsappNumber.replace(/[^0-9]/g, '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0d453a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏠 Lead Nou din Profit Calculator</h1>
        </div>
        
        <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #0d453a; margin-top: 0; margin-bottom: 24px; font-size: 20px;">Detalii Contact</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; width: 40%;">Nume</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 500;">${leadData.name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">WhatsApp</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 500;">
                <a href="https://wa.me/${whatsappClean}" style="color: #0d453a; text-decoration: none;">${leadData.whatsappNumber}</a>
              </td>
            </tr>
          </table>
          
          <h2 style="color: #0d453a; margin-bottom: 16px; font-size: 20px;">Detalii Proprietate</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; width: 40%;">Tip Proprietate</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 500;">${propertyTypeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">Suprafață</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 500;">${leadData.propertyArea} m²</td>
            </tr>
          </table>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; margin-top: 0; margin-bottom: 12px; font-size: 16px;">💰 Profit Estimat</h3>
            <p style="margin: 0 0 8px 0; color: #15803d; font-size: 24px; font-weight: 700;">
              ${leadData.calculatedNetProfit.toLocaleString('ro-RO')} €/lună
            </p>
            <p style="margin: 0; color: #166534; font-size: 16px;">
              ${leadData.calculatedYearlyProfit.toLocaleString('ro-RO')} €/an
            </p>
          </div>
          
          <h2 style="color: #0d453a; margin-bottom: 16px; font-size: 20px;">Parametri Simulare</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; width: 50%;">Tarif mediu/noapte</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${leadData.simulationData.adr} €</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">Grad ocupare</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${leadData.simulationData.occupancy}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">Cost curățenie</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${leadData.simulationData.cleaningCost} €</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">Comision management</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${leadData.simulationData.managementFee}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">Comision platforme</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${leadData.simulationData.platformFee}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">Durată medie ședere</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${leadData.simulationData.avgStayDuration} nopți</td>
            </tr>
          </table>
          
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e4e4e7;">
            <a href="https://wa.me/${whatsappClean}" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
              📱 Contactează pe WhatsApp
            </a>
          </div>
        </div>
        
        <p style="text-align: center; color: #71717a; font-size: 12px; margin-top: 24px;">
          Acest email a fost trimis automat de sistemul RealTrust.
        </p>
      </div>
    </body>
    </html>
  `;
};

const generateRentalCalculatorEmail = (leadData: RentalCalculatorLead): string => {
  const { simulationData } = leadData;
  const calculatedAt = new Date(simulationData.calculatedAt).toLocaleString('ro-RO', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #0d453a 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📊 Lead Nou din Calculator Venituri</h1>
          <p style="color: #d4af37; margin: 8px 0 0 0; font-size: 14px;">Estimator AI pentru Proprietari</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #d4af37; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
            <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">💰 Venit Lunar Estimat</h2>
            <p style="margin: 0; color: #78350f; font-size: 36px; font-weight: 800;">
              ${simulationData.estimatedMin}€ - ${simulationData.estimatedMax}€
            </p>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
              Media: <strong>${simulationData.estimatedBase}€/lună</strong>
            </p>
          </div>

          <h2 style="color: #1a365d; margin-bottom: 16px; font-size: 18px;">🏠 Detalii Proprietate</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a; width: 40%;">📍 Oraș</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 600;">${simulationData.cityName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">🛏️ Tip Apartament</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 600;">${simulationData.roomName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #71717a;">📌 Zonă</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 600;">${simulationData.locationName}</td>
            </tr>
          </table>

          <h2 style="color: #1a365d; margin-bottom: 16px; font-size: 18px;">📈 Analiză Comparativă</h2>
          
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background-color: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px;">Chirie Standard</p>
              <p style="margin: 0; color: #18181b; font-size: 24px; font-weight: 700;">${simulationData.longTermRent}€</p>
            </div>
            <div style="flex: 1; background-color: #ecfdf5; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #059669; font-size: 12px;">Cu RealTrust</p>
              <p style="margin: 0; color: #047857; font-size: 24px; font-weight: 700;">${simulationData.estimatedBase}€</p>
            </div>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; color: #047857; font-size: 16px;">
              ✨ <strong>+${simulationData.percentageIncrease}%</strong> mai mult decât chiria pe termen lung
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px;">
            <tr>
              <td style="padding: 12px; color: #71717a; font-size: 12px;">Multiplicator zonă</td>
              <td style="padding: 12px; color: #18181b; font-size: 12px; text-align: right;">${simulationData.multiplier}x</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #71717a; font-size: 12px;">Valoare bază</td>
              <td style="padding: 12px; color: #18181b; font-size: 12px; text-align: right;">${simulationData.baseValue}€</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #71717a; font-size: 12px;">Calculat la</td>
              <td style="padding: 12px; color: #18181b; font-size: 12px; text-align: right;">${calculatedAt}</td>
            </tr>
          </table>
          
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e4e4e7;">
            <p style="color: #71717a; font-size: 14px; margin: 0 0 16px 0;">
              Acest lead a venit din Calculatorul de Venituri.<br/>
              Utilizatorul va contacta prin WhatsApp.
            </p>
          </div>
        </div>
        
        <p style="text-align: center; color: #71717a; font-size: 12px; margin-top: 24px;">
          Acest email a fost trimis automat de sistemul RealTrust.
        </p>
      </div>
    </body>
    </html>
  `;
};

const generateQuickFormEmail = (leadData: QuickFormLead): string => {
  const propertyTypeLabel = propertyTypeLabels[leadData.propertyType] || leadData.propertyType;
  const whatsappClean = leadData.whatsappNumber.replace(/[^0-9]/g, '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚡ Lead Rapid - Evaluare Gratuită</h1>
          <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Formular Quick Lead</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              🔥 Lead rapid care solicită evaluare gratuită!
            </p>
          </div>
          
          <h2 style="color: #1a365d; margin-top: 0; margin-bottom: 24px; font-size: 20px;">📋 Detalii Contact</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e4e4e7; color: #71717a; width: 40%;">👤 Nume</td>
              <td style="padding: 16px; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 600; font-size: 18px;">${leadData.name}</td>
            </tr>
            <tr>
              <td style="padding: 16px; border-bottom: 1px solid #e4e4e7; color: #71717a;">📱 WhatsApp</td>
              <td style="padding: 16px; border-bottom: 1px solid #e4e4e7; color: #18181b; font-weight: 600;">
                <a href="https://wa.me/${whatsappClean}" style="color: #0d453a; text-decoration: none; font-size: 18px;">${leadData.whatsappNumber}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px; color: #71717a;">🏠 Tip Proprietate</td>
              <td style="padding: 16px; color: #18181b; font-weight: 600; font-size: 18px;">${propertyTypeLabel}</td>
            </tr>
          </table>
          
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e4e4e7;">
            <a href="https://wa.me/${whatsappClean}" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              📱 Contactează pe WhatsApp
            </a>
            <p style="color: #71717a; font-size: 12px; margin-top: 16px;">
              Răspunde rapid pentru cea mai bună conversie!
            </p>
          </div>
        </div>
        
        <p style="text-align: center; color: #71717a; font-size: 12px; margin-top: 24px;">
          Acest email a fost trimis automat de sistemul RealTrust.
        </p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send lead notification");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: LeadNotificationRequest = await req.json();
    console.log("Lead data received:", JSON.stringify(leadData));

    let htmlContent: string;
    let emailSubject: string;

    if (leadData.source === 'rental-calculator') {
      const { simulationData } = leadData;
      htmlContent = generateRentalCalculatorEmail(leadData);
      emailSubject = `📊 Calculator Venituri: ${simulationData.roomName} în ${simulationData.locationName}, ${simulationData.cityName} - ${simulationData.estimatedBase}€/lună`;
    } else if (leadData.source === 'quick_form') {
      const quickLead = leadData as QuickFormLead;
      const propertyTypeLabel = propertyTypeLabels[quickLead.propertyType] || quickLead.propertyType;
      htmlContent = generateQuickFormEmail(quickLead);
      emailSubject = `⚡ Lead Rapid: ${quickLead.name} - ${propertyTypeLabel}`;
    } else {
      const profitLead = leadData as ProfitCalculatorLead;
      const propertyTypeLabel = propertyTypeLabels[profitLead.propertyType] || profitLead.propertyType;
      htmlContent = generateProfitCalculatorEmail(profitLead);
      emailSubject = `🏠 Lead Nou: ${profitLead.name} - ${propertyTypeLabel} ${profitLead.propertyArea}m²`;
    }

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RealTrust Leads <onboarding@resend.dev>",
        to: ["contact@realtrust.ro"],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    // Send Slack notification if webhook URL is configured
    let slackResult = null;
    if (SLACK_WEBHOOK_URL) {
      try {
        let slackMessage: string;
        
        if (leadData.source === 'rental-calculator') {
          const { simulationData } = leadData;
          slackMessage = `🏠 *Lead Nou din Calculator Venituri*\n\n` +
            `📍 *Oraș:* ${simulationData.cityName}\n` +
            `🛏️ *Tip:* ${simulationData.roomName}\n` +
            `📌 *Zonă:* ${simulationData.locationName}\n` +
            `💰 *Venit estimat:* ${simulationData.estimatedMin}€ - ${simulationData.estimatedMax}€/lună\n` +
            `📈 *+${simulationData.percentageIncrease}%* față de chirie standard`;
        } else if (leadData.source === 'quick_form') {
          const quickLead = leadData as QuickFormLead;
          const propertyTypeLabel = propertyTypeLabels[quickLead.propertyType] || quickLead.propertyType;
          slackMessage = `⚡ *Lead Rapid - Evaluare Gratuită*\n\n` +
            `👤 *Nume:* ${quickLead.name}\n` +
            `📱 *WhatsApp:* ${quickLead.whatsappNumber}\n` +
            `🏠 *Tip:* ${propertyTypeLabel}\n` +
            `🔥 _Răspunde rapid pentru conversie maximă!_`;
        } else {
          const profitLead = leadData as ProfitCalculatorLead;
          const propertyTypeLabel = propertyTypeLabels[profitLead.propertyType] || profitLead.propertyType;
          slackMessage = `🏠 *Lead Nou din Profit Calculator*\n\n` +
            `👤 *Nume:* ${profitLead.name}\n` +
            `📱 *WhatsApp:* ${profitLead.whatsappNumber}\n` +
            `🏢 *Proprietate:* ${propertyTypeLabel}, ${profitLead.propertyArea}m²\n` +
            `💰 *Profit estimat:* ${profitLead.calculatedNetProfit.toLocaleString('ro-RO')}€/lună\n` +
            `📅 *Anual:* ${profitLead.calculatedYearlyProfit.toLocaleString('ro-RO')}€`;
        }

        const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: slackMessage }),
        });

        slackResult = slackResponse.ok ? "sent" : "failed";
        console.log("Slack notification result:", slackResult);
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
        slackResult = "error";
      }
    }

    return new Response(JSON.stringify({ success: true, emailData, slackResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-lead-notification function:", error);
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
