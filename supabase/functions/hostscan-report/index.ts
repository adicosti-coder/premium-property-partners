import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders_fallback = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const {
      recipientEmail,
      recipientName,
      report,
      zone,
      rooms,
      phone,
      language = "ro",
      turnstileToken,
    } = await req.json();

    if (!recipientEmail || !report) {
      return new Response(JSON.stringify({ error: "Missing email or report" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Basic email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) || recipientEmail.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Turnstile verification (fail-open if widget unavailable per project policy,
    // but require token presence so anonymous bots can't spam silently).
    const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (TURNSTILE_SECRET && turnstileToken) {
      try {
        const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: turnstileToken }),
        });
        const j = await verify.json().catch(() => ({}));
        if (!j?.success) {
          return new Response(JSON.stringify({ error: "Captcha failed" }), {
            status: 403, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("[hostscan-report] turnstile verify error (fail-open):", (e as Error).message);
      }
    }

    // Per-email rate limit: max 2 reports per email per hour
    const sbRl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await sbRl
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("email", recipientEmail)
        .eq("source", "HostScan AI Report")
        .gte("created_at", since);
      if ((count ?? 0) >= 2) {
        return new Response(JSON.stringify({ error: "Rate limit: max 2 reports per hour for this email" }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("[hostscan-report] rate-limit check failed (continuing):", (e as Error).message);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // HTML-escape all user-supplied report fields to prevent injection in email body
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const scoreNum = Number(report.scor) || 0;
    const maxScoreNum = Number(report.max_scor) || 100;
    const scorePercent = Math.round((scoreNum / maxScoreNum) * 100);
    const scoreColor = scoreNum >= 100 ? "#10b981" : scoreNum >= 70 ? "#f59e0b" : "#ef4444";

    const recomandariHTML = (Array.isArray(report.recomandari) ? report.recomandari : [])
      .slice(0, 20)
      .map((r: unknown) => `<li style="margin-bottom:6px;color:#374151;">✅ ${esc(String(r).slice(0, 300))}</li>`)
      .join("");

    const safeZona = esc(String(report.zona || zone || "").slice(0, 100));
    const safeCategorie = esc(String(report.categorie || "Standard").slice(0, 80));
    const safeRoi = esc(String(report.roi_estimat || "").slice(0, 40));
    const safeTarif = esc(String(report.tarif_noapte ?? "").toString().slice(0, 20));
    const safeNote = esc(String(report.note_consultant || "").slice(0, 1000));
    const safeScor = esc(String(scoreNum));
    const safeMax = esc(String(maxScoreNum));

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center;">
      <h1 style="color:white;font-size:22px;margin:0;">📋 Raport HostScan AI</h1>
      <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:8px 0 0;">RealTrust · Analiză Proprietate</p>
    </div>
    
    <!-- Score -->
    <div style="padding:32px;text-align:center;">
      <div style="display:inline-block;width:120px;height:120px;border-radius:50%;border:8px solid ${scoreColor};line-height:104px;">
        <span style="font-size:36px;font-weight:bold;color:#1f2937;">${safeScor}</span>
        <span style="font-size:14px;color:#9ca3af;">/${safeMax}</span>
      </div>
      <p style="margin-top:12px;font-size:14px;color:#6b7280;">Categorie: <strong style="color:${scoreColor};">${safeCategorie}</strong></p>
    </div>
    
    <!-- Details Grid -->
    <div style="padding:0 32px 24px;display:flex;gap:12px;">
      <div style="flex:1;background:#f3f4f6;border-radius:12px;padding:16px;text-align:center;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">Zonă</p>
        <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:4px 0 0;">${safeZona}</p>
      </div>
      <div style="flex:1;background:#f3f4f6;border-radius:12px;padding:16px;text-align:center;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">ROI Estimat</p>
        <p style="font-size:16px;font-weight:bold;color:#10b981;margin:4px 0 0;">${safeRoi}</p>
      </div>
      <div style="flex:1;background:#f3f4f6;border-radius:12px;padding:16px;text-align:center;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">Tarif/Noapte</p>
        <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:4px 0 0;">${safeTarif}€</p>
      </div>
    </div>
    
    <!-- Consultant Note -->
    <div style="padding:0 32px 24px;">
      <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 12px 12px 0;padding:16px;">
        <p style="font-size:12px;color:#3b82f6;font-weight:bold;margin:0 0 4px;">💬 Nota Consultantului</p>
        <p style="font-size:13px;color:#374151;margin:0;font-style:italic;">"${safeNote}"</p>
      </div>
    </div>
    
    <!-- Recommendations -->
    ${recomandariHTML ? `
    <div style="padding:0 32px 24px;">
      <p style="font-size:13px;font-weight:bold;color:#1f2937;margin:0 0 8px;">📌 Recomandări de Optimizare:</p>
      <ul style="padding-left:0;list-style:none;margin:0;">${recomandariHTML}</ul>
    </div>` : ""}
    
    <!-- CTA -->
    <div style="padding:24px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
      <a href="https://wa.me/40799069256?text=${encodeURIComponent(`Scor HostScan: ${scoreNum}/${maxScoreNum} | ${String(report.zona || zone || "")} | ROI: ${String(report.roi_estimat || "")}`)}" 
         style="display:inline-block;background:#25d366;color:white;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
        📞 Discută cu un Consultant
      </a>
      <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">
        RealTrust · info@realtrust.ro · +40 723 154 520
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RealTrust AI <info@notify.realtrust.ro>",
        to: [recipientEmail],
        cc: ["info@realtrust.ro"],
        subject: `📋 Raport HostScan AI - ${String(report.zona || zone || "").replace(/[\r\n]/g, " ").slice(0, 100)} - Scor ${scoreNum}/${maxScoreNum}`,
        html: htmlContent,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("[hostscan-report] Resend error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Save lead
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("leads").insert({
        name: recipientName || "HostScan Lead",
        whatsapp_number: phone || "N/A",
        property_type: rooms === "Studio" ? "studio" : rooms === "1" || rooms === "2" ? "2_camere" : "3_camere",
        property_area: rooms === "Studio" ? 35 : rooms === "3" || rooms === "4+" ? 75 : 55,
        source: "HostScan AI Report",
        email: recipientEmail,
        simulation_data: report,
      });
    } catch (e) {
      console.error("[hostscan-report] Lead save error:", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[hostscan-report] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
