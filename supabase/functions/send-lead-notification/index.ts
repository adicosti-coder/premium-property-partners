import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationRequest {
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

const propertyTypeLabels: Record<string, string> = {
  apartament: "Apartament",
  casa: "Casă",
  studio: "Studio",
  penthouse: "Penthouse",
  vila: "Vilă",
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

    const propertyTypeLabel = propertyTypeLabels[leadData.propertyType] || leadData.propertyType;
    const whatsappClean = leadData.whatsappNumber.replace(/[^0-9]/g, '');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #0d453a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏠 Lead Nou din Calculator</h1>
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
            Acest email a fost trimis automat de sistemul AleStay.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AleStay Leads <onboarding@resend.dev>",
        to: ["contact@realtust.ro"],
        subject: `🏠 Lead Nou: ${leadData.name} - ${propertyTypeLabel} ${leadData.propertyArea}m²`,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailData }), {
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
