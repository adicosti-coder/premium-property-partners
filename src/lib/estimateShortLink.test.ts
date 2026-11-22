import { describe, expect, it } from "vitest";
import { estimatePrefillFromRpc, normalizeEstimateCode } from "./estimateShortLink";

describe("linkul scurt /e/<cod>", () => {
  it("acceptă doar coduri de 7–8 litere/cifre", () => {
    expect(normalizeEstimateCode("K7m2qx9a")).toBe("k7m2qx9a");
    expect(normalizeEstimateCode("abc1234")).toBe("abc1234");
    expect(normalizeEstimateCode("abc")).toBeNull();
    expect(normalizeEstimateCode("abc12345x")).toBeNull();
    expect(normalizeEstimateCode("ab%2Fcd12")).toBeNull();
  });
  it("precompletează analiza doar cu linkul https, zona și tipul", () => {
    expect(estimatePrefillFromRpc({ zone: "Iosefin", listing_type: "vanzare", source_url: "https://www.olx.ro/d/oferta/x" }))
      .toEqual({ url: "https://www.olx.ro/d/oferta/x", zone: "Iosefin", listingType: "vanzare" });
    expect(estimatePrefillFromRpc({ zone: "<script>", listing_type: "x", source_url: "javascript:alert(1)" }))
      .toEqual({ url: null, zone: "script", listingType: null });
    expect(estimatePrefillFromRpc(null)).toBeNull();
  });
});
