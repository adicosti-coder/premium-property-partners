import { describe, expect, it } from "vitest";
import { readSocialVariants, selectedVariant } from "./socialVariants";

describe("social channel variants", () => {
  it("keeps feed, reels and stories separate", () => {
    expect(selectedVariant("IMAGE")).toBe("FEED");
    expect(selectedVariant("CAROUSEL")).toBe("FEED");
    expect(selectedVariant("REELS")).toBe("REELS");
    expect(selectedVariant("STORY")).toBe("STORY");
  });
  it("rejects incomplete saved JSON", () => {
    expect(readSocialVariants({ FEED: { caption: "Feed" } })).toBeNull();
    expect(readSocialVariants("bad")).toBeNull();
    expect(readSocialVariants({ FEED: { caption: "Feed" }, REELS: { caption: "Reel" }, STORY: { caption: "Story" } })?.STORY.caption).toBe("Story");
  });
});