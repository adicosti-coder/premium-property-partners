import { describe, expect, it } from "vitest";
import { ZONES } from "./PreCalcMiniForm";
const f = (l: string) => ZONES.find((z) => z.label === l)?.factor;
describe("factori zonă Calcul venit", () => {
  it("ISHO nu mai apare în listă", () => expect(f("ISHO")).toBeUndefined());
  it("Complex Studențesc = 0,76", () => expect(f("Complex Studențesc")).toBe(0.76));
  it("Ring Residence fără date = 1,00", () => expect(f("Ring Residence")).toBe(1));
});
