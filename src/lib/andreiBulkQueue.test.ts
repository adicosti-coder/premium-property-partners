import { describe, it, expect } from "vitest";
import { andreiIneligibleReason } from "./andreiBulkQueue";

const base = { phone_normalized: "0722123456", contact_phone: null, lifecycle_status: "new", seller_type: "privat", andrei_queued_at: null, tags: [] };

describe("andreiIneligibleReason", () => {
  it("accepts a private owner with a Romanian mobile and unprocessed status", () => {
    expect(andreiIneligibleReason(base)).toBeNull();
  });
  it("blocks landlines", () => {
    expect(andreiIneligibleReason({ ...base, phone_normalized: "0256123456" })).toBe("Telefon invalid");
  });
  it("blocks listings already sent to Andrei", () => {
    expect(andreiIneligibleReason({ ...base, andrei_queued_at: "2026-10-28T08:00:00Z" })).toBe("Trimis la Andrei");
  });
  it("blocks unconfirmed sellers (Needs Review)", () => {
    expect(andreiIneligibleReason({ ...base, seller_type: "de_verificat" })).toBe("Neconfirmat");
  });
  it("blocks already processed listings", () => {
    expect(andreiIneligibleReason({ ...base, lifecycle_status: "calling" })).toBe("Procesat");
  });
  it("blocks owners already contacted on WhatsApp", () => {
    expect(andreiIneligibleReason({ ...base, outreach_status: "whatsapp_sent" })).toBe("Trimis pe WhatsApp");
  });
});
