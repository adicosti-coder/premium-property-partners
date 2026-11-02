import { describe, it, expect } from "vitest";
import { buildLangAlternates } from "./CanonicalHreflang";

const base = "https://realtrust.ro/avenue-of-mara-apart-hotel";

describe("buildLangAlternates", () => {
  it("RO page canonicalizes to clean path", () => {
    const r = buildLangAlternates("/avenue-of-mara-apart-hotel/", "?utm_source=fb");
    expect(r.canonical).toBe(base);
    expect(r.languages).toEqual({ ro: base, "x-default": base });
  });
  it("EN page self-canonicalizes with ?lang=en", () => {
    const r = buildLangAlternates("/avenue-of-mara-apart-hotel", "?lang=en&fbclid=x");
    expect(r.canonical).toBe(`${base}?lang=en`);
  });
});

import { buildLangAlternates as build2 } from "./CanonicalHreflang";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("complex canonical", () => {
  i2("points /complex/:slug with a landing page at /complexe/:slug", () => {
    e2(build2("/complex/isho", "").canonical).toBe("https://realtrust.ro/complexe/isho");
  });
  i2("all singular complex addresses use the plural destination", () => {
    e2(build2("/complex/alt-complex", "").canonical).toBe("https://realtrust.ro/complexe/alt-complex");
  });
});
