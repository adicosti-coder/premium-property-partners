// deliver-yield-report
// Stores the personalised yield report PDF (generated client-side on /multumire)
// in the private `lead-reports` bucket, returns a 7-day signed URL that can be
// shared over WhatsApp, and optionally emails the PDF to the owner.
//
// Public endpoint: no session required (owners are anonymous at this point), so
// input is strictly validated and IP rate-limited.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
const MAX_PDF_B64 = 4_000_000; // ~3MB binary
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const limited = applyRateLimit(req, corsHeaders, { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400);

    const { pdfBase64, name, email, phone } = body as Record<string, unknown>;

    if (typeof pdfBase64 !== "string" || pdfBase64.length < 100 || pdfBase64.length > MAX_PDF_B64) {
      return json({ error: "Invalid PDF payload" }, 400);
    }
    if (!/^[A-Za-z0-9+/=\s]+$/.test(pdfBase64)) return json({ error: "Invalid PDF encoding" }, 400);

    const safeName = typeof name === "string" ? name.trim().slice(0, 80) : "";
    const ownerEmail = typeof email === "string" && EMAIL_RE.test(email.trim()) ? email.trim() : null;
    const ownerPhone = typeof phone === "string" ? phone.replace(/[^\d+]/g, "").slice(0, 20) : "";

    const bytes = b64ToBytes(pdfBase64.replace(/\s/g, ""));
    if (bytes.length < 200) return json({ error: "Invalid PDF payload" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const path = `yield-reports/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;

    const { error: upErr } = await admin.storage
      .from("lead-reports")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });

    if (upErr) {
      console.error("deliver-yield-report upload failed:", upErr.message);
      return json({ error: "storage_failed" }, 500);
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("lead-reports")
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signErr || !signed?.signedUrl) {
      console.error("deliver-yield-report sign failed:", signErr?.message);
      return json({ error: "sign_failed" }, 500);
    }

    // Optional: email the PDF straight to the owner.
    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (ownerEmail && resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "RealTrust <noreply@realtrust.ro>",
          to: [ownerEmail],
          subject: "Raportul tău de randament — RealTrust Timișoara",
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px">
              <h2 style="color:#1a365d;margin:0 0 8px">Raportul tău de randament${safeName ? `, ${escapeHtml(safeName)}` : ""}</h2>
              <p style="color:#3c4250;line-height:1.6">Ai atașat rezumatul PDF cu estimarea de randament net (ținta 9,4% pe an),
              defalcarea deducerilor de 27% (comisioane platforme, impozit efectiv, consumabile) și planul de colaborare în 3 pași.</p>
              <p style="margin:20px 0"><a href="${signed.signedUrl}" style="background:#8b6914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Deschide raportul</a></p>
              <p style="color:#6e7480;font-size:12px">Linkul este valabil 7 zile. Ai întrebări? Scrie-ne pe WhatsApp la +40 799 069 256.</p>
            </div>`,
          attachments: [{ filename: "Raport-Randament-RealTrust.pdf", content: pdfBase64.replace(/\s/g, "") }],
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("deliver-yield-report email failed:", res.status);
    }

    // Link the report back to the freshest matching lead so the team dashboard
    // can open the exact PDF the owner received.
    try {
      const digits = ownerPhone.replace(/[^\d]/g, "").slice(-9);
      let q = admin
        .from("leads")
        .select("id")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      if (digits.length >= 9) q = q.ilike("whatsapp_number", `%${digits}%`);
      else if (ownerEmail) q = q.eq("email", ownerEmail);
      else q = q.eq("id", "00000000-0000-0000-0000-000000000000");

      const { data: leadRow } = await q.maybeSingle();
      if (leadRow?.id) {
        await admin
          .from("leads")
          .update({ report_pdf_path: path, report_delivered_at: new Date().toISOString() })
          .eq("id", leadRow.id);
      }
    } catch (linkErr) {
      console.error("deliver-yield-report lead link failed:", (linkErr as Error)?.message);
    }

    return json({ ok: true, url: signed.signedUrl, email_sent: emailSent });
  } catch (err) {
    console.error("deliver-yield-report error:", err);
    return json({ error: "unexpected" }, 500);
  }
});
