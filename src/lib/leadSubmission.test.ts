import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: () => ({ insert: (payload: unknown) => insertMock(payload) }),
  },
}));

vi.mock("@/lib/errorReporting", () => ({
  reportError: vi.fn(),
}));

import { submitLead, type LeadInput } from "@/lib/leadSubmission";

const base: LeadInput = {
  name: "Adrian Costi",
  whatsapp_number: "+40712345678",
  email: "adrian@example.com",
  property_type: "apartament",
  property_area: 55,
  message: "Vreau o evaluare",
  source: "owners_form",
};

describe("submitLead", () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it("inserts a valid lead and normalizes the phone", async () => {
    const res = await submitLead({ ...base, whatsapp_number: "+40 712 345 678" });
    expect(res).toEqual({ ok: true, duplicate: false });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toMatchObject({
      whatsapp_number: "+40712345678",
      email: "adrian@example.com",
      source: "owners_form",
    });
  });

  it("rejects a too-short name without touching the database", async () => {
    const res = await submitLead({ ...base, name: "A" });
    expect(res).toEqual({
      ok: false,
      reason: "validation",
      errors: { name: "name_min" },
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await submitLead({ ...base, email: "not-an-email" });
    expect(res).toMatchObject({ ok: false, reason: "validation" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed phone number", async () => {
    const res = await submitLead({ ...base, whatsapp_number: "0712" });
    expect(res).toEqual({
      ok: false,
      reason: "validation",
      errors: { whatsapp_number: "phone_invalid" },
    });
  });

  it("accepts a sentinel phone when explicitly allowed (pre-calc leads)", async () => {
    const res = await submitLead({
      ...base,
      whatsapp_number: "-",
      allowSentinelPhone: true,
    });
    expect(res).toEqual({ ok: true, duplicate: false });
  });

  it("treats a legacy unique-violation as a successful duplicate", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const res = await submitLead(base);
    expect(res).toEqual({ ok: true, duplicate: true });
  });

  it("surfaces database errors as network failures", async () => {
    insertMock.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    const res = await submitLead(base);
    expect(res).toEqual({ ok: false, reason: "network", message: "permission denied" });
  });

  it("catches thrown errors as unknown failures", async () => {
    insertMock.mockRejectedValue(new Error("offline"));
    const res = await submitLead(base);
    expect(res).toEqual({ ok: false, reason: "unknown", message: "offline" });
  });

  it("does not send personal data when validation fails", async () => {
    await submitLead({ ...base, name: "", email: "x" });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
