import { requireAdmin } from "../_shared/adminAuth.ts";
// Blog Hub Weekly Digest
// Cron: weekly Monday. Computes per-location impressions, hub clicks (inline + card),
// CTR%, and emails a compact report to admin. Also returns JSON payload for orchestrator.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __auth = await requireAdmin(req, corsHeaders);
  if (!__auth.ok) return __auth.response!;


  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const endIso = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 86400_000);
  const startIso = startDate.toISOString().slice(0, 10);
  const sinceTs = startDate.toISOString();

  // Impressions by location via existing RPC
  const { data: imp, error: impErr } = await supabase.rpc("get_blog_hub_impressions_range", {
    p_start_date: startIso,
    p_end_date: endIso,
  });
  if (impErr) console.warn("[blog-hub-weekly-digest] impressions error:", impErr.message);

  // Hub click events
  const { data: clicks } = await supabase
    .from("cta_analytics")
    .select("metadata, session_id, created_at")
    .eq("cta_type", "form_submit")
    .filter("metadata->>event", "eq", "blog_location_hub_click")
    .gte("created_at", sinceTs);

  type Row = { location: string; impressions: number; inline: number; card: number; unique: number };
  const map = new Map<string, Row>();
  for (const r of (imp ?? []) as Array<{ location: string; impressions: number }>) {
    map.set(r.location, { location: r.location, impressions: r.impressions || 0, inline: 0, card: 0, unique: 0 });
  }
  const seen = new Set<string>();
  for (const c of clicks ?? []) {
    const md = (c.metadata ?? {}) as Record<string, unknown>;
    const loc = String(md.location ?? "");
    if (!loc) continue;
    const src = String(md.source ?? "");
    const row = map.get(loc) ?? { location: loc, impressions: 0, inline: 0, card: 0, unique: 0 };
    if (src === "inline") row.inline++; else if (src === "card") row.card++;
    const key = `${c.session_id}|${loc}|${src}`;
    if (!seen.has(key)) { seen.add(key); row.unique++; }
    map.set(loc, row);
  }

  const rows = [...map.values()]
    .map((r) => ({ ...r, total: r.inline + r.card, ctr: r.impressions ? (r.unique / r.impressions) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  const totals = rows.reduce(
    (acc, r) => ({ impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.total, unique: acc.unique + r.unique }),
    { impressions: 0, clicks: 0, unique: 0 },
  );
  const avgCtr = totals.impressions ? (totals.unique / totals.impressions) * 100 : 0;

  const payload = {
    period: { start: startIso, end: endIso },
    totals: { ...totals, ctr_pct: Number(avgCtr.toFixed(2)) },
    top_locations: rows.slice(0, 10),
    locations_count: rows.length,
  };

  if (dryRun) {
    return new Response(JSON.stringify({ ok: true, dry_run: true, ...payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Compose & send email digest (best-effort)
  try {
    const { data: cfg } = await supabase
      .from("system_health_thresholds").select("daily_report_email").maybeSingle();
    const recipients: string[] = String(cfg?.daily_report_email || "contact@realtrust.ro")
      .split(/[,;]/).map((s) => s.trim()).filter((s) => s.includes("@"));

    const top = rows.slice(0, 10).map((r) =>
      `<tr><td style="padding:6px 10px;">${r.location}</td><td style="text-align:right;padding:6px 10px;">${r.impressions}</td><td style="text-align:right;padding:6px 10px;">${r.inline}</td><td style="text-align:right;padding:6px 10px;">${r.card}</td><td style="text-align:right;padding:6px 10px;">${r.unique}</td><td style="text-align:right;padding:6px 10px;">${r.ctr.toFixed(2)}%</td></tr>`
    ).join("");

    const html = `<div style="font-family:system-ui,sans-serif;max-width:680px;margin:0 auto;">
      <h2 style="margin:0 0 6px;">Blog Hub Clicks · Raport Săptămânal</h2>
      <p style="color:#64748b;margin:0 0 18px;">Perioadă: ${startIso} → ${endIso}</p>
      <div style="display:flex;gap:12px;margin-bottom:18px;">
        <div style="flex:1;background:#f1f5f9;padding:12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;">Afișări</div><div style="font-size:22px;font-weight:700;">${totals.impressions}</div></div>
        <div style="flex:1;background:#f1f5f9;padding:12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;">Click-uri</div><div style="font-size:22px;font-weight:700;">${totals.clicks}</div></div>
        <div style="flex:1;background:#f1f5f9;padding:12px;border-radius:8px;"><div style="font-size:11px;color:#64748b;text-transform:uppercase;">CTR mediu</div><div style="font-size:22px;font-weight:700;">${avgCtr.toFixed(2)}%</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#0f172a;color:#fff;text-align:left;">
          <th style="padding:8px 10px;">Locație</th><th style="padding:8px 10px;text-align:right;">Afișări</th>
          <th style="padding:8px 10px;text-align:right;">Inline</th><th style="padding:8px 10px;text-align:right;">Card</th>
          <th style="padding:8px 10px;text-align:right;">Unice</th><th style="padding:8px 10px;text-align:right;">CTR</th>
        </tr></thead>
        <tbody>${top || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8;">Fără date</td></tr>'}</tbody>
      </table>
    </div>`;

    if (recipients.length) {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          to: recipients,
          subject: `Blog Hub · Raport săptămânal (${startIso} → ${endIso})`,
          html,
        },
      });
    }
  } catch (e) {
    console.warn("[blog-hub-weekly-digest] email failed:", (e as Error).message);
  }

  return new Response(JSON.stringify({ ok: true, ...payload }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
