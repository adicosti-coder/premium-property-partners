import { describe, expect, it, vi, beforeEach } from "vitest";
const save = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
vi.mock("./leadSubmission", () => ({ submitLead: save }));
vi.mock("./conversionTracking", () => ({ formatPhoneInput: () => "+40712345678", trackConversion: track }));
vi.mock("./campaignAttribution", () => ({ withCampaignTracking: (v: unknown) => v }));
import { saveViewingRequest } from "./viewingRequest";
const input = { name: "Test controlat", phone: "0712 345 678", timeSlot: "morning" as const, propertyId: "property-test", propertyName: "Apartament test" };
describe("viewing persistence before WhatsApp", () => {
  beforeEach(() => { save.mockReset(); track.mockReset(); });
  it("returns WhatsApp only after a confirmed saved lead and records one Lead", async () => {
    save.mockResolvedValue({ ok: true, leadId: "saved-test" });
    const result = await saveViewingRequest(input, "test-token");
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ source: "whatsapp_viewing", viaServer: true, whatsapp_number: "+40712345678", captcha_token: "test-token", simulation_data: expect.objectContaining({ status_label: "Nou - WhatsApp" }) }));
    expect(result.leadId).toBe("saved-test");
    expect(result.whatsappUrl).toContain("https://wa.me/40799069256?text=");
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({ event: "Lead_Submit", source: "whatsapp_viewing", property_id: "property-test" });
  });
  it("does not return a chat URL or emit Lead when saving fails", async () => {
    save.mockResolvedValue({ ok: false, reason: "network" });
    await expect(saveViewingRequest(input, "test-token")).rejects.toThrow("salvată");
    expect(track).not.toHaveBeenCalled();
  });
  it("requires security verification before any save", async () => {
    await expect(saveViewingRequest(input, "")).rejects.toThrow("securitate");
    expect(save).not.toHaveBeenCalled();
  });
});