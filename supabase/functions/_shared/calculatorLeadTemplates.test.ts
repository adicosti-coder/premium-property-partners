import { expect, test } from "bun:test";
import {
  CALC_ALERT_TEMPLATE_GENERIC, CALC_ALERT_TEMPLATE_V2, CALC_VISITOR_TEMPLATE_GENERIC, CALC_VISITOR_TEMPLATE_V2,
  calcAlertParamsGeneric, calcAlertParamsV2, calcVisitorParamsGeneric, calcVisitorParamsV2,
} from "./calculatorLeadTemplates.ts";

const s = {
  leadId: "00000000-0000-0000-0000-000000000001", name: "Ion Popescu", phone: "40722123456",
  location: "Sinaia", serviceTag: "[Consultanță / Regional]", property: "Apartament · 60 mp",
  incomeRange: "650 – 860 €/lună", nightlyRate: 73, occupancy: 0.7, classicRent: 500, netMid: 750, adjusted: true,
};
const count = (b: string) => new Set(b.match(/\{\{\d+\}\}/g)).size;

test("param counts match template variables and examples", () => {
  expect(calcAlertParamsV2(s)).toHaveLength(count(CALC_ALERT_TEMPLATE_V2.body));
  expect(CALC_ALERT_TEMPLATE_V2.example).toHaveLength(10);
  expect(calcVisitorParamsV2(s)).toHaveLength(count(CALC_VISITOR_TEMPLATE_V2.body));
  expect(CALC_VISITOR_TEMPLATE_V2.example).toHaveLength(7);
});

test("alert carries nightly rate, occupancy, difference and adjusted mark", () => {
  const p = calcAlertParamsV2(s);
  expect(p[5]).toBe("73 €/noapte");
  expect(p[6]).toBe("70%");
  expect(p[7]).toBe("+250 €/lună");
  expect(p[8]).toBe("Da (ajustat de mine)");
  expect(calcAlertParamsV2({ ...s, adjusted: false })[8]).toBe("Nu, valori implicite");
  expect(calcAlertParamsV2({ ...s, netMid: 400 })[7]).toBe("−100 €/lună");
});

test("generic templates carry the calculator tag and complete summary", () => {
  const generic = {
    leadId: s.leadId, calculatorName: "Calculator Investiții", tag: "[Lead Investitor]",
    name: s.name, phone: s.phone, summary: "Preț achiziție: 120.000 € • Randament net: 5,52%",
    visitorNextStep: "Andrei verifică ipotezele.",
  };
  expect(calcAlertParamsGeneric(generic)).toHaveLength(count(CALC_ALERT_TEMPLATE_GENERIC.body));
  expect(CALC_ALERT_TEMPLATE_GENERIC.example).toHaveLength(6);
  expect(calcVisitorParamsGeneric(generic)).toHaveLength(count(CALC_VISITOR_TEMPLATE_GENERIC.body));
  expect(CALC_VISITOR_TEMPLATE_GENERIC.example).toHaveLength(4);
  expect(calcAlertParamsGeneric(generic)[1]).toBe("[Lead Investitor]");
  expect(calcAlertParamsGeneric(generic)[4]).toContain("120.000 €");
});

test("no param is empty or contains newlines (Meta validation)", () => {
  for (const p of [...calcAlertParamsV2({ ...s, nightlyRate: null, occupancy: null, classicRent: null, name: "A\nB" }), ...calcVisitorParamsV2(s)]) {
    expect(p.length).toBeGreaterThan(0);
    expect(/[\r\n\t]/.test(p)).toBe(false);
  }
});
