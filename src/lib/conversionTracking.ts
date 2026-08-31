/**
 * Conversion tracking utility.
 *
 * Fan-out for every conversion event:
 *   1. `dataLayer` push  → Google Tag Manager (any container/tag can consume it)
 *   2. `gtag('event')`   → GA4 direct (measurement ID lives in index.html)
 *   3. `fbq('track')`    → Meta Pixel, client-side (blocked by ad blockers)
 *   4. Meta Conversions API → server-side via the `meta-conversions` edge
 *      function, using the SAME `event_id` as the pixel so Meta deduplicates
 *      the pair. This is what survives ad blockers / iOS tracking prevention.
 *
 * Consent: analytics events require `analytics_only` or `all`; Meta (pixel +
 * CAPI) is advertising and only fires on `all`. Same storage key as
 * <CookieConsent />.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

const CONSENT_KEY = "cookie_consent_v2";

/** Meta Pixel ID is a publishable value — safe in client code / env. */
export const META_PIXEL_ID: string | undefined =
  (import.meta.env.VITE_META_PIXEL_ID as string | undefined) || undefined;

type ConsentChoice = "all" | "analytics_only" | "declined";

const readConsent = (): ConsentChoice | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    // Current shape: {"choice":"all","ts":…} with a 12-month validity.
    // Older builds stored a bare (sometimes JSON-quoted) string.
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { choice?: string; ts?: number };
      if (typeof parsed.ts === "number" && Date.now() - parsed.ts > 365 * 24 * 60 * 60 * 1000) return null;
      const c = parsed.choice;
      return c === "all" || c === "analytics_only" || c === "declined" ? c : null;
    }
    const value = raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
    if (value === "all" || value === "analytics_only" || value === "declined") return value;
    return null;
  } catch {
    return null;
  }
};

export const hasAnalyticsConsent = (): boolean => {
  const c = readConsent();
  return c === "all" || c === "analytics_only";
};

/** Meta pixel + CAPI are advertising vendors → require full consent. */
export const hasAdsConsent = (): boolean => readConsent() === "all";

/* ------------------------------------------------------------------ *
 * Meta Pixel bootstrap (lazy, consent-gated, idempotent)
 * ------------------------------------------------------------------ */

let pixelInitialized = false;

export const initMetaPixel = (): void => {
  if (typeof window === "undefined") return;
  if (pixelInitialized || !META_PIXEL_ID || !hasAdsConsent()) return;
  pixelInitialized = true;

  // Standard Meta Pixel snippet, TS-safe.
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      const self = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
      if (self.callMethod) self.callMethod(...args);
      else self.queue.push(args);
    } as unknown as NonNullable<Window["fbq"]>;
    (n as unknown as { queue: unknown[] }).queue = [];
    n.loaded = true;
    n.version = "2.0";
    window.fbq = n;
    window._fbq = n;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
};

/** Meta Pixel page view on SPA route changes (no-op without consent/ID). */
export const trackMetaPageView = (): void => {
  if (!pixelInitialized) {
    initMetaPixel();
    return; // init already sends the first PageView
  }
  window.fbq?.("track", "PageView");
};

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

/** Critical funnel events — canonical names shared by GA4, GTM and Meta. */
export type CriticalConversionEvent = "Lead_Submit" | "PreCalc_Completed" | "WhatsApp_Click";

export type ConversionEvent =
  | CriticalConversionEvent
  | "contact_form_submit"
  | "generate_lead"
  | "generate_lead_roi_calculator"
  | "lead_magnet_pdf"
  | "roi_calculator_lead"
  | "download_yield_report"
  | "owner_valuation_submit"
  | "newsletter_subscribe"
  | "whatsapp_click"
  | "phone_click"
  /* City guide / restaurant guide micro-conversions */
  | "poi_detail_open"
  | "poi_navigate_gps"
  | "poi_open_google_maps"

  | "poi_deep_link_open"
  | "poi_link_copy"
  /* Booking / management funnel (GA4 e-commerce taxonomy) */
  | "select_booking_dates"
  | "begin_checkout"
  | "schedule_call"
  | "booking_completed"
  | "purchase";

/** Map our canonical events to Meta's taxonomy (standard events when possible). */
const META_EVENT_MAP: Record<string, { name: string; custom: boolean }> = {
  Lead_Submit: { name: "Lead", custom: false },
  PreCalc_Completed: { name: "PreCalc_Completed", custom: true },
  WhatsApp_Click: { name: "Contact", custom: false },
  contact_form_submit: { name: "Lead", custom: false },
  generate_lead: { name: "Lead", custom: false },
  generate_lead_roi_calculator: { name: "Lead", custom: false },
  owner_valuation_submit: { name: "Lead", custom: false },
  roi_calculator_lead: { name: "Lead", custom: false },
  lead_magnet_pdf: { name: "Lead", custom: false },
  download_yield_report: { name: "Lead", custom: false },
  newsletter_subscribe: { name: "Subscribe", custom: false },
  whatsapp_click: { name: "Contact", custom: false },
  phone_click: { name: "Contact", custom: false },
  poi_detail_open: { name: "ViewContent", custom: false },
  poi_navigate_gps: { name: "FindLocation", custom: false },
  poi_open_google_maps: { name: "FindLocation", custom: false },
  poi_deep_link_open: { name: "ViewContent", custom: false },

  poi_link_copy: { name: "Share", custom: true },
  // Booking funnel → Meta standard events so campaigns can optimise on them.
  select_booking_dates: { name: "AddToCart", custom: false },
  begin_checkout: { name: "InitiateCheckout", custom: false },
  schedule_call: { name: "Schedule", custom: false },
  booking_completed: { name: "Purchase", custom: false },
  purchase: { name: "Purchase", custom: false },
};

/**
 * Estimated commercial value of an owner conversion, in EUR.
 * Used as `value` on GA4 e-commerce events and for Meta bid optimisation.
 * Basis: average managed apartment ≈ 1.150 €/lună venit brut × 20% comision
 * × 12 luni, ponderat cu rata de închidere pe fiecare pas al funnel-ului.
 */
export const OWNER_FUNNEL_VALUE_EUR = {
  /** Visitor picked a call slot / finished the yield calculation. */
  intent: 90,
  /** Booked a 15-minute strategy call. */
  scheduledCall: 320,
  /** Sent a full management request. */
  managementRequest: 550,
} as const;

/**
 * Attribution params (UTM / gclid / fbclid / src) for the current session,
 * flattened so they ride along on every GA4 + CAPI conversion payload.
 */
export const attributionParams = (): Record<string, string> => {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  try {
    const raw = sessionStorage.getItem("campaign_attribution_v1");
    if (!raw) return out;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
      "src",
      "landing_path",
      "cta_variant",
    ]) {
      const value = parsed[key];
      if (typeof value === "string" && value) out[key] = value;
    }
  } catch {
    // attribution is best-effort only
  }
  return out;
};



interface ConversionPayload {
  event: ConversionEvent;
  source?: string;
  value?: number;
  currency?: string;
  page_path?: string;
  /** Optional user data — hashed server-side for Meta advanced matching. Never stored. */
  email?: string;
  phone?: string;
  name?: string;
  [key: string]: unknown;
}

const newEventId = (): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const readCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

/**
 * Send the same conversion server-side (Meta Conversions API) so ad blockers
 * cannot drop it. Fire-and-forget: tracking must never block or break the UI.
 */
const forwardToConversionsApi = (
  payload: ConversionPayload,
  metaEvent: { name: string; custom: boolean },
  eventId: string,
): void => {
  if (!hasAdsConsent()) return;

  void import("@/lib/supabaseClient")
    .then(({ supabase }) =>
      supabase.functions.invoke("meta-conversions", {
        body: {
          event_name: metaEvent.name,
          is_custom: metaEvent.custom,
          event_id: eventId,
          event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
          action_source: "website",
          value: payload.value,
          currency: payload.currency,
          source: payload.source,
          email: payload.email,
          phone: payload.phone,
          name: payload.name,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
        },
      }),
    )
    .catch(() => {
      // Never surface tracking failures to the visitor.
    });
};

/**
 * Track a conversion event across GTM/GA4 + Meta (pixel and server-side).
 * Safe to call from any form or handler; silently no-ops without consent.
 */
export const trackConversion = (payload: ConversionPayload): void => {
  if (typeof window === "undefined") return;

  const eventId = newEventId();
  const { email: _e, phone: _p, name: _n, ...safeForDataLayer } = payload;

  const enriched = {
    ...safeForDataLayer,
    event_id: eventId,
    page_path: payload.page_path ?? window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  // 1. GTM dataLayer — always safe (no PII pushed).
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(enriched);
  } catch {
    // ignore
  }

  if (!hasAnalyticsConsent()) return;

  // 2. GA4
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", payload.event, {
        ...attributionParams(),
        ...safeForDataLayer,
        event_category: "conversion",
        event_label: payload.source,
        value: payload.value,
        currency: payload.currency ?? (payload.value ? "EUR" : undefined),
        event_id: eventId,
      });
    }
  } catch {
    // ignore
  }

  const metaEvent = META_EVENT_MAP[payload.event];
  if (!metaEvent) return;

  // 3. Meta Pixel (client-side)
  try {
    if (hasAdsConsent()) {
      initMetaPixel();
      window.fbq?.(
        metaEvent.custom ? "trackCustom" : "track",
        metaEvent.name,
        {
          content_name: payload.source,
          value: payload.value,
          currency: payload.currency ?? "EUR",
        },
        { eventID: eventId },
      );
    }
  } catch {
    // ignore
  }

  // 4. Meta Conversions API (server-side, deduped by event_id)
  forwardToConversionsApi(payload, metaEvent, eventId);
};

/** Convenience wrapper for the three critical funnel events. */
export const trackCriticalConversion = (
  event: CriticalConversionEvent,
  payload: Omit<ConversionPayload, "event"> = {},
): void => trackConversion({ ...payload, event });

/**
 * Validate Romanian / international phone number for WhatsApp.
 * Accepts +40 7XX XXX XXX or +<country><7-14 digits>.
 */
export const isValidWhatsAppNumber = (raw: string): boolean => {
  if (!raw) return false;
  const cleaned = raw.replace(/[\s\-().]/g, "");
  // Must start with + and be 8-16 digits total (including country code)
  return /^\+\d{8,16}$/.test(cleaned);
};

/**
 * Format input as international phone number with +40 default.
 * Returns the formatted value to display in the input.
 */
export const formatPhoneInput = (raw: string): string => {
  // Strip everything except digits and leading +
  let digits = raw.replace(/[^\d+]/g, "");

  // If no +, assume Romanian and prepend +40
  if (!digits.startsWith("+")) {
    // Strip a leading 0 (Romanian local format)
    if (digits.startsWith("0")) digits = digits.slice(1);
    digits = "+40" + digits;
  }

  // Limit total length
  digits = digits.slice(0, 16);

  // Pretty print: +40 7XX XXX XXX
  if (digits.startsWith("+40") && digits.length > 3) {
    const rest = digits.slice(3);
    const parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)].filter(Boolean);
    return "+40 " + parts.join(" ");
  }

  return digits;
};
