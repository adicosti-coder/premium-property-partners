import { describe, it, expect } from "vitest";
import {
  getNightlyRate,
  getCapacityRange,
  getPropertyTypeOptions,
  type PropertyType,
} from "@/utils/nightlyRatePricing";

describe("getNightlyRate", () => {
  const cases: Array<[PropertyType, number, number]> = [
    ["studio", 2, 45],
    ["studio", 3, 60],
    ["studio", 4, 65],
    ["2camere", 2, 65],
    ["2camere", 4, 75],
    ["2camere", 6, 90],
    ["3camere", 7, 100],
  ];

  it.each(cases)("charges %s with %i guests at €%i/night", (type, capacity, rate) => {
    expect(getNightlyRate(type, capacity)).toBe(rate);
  });

  it("applies the highest matching tier for capacities above the matrix", () => {
    expect(getNightlyRate("studio", 8)).toBe(65);
    expect(getNightlyRate("2camere", 10)).toBe(90);
    expect(getNightlyRate("3camere", 10)).toBe(100);
  });

  it("falls back to the base rate below the minimum capacity", () => {
    expect(getNightlyRate("studio", 1)).toBe(45);
    expect(getNightlyRate("3camere", 4)).toBe(45);
  });

  it("never decreases as capacity grows", () => {
    for (const type of ["studio", "2camere", "3camere"] as PropertyType[]) {
      let previous = 0;
      for (let capacity = 1; capacity <= 10; capacity++) {
        const rate = getNightlyRate(type, capacity);
        if (capacity > 2) expect(rate).toBeGreaterThanOrEqual(previous);
        previous = rate;
      }
    }
  });
});

describe("capacity ranges and options", () => {
  it("keeps the default inside the allowed range", () => {
    for (const type of ["studio", "2camere", "3camere"] as PropertyType[]) {
      const { min, max, defaultVal } = getCapacityRange(type);
      expect(min).toBeLessThanOrEqual(defaultVal);
      expect(defaultVal).toBeLessThanOrEqual(max);
    }
  });

  it("prices every default capacity from the matrix, not the fallback", () => {
    expect(getNightlyRate("2camere", getCapacityRange("2camere").defaultVal)).toBe(75);
    expect(getNightlyRate("3camere", getCapacityRange("3camere").defaultVal)).toBe(100);
  });

  it("localizes the property type labels", () => {
    expect(getPropertyTypeOptions("ro")[1].label).toBe("Apartament 2 Camere");
    expect(getPropertyTypeOptions("en")[1].label).toBe("2-Room Apartment");
  });
});
