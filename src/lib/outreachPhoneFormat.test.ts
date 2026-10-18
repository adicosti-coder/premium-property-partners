import { describe, expect, it } from "vitest";
import { toOutreachPhone } from "../../supabase/functions/_shared/waPhone";

// Regulă: Make.com primește telefonul în format internațional complet, Fără „+”.
describe("Outreach phone format (Make.com)", () => {
  it("adds prefix 40 to a local 07 number and drops the plus", () => {
    expect(toOutreachPhone("0799069256")).toBe("40799069256");
    expect(toOutreachPhone("0799 069 256")).toBe("40799069256");
    expect(toOutreachPhone("799069256")).toBe("40799069256");
  });

  it("normalizes every stored form of the same number to one value", () => {
    const forms = ["+40799069256", "40799069256", "0040799069256", "0799069256"];
    const out = forms.map(f => toOutreachPhone(f));
    expect(out).toEqual(["40799069256", "40799069256", "40799069256", "40799069256"]);
  });

  it("never returns a plus sign and always starts with 407", () => {
    const phone = toOutreachPhone("+40 799 069 256");
    expect(phone).not.toBeNull();
    expect(phone).not.toContain("+");
    expect(phone).toMatch(/^407\d{8}$/);
  });

  it("rejects landlines, short numbers and empty input", () => {
    expect(toOutreachPhone("0213333333")).toBeNull();
    expect(toOutreachPhone("0755555")).toBeNull();
    expect(toOutreachPhone("")).toBeNull();
    expect(toOutreachPhone(null)).toBeNull();
    expect(toOutreachPhone(undefined)).toBeNull();
  });
});
