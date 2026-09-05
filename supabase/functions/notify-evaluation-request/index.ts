import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TEAM_EMAIL = "info@realtrust.ro";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Simple in-memory rate limit: 10 requests / minute / IP. */
const RATE_MAX = 10;
const RATE_WINDOW = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (b.count >= RATE_MAX) return true;
  b.count++;
  return false;
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!),
  );
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(v: unknown, max: number): number {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(n, max));
}

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
const ro = (n: number) => n.toLocaleString("ro-RO");

const adminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

async function sendEmail(to: string, subject: string, html: string, source: string) {
  return await sendTeamEmail({ to, subject, html, source }, adminClient());
}


const wrap = (inner: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;color:#1a202c">
  <div style="max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
    <div style="background:#1a365d;padding:18px 24px;color:#ffffff">
      <div style="font-size:18px;font-weight:700">RealTrust</div>
      <div style="font-size:12px;opacity:.8">Property management &amp; regim hotelier · Timișoara</div>
    </div>
    <div style="padding:24px">${inner}</div>
    <div style="padding:16px 24px;background:#f7fafc;font-size:12px;color:#4a5568">
      RealTrust · Strada Samuel Clain Micu Nr.14, ap.4, Timișoara · +40 799 069 256 · info@realtrust.ro
    </div>
  </div>
</div>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Email provider not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const name = str(body.name, 120);
    const email = str(body.email, 255);
    const phone = str(body.phone, 30).replace(/[^\d+\s()-]/g, "");
    const propertyValue = num(body.propertyValue, 10_000_000);
    const surface = num(body.surface, 10_000);
    const managementTier = num(body.managementTier, 100);
    const targetNetAnnual = num(body.targetNetAnnual, 10_000_000);
    const targetNetMonthly = num(body.targetNetMonthly, 1_000_000);
    const classicRent = num(body.classicRent, 1_000_000);
    const realtrustIncome = num(body.realtrustIncome, 1_000_000);
    const source = str(body.source, 80) || "calculator_roi_widget";

    if (name.length < 2 || !isEmail(email) || phone.length < 6 || propertyValue <= 0) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summaryRows = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#4a5568">Valoare proprietate</td><td style="padding:6px 0;text-align:right;font-weight:700">${ro(propertyValue)} €</td></tr>
        <tr><td style="padding:6px 0;color:#4a5568">Suprafață</td><td style="padding:6px 0;text-align:right;font-weight:700">${surface} mp</td></tr>
        <tr><td style="padding:6px 0;color:#4a5568">Comision management selectat</td><td style="padding:6px 0;text-align:right;font-weight:700">${managementTier}%</td></tr>
        <tr><td style="padding:6px 0;color:#4a5568">Chirie clasică estimată</td><td style="padding:6px 0;text-align:right;font-weight:700">${ro(classicRent)} €/lună</td></tr>
        <tr><td style="padding:6px 0;color:#4a5568">Venit estimat cu RealTrust</td><td style="padding:6px 0;text-align:right;font-weight:700">${ro(realtrustIncome)} €/lună</td></tr>
        <tr><td style="padding:10px 0;border-top:1px solid #e2e8f0;color:#4a5568">Randament net de referință (9,4%)</td><td style="padding:10px 0;border-top:1px solid #e2e8f0;text-align:right;font-weight:700;color:#1a365d">${ro(targetNetAnnual)} €/an</td></tr>
        <tr><td style="padding:0;color:#4a5568">≈ pe lună</td><td style="padding:0;text-align:right;font-weight:700">${ro(targetNetMonthly)} €</td></tr>
      </table>
      <p style="font-size:12px;color:#718096;margin-top:12px">
        Ipoteze afișate transparent: randament net de referință 9,4%/an, grad de ocupare 75%, deducere 27% (management, costuri operaționale și taxe).
        Estimarea este orientativă și se confirmă după evaluarea concretă a apartamentului.
      </p>`;

    // 1) Alertă echipa RealTrust
    const teamHtml = wrap(`
      <h2 style="margin:0 0 6px;font-size:20px">Cerere nouă de evaluare / proiecție</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#4a5568">Sursă: ${esc(source)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
        <tr><td style="padding:6px 0;color:#4a5568">Nume</td><td style="padding:6px 0;text-align:right;font-weight:700">${esc(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#4a5568">Telefon</td><td style="padding:6px 0;text-align:right;font-weight:700">${esc(phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#4a5568">Email</td><td style="padding:6px 0;text-align:right;font-weight:700">${esc(email)}</td></tr>
      </table>
      ${summaryRows}
      <p style="margin-top:18px">
        <a href="https://wa.me/${esc(phone.replace(/[^\d]/g, ""))}" style="background:#1a365d;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">Scrie pe WhatsApp</a>
      </p>`);

    // 2) Confirmare pentru proprietar
    const ownerHtml = wrap(`
      <h2 style="margin:0 0 10px;font-size:20px">Am primit cererea ta, ${esc(name)}</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#2d3748">
        Mai jos ai rezumatul proiecției estimate pentru apartamentul tău. Un consultant RealTrust te contactează
        în cel mai scurt timp pentru evaluarea detaliată.
      </p>
      ${summaryRows}
      <p style="margin-top:18px">
        <a href="https://realtrust.ro/pentru-proprietari" style="background:#D4AF37;color:#1a365d;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">Vezi cum lucrăm</a>
      </p>`);

    const [team, owner] = await Promise.all([
      sendEmail(TEAM_EMAIL, `📈 Cerere evaluare: ${name} — ${ro(propertyValue)} € · ${surface} mp`, teamHtml),
      sendEmail(email, "Proiecția ta de randament RealTrust", ownerHtml),
    ]);

    return new Response(JSON.stringify({ success: true, team, owner }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-evaluation-request error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
