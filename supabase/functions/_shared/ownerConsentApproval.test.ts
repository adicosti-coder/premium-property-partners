import { describe, expect, it } from "bun:test";
import { consentStatusAfterOwnerYes, needsInspectionDispatch } from "./ownerConsentApproval.ts";

describe("acordul proprietarului așteaptă aprobarea adminului", () => {
  it("fără aprobarea adminului, acordul rămâne pending_approval", () => {
    expect(consentStatusAfterOwnerYes("pending")).toBe("pending_approval");
    expect(consentStatusAfterOwnerYes(null)).toBe("pending_approval");
    expect(consentStatusAfterOwnerYes("no_phone")).toBe("pending_approval");
    expect(consentStatusAfterOwnerYes("rejected")).toBe("pending_approval");
  });

  it("dacă adminul a aprobat deja (1), acordul devine granted", () => {
    expect(consentStatusAfterOwnerYes("approved")).toBe("granted");
    expect(consentStatusAfterOwnerYes("approved_waiting_consent")).toBe("granted");
  });

  it("un DA repetat nu retrogradează un anunț publicat", () => {
    expect(consentStatusAfterOwnerYes("pending", "published")).toBe("published");
    expect(consentStatusAfterOwnerYes("pending", "granted")).toBe("granted");
  });

  it("adminul primește mesajul 1/2 doar dacă nu l-a primit deja", () => {
    expect(needsInspectionDispatch(null)).toBe(true);
    expect(needsInspectionDispatch({ status: "no_phone" })).toBe(true);
    expect(needsInspectionDispatch({ status: "pending", sent_at: null })).toBe(true);
    expect(needsInspectionDispatch({ status: "pending", sent_at: "2026-11-08T10:00:00Z" })).toBe(false);
  });
});
