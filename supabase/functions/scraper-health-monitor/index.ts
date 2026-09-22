// Scraper Health Monitor — detectează blocajele scraperului și le remediază automat.
//
// Ce verifică și ce repară (toate acțiunile sunt mărginite și idempotente):
//   1. Scanări blocate (prospect_scan_jobs / keyword_radar_runs rămase "running")
//      → marcate failed, ca următoarea rulare programată să poată porni.
//   2. Portaluri blocate anti-bot (blocked_alerts / engine_stats din ultimele rulări)
//      → dezactivate temporar (cooldown) în platform_scan_config, ca scanarea să nu
//        consume bugetul pe o sursă care returnează 0 rezultate.
//   3. Auto-revenire: portalurile dezactivate automat se reactivează după cooldown.
//   4. Cuvinte cheie cu zero rezultate repetate → dezactivate cu motiv; cele
//      dezactivate automat de peste 10 zile se reactivează pentru retestare.
//   5. Alertă e-mail (o singură dată per incident) către echipă.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

const STUCK_JOB_MINUTES = 15;
const RECENT_RUNS = 25;
const BLOCKED_DISABLE_THRESHOLD = 3;   // rulări consecutive blocate
const PLATFORM_COOLDOWN_HOURS = 6;
const KEYWORD_ZERO_THRESHOLD = 4;
const KEYWORD_RETEST_DAYS = 10;
const MAX_ACTIONS_PER_RUN = 40;        // buget de lucru per rulare
const ALERT_TO = "info@realtrust.ro";

type Sb = ReturnType<typeof createClient>;

const nowIso = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

async function liveLog(sb: Sb, level: string, message: string, details: Record<string, unknown> = {}) {
  try {
    await sb.from("automation_live_logs").insert({
      source: "scraper_health", level, message, details, job_key: "scraper.health_monitor",
    });
  } catch { /* logger nu aruncă niciodată */ }
}

/** Deschide sau actualizează un incident; returnează true dacă e nou. */
async function openIncident(
  sb: Sb,
  kind: string,
  target: string,
  severity: "warning" | "critical",
  detail: Record<string, unknown>,
  remediation: string,
): Promise<boolean> {
  const { data: existing } = await sb
    .from("scraper_health_incidents")
    .select("id, occurrences")
    .eq("kind", kind).eq("target", target).eq("status", "open")
    .maybeSingle();

  if (existing) {
    await sb.from("scraper_health_incidents").update({
      occurrences: (existing.occurrences as number) + 1,
      last_seen_at: nowIso(),
      detail, remediation, severity,
    }).eq("id", existing.id as string);
    return false;
  }
  await sb.from("scraper_health_incidents").insert({
    kind, target, severity, detail, remediation, status: "open",
  });
  return true;
}

async function resolveIncident(sb: Sb, kind: string, target: string, remediation: string) {
  await sb.from("scraper_health_incidents")
    .update({ status: "resolved", resolved_at: nowIso(), remediation })
    .eq("kind", kind).eq("target", target).eq("status", "open");
}

/** Agregă starea fiecărui portal din rezultatele ultimelor scanări. */
function platformSignals(rows: Array<Record<string, any>>) {
  // platform -> listă cronologică (recent → vechi) de "blocked" | "ok" | "zero"
  const series = new Map<string, Array<"blocked" | "ok" | "zero">>();
  const push = (p: string, v: "blocked" | "ok" | "zero") => {
    const key = p.trim();
    if (!key) return;
    const arr = series.get(key) ?? [];
    arr.push(v);
    series.set(key, arr);
  };

  for (const row of rows) {
    const result = (row.result ?? {}) as Record<string, any>;
    const alerts = Array.isArray(result.blocked_alerts) ? result.blocked_alerts : [];
    const blockedPlatforms = new Set<string>(
      alerts.map((a: any) => String(a?.platform ?? "")).filter(Boolean),
    );
    const listings = Array.isArray(result.listings) ? result.listings : [];
    const okPlatforms = new Set<string>(
      listings.map((l: any) => String(l?.source_platform ?? "")).filter(Boolean),
    );
    for (const p of okPlatforms) push(p, "ok");
    for (const p of blockedPlatforms) if (!okPlatforms.has(p)) push(p, "blocked");
  }
  return series;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  ) as Sb;

  const actions: string[] = [];
  const newIncidents: Array<{ kind: string; target: string; remediation: string }> = [];
  let budget = MAX_ACTIONS_PER_RUN;
  const spend = () => (budget-- > 0);

  try {
    // ── 1. scanări blocate ────────────────────────────────────────────────
    const cutoff = minutesAgo(STUCK_JOB_MINUTES);
    const { data: stuckJobs } = await sb
      .from("prospect_scan_jobs")
      .select("id, status, updated_at, current_platform, current_keyword")
      .in("status", ["running", "pending"])
      .lt("updated_at", cutoff)
      .limit(10);

    for (const job of stuckJobs ?? []) {
      if (!spend()) break;
      await sb.from("prospect_scan_jobs").update({
        status: "failed",
        finished_at: nowIso(),
        error_message: `Auto-recuperat: scanare blocată peste ${STUCK_JOB_MINUTES} min`,
      }).eq("id", job.id as string);
      actions.push(`scanare blocată deblocată (${String(job.current_platform ?? "necunoscut")})`);
      if (await openIncident(sb, "stuck_job", String(job.id), "critical", {
        current_platform: job.current_platform, current_keyword: job.current_keyword,
        stuck_since: job.updated_at,
      }, "Scanarea a fost închisă automat ca failed, coada e liberă.")) {
        newIncidents.push({ kind: "stuck_job", target: String(job.id), remediation: "Scanare blocată închisă automat." });
      }
      await resolveIncident(sb, "stuck_job", String(job.id), "Scanare blocată închisă automat.");
    }

    const { data: stuckRadar } = await sb
      .from("keyword_radar_runs")
      .select("id, status, started_at")
      .eq("status", "running")
      .lt("started_at", minutesAgo(STUCK_JOB_MINUTES))
      .limit(10);
    for (const run of stuckRadar ?? []) {
      if (!spend()) break;
      await sb.from("keyword_radar_runs").update({
        status: "failed", finished_at: nowIso(),
        error: `Auto-recuperat: rulare blocată peste ${STUCK_JOB_MINUTES} min`,
      }).eq("id", run.id as string);
      actions.push("rulare Keyword Radar blocată deblocată");
    }

    // ── 2+3. portaluri blocate / auto-revenire ────────────────────────────
    // Doar scanările din ultimele 24h — datele vechi nu trebuie să dezactiveze portaluri.
    const { data: recentRuns } = await sb
      .from("prospect_scan_jobs")
      .select("result, created_at")
      .gte("created_at", minutesAgo(24 * 60))
      .order("created_at", { ascending: false })
      .limit(RECENT_RUNS);

    const series = platformSignals(recentRuns ?? []);
    const { data: platforms } = await sb
      .from("platform_scan_config")
      .select("platform, is_enabled, notes");

    for (const cfg of platforms ?? []) {
      const platform = String(cfg.platform);
      const signals = series.get(platform) ?? [];
      let consecutiveBlocked = 0;
      for (const s of signals) {
        if (s === "ok") break;
        consecutiveBlocked++;
      }
      const hasOk = signals.includes("ok");

      const { data: health } = await sb
        .from("scraper_platform_health")
        .select("platform, auto_disabled, cooldown_until")
        .eq("platform", platform)
        .maybeSingle();

      await sb.from("scraper_platform_health").upsert({
        platform,
        consecutive_blocked: consecutiveBlocked,
        last_ok_at: hasOk ? nowIso() : (health ? undefined : null),
        last_blocked_at: consecutiveBlocked > 0 ? nowIso() : undefined,
        updated_at: nowIso(),
      }, { onConflict: "platform" });

      // auto-revenire după cooldown
      if (health?.auto_disabled && health.cooldown_until && new Date(String(health.cooldown_until)) <= new Date()) {
        if (!spend()) break;
        await sb.from("platform_scan_config").update({ is_enabled: true, notes: null }).eq("platform", platform);
        await sb.from("scraper_platform_health").update({
          auto_disabled: false, cooldown_until: null, consecutive_blocked: 0,
          last_reason: "reactivat automat după cooldown", updated_at: nowIso(),
        }).eq("platform", platform);
        await resolveIncident(sb, "platform_blocked", platform, "Portal reactivat automat după cooldown.");
        actions.push(`${platform}: reactivat după cooldown`);
        continue;
      }

      // blocaj persistent → dezactivare temporară
      if (!health?.auto_disabled && cfg.is_enabled && consecutiveBlocked >= BLOCKED_DISABLE_THRESHOLD) {
        if (!spend()) break;
        const cooldownUntil = new Date(Date.now() + PLATFORM_COOLDOWN_HOURS * 3_600_000).toISOString();
        await sb.from("platform_scan_config").update({
          is_enabled: false,
          notes: `Dezactivat automat (anti-bot / HTML schimbat). Revine la ${cooldownUntil}.`,
        }).eq("platform", platform);
        await sb.from("scraper_platform_health").upsert({
          platform, auto_disabled: true, cooldown_until: cooldownUntil,
          consecutive_blocked: consecutiveBlocked,
          last_reason: "blocaj repetat la descoperire", updated_at: nowIso(),
        }, { onConflict: "platform" });
        actions.push(`${platform}: dezactivat temporar ${PLATFORM_COOLDOWN_HOURS}h`);
        if (await openIncident(sb, "platform_blocked", platform, "critical", {
          consecutive_blocked: consecutiveBlocked, cooldown_until: cooldownUntil,
        }, `Portal dezactivat ${PLATFORM_COOLDOWN_HOURS}h; se reactivează automat.`)) {
          newIncidents.push({
            kind: "platform_blocked", target: platform,
            remediation: `Dezactivat temporar ${PLATFORM_COOLDOWN_HOURS}h, revine automat.`,
          });
        }
      } else if (hasOk && consecutiveBlocked === 0) {
        await resolveIncident(sb, "platform_blocked", platform, "Portalul returnează din nou anunțuri.");
      }
    }

    // ── 4. cuvinte cheie ──────────────────────────────────────────────────
    const { data: zeroKeywords } = await sb
      .from("scraper_search_keywords")
      .select("id, keyword, platform, consecutive_zero, is_active")
      .eq("is_active", true)
      .gte("consecutive_zero", KEYWORD_ZERO_THRESHOLD)
      .limit(15);

    for (const kw of zeroKeywords ?? []) {
      if (!spend()) break;
      await sb.from("scraper_search_keywords").update({
        is_active: false,
        auto_disabled_reason: `Auto: ${kw.consecutive_zero} scanări fără rezultate`,
        updated_at: nowIso(),
      }).eq("id", kw.id as string);
      actions.push(`cuvânt-cheie dezactivat: ${String(kw.keyword).slice(0, 60)}`);
      await openIncident(sb, "keyword_zero", String(kw.keyword).slice(0, 120), "warning", {
        platform: kw.platform, consecutive_zero: kw.consecutive_zero,
      }, "Dezactivat automat; se retestează după 10 zile.");
    }

    const { data: retestKeywords } = await sb
      .from("scraper_search_keywords")
      .select("id, keyword")
      .eq("is_active", false)
      .not("auto_disabled_reason", "is", null)
      .lt("updated_at", minutesAgo(KEYWORD_RETEST_DAYS * 24 * 60))
      .limit(10);

    for (const kw of retestKeywords ?? []) {
      if (!spend()) break;
      await sb.from("scraper_search_keywords").update({
        is_active: true, consecutive_zero: 0, auto_disabled_reason: null, updated_at: nowIso(),
      }).eq("id", kw.id as string);
      await resolveIncident(sb, "keyword_zero", String(kw.keyword).slice(0, 120), "Reactivat pentru retestare.");
      actions.push(`cuvânt-cheie reactivat pentru retestare: ${String(kw.keyword).slice(0, 60)}`);
    }

    // ── 5. alertă e-mail, o singură dată per incident ─────────────────────
    if (newIncidents.length > 0) {
      const { data: toAlert } = await sb
        .from("scraper_health_incidents")
        .select("id, kind, target, severity, remediation")
        .eq("status", "open")
        .is("alerted_at", null)
        .limit(10);

      if ((toAlert ?? []).length > 0) {
        const rows = (toAlert ?? []).map(
          (i) => `<li><b>${escapeHtml(i.kind)}</b> · ${escapeHtml(i.target)} — ${escapeHtml(i.remediation ?? "")}</li>`,
        ).join("");
        const res = await sendTeamEmail({
          to: ALERT_TO,
          subject: `Scraper: ${(toAlert ?? []).length} blocaj(e) detectate și remediate`,
          html: `<h2>Blocaje scraper</h2><ul>${rows}</ul><p>Remedierile au fost aplicate automat.</p>`,
          source: "scraper-health-monitor",
        }, sb);
        if (res.sent) {
          await sb.from("scraper_health_incidents")
            .update({ alerted_at: nowIso() })
            .in("id", (toAlert ?? []).map((i) => i.id as string));
        }
      }
    }

    await liveLog(sb, actions.length ? "success" : "info",
      actions.length ? `Remedieri aplicate: ${actions.length}` : "Niciun blocaj detectat",
      { actions, new_incidents: newIncidents.length });

    return new Response(JSON.stringify({
      success: true,
      actions,
      actions_count: actions.length,
      new_incidents: newIncidents.length,
      budget_left: Math.max(0, budget),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    await liveLog(sb, "error", `Monitor blocaje scraper a eșuat: ${msg}`, { actions });
    return new Response(JSON.stringify({ success: false, error: msg, actions }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
