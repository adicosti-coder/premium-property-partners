import { expect, test } from "bun:test";
import { getLeadLocationDetails, getLeadPropertyDetails, getLocationLeadMessage } from "./propertyDetails.ts";

test("hotel identity stays categorical and does not become a room count", () => {
  expect(getLeadPropertyDetails({ property_type: "hotel-motel", property_type_label: "Hotel / Motel" })).toEqual({
    property_type: "hotel-motel", property_type_label: "Hotel / Motel", tip_proprietate: "Hotel / Motel", rooms: null, numar_camere: null,
  });
});
test("legacy calculator room strings stay compatible", () => {
  expect(getLeadPropertyDetails({ numar_camere: "2-camere" }).rooms).toBe("2-camere");
});
test("regional notification keeps Brașov and holiday villa, without offering local management", () => {
  const input = { location_mode: "regional", zona: "Brașov", property_type_label: "Vilă de vacanță" } as const;
  expect(getLeadLocationDetails(input)).toEqual({ location_mode: "regional", location: "Brașov", service_tag: "[Consultanță / Regional]" });
  expect(getLocationLeadMessage(input)).toContain("Locație: Brașov | Tip: Vilă de vacanță");
  expect(getLocationLeadMessage(input)).not.toContain("administrare locală");
});
test("local notification retains the exact residential complex", () => {
  const input = { location_mode: "local", zona: "Monarch", property_type_label: "2 camere" } as const;
  expect(getLeadLocationDetails(input).service_tag).toBe("[Administrare Locală]");
  expect(getLocationLeadMessage(input)).toContain("Locație: Monarch | Tip: 2 camere");
});
test("legacy callers keep the existing notification", () => {
  expect(getLocationLeadMessage({ zona: "Centru" })).toBeNull();
});