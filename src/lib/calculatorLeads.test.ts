import { describe, expect, it } from "vitest";
import { buildGuestLeadRequest, buildInvestmentLeadRequest, buildQuickInvestmentLeadRequest } from "./calculatorLeads";

describe("calculator lead payloads", () => {
  it("maps every investment figure and the investor tag", () => {
    const lead = buildInvestmentLeadRequest({ purchasePrice: 120000, renovation: 8000, netYieldPct: 5.52, annualNet: 7065.6, estimatedRent: 633 });
    expect(lead.tag).toBe("[Lead Investitor]");
    expect(lead.source).toBe("calculator_unificat_investitii");
    expect(lead.data).toMatchObject({ purchase_price: 120000, renovation_cost: 8000, net_yield_pct: 5.52, profit_10y: 70656, estimated_rent: 633 });
    expect(lead.adminSummary).toContain("Profit la 10 ani: 70.656 €");
  });

  it("maps the selected apartment, stay and both prices with the guest tag", () => {
    const lead = buildGuestLeadRequest({ propertyName: "NordOne ApArt Hotel - Premium 60 mp", nights: 4, guests: 2, directTotal: 324, bookingTotal: 340 });
    expect(lead.tag).toBe("[Lead Oaspete]");
    expect(lead.data).toMatchObject({ property_name: "NordOne ApArt Hotel - Premium 60 mp", nights: 4, guests: 2, direct_total: 324, booking_total: 340, discount_code: "DIRECT5" });
    expect(lead.adminSummary).toContain("Total direct (DIRECT5): 324 €");
    expect(lead.visitorNextStep).toContain("nu este finalizată automat");
  });

  it("maps all quick-widget inputs with the rapid-investment tag", () => {
    const lead = buildQuickInvestmentLeadRequest({ purchasePrice: 95000, renovation: 7000, monthlyRent: 500, monthsRented: 11, annualNet: 5225, netYieldPct: 5.12 });
    expect(lead.tag).toBe("[Lead Rapid Investiții]");
    expect(lead.source).toBe("calculator_unificat_rapid_investitii");
    expect(lead.data).toMatchObject({ purchase_price: 95000, renovation_cost: 7000, monthly_rent: 500, months_rented: 11, annual_net: 5225, net_yield_pct: 5.12 });
  });
});
