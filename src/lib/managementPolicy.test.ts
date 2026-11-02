import { describe, expect, it } from "vitest";
import { calculateManagedIncome, MANAGEMENT_POLICY } from "./managementPolicy";

describe("official management policy", () => {
  it("charges 20% on gross minus channel fees and utilities", () => {
    const result = calculateManagedIncome({ gross: 1800, channelFees: 270, utilities: 120 });
    expect(result.commissionBase).toBe(1410);
    expect(result.managementFee).toBe(282);
    expect(result.ownerIncome).toBe(1128);
  });
  it("supports the official 15% lower commission", () => {
    expect(calculateManagedIncome({ gross: 1800, channelFees: 270, utilities: 120, commissionRate: .15 }).managementFee).toBe(211.5);
  });
  it("never uses a 25% management commission", () => {
    expect(calculateManagedIncome({ gross: 1000, channelFees: 0, utilities: 0, commissionRate: .25 }).managementFee).toBe(200);
  });
  it("cleaning paid from gross does not reduce the management commission", () => {
    const result = calculateManagedIncome({ gross: 1800, channelFees: 270, utilities: 120, cleaningFromGross: 200 });
    expect(result.managementFee).toBe(282);
    expect(result.ownerIncome).toBe(928);
  });
  it("uses conservative 70% occupancy within 65–75% annual assumptions", () => {
    expect(MANAGEMENT_POLICY.occupancyDefault).toBe(.70);
    expect(MANAGEMENT_POLICY.occupancyMin).toBe(.65);
    expect(MANAGEMENT_POLICY.occupancyMax).toBe(.75);
  });
  it("uses a 12-month contract", () => expect(MANAGEMENT_POLICY.contractMonths).toBe(12));
  it("allows a 90-day trial", () => expect(MANAGEMENT_POLICY.trialDays).toBe(90));
  it("uses 30-day notice", () => expect(MANAGEMENT_POLICY.noticeDays).toBe(30));
  it("uses estimated annual net yields of 6.5–9.4%", () => {
    expect(MANAGEMENT_POLICY.yieldMin).toBe(.065);
    expect(MANAGEMENT_POLICY.yieldMax).toBe(.094);
  });
  it("uses the approved fallback of 13 active stays", () => expect(MANAGEMENT_POLICY.activeStaysFallback).toBe(13));
});