// Sends the personalised yield report PDF (generated client-side) by email via Resend.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// ~4MB base64 cap — the report is a few hundred KB in practice.
const MAX_PDF_B64 = 4_000_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400);

    const { name, email, language, pdfBase64, fileName, summary } = body as Record<string, unknown>;

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return json({ error: "Valid email is required" }, 400);
    }
    if (typeof pdfBase64 !== "string" || pdfBase64.length < 100 || pdfBase64.length > MAX_PDF_B64) {
      return json({ error: "Invalid PDF payload" }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured — skipping yield report email");
      return json({ skipped: true, reason: "email_not_configured" });
    }

    const isRo = (typeof language === "string" ? language : "ro") === "ro";
    const safeName = escapeHtml(typeof name === "string" && name.trim() ? name.trim() : isRo ? "Investitor" : "Investor");
    const attachmentName =
      typeof fileName === "string" && /^[\w.-]{4,80}\.pdf$/.test(fileName)
        ? fileName
        : "RealTrust-Raport-Randament.pdf";

    const s = (summary ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
    const netProfit = num(s.netProfit);
    const yearlyNet = num(s.yearlyNet);

    const subject = isRo
      ? "📊 Raportul tău de randament — RealTrust Timișoara"
      : "📊 Your yield report — RealTrust Timișoara";

    const rows = [
      netProfit !== null
        ? `<li>${isRo ? "Profit net estimat / lună" : "Estimated net profit / month"}: <strong>${netProfit} €</strong></li>`
        : "",
      yearlyNet !== null
        ? `<li>${isRo ? "Profit net estimat / an" : "Estimated net profit / year"}: <strong>${yearlyNet} €</strong></li>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="${isRo ? "ro" : "en"}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <h1 style="margin:0 0 12px;font-size:24px;color:#1a1f36;font-family:Georgia,serif;">
      ${isRo ? `Salut, ${safeName}!` : `Hi ${safeName}!`}
    </h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
      ${
        isRo
          ? "Găsești atașat raportul tău personalizat de randament: venit brut, deducerile operaționale (curățenie, management, comisioane platforme) și proiecția pe 12 luni."
          : "Attached is your personalised yield report: gross revenue, operating deductions (cleaning, management, platform fees) and the 12-month projection."
      }
    </p>
    ${rows ? `<ul style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">${rows}</ul>` : ""}
    <div style="text-align:center;margin:28px 0;">
      <a href="https://wa.me/40733558454" style="display:inline-block;padding:14px 32px;background:#25D366;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
        ${isRo ? "💬 Vreau evaluarea gratuită" : "💬 Get the free valuation"}
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;margin:0;">
      RealTrust Timișoara · +40 733 558 454 · info@realtrust.ro · realtrust.ro<br>
      ${
        isRo
          ? "Ai primit acest email pentru că ai cerut raportul de randament pe realtrust.ro."
          : "You received this email because you requested the yield report on realtrust.ro."
      }
    </p>
  </div>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: "RealTrust <info@notify.realtrust.ro>",
        to: [email],
        subject,
        html,
        reply_to: "info@realtrust.ro",
        attachments: [{ filename: attachmentName, content: pdfBase64 }],
      }),
    });

    const resendBody = await resendResponse.text();
    if (!resendResponse.ok) {
      console.error("Resend yield report failed:", resendResponse.status, resendBody);
      return json({ error: "Failed to send email" }, 502);
    }

    // Non-blocking admin heads-up: a warm lead just pulled a yield report.
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: "RealTrust Leads <info@notify.realtrust.ro>",
          to: ["info@realtrust.ro"],
          subject: `📊 Raport randament trimis: ${safeName}`,
          html: `<p><strong>Nume:</strong> ${safeName}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>${
            rows ? `<ul>${rows}</ul>` : ""
          }<p><strong>Sursă:</strong> Calculator randament (realtrust.ro)</p>`,
        }),
      });
    } catch (adminErr) {
      console.error("Admin notification failed (non-blocking):", adminErr);
    }

    return json({ success: true });
  } catch (error) {
    console.error("send-yield-report error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
