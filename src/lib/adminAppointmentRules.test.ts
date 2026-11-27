import { describe, expect, it } from "vitest";
import { bucharestToday, isUpcomingAppointment } from "./adminAppointmentRules";
import { inspectionReviewPolicy } from "../../supabase/functions/_shared/inspectionReviewPolicy";

describe("programări viitoare pentru toate tipurile", () => {
  it("folosește ziua României la trecerea peste miezul nopții", () => {
    expect(bucharestToday(new Date("2026-11-27T22:30:00Z"))).toBe("2026-11-28");
  });
  it("include evaluările și orice alt tip cu dată viitoare", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    expect(isUpcomingAppointment({ preferred_date: "2026-11-28T10:00:00Z" }, now)).toBe(true);
    expect(isUpcomingAppointment({ preferred_date: "2026-11-26T10:00:00Z" }, now)).toBe(false);
    expect(isUpcomingAppointment({ preferred_date: "2026-11-27T10:00:00Z" }, now)).toBe(false);
    expect(isUpcomingAppointment({ preferred_date: "2026-11-27T14:00:00Z" }, now)).toBe(true);
    expect(isUpcomingAppointment({ preferred_date: null }, now)).toBe(false);
  });
});
describe("aprobări de inspecție", () => {
  it("nu publică fără acord sau cu acord retras", () => {
    expect(inspectionReviewPolicy("pending", "approve", null)).toEqual({ allowed: true, publish: false, nextStatus: "approved_waiting_consent" });
    expect(inspectionReviewPolicy("approved_waiting_consent", "approve", { status: "granted", revoked_at: "2026-11-27" }).publish).toBe(false);
  });
  it("aprobarea cu DA permite publicarea", () => {
    expect(inspectionReviewPolicy("pending", "approve", { status: "pending_approval" }).publish).toBe(true);
  });
  it("respingerea nu publică", () => {
    expect(inspectionReviewPolicy("pending", "reject", { status: "granted" })).toEqual({ allowed: true, publish: false, nextStatus: "rejected" });
  });
  it("nu reprocessează anunțurile publicate sau respinse", () => {
    expect(inspectionReviewPolicy("published", "reject", { status: "published" }).allowed).toBe(false);
    expect(inspectionReviewPolicy("rejected", "approve", { status: "granted" }).allowed).toBe(false);
  });
});