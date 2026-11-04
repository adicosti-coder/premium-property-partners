import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCalculatorAnalyticsPayload, getRegionalSuggestions, REGIONAL_DESTINATIONS, trackCalculatorEvent } from "./calculatorAnalytics";

describe("calculator suggestions and privacy", () => {
  beforeEach(() => { localStorage.clear(); window.dataLayer = []; window.gtag = vi.fn(); });
  it("includes the requested cities and resorts", () => {
    for (const name of ["București", "Cluj-Napoca", "Brașov", "Sibiu", "Iași", "Constanța", "Oradea", "Arad", "Craiova", "Poiana Brașov", "Sinaia", "Predeal", "Bușteni", "Mamaia", "Vama Veche", "Eforie Nord", "Sovata", "Băile Felix", "Bran", "Râșnov", "Vatra Dornei", "Călimănești", "Murani"]) expect(REGIONAL_DESTINATIONS).toContain(name);
  });
  it("matches without accents and preserves unknown free input", () => {
    expect(getRegionalSuggestions("brasov")).toEqual(["Brașov", "Poiana Brașov"]);
    expect(getRegionalSuggestions("Sat necunoscut")).toEqual([]);
  });
  it.each(["baile felix", "BAILE FELIX", "baile  felix", "  baile\u00a0felix  ", "felix baile"])("finds Băile Felix for %s", (query) => {
    expect(getRegionalSuggestions(query)).toEqual(["Băile Felix"]);
  });
  it("sends only approved context, never extra contact fields", () => {
    const input = { location_mode: "regional" as const, property_type: "vila-vacanta", location_name: "Brasov", surface_sqm: 200, name: "Test Person", phone: "0722123456", email: "test@example.com" };
    expect(buildCalculatorAnalyticsPayload(input)).toEqual({ location_mode: "regional", property_type: "vila-vacanta", location_name: "Brașov", surface_sqm: 200 });
  });
  it.each(["test@example.com", "0722123456", "Brașov | Test Person", "Test Person"])("never forwards free text %s", (location_name) => {
    expect(buildCalculatorAnalyticsPayload({ location_mode: "regional", location_name }).location_name).toBe("other");
  });
  it.each(["calculator_location_mode_select", "calculator_result_view", "calculator_lead_submit"] as const)("does not send %s before consent", (event) => {
    trackCalculatorEvent(event, { location_mode: "regional" });
    expect(window.gtag).not.toHaveBeenCalled(); expect(window.dataLayer).toEqual([]);
  });
  it("does not replay prior results after granting consent or send after withdrawal", () => {
    trackCalculatorEvent("calculator_result_view", { location_mode: "regional" });
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice: "analytics_only", ts: Date.now() }));
    expect(window.gtag).not.toHaveBeenCalled();
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice: "declined", ts: Date.now() }));
    trackCalculatorEvent("calculator_lead_submit", { location_mode: "regional" });
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it.each(["calculator_location_mode_select", "calculator_result_view", "calculator_lead_submit"] as const)("sends %s once with consent", (event) => {
    localStorage.setItem("cookie_consent_v2", JSON.stringify({ choice: "analytics_only", ts: Date.now() }));
    trackCalculatorEvent(event, { location_mode: "local" });
    expect(window.gtag).toHaveBeenCalledExactlyOnceWith("event", event, { location_mode: "local" });
  });
});