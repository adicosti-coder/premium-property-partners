/**
 * Real User Monitoring (RUM) for Core Web Vitals.
 *
 * Uses the official `web-vitals` library to capture LCP, CLS, INP, FCP, TTFB
 * from real visitor sessions and reports them via GA4 (`event: web_vitals`) +
 * an optional external webhook (VITE_MAKE_WEB_VITALS_WEBHOOK_URL).
 *
 * Loaded AFTER first user interaction (see src/main.tsx) so the measurement
 * code itself does not affect the metrics it measures.
 */
import type { Metric } from "web-vitals";

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

function report(metric: Metric) {
  sendToGtag(metric);
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
