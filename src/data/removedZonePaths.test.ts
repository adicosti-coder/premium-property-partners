import { describe, expect, it } from "vitest";
import { REMOVED_ZONE_REDIRECTS } from "./removedZonePaths";
import { neighborhoods } from "./neighborhoods";

describe("ISHO pages withdrawn (15 Nov 2026)", () => {
  it("sends the old complex address to the residential complexes hub", () => {
    expect(REMOVED_ZONE_REDIRECTS["/complexe/isho"]).toBe("/ansambluri-rezidentiale");
  });

  it("sends the old neighborhood addresses to the neighborhoods hub", () => {
    expect(REMOVED_ZONE_REDIRECTS["/imobiliare-timisoara/isho"]).toBe("/cartiere");
    expect(REMOVED_ZONE_REDIRECTS["/cartier/isho"]).toBe("/cartiere");
  });

  it("no longer lists ISHO as a neighborhood page", () => {
    expect(neighborhoods.some((n) => n.slug === "isho")).toBe(false);
  });
});
