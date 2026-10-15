import { describe, expect, it } from "bun:test";
import { publishConsentRequestText } from "./waAutoReply.ts";
import { WA_PUBLISH_CONSENT_BODY, WA_PUBLISH_CONSENT_TEMPLATE, WA_PUBLISH_CONSENT_LEGACY_BODIES, consentPropertyLabel, isApprovedConsentTemplate } from "./waPublishConsentTemplate.ts";

describe("Owner consent template", () => {
  it("is identical to the direct request with its property variable filled", () => {
    const u = "https://www.olx.ro/d/oferta/x?a=1";
    const link = `https://realtrust.ro/analiza-anunt?url=${encodeURIComponent(u)}`;
    expect(WA_PUBLISH_CONSENT_BODY.replace("{{1}}", link)).toBe(publishConsentRequestText({ source_url: u }));
  });
  it("accepts the previously approved „DA” body while the „CONFIRM” edit is pending", () => {
    const legacy = { name: WA_PUBLISH_CONSENT_TEMPLATE, status: "APPROVED", language: "ro", components: [{ type: "BODY", text: WA_PUBLISH_CONSENT_LEGACY_BODIES[0] }] };
    expect(isApprovedConsentTemplate([legacy])).toBe(true);
    expect(isApprovedConsentTemplate([{ ...legacy, components: [{ type: "BODY", text: WA_PUBLISH_CONSENT_BODY }] }])).toBe(true);
  });
  it("never enables pending, rejected, wrong-language or altered templates", () => {
    const row = { name: WA_PUBLISH_CONSENT_TEMPLATE, status: "APPROVED", language: "ro", components: [{ type: "BODY", text: WA_PUBLISH_CONSENT_BODY }] };
    expect(isApprovedConsentTemplate([row])).toBe(true);
    expect(isApprovedConsentTemplate([{ ...row, status: "PENDING" }])).toBe(false);
    expect(isApprovedConsentTemplate([{ ...row, status: "REJECTED" }])).toBe(false);
    expect(isApprovedConsentTemplate([{ ...row, language: "en" }])).toBe(false);
    expect(isApprovedConsentTemplate([{ ...row, components: [{ type: "BODY", text: "Inspection" }] }])).toBe(false);
    expect(isApprovedConsentTemplate([])).toBe(false);
  });
  it("cleans property parameters and provides a zone fallback", () => {
    expect(consentPropertyLabel({ title: "Apartament\n  2 camere" })).toBe("Apartament 2 camere");
    expect(consentPropertyLabel({ zone: "Fabric" })).toBe("apartamentul din zona Fabric");
    expect(consentPropertyLabel()).toBe("proprietății dumneavoastră");
  });
});