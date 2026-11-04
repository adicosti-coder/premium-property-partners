import { expect, test } from "bun:test";
import { getLeadPropertyDetails } from "./propertyDetails.ts";

test("hotel identity stays categorical and does not become a room count", () => {
  expect(getLeadPropertyDetails({ property_type: "hotel-motel", property_type_label: "Hotel / Motel" })).toEqual({
    property_type: "hotel-motel", property_type_label: "Hotel / Motel", tip_proprietate: "Hotel / Motel", rooms: null, numar_camere: null,
  });
});
test("legacy calculator room strings stay compatible", () => {
  expect(getLeadPropertyDetails({ numar_camere: "2-camere" }).rooms).toBe("2-camere");
});