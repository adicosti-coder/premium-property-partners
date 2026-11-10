import { describe, expect, it } from "vitest";
import {
  REAL_ESTATE_SINCE, HOTEL_MANAGEMENT_SINCE, realEstateSinceLabel, hotelSinceLabel,
  contactHoursLabel, CONTACT_OPENING_HOURS_SPEC, CONTACT_HOURS, isContactOpen,
} from "./businessFacts";
import { REAL_ESTATE_AGENT_SCHEMA } from "./orgIdentity";

describe("business facts confirmed by Adrian (10 Nov 2026)", () => {
  it("real estate activity started in 2000", () => {
    expect(REAL_ESTATE_SINCE).toBe(2000);
    expect(realEstateSinceLabel("ro")).toBe("În imobiliare din 2000");
    expect(realEstateSinceLabel("en")).toBe("In real estate since 2000");
  });

  it("hotel-regime management started in 2016", () => {
    expect(HOTEL_MANAGEMENT_SINCE).toBe(2016);
    expect(hotelSinceLabel("ro")).toBe("Regim hotelier din 2016");
  });

  it("contact is non-stop, every day", () => {
    expect(contactHoursLabel("ro")).toBe("Program non-stop (24/7)");
    expect(CONTACT_OPENING_HOURS_SPEC.dayOfWeek).toHaveLength(7);
    expect(CONTACT_OPENING_HOURS_SPEC.opens).toBe("00:00");
    expect(CONTACT_OPENING_HOURS_SPEC.closes).toBe("23:59");
    expect(isContactOpen(new Date("2026-11-15T03:00:00+02:00"))).toBe(true); // Sunday, 03:00
  });

  it("Google data uses the same contact hours", () => {
    expect((REAL_ESTATE_AGENT_SCHEMA as any).openingHours).toBe(CONTACT_HOURS.schemaText);
  });
});
