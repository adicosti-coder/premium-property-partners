/**
 * Real User Monitoring (RUM) for Core Web Vitals.
 *
 * Uses the official `web-vitals` library to capture LCP, CLS, INP, FCP, TTFB
 * from real visitor sessions and reports them via GA4 (`event: web_vitals`),
 * our backend (`record_web_vital`, checked for regressions every 6h by
 * `web-vitals-regression-check`) and an optional external webhook
 * (VITE_MAKE_WEB_VITALS_WEBHOOK_URL).
 *
 * Loaded AFTER first user interaction (see src/main.tsx) so the measurement
 * code itself does not affect the metrics it measures.
 */
import type { Metric } from "web-vitals";
import { deviceClassForWidth, pageGroupForPath, shouldReportVitals } from "@/lib/webVitalsBeacon";

type WindowWithGtag = Window & {
  gtag?: (...args: unknown[]) => void;
};

const WEBHOOK_URL = (import.meta.env.VITE_MAKE_WEB_VITALS_WEBHOOK_URL as string | undefined) || "";

function buildPayload(metric: Metric) {
  return {
    name: metric.name,
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating, // "good" | "needs-improvement" | "poor"
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    path: typeof window !== "undefined" ? window.location.pathname : "",
    href: typeof window !== "undefined" ? window.location.href : "",
    ts: Date.now(),
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

function sendToGtag(metric: Metric) {
  if (typeof window === "undefined") return;
  const w = window as WindowWithGtag;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", metric.name, {
    event_category: "Web Vitals",
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    non_interaction: true,
  });
}

function sendToWebhook(metric: Metric) {
  if (!WEBHOOK_URL) return;
  try {
    const body = JSON.stringify(buildPayload(metric));
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(WEBHOOK_URL, blob);
      return;
    }
    void fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never throw from telemetry
  }
}

// Public URL + publishable key, injected by vite.config.ts (avoids pulling the
// full backend client into this lazily loaded telemetry chunk).
const SUPABASE_PUBLIC_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
const SUPABASE_PUBLIC_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || "";
const RELEASE = typeof __APP_RELEASE__ === "string" ? __APP_RELEASE__ : "necunoscut";

function sendToBackend(metric: Metric) {
  if (typeof window === "undefined" || !SUPABASE_PUBLIC_URL || !SUPABASE_PUBLIC_ANON_KEY) return;
  if (!shouldReportVitals(window.location.hostname)) return;
  try {
    void fetch(`${SUPABASE_PUBLIC_URL}/rest/v1/rpc/record_web_vital`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLIC_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLIC_ANON_KEY}`,
      },
      body: JSON.stringify({
        p_metric: metric.name,
        p_metric_id: metric.id,
        p_value: metric.value,
        p_rating: metric.rating,
        p_device: deviceClassForWidth(window.innerWidth),
        p_page_group: pageGroupForPath(window.location.pathname),
        p_release: RELEASE,
      }),
    }).catch(() => {});
  } catch {
    // never throw from telemetry
  }
}

function report(metric: Metric) {
  sendToGtag(metric);
  sendToBackend(metric);
  sendToWebhook(metric);
}

export async function initWebVitals() {
  if (typeof window === "undefined") return;
  try {
    const { onLCP, onCLS, onINP, onFCP, onTTFB } = await import("web-vitals");
    onLCP(report);
    onCLS(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  } catch {
    // ignore: telemetry must never break the app
  }
}
