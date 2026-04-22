// Send Investor Guide email — delivers the PDF guide link to leads
// who submit the InvestmentGuideLeadModal on /blog/ghid-investitii-imobiliare-timisoara-2026
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvestorGuideRequest {
  name: string;
  email: string;
  language?: string;
  budget?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, language, budget } = (await req.json()) as InvestorGuideRequest;

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isRo = (language ?? "ro") === "ro";
    const siteUrl = "https://www.realtrust.ro";
    const guideUrl = `${siteUrl}/blog/ghid-investitii-imobiliare-timisoara-2026`;
    const calcUrl = `${siteUrl}/calculator-roi`;
    const whatsappUrl = "https://wa.me/40733558454?text=" + encodeURIComponent(
      isRo
        ? "Bună! Am descărcat Ghidul Investitorului 2026 și aș dori o consultanță."
        : "Hi! I downloaded the 2026 Investor Guide and would like a consultation.",
    );

    const subject = isRo
      ? "📊 Ghidul Investițiilor Imobiliare Timișoara 2026 — RealTrust"
      : "📊 Your 2026 Timișoara Real Estate Investment Guide — RealTrust";

    const html = `<!DOCTYPE html>
<html lang="${isRo ? "ro" : "en"}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;padding:8px 20px;background:linear-gradient(135deg,#8B6914,#b8860b);border-radius:50px;color:#fff;font-size:13px;font-weight:600;letter-spacing:0.5px;">
        ${isRo ? "📊 GHID INVESTIȚII GRATUIT" : "📊 FREE INVESTMENT GUIDE"}
      </div>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#78350f;font-family:Georgia,serif;">
        ${isRo ? `Mulțumim, ${name}! 🎉` : `Thank you, ${name}! 🎉`}
      </h1>
      <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
        ${
          isRo
            ? "Iată Ghidul Investițiilor Imobiliare Timișoara 2026 — analiză detaliată a pieței, ROI pe cartiere, scenarii fiscale PFA vs SRL și strategii de regim hotelier."
            : "Here is your 2026 Timișoara Real Estate Investment Guide — detailed market analysis, ROI by neighborhood, PFA vs SRL tax scenarios, and short-term rental strategies."
        }
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${guideUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#8B6914,#b8860b);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
          ${isRo ? "📖 Citește Ghidul Complet" : "📖 Read the Full Guide"}
        </a>
      </div>
      <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
        ${isRo ? 'Versiunea PDF descărcabilă este disponibilă direct în articol (buton Descarcă PDF).' : 'A downloadable PDF version is available in the article (Download PDF button).'}
      </p>
    </div>

    <div style="margin-bottom:24px;padding:24px;background:#f9fafb;border-radius:12px;">
      <h2 style="font-size:18px;color:#1f2937;margin:0 0 12px;font-family:Georgia,serif;">
        ${isRo ? "Ce vei găsi în ghid:" : "What's inside:"}
      </h2>
      <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
        <li>${isRo ? "ROI net verificat 9.4% în regim hotelier" : "Verified 9.4% net ROI in short-term rental"}</li>
        <li>${isRo ? "Top cartiere: Iosefin, Elisabetin, ISHO, Ultracentral" : "Top neighborhoods: Iosefin, Elisabetin, ISHO, Ultracentral"}</li>
        <li>${isRo ? "Comparativ fiscal PFA vs SRL (cu calculator)" : "PFA vs SRL tax comparison (with calculator)"}</li>
        <li>${isRo ? "Studii de caz cu randamente reale" : "Case studies with real returns"}</li>
      </ul>
    </div>

    <div style="text-align:center;margin:32px 0;padding:24px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
      <p style="margin:0 0 16px;font-size:15px;color:#065f46;font-weight:600;">
        ${isRo ? "Vrei o evaluare personalizată gratuită?" : "Want a free personalized valuation?"}
      </p>
      <a href="${whatsappUrl}" style="display:inline-block;padding:14px 32px;background:#25D366;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;margin:0 6px 8px;">
        ${isRo ? "💬 WhatsApp" : "💬 WhatsApp"}
      </a>
      <a href="${calcUrl}" style="display:inline-block;padding:14px 32px;background:#1f2937;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;margin:0 6px 8px;">
        ${isRo ? "🧮 Calculator ROI" : "🧮 ROI Calculator"}
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
    <p style="font-size:13px;color:#1f2937;text-align:center;line-height:1.6;margin:0 0 8px;font-weight:600;">
      RealTrust &amp; ApArt Hotel Timișoara
    </p>
    <p style="font-size:12px;color:#6b7280;text-align:center;line-height:1.6;margin:0 0 12px;">
      ${isRo ? "Consultanță și Administrare Regim Hotelier" : "Real Estate Consulting & Short-Term Rental Management"}
    </p>
    <p style="font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;margin:0;">
      +40 733 558 454 · info@realtrust.ro · realtrust.ro<br>
      ${isRo ? "Ai primit acest email pentru că ai solicitat Ghidul Investitorului pe realtrust.ro" : "You received this email because you requested the Investor Guide on realtrust.ro"}
    </p>
  </div>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "RealTrust <info@realtrust.ro>",
        to: [email],
        subject,
        html,
        reply_to: "info@realtrust.ro",
      }),
    });

    const resendBody = await resendResponse.text();
    console.log("Resend response:", resendResponse.status, resendBody);

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Optional: notify admin of new lead magnet download
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "RealTrust Leads <info@realtrust.ro>",
          to: ["info@realtrust.ro"],
          subject: `📊 Lead Ghid Investitor: ${name} (${budget ?? "buget necunoscut"})`,
          html: `<p><strong>Nume:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Buget:</strong> ${budget ?? "—"}</p><p><strong>Sursă:</strong> Ghid Investiții 2026 (blog)</p>`,
        }),
      });
    } catch (adminErr) {
      console.error("Admin notification failed (non-blocking):", adminErr);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Investor guide email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-investor-guide-email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
