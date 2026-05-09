// Pure helpers for SystemHealthDashboard — extracted for unit testing.

export type E2ERun = {
  id: number | string;
  test_type: string;
  status: string;
  duration_ms?: number | null;
  run_at: string;
  retry_count?: number | null;
  parent_run_id?: number | string | null;
  recovery_notified_at?: string | null;
  error_message?: string | null;
  details?: unknown;
};

export const isRecovered = (r: E2ERun): boolean =>
  r.status === "passed" && (!!r.recovery_notified_at || (r.parent_run_id != null));

export const E2E_CSV_COLUMNS = [
  "id", "test_type", "status", "duration_ms",
  "run_at", "retry_count", "parent_run_id",
  "error_message", "details",
] as const;

const csvEscape = (v: unknown): string => {
  const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
};

export function buildE2ECsv(rows: E2ERun[]): string {
  const header = E2E_CSV_COLUMNS.join(",");
  const body = rows.map((r) =>
    E2E_CSV_COLUMNS.map((c) => csvEscape((r as any)[c])).join(",")
  );
  return [header, ...body].join("\n");
}

// Heuristic incident-correlation engine.
export type IncidentInsight = {
  severity: "ok" | "warning" | "critical";
  headline: string;
  impact: string;
  hints: string[];
};

// Compute average recovery time (ms) by linking each recovered run to its parent failure.
export function computeAvgRecoveryMs(rows: E2ERun[]): number | null {
  const byId = new Map<string, E2ERun>();
  for (const r of rows) byId.set(String(r.id), r);
  const deltas: number[] = [];
  for (const r of rows) {
    if (!isRecovered(r) || r.parent_run_id == null) continue;
    const parent = byId.get(String(r.parent_run_id));
    if (!parent) continue;
    const d = new Date(r.run_at).getTime() - new Date(parent.run_at).getTime();
    if (Number.isFinite(d) && d > 0) deltas.push(d);
  }
  if (!deltas.length) return null;
  return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

export function analyzeIncidents(input: {
  invalidKeys: { provider: string }[];
  recentE2E: E2ERun[];
  latencyAlertsCount: number;
}): IncidentInsight {
  const invalidProviders = new Set(input.invalidKeys.map((k) => k.provider.toLowerCase()));
  const failedE2E = input.recentE2E.filter((r) => r.status !== "passed");
  const failedTypes = new Set(failedE2E.map((r) => r.test_type.toLowerCase()));
  const hints: string[] = [];

  // Google correlation: SEO + GA4-related fails + invalid google key.
  const googleKeyBad = invalidProviders.has("google") || invalidProviders.has("ga4") || invalidProviders.has("google-analytics");
  if (googleKeyBad && failedTypes.has("seo")) {
    hints.push("Cheia Google pare invalidă ȘI testul SEO eșuează — probabil același incident (Google API).");
  }
  // ElevenLabs / voice
  const voiceKeyBad = invalidProviders.has("elevenlabs") || invalidProviders.has("twilio");
  if (voiceKeyBad && failedTypes.has("voice")) {
    hints.push("Apelurile vocale + cheia ElevenLabs/Twilio invalidă → indisponibilitate Voice Agent.");
  }
  if (input.latencyAlertsCount > 0 && failedTypes.has("voice")) {
    hints.push("Latența voce ridicată corelată cu eșecuri E2E voce — verifică ElevenLabs status.");
  }

  // Recovery insight: average self-heal time across recovered tests.
  const avgRecoveryMs = computeAvgRecoveryMs(input.recentE2E);
  if (avgRecoveryMs != null) {
    const minutes = Math.max(1, Math.round(avgRecoveryMs / 60000));
    hints.push(`Sistemul se recuperează în medie în ~${minutes} minute în cazul erorilor temporare API.`);
  }

  if (invalidProviders.size === 0 && failedE2E.length === 0 && input.latencyAlertsCount === 0) {
    return {
      severity: "ok",
      headline: "Toate sistemele funcționează normal",
      impact: "Fără impact pentru clienți. Cron-uri, chei API și Voice Agent operaționale.",
      hints,
    };
  }
  const isCritical =
    failedE2E.some((r) => r.status === "critical") ||
    (invalidProviders.size > 0 && failedTypes.size > 0);

  const headline = isCritical
    ? "Incident activ — impact direct asupra clienților"
    : "Anomalii detectate — necesită verificare";

  const impactParts: string[] = [];
  if (failedTypes.has("voice") || voiceKeyBad) impactParts.push("agentul vocal Andrei poate fi indisponibil pentru lead-urile noi");
  if (failedTypes.has("seo") || googleKeyBad) impactParts.push("auditele SEO automate nu se mai actualizează");
  if (input.latencyAlertsCount > 0) impactParts.push("apelurile vocale au întârzieri vizibile (>1.5s)");
  const impact = impactParts.length
    ? `Posibil impact: ${impactParts.join(", ")}.`
    : "Fără impact direct identificat — monitorizare recomandată.";

  return { severity: isCritical ? "critical" : "warning", headline, impact, hints };
}

// Build daily recovery trend for the last `days` days.
// Each bucket = day, with `first_pass` (passed at first try) vs `recovered` (passed after retry).
export function buildRecoveryTrend(rows: E2ERun[], days = 30): { day: string; first_pass: number; recovered: number; failed: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Map<string, { day: string; first_pass: number; recovered: number; failed: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { day: key.slice(5), first_pass: 0, recovered: 0, failed: 0 });
  }
  for (const r of rows) {
    const key = new Date(r.run_at).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (isRecovered(r)) b.recovered++;
    else if (r.status === "passed") b.first_pass++;
    else b.failed++;
  }
  return Array.from(buckets.values());
}

export type E2EFilter = { status: string; test_type: string; query: string };

export function filterE2E(rows: E2ERun[], f: E2EFilter): E2ERun[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status === "recovered") {
      if (!isRecovered(r)) return false;
    } else if (f.status !== "all" && r.status !== f.status) return false;
    if (f.test_type !== "all" && r.test_type !== f.test_type) return false;
    if (!q) return true;
    const blob = `${r.test_type} ${r.status} ${r.error_message ?? ""} ${JSON.stringify(r.details ?? "")}`.toLowerCase();
    return blob.includes(q);
  });
}
