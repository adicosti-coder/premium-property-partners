import { describe, it, expect } from "vitest";
import { BROKERAGE_FEES, MANAGEMENT_PACKAGE_COMMISSIONS, parsePricingTab } from "./brokerageFees";

describe("pricing tabs values", () => {
  it("sale commission is 2–4% with free evaluation", () => {
    expect(BROKERAGE_FEES.sale.commission).toBe("2–4%");
    expect(BROKERAGE_FEES.sale.evaluation).toBe("0 lei");
  });
  it("rent commission is 50–100% of first rent", () => {
    expect(BROKERAGE_FEES.rent.commission).toBe("50–100%");
  });
  it("management packages stay 15/18/20%", () => {
    expect(MANAGEMENT_PACKAGE_COMMISSIONS).toEqual({ starter: "15%", esential: "18%", standard: "20%" });
  });
  it("tab defaults to administrare", () => {
    expect(parsePricingTab(null)).toBe("administrare");
    expect(parsePricingTab("intermediere")).toBe("intermediere");
    expect(parsePricingTab("x")).toBe("administrare");
  });
});
