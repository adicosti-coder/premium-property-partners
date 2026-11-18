// Core Web Vitals regression rules, shared by the regression check edge
// function and the admin dashboard. Pure TypeScript (no Deno/Vite imports).

export type MonitoredMetric = "LCP" | "CLS" | "INP";
export type DeviceClass = "mobile" | "desktop";
export type VitalRating = "good" | "needs-improvement" | "poor";

export const MONITORED_METRICS: MonitoredMetric[] = ["LCP", "CLS", "INP"];
export const DEVICE_CLASSES: DeviceClass[] = ["mobile", "desktop"];

/** Google's Core Web Vitals thresholds (p75). LCP/INP in ms, CLS unitless. */
export const CWV_THRESHOLDS: Record<MonitoredMetric, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
};

/** Fewer readings than this are too little data to judge a window. */
export const MIN_SAMPLES = 30;
/** Recent window compared against the baseline that precedes it. */
export const CURRENT_WINDOW_DAYS = 3;
export const BASELINE_WINDOW_DAYS = 14;
/** p75 must be this much worse (relative) than the baseline to count. */
export const RELATIVE_REGRESSION = 0.2;
/** ...and at least this much worse in absolute terms (ignores noise). */
export const MIN_ABSOLUTE_REGRESSION: Record<MonitoredMetric, number> = {
  LCP: 300,
  CLS: 0.02,
  INP: 50,
};

export function rateVital(metric: MonitoredMetric, p75: number): VitalRating {
  const t = CWV_THRESHOLDS[metric];
  if (p75 <= t.good) return "good";
  if (p75 <= t.poor) return "needs-improvement";
  return "poor";
}

export function formatVital(metric: MonitoredMetric, value: number): string {
  // Romanian decimal comma (2,90 s) — shown in the admin page, e-mail and WhatsApp.
  if (metric === "CLS") return value.toFixed(3).replace(".", ",");
  if (metric === "LCP") return `${(value / 1000).toFixed(2).replace(".", ",")} s`;
  return `${Math.round(value)} ms`;
}

export interface WindowStat {
  samples: number;
  p75: number;
}

export interface RegressionVerdict {
  severity: "warning" | "error";
  reason: string;
}

/**
 * Decides whether the recent window is a regression worth alerting on.
 * - too few recent readings → no verdict;
 * - recent p75 still "good" → never alert;
 * - with a usable baseline: alert when p75 is ≥20% and a meaningful absolute
 *   amount worse, or when it newly crossed into "poor";
 * - without a usable baseline: alert only when p75 is "poor".
 */
export function evaluateRegression(
  metric: MonitoredMetric,
  device: DeviceClass,
  current: WindowStat | null | undefined,
  baseline: WindowStat | null | undefined,
): RegressionVerdict | null {
  if (!current || current.samples < MIN_SAMPLES || !Number.isFinite(current.p75)) return null;
  const currentRating = rateVital(metric, current.p75);
  if (currentRating === "good") return null;

  const deviceLabel = device === "mobile" ? "telefon" : "calculator";
  const now = formatVital(metric, current.p75);
  const severity = currentRating === "poor" ? "error" : "warning";
  const hasBaseline = !!baseline && baseline.samples >= MIN_SAMPLES && Number.isFinite(baseline.p75);

  if (!hasBaseline) {
    if (currentRating !== "poor") return null;
    return { severity, reason: `${metric} pe ${deviceLabel} este slab: ${now} (fără perioadă anterioară de comparat).` };
  }

  const before = formatVital(metric, baseline!.p75);
  const delta = current.p75 - baseline!.p75;
  const relativeWorse = baseline!.p75 > 0 ? delta / baseline!.p75 >= RELATIVE_REGRESSION : delta > 0;
  const worse = relativeWorse && delta >= MIN_ABSOLUTE_REGRESSION[metric];
  const newlyPoor = currentRating === "poor" && rateVital(metric, baseline!.p75) !== "poor";

  if (!worse && !newlyPoor) return null;
  return { severity, reason: `${metric} pe ${deviceLabel} s-a înrăutățit: ${before} → ${now}.` };
}

/** One alert per metric, device and calendar day (UTC). */
export function regressionAlertKey(metric: MonitoredMetric, device: DeviceClass, at: Date): string {
  return `${metric}|${device}|${at.toISOString().slice(0, 10)}`;
}
