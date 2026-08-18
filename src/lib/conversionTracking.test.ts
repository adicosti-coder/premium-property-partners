import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  hasAnalyticsConsent,
  hasAdsConsent,
  attributionParams,
  trackConversion,
  isValidWhatsAppNumber,
  OWNER_FUNNEL_VALUE_EUR,
} from "@/lib/conversionTracking";

const setConsent = (choice: string, ts = Date.now()) =>
  localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice, ts }));

describe("consent gating", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("denies everything before a choice is made", () => {
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasAdsConsent()).toBe(false);
  });

  it("allows analytics but not ads on analytics_only", () => {
    setConsent("analytics_only");
    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasAdsConsent()).toBe(false);
  });

  it("allows analytics and ads on full consent", () => {
    setConsent("all");
    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasAdsConsent()).toBe(true);
  });

  it("denies everything when the visitor declined", () => {
    setConsent("declined");
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasAdsConsent()).toBe(false);
  });

  it("expires a consent choice older than 12 months", () => {
    setConsent("all", Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("accepts the legacy bare-string consent shape", () => {
    localStorage.setItem("cookie_consent_v2", "all");
    expect(hasAdsConsent()).toBe(true);
  });

  it("ignores corrupted consent payloads", () => {
    localStorage.setItem("cookie_consent_v2", "{not json");
    expect(hasAnalyticsConsent()).toBe(false);
  });
});

describe("attributionParams", () => {
  beforeEach(() => sessionStorage.clear());

  it("returns an empty object without a session attribution", () => {
    expect(attributionParams()).toEqual({});
  });

  it("flattens only the whitelisted marketing keys", () => {
    sessionStorage.setItem(
      "campaign_attribution_v1",
      JSON.stringify({
        utm_source: "google",
        utm_medium: "cpc",
        cta_variant: "B",
        captured_at: "2026-01-01T00:00:00.000Z",
        referrer: "https://example.com",
      }),
    );
    expect(attributionParams()).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      cta_variant: "B",
    });
  });
});

describe("trackConversion", () => {
  let gtag: ReturnType<typeof vi.fn>;
  let fbq: ReturnType<typeof vi.fn>;
  /* eslint-disable @typescript-eslint/no-explicit-any */

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.dataLayer = [];
    gtag = vi.fn();
    fbq = vi.fn();
    (window as any).gtag = gtag;
    (window as any).fbq = fbq;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as any).gtag;
    delete (window as any).fbq;
  });

  it("pushes to dataLayer but skips GA4/Meta without consent", () => {
    trackConversion({ event: "Lead_Submit", source: "owners_form" });
    expect(window.dataLayer?.length).toBe(1);
    expect(gtag).not.toHaveBeenCalled();
    expect(fbq).not.toHaveBeenCalled();
  });

  it("sends GA4 but not the Meta pixel on analytics_only", () => {
    setConsent("analytics_only");
    trackConversion({ event: "Lead_Submit", source: "owners_form" });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(fbq).not.toHaveBeenCalled();
  });

  it("never pushes PII into the dataLayer", () => {
    setConsent("all");
    trackConversion({
      event: "Lead_Submit",
      source: "owners_form",
      email: "adrian@example.com",
      phone: "+40712345678",
      name: "Adrian",
    });
    const pushed = JSON.stringify(window.dataLayer);
    expect(pushed).not.toContain("adrian@example.com");
    expect(pushed).not.toContain("+40712345678");
    const ga4Args = JSON.stringify(gtag.mock.calls);
    expect(ga4Args).not.toContain("adrian@example.com");
  });

  it("attaches session attribution to the GA4 payload", () => {
    setConsent("all");
    sessionStorage.setItem(
      "campaign_attribution_v1",
      JSON.stringify({ utm_source: "google", src: "andrei_wa" }),
    );
    trackConversion({ event: "Lead_Submit", source: "owners_form" });
    expect(gtag.mock.calls[0][2]).toMatchObject({
      utm_source: "google",
      src: "andrei_wa",
    });
  });
});

describe("isValidWhatsAppNumber", () => {
  it.each(["+40712345678", "+40 712 345 678", "+4-0712345678"])("accepts %s", (n) => {
    expect(isValidWhatsAppNumber(n)).toBe(true);
  });

  it.each(["", "0712345678", "+40712", "+4071234567890123456", "abc"])(
    "rejects %s",
    (n) => {
      expect(isValidWhatsAppNumber(n)).toBe(false);
    },
  );
});

describe("owner funnel values", () => {
  it("keeps the funnel value ladder increasing", () => {
    expect(OWNER_FUNNEL_VALUE_EUR.intent).toBeLessThan(
      OWNER_FUNNEL_VALUE_EUR.scheduledCall,
    );
    expect(OWNER_FUNNEL_VALUE_EUR.scheduledCall).toBeLessThan(
      OWNER_FUNNEL_VALUE_EUR.managementRequest,
    );
  });
});
