import { describe, it, expect } from "vitest";
import { buildLangAlternates } from "./CanonicalHreflang";

const base = "https://realtrust.ro/avenue-of-mara-apart-hotel";

describe("buildLangAlternates", () => {
  it("RO page canonicalizes to clean path", () => {
    const r = buildLangAlternates("/avenue-of-mara-apart-hotel/", "?utm_source=fb");
    expect(r.canonical).toBe(base);
    expect(r.languages).toEqual({ ro: base, en: `${base}?lang=en`, "x-default": base });
  });
  it("EN page self-canonicalizes with ?lang=en", () => {
    const r = buildLangAlternates("/avenue-of-mara-apart-hotel", "?lang=en&fbclid=x");
    expect(r.canonical).toBe(`${base}?lang=en`);
  });
});
