/**
 * Conversion tracking utility — pushes custom events to dataLayer (GTM/GA4)
 * and forwards to gtag if available. Safe to call from any form.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export type ConversionEvent =
  | "contact_form_submit"
  | "lead_magnet_pdf"
  | "roi_calculator_lead"
  | "owner_valuation_submit"
  | "newsletter_subscribe"
  | "whatsapp_click"
  | "phone_click";

interface ConversionPayload {
  event: ConversionEvent;
  source?: string;
  value?: number;
  currency?: string;
  page_path?: string;
  [key: string]: unknown;
}

/**
 * Track a conversion event by pushing it to the dataLayer and gtag.
 * Use this for all key form submissions and conversion goals.
 */
export const trackConversion = (payload: ConversionPayload): void => {
  if (typeof window === "undefined") return;

  const enriched = {
    ...payload,
    page_path: payload.page_path ?? window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(enriched);
  } catch {
    // ignore
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", payload.event, {
        event_category: "conversion",
        event_label: payload.source,
        value: payload.value,
        currency: payload.currency,
      });
    }
  } catch {
    // ignore
  }
};

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
