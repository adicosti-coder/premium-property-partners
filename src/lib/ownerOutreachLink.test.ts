import { describe, expect, it } from "vitest";
import { parseOwnerOutreachParams } from "./ownerOutreachLink";

describe("linkul de analiză din mesajul către proprietari", () => {
  it("citește zona și tipul", () => {
    expect(parseOwnerOutreachParams("?zona=Iosefin&tip=vanzare")).toEqual({ zone: "Iosefin", type: "vanzare" });
  });
  it("ignoră tipuri necunoscute și caractere periculoase", () => {
    expect(parseOwnerOutreachParams("?zona=<script>Fabric&tip=hotel")).toEqual({ zone: "scriptFabric", type: null });
    expect(parseOwnerOutreachParams("")).toEqual({ zone: null, type: null });
  });
});
