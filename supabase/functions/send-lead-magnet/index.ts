// Lead Magnet Edge Function - v2.0 - Fixed deployment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadMagnetRequest {
  name: string;
  email: string;
  source: string;
  language: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, source, language } = await req.json() as LeadMagnetRequest;

    console.log("Lead magnet request received:", { name, email, source, language });

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // 1. Save lead to leads table for admin tracking
    const { error: leadError } = await supabase
      .from("leads")
      .insert({
        name,
        email,
        whatsapp_number: "",
        property_type: "investor_guide",
        property_area: 0,
        source: source || "lead_magnet_guide_2026",
        message: `Ghidul Investitorului - ${language === "ro" ? "Română" : "English"}`,
      });

    if (leadError) {
      console.error("Lead insert error:", leadError);
    } else {
      console.log("Lead saved to database successfully");
    }

    // 2. Also save to newsletter subscribers
    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email, is_active: true },
        { onConflict: "email" }
      );

    if (dbError) {
      console.error("Newsletter subscriber error:", dbError);
    }

    // 2. Send to Make.com webhook
    if (makeWebhookUrl) {
      try {
        const makeResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            source,
            language,
            type: "lead_magnet",
            guide: "ghid_investitor_timisoara_2026",
            timestamp: new Date().toISOString(),
          }),
        });

        console.log("Make.com webhook response:", makeResponse.status);
      } catch (makeError) {
        console.error("Make.com webhook error:", makeError);
        // Continue even if Make fails
      }
    } else {
      console.warn("MAKE_WEBHOOK_URL not configured");
    }

    // 3. Send notification email to admin
    if (resendApiKey) {
      try {
        const adminEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "RealTrust Leads <onboarding@resend.dev>",
            to: ["adicosti@gmail.com"],
            subject: `🎯 Lead Magnet: ${name} vrea Ghidul Investitorului 2026`,
            html: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px; text-align: center;">
                  <h1 style="color: #d4af37; margin: 0; font-size: 24px;">🎯 Lead Magnet Nou!</h1>
                  <p style="color: #ffffff; margin: 8px 0 0; opacity: 0.9;">Ghidul Investitorului Timișoara 2026</p>
                </div>
                
                <div style="padding: 32px;">
                  <div style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h2 style="color: #1e3a5f; margin: 0 0 16px; font-size: 18px;">📋 Detalii Contact</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; width: 120px;">Nume:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Email:</td>
                        <td style="padding: 8px 0; color: #1e293b;">
                          <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Sursă:</td>
                        <td style="padding: 8px 0; color: #1e293b;">${source}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Limbă:</td>
                        <td style="padding: 8px 0; color: #1e293b;">${language === "ro" ? "Română" : "English"}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="background: #fef3c7; border-radius: 12px; padding: 16px; border-left: 4px solid #d4af37;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                      <strong>💡 Acțiune recomandată:</strong> Acest lead este interesat de investiții imobiliare. 
                      Trimite-i ghidul și contactează-l în 24h pentru o discuție personalizată.
                    </p>
                  </div>
                </div>
                
                <div style="background: #1e3a5f; padding: 16px; text-align: center;">
                  <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                    Acest email a fost generat automat de sistemul Lead Magnet RealTrust
                  </p>
                </div>
              </div>
            `,
          }),
        });

        console.log("Admin notification email response:", adminEmailResponse.status);
      } catch (emailError) {
        console.error("Admin email error:", emailError);
      }
    }

    // 4. Send guide email to user (confirmation + guide link)
    if (resendApiKey) {
      try {
        const guideContent = language === "ro" ? {
          subject: "📚 Ghidul Investitorului în Timișoara 2026 - Download",
          greeting: `Bună ${name}!`,
          intro: "Mulțumim pentru interesul tău în piața imobiliară din Timișoara! Aici găsești ghidul promis cu cele mai importante informații pentru investitori în 2026.",
          sections: [
            { title: "📊 Capitolul 1: Analiza Pieței", desc: "Tendințe și predicții pentru Capitala Culturală Europeană" },
            { title: "💰 Capitolul 2: Randament Hotelier vs Clasic", desc: "Comparație detaliată cu cifre reale din portofoliul nostru" },
            { title: "🎯 Capitolul 3: Strategii de Maximizare", desc: "Cum să obții cu 30% mai mult din proprietatea ta" },
            { title: "📍 Capitolul 4: Zone Premium Timișoara", desc: "Unde să investești pentru randament maxim" },
            { title: "🔧 Capitolul 5: Administrare Profesională", desc: "De ce contează managementul în regim hotelier" },
          ],
          cta: "Dacă vrei să discutăm despre proprietatea ta, răspunde la acest email sau sună-ne la 0756 123 456.",
          signature: "Echipa RealTrust"
        } : {
          subject: "📚 Investor's Guide to Timișoara 2026 - Download",
          greeting: `Hello ${name}!`,
          intro: "Thank you for your interest in Timișoara's real estate market! Here's the promised guide with the most important information for investors in 2026.",
          sections: [
            { title: "📊 Chapter 1: Market Analysis", desc: "Trends and predictions for the European Capital of Culture" },
            { title: "💰 Chapter 2: Hotel vs Classic Yield", desc: "Detailed comparison with real figures from our portfolio" },
            { title: "🎯 Chapter 3: Maximization Strategies", desc: "How to get 30% more from your property" },
            { title: "📍 Chapter 4: Premium Timișoara Areas", desc: "Where to invest for maximum yield" },
            { title: "🔧 Chapter 5: Professional Management", desc: "Why management matters in hotel regime" },
          ],
          cta: "If you'd like to discuss your property, reply to this email or call us at +40 756 123 456.",
          signature: "The RealTrust Team"
        };

        const userEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "RealTrust <onboarding@resend.dev>",
            to: [email],
            subject: guideContent.subject,
            html: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 32px; text-align: center;">
                  <h1 style="color: #d4af37; margin: 0; font-size: 28px;">RealTrust</h1>
                  <p style="color: #ffffff; margin: 12px 0 0; font-size: 16px; opacity: 0.9;">Ghidul Investitorului 2026</p>
                </div>
                
                <div style="padding: 32px;">
                  <p style="color: #1e293b; font-size: 18px; margin: 0 0 8px;">${guideContent.greeting}</p>
                  <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">${guideContent.intro}</p>
                  
                  <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h2 style="color: #1e3a5f; margin: 0 0 16px; font-size: 18px;">📖 Ce vei găsi în ghid:</h2>
                    ${guideContent.sections.map(s => `
                      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                        <h3 style="color: #1e3a5f; margin: 0 0 4px; font-size: 15px;">${s.title}</h3>
                        <p style="color: #64748b; margin: 0; font-size: 14px;">${s.desc}</p>
                      </div>
                    `).join("")}
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <p style="color: #ffffff; margin: 0 0 16px; font-size: 16px;">Ghidul complet urmează să fie trimis separat.</p>
                    <p style="color: #d4af37; margin: 0; font-size: 14px;">Între timp, echipa noastră te va contacta pentru detalii personalizate.</p>
                  </div>
                  
                  <div style="background: #fef3c7; border-radius: 12px; padding: 16px; border-left: 4px solid #d4af37;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                      💬 ${guideContent.cta}
                    </p>
                  </div>
                  
                  <p style="color: #64748b; margin: 24px 0 0; font-size: 14px;">
                    Cu stimă,<br/>
                    <strong style="color: #1e3a5f;">${guideContent.signature}</strong>
                  </p>
                </div>
                
                <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                    © 2026 RealTrust • Timișoara, România
                  </p>
                </div>
              </div>
            `,
          }),
        });

        console.log("User guide email response:", userEmailResponse.status);
      } catch (emailError) {
        console.error("User email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead magnet processed successfully" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Lead magnet error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
