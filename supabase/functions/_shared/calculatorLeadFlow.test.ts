import { expect, test } from "bun:test";
import { isCalculatorLeadSource, shouldSendLegacyLeadAlert, shouldUseMakeWhatsApp } from "./calculatorLeadFlow.ts";

test("all calculator sources bypass legacy duplicate alerts", () => {
  for (const source of ["calculator_unificat_manual", "calculator_unificat_investitii", "calculator_unificat_oaspeti", "calculator_unificat_rapid_investitii"]) {
    expect(isCalculatorLeadSource(source)).toBe(true);
    expect(shouldSendLegacyLeadAlert(source)).toBe(false);
  }
});

test("ordinary forms keep their existing notifications", () => {
  expect(isCalculatorLeadSource("pagina_contact")).toBe(false);
  expect(shouldSendLegacyLeadAlert("pagina_contact")).toBe(true);
  expect(shouldSendLegacyLeadAlert(null)).toBe(true);
});

test("additional calculators never relay a second WhatsApp through Make", () => {
  expect(shouldUseMakeWhatsApp("investment")).toBe(false);
  expect(shouldUseMakeWhatsApp("guest")).toBe(false);
  expect(shouldUseMakeWhatsApp("quick_investment")).toBe(false);
  expect(shouldUseMakeWhatsApp("unified")).toBe(true);
  expect(shouldUseMakeWhatsApp(null)).toBe(true);
});
