import { requireAdmin } from "../_shared/adminAuth.ts";
// SEO Audit Cron — runs every Monday 08:00 (Europe/Bucharest)
// 1. Audits 5 critical URLs via seo-ai-optimizer
// 2. Compares scores vs last snapshot
// 3. Alerts admins if delta < -5
// 4. Generates PDF and archives in Storage
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_URLS = [
  "https://www.realtrust.ro/",
  "https://www.realtrust.ro/cartiere",
  "https://www.realtrust.ro/pentru-proprietari",
  "https://www.realtrust.ro/investitii",
  "https://www.realtrust.ro/cazare",
];

const ALERT_THRESHOLD = 5; // points drop triggers alert

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const __auth = await requireAdmin(req, corsHeaders);
  if (!__auth.ok) return __auth.response!;


  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const runStart = Date.now();
  await sb.from("cron_run_log").insert({ job_name: "seo-audit-cron", status: "started" }).then(()=>{}, ()=>{});
  const runDate = new Date();
  const dateLabel = `${String(runDate.getDate()).padStart(2, "0")}-${String(runDate.getMonth() + 1).padStart(2, "0")}-${runDate.getFullYear()}`;
  const results: any[] = [];
  const alerts: string[] = [];

  for (const url of TARGET_URLS) {
    try {
      console.log(`[seo-cron] Auditing ${url}`);
      // 1. Trigger fresh audit via seo-ai-optimizer
      const auditRes = await fetch(`${SUPABASE_URL}/functions/v1/seo-ai-optimizer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ url, language: "ro", forceRefresh: true }),
      });

      if (!auditRes.ok) {
        console.error(`[seo-cron] Audit failed for ${url}: ${auditRes.status}`);
        continue;
      }

      const { audit } = await auditRes.json();
      if (!audit) continue;

      const overall = audit.overall_score ?? 0;
      const local = audit.local_relevance_score ?? 0;

      // 2. Find previous snapshot for delta
      const { data: prev } = await sb
        .from("seo_audit_snapshots")
        .select("overall_score, local_relevance_score, created_at")
        .eq("url", url)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const deltaOverall = prev ? overall - prev.overall_score : null;
      const deltaLocal = prev ? local - prev.local_relevance_score : null;

      // 3. Alert logic: drop > ALERT_THRESHOLD on either score
      let alertTriggered = false;
      let alertReason: string | null = null;
      if (prev && deltaOverall !== null && deltaLocal !== null) {
        if (deltaOverall <= -ALERT_THRESHOLD || deltaLocal <= -ALERT_THRESHOLD) {
          alertTriggered = true;
          const parts: string[] = [];
          if (deltaOverall <= -ALERT_THRESHOLD) parts.push(`general ${prev.overall_score}→${overall} (${deltaOverall})`);
          if (deltaLocal <= -ALERT_THRESHOLD) parts.push(`local ${prev.local_relevance_score}→${local} (${deltaLocal})`);
          alertReason = `Scădere SEO pe ${url}: ${parts.join(", ")}`;
          alerts.push(alertReason);
        }
      }

      // 4. Generate PDF (simple text-based PDF for archive)
      const pdfBytes = buildSimplePdf(audit, url, dateLabel);
      const safeUrlSlug = url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "_").slice(0, 60);
      const pdfPath = `audit-automat-${dateLabel}/${safeUrlSlug}.pdf`;

      const { error: uploadErr } = await sb.storage
        .from("seo-audit-reports")
        .upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });

      if (uploadErr) console.error(`[seo-cron] PDF upload failed:`, uploadErr);

      // 5. Save snapshot
      const { error: snapErr } = await sb.from("seo_audit_snapshots").insert({
        audit_id: audit.id,
        url,
        language: "ro",
        overall_score: overall,
        local_relevance_score: local,
        delta_overall: deltaOverall,
        delta_local: deltaLocal,
        alert_triggered: alertTriggered,
        alert_reason: alertReason,
        pdf_storage_path: uploadErr ? null : pdfPath,
        run_type: "scheduled",
      });
      if (snapErr) console.error(`[seo-cron] Snapshot insert failed:`, snapErr);

      results.push({ url, overall, local, deltaOverall, deltaLocal, alertTriggered, pdfPath });
    } catch (e: any) {
      console.error(`[seo-cron] Error for ${url}:`, e?.message || e);
    }
  }

  // 6. Send admin notifications if alerts fired
  if (alerts.length > 0) {
    const { data: admins } = await sb
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins?.length) {
      const notifications = admins.map((a: any) => ({
        user_id: a.user_id,
        title: "⚠️ Alertă SEO — scor în scădere",
        message: `${alerts.length} URL${alerts.length > 1 ? "-uri au" : " a"} înregistrat scăderi semnificative (>${ALERT_THRESHOLD}p) față de săptămâna trecută:\n\n${alerts.join("\n")}`,
        type: "warning",
        action_url: "/admin/seo-optimizer",
        action_label: "Vezi rapoartele",
      }));
      await sb.from("user_notifications").insert(notifications);
    }
  }

  const duration = Date.now() - runStart;
  console.log(`[seo-cron] Completed in ${duration}ms — ${results.length} URLs, ${alerts.length} alerts`);
  await sb.from("cron_run_log").insert({
    job_name: "seo-audit-cron", status: "success", duration_ms: duration,
    details: { urls: results.length, alerts: alerts.length },
  }).then(()=>{}, ()=>{});

  return new Response(
    JSON.stringify({ success: true, duration_ms: duration, results, alerts_count: alerts.length, date: dateLabel }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// Minimal PDF generator (no external deps) — produces a valid printable PDF with audit summary
function buildSimplePdf(audit: any, url: string, dateLabel: string): Uint8Array {
  const lines: string[] = [];
  lines.push(`SEO Audit Automat — ${dateLabel}`);
  lines.push(`URL: ${url}`);
  lines.push(``);
  lines.push(`Scor general: ${audit.overall_score ?? "-"}/100`);
  lines.push(`Scor Local SEO: ${audit.local_relevance_score ?? "-"}/100`);
  lines.push(`Cuvinte: ${audit.word_count ?? "-"} | H1: ${audit.h1_count ?? "-"}`);
  lines.push(``);
  lines.push(`TITLU SUGERAT:`);
  lines.push(truncate(audit.suggested_title || "-", 90));
  lines.push(``);
  lines.push(`META DESCRIPTION SUGERATĂ:`);
  lines.push(truncate(audit.suggested_meta || "-", 200));
  lines.push(``);
  if (Array.isArray(audit.issues) && audit.issues.length) {
    lines.push(`PROBLEME (${audit.issues.length}):`);
    audit.issues.slice(0, 8).forEach((i: any, idx: number) => {
      lines.push(`${idx + 1}. [${i.severity || "info"}] ${truncate(i.issue || "", 120)}`);
    });
    lines.push(``);
  }
  if (Array.isArray(audit.local_geo_keywords) && audit.local_geo_keywords.length) {
    lines.push(`LOCAL SEO — KEYWORDS LIPSĂ:`);
    audit.local_geo_keywords.slice(0, 5).forEach((k: any, idx: number) => {
      lines.push(`${idx + 1}. ${truncate(k.keyword || "", 100)}`);
    });
    lines.push(``);
  }
  if (Array.isArray(audit.local_recommendations) && audit.local_recommendations.length) {
    lines.push(`LOCAL SEO — RECOMANDĂRI:`);
    audit.local_recommendations.slice(0, 5).forEach((r: string, idx: number) => {
      lines.push(`${idx + 1}. ${truncate(r, 150)}`);
    });
  }

  return encodeMinimalPdf(lines);
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Build a tiny valid single-page PDF using Helvetica.
// Strips diacritics to ensure WinAnsi-safe glyphs.
function encodeMinimalPdf(lines: string[]): Uint8Array {
  const safeLines = lines.map((l) => sanitizeForPdf(l));
  const lineHeight = 14;
  const startY = 800;
  let textOps = `BT /F1 11 Tf 50 ${startY} Td 14 TL\n`;
  safeLines.forEach((l, i) => {
    if (i === 0) textOps += `(${escapePdfString(l)}) Tj\n`;
    else textOps += `T* (${escapePdfString(l)}) Tj\n`;
  });
  textOps += `ET`;

  const stream = textOps;
  const objs: string[] = [];
  objs.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objs.push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`);
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);

  let pdf = `%PDF-1.4\n`;
  const offsets: number[] = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapePdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function sanitizeForPdf(s: string): string {
  // Strip Romanian diacritics → ASCII (Helvetica WinAnsi is limited)
  return s
    .replace(/[ăâ]/g, "a").replace(/[ĂÂ]/g, "A")
    .replace(/[î]/g, "i").replace(/[Î]/g, "I")
    .replace(/[șş]/g, "s").replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t").replace(/[ȚŢ]/g, "T")
    .replace(/[„""]/g, '"').replace(/[‚'']/g, "'")
    .replace(/–|—/g, "-").replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}
