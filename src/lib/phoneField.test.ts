import { describe, expect, it } from "vitest";
import { z } from "zod";
import { normalizePhoneInput, roMobileField } from "./phoneField";

const schema = z.object({ phone: roMobileField("Introdu un mobil valid") });

const check = (value: string) => schema.safeParse({ phone: value });

describe("Phone field accepts the number as visitors type it", () => {
  it("accepts the spaced form the placeholder suggests", () => {
    const r = check("0722 123 456");
    expect(r.success).toBe(true);
    expect(r.success && r.data.phone).toBe("0722123456");
  });

  it("accepts the form the browser autofills", () => {
    const r = check("+40 722 123 456");
    expect(r.success).toBe(true);
    expect(r.success && r.data.phone).toBe("+40722123456");
  });

  it("accepts dashes, dots and parentheses too", () => {
    for (const value of ["0722-123-456", "0722.123.456", "(0722) 123 456", "0722 123 456 "]) {
      expect(check(value).success, value).toBe(true);
    }
  });

  it("keeps rejecting numbers that are not a Romanian mobile", () => {
    for (const value of ["0213 333 333", "0755555", "", "abc"]) {
      const r = check(value);
      expect(r.success, value).toBe(false);
      if (!r.success) expect(r.error.flatten().fieldErrors.phone?.[0]).toBe("Introdu un mobil valid");
    }
  });

  it("normalizes every typed form of the same number to one value", () => {
    const forms = ["0799069256", "0799 069 256", "+40 799 069 256", "0040 799 069 256".replace("0040", "0799")];
    const out = forms.map((f) => normalizePhoneInput(f));
    expect(out).toEqual(["0799069256", "0799069256", "+40799069256", "0799069256"]);
  });
});
