import { describe, expect, it } from "vitest";
import { parseOwnerOutreachParams, RENTAL_ANALYSIS_BADGE } from "./ownerOutreachLink";

describe("linkul de analiză din mesajul către proprietari", () => {
  it("citește zona și tipul", () => {
    expect(parseOwnerOutreachParams("?zona=Iosefin&tip=vanzare")).toEqual({ zone: "Iosefin", type: "vanzare", listingType: null });
  });
  it("ignoră tipuri necunoscute și caractere periculoase", () => {
    expect(parseOwnerOutreachParams("?zona=<script>Fabric&tip=hotel")).toEqual({ zone: "scriptFabric", type: null, listingType: null });
    expect(parseOwnerOutreachParams("")).toEqual({ zone: null, type: null, listingType: null });
  });
  it("listing_type=inchiriere activează eticheta de închiriere", () => {
    expect(parseOwnerOutreachParams("?listing_type=inchiriere").listingType).toBe("inchiriere");
    expect(parseOwnerOutreachParams("?listing_type=hotel").listingType).toBeNull();
    expect(RENTAL_ANALYSIS_BADGE).toBe("Ideal pentru Închiriere Clasică & Regim Hotelier (ApArt Hotel)");
  });
});
