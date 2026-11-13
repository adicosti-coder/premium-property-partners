import { describe, expect, it } from "vitest";
import { LEGACY_PROPERTY_REDIRECTS } from "./legacyPropertyPaths";
import { getPropertyBySlug } from "./properties";

describe("legacy apartment addresses", () => {
  it("each old top-level address points to an existing /proprietate page", () => {
    for (const [from, to] of Object.entries(LEGACY_PROPERTY_REDIRECTS)) {
      expect(to).toMatch(/^\/proprietate\/[a-z0-9-]+$/);
      expect(getPropertyBySlug(to.replace("/proprietate/", "")), `${from} → ${to}`).toBeTruthy();
    }
  });

  it("the Avenue of Mara old address redirects to its canonical page", () => {
    expect(LEGACY_PROPERTY_REDIRECTS["/avenue-of-mara-apart-hotel"]).toBe("/proprietate/avenue-of-mara-apart-hotel");
  });
});
