import { describe, expect, it } from "vitest";
import { instagramFrame, selectSocialImage, socialImageTopic, usableSocialImage } from "../../supabase/functions/_shared/socialImageSelection";

describe("social featured image selection", () => {
  it("prefers the original OG image", () => {
    expect(selectSocialImage("Taxă hotelieră", "blog", ["https://realtrust.ro/article.jpg", "https://realtrust.ro/other.jpg"])).toBe("https://realtrust.ro/article.jpg");
  });
  it("rejects generic heroes and placeholders", () => {
    expect(selectSocialImage("Articol", "blog", ["/images/hero-optimized-1920w.webp", "/placeholder.svg", "/logo.png"])).toBeNull();
  });
  it("rejects digital locks for tax and finance articles", () => {
    expect(usableSocialImage("/assets/smart-locks.jpg", "Taxă hotelieră", "blog")).toBeNull();
    expect(usableSocialImage("/assets/smart-locks.jpg", "Smart Lock", "blog")).toContain("smart-locks.jpg");
  });
  it("uses main content image after generic metadata", () => {
    expect(selectSocialImage("Taxe", "blog", ["/images/hero-optimized.webp"], "![Formulare](/assets/documents.jpg)")).toBe("https://realtrust.ro/assets/documents.jpg");
  });
  it("associates known topics but does not invent city imagery", () => {
    expect(socialImageTopic("Taxă hotelieră / Ghid")).toBe("taxes");
    expect(socialImageTopic("Smart Lock / Check-in")).toBe("smart-lock");
    expect(socialImageTopic("ROI investiție")).toBe("finance");
    expect(socialImageTopic("Primăria Timișoara")).toBeNull();
  });
  it.each([[1920, 1080], [1080, 1920], [1080, 1080], [800, 1000], [3000, 500]])("fits all of %i×%i without clipping", (w, h) => {
    const f = instagramFrame(w, h);
    expect([1, 0.8]).toContain(f.width / f.height);
    expect(f.imageWidth + f.x).toBeLessThanOrEqual(f.width);
    expect(f.imageHeight + f.y).toBeLessThanOrEqual(f.height);
    expect(f.imageWidth / f.imageHeight).toBeCloseTo(w / h, 1);
  });
});