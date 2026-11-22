import { describe, expect, it } from "bun:test";
import { publishConsentRequestText } from "./waAutoReply.ts";
import {
  WA_PUBLISH_CONSENT_BODY, WA_PUBLISH_CONSENT_COMPONENTS, WA_PUBLISH_CONSENT_LEGACY_BODIES, WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE,
  WA_PUBLISH_CONSENT_TEMPLATE, WA_PUBLISH_CONSENT_V3_BODY, approvedConsentTemplate, consentPropertyLabel,
  isApprovedConsentTemplate, isPublishConsentTemplate,
} from "./waPublishConsentTemplate.ts";

const V5 = "acord_publicare_proprietar_v5";
const V4 = "acord_publicare_proprietar_v4";
const V3 = "acord_publicare_proprietar_v3";
const row = (name: string, text: string, status = "APPROVED", language = "ro") => ({ name, status, language, components: [{ type: "BODY", text }] });

describe("Owner consent template v5", () => {
  it("is named v5, keeps v3 as the transition template and never uses the superseded v4", () => {
    expect(WA_PUBLISH_CONSENT_TEMPLATE).toBe(V5);
    expect(WA_PUBLISH_CONSENT_PREVIOUS_TEMPLATE).toBe(V3);
    expect(isPublishConsentTemplate(V5)).toBe(true);
    expect(isPublishConsentTemplate(V3)).toBe(true);
    expect(isPublishConsentTemplate(V4)).toBe(false);
    expect(isPublishConsentTemplate("prospect_intro_premium_v6")).toBe(false);
  });
  it("has the approved body with the estimate link as {{1}} and a short-link example", () => {
    expect(WA_PUBLISH_CONSENT_BODY).toBe(
      "Bună ziua! Sunt Andrei de la RealTrust Timișoara. Am pregătit o estimare de preț și randament pentru proprietatea dvs.: {{1}}\n" +
      "Avem cereri active în zonă. Dacă doriți să o prezentăm clienților noștri (fără exclusivitate), răspundeți cu „DA”. Pentru dezabonare, scrieți „STOP”.");
    expect(WA_PUBLISH_CONSENT_COMPONENTS[0].example.body_text).toEqual([["https://realtrust.ro/e/k7m2qx9a"]]);
    expect(WA_PUBLISH_CONSENT_BODY.trim().endsWith("}}")).toBe(false);
  });
  it("is identical to the direct request with its link filled", () => {
    const link = "https://realtrust.ro/e/k7m2qx9a";
    expect(WA_PUBLISH_CONSENT_BODY.replace("{{1}}", link)).toBe(publishConsentRequestText({ analysisUrl: link }));
  });
});

describe("Transition v3 → v5", () => {
  it("uses v5 once Meta approves its exact body", () => {
    expect(approvedConsentTemplate([row(V5, WA_PUBLISH_CONSENT_BODY), row(V3, WA_PUBLISH_CONSENT_V3_BODY)])).toBe(V5);
  });
  it("ignores the superseded v4 even if Meta approves it", () => {
    expect(approvedConsentTemplate([row(V4, "Bună ziua! Sunt Andrei {{1}}"), row(V3, WA_PUBLISH_CONSENT_V3_BODY)])).toBe(V3);
    expect(approvedConsentTemplate([row(V4, WA_PUBLISH_CONSENT_BODY)])).toBeNull();
  });
  it("keeps v3 while v5 is pending, rejected or altered", () => {
    expect(approvedConsentTemplate([row(V5, WA_PUBLISH_CONSENT_BODY, "PENDING"), row(V3, WA_PUBLISH_CONSENT_V3_BODY)])).toBe(V3);
    expect(approvedConsentTemplate([row(V5, WA_PUBLISH_CONSENT_BODY, "REJECTED"), row(V3, WA_PUBLISH_CONSENT_V3_BODY)])).toBe(V3);
    expect(approvedConsentTemplate([row(V5, "Altceva {{1}}"), row(V3, WA_PUBLISH_CONSENT_V3_BODY)])).toBe(V3);
    expect(approvedConsentTemplate([row(V3, WA_PUBLISH_CONSENT_V3_BODY)])).toBe(V3);
  });
  it("still accepts the older approved v3 bodies (DA / CONFIRM)", () => {
    for (const body of WA_PUBLISH_CONSENT_LEGACY_BODIES) expect(approvedConsentTemplate([row(V3, body)])).toBe(V3);
  });
  it("never enables pending, wrong-language or altered templates", () => {
    expect(isApprovedConsentTemplate([row(V3, WA_PUBLISH_CONSENT_V3_BODY, "PENDING")])).toBe(false);
    expect(isApprovedConsentTemplate([row(V3, WA_PUBLISH_CONSENT_V3_BODY, "APPROVED", "en")])).toBe(false);
    expect(isApprovedConsentTemplate([row(V3, "Inspection")])).toBe(false);
    expect(isApprovedConsentTemplate([row(V3, WA_PUBLISH_CONSENT_BODY)])).toBe(false); // corpul v5 nu poate activa v3
    expect(isApprovedConsentTemplate([])).toBe(false);
  });
  it("cleans property parameters and provides a zone fallback", () => {
    expect(consentPropertyLabel({ title: "Apartament\n  2 camere" })).toBe("Apartament 2 camere");
    expect(consentPropertyLabel({ zone: "Fabric" })).toBe("apartamentul din zona Fabric");
    expect(consentPropertyLabel()).toBe("proprietății dumneavoastră");
  });
});
