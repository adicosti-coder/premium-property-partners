import { describe, expect, it } from "vitest";
import { publishConsentRequestText } from "./waAutoReply.ts";
import { WA_PUBLISH_CONSENT_BODY, WA_PUBLISH_CONSENT_TEMPLATE, consentPropertyLabel, isApprovedConsentTemplate } from "./waPublishConsentTemplate.ts";

describe("Owner consent template", () => {
  it("is identical to the direct request with its property variable filled", () => {
    const title = "Apartament 2 camere – Iosefin";
    expect(WA_PUBLISH_CONSENT_BODY.replace("{{1}}", title)).toBe(publishConsentRequestText({ title }));
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
    expect(consentPropertyLabel()).toBe("proprietății dumneavoavoastră".replace("dumneavoavoastră", "dumneavoastră"));
  });
});