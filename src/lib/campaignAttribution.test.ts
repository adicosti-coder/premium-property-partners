import { describe, it, expect, beforeEach } from "vitest";
import {
  captureCampaignAttribution,
  getCampaignAttribution,
  setCtaVariant,
  getCtaVariant,
  withCampaignTracking,
  campaignSourceSuffix,
} from "@/lib/campaignAttribution";

const goto = (search: string, path = "/pentru-proprietari") => {
  window.history.replaceState({}, "", `${path}${search}`);
};

describe("campaign attribution", () => {
  beforeEach(() => {
    sessionStorage.clear();
    goto("");
    Object.defineProperty(document, "referrer", { value: "", configurable: true });
  });

  it("captures utm params and the landing path", () => {
    goto("?utm_source=google&utm_medium=cpc&utm_campaign=proprietari");
    const a = captureCampaignAttribution();
    expect(a).toMatchObject({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "proprietari",
      landing_path: "/pentru-proprietari",
    });
    expect(a?.captured_at).toBeTruthy();
  });

  it("keeps the first touch when a later page has different params", () => {
    goto("?utm_source=google");
    captureCampaignAttribution();
    goto("?utm_source=facebook", "/despre-noi");
    expect(captureCampaignAttribution()?.utm_source).toBe("google");
    expect(getCampaignAttribution()?.landing_path).toBe("/pentru-proprietari");
  });

  it("returns null on a direct organic visit with no referrer", () => {
    expect(captureCampaignAttribution()).toBeNull();
    expect(getCampaignAttribution()).toBeNull();
  });

  it("captures the WhatsApp outreach tag from Andrei links", () => {
    goto("?src=andrei_wa&prospect_id=abc123");
    expect(captureCampaignAttribution()).toMatchObject({
      src: "andrei_wa",
      prospect_id: "abc123",
    });
    expect(campaignSourceSuffix()).toBe("andrei_wa");
  });

  it("derives a source suffix from utm source/medium", () => {
    goto("?utm_source=google&utm_medium=cpc");
    captureCampaignAttribution();
    expect(campaignSourceSuffix()).toBe("google_cpc");
  });

  it("falls back to ad click ids for the source suffix", () => {
    goto("?fbclid=xyz");
    captureCampaignAttribution();
    expect(campaignSourceSuffix()).toBe("meta_ads");
  });

  it("returns an empty suffix without attribution", () => {
    expect(campaignSourceSuffix()).toBe("");
  });

  it("records and reads the A/B cta variant", () => {
    goto("?utm_source=google");
    captureCampaignAttribution();
    setCtaVariant("B");
    expect(getCtaVariant()).toBe("B");
    expect(getCampaignAttribution()?.utm_source).toBe("google");
  });

  it("merges attribution into the lead simulation payload", () => {
    goto("?utm_source=google");
    captureCampaignAttribution();
    const merged = withCampaignTracking({ rooms: 2 }) as Record<string, unknown>;
    expect(merged.rooms).toBe(2);
    expect((merged.attribution as Record<string, unknown>).utm_source).toBe("google");
  });

  it("leaves the payload untouched when there is nothing to attribute", () => {
    expect(withCampaignTracking({ rooms: 2 })).toEqual({ rooms: 2 });
  });
});
