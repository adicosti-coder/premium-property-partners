import { describe, expect, it } from "vitest";
import { describeSocialImage, readableSocialPost, socialImageKey } from "./socialDraftContent";

describe("social draft content", () => {
  const gallery = [{ image_path: "apt/baie.webp", original_url: null, caption: "Baie cu duș.", alt_text: "Baie cu duș și lavoar." }];
  it("matches resized images to stored captions", () => {
    const src = "https://example.com/storage/v1/render/image/public/property-images/apt/baie.webp?width=1080";
    expect(socialImageKey(src)).toBe(socialImageKey(gallery[0].image_path));
    expect(describeSocialImage(src, gallery, "Apartament", 0)).toEqual({ caption: "Baie cu duș.", alt: "Baie cu duș și lavoar." });
  });
  it("does not match unrelated files or invent room descriptions", () => {
    expect(describeSocialImage("alt/baie.webp", gallery, "Apartament", 1)).toEqual({ caption: "", alt: "Fotografia 2 a proprietății Apartament" });
  });
  it("preserves price and link, adds distinct factual captions and removes decorative emoji", () => {
    const post = readableSocialPost("🏡 De vânzare — Apartament\n💶 90.000 €\n\nDetalii și toate pozele: https://realtrust.ro/proprietate/apartament\n#RealTrust", ["Baie cu duș.", "Baie cu duș.", "Bucătărie mobilată"]);
    expect(post).toContain("90.000 €");
    expect(post).toContain("În fotografii: Baie cu duș. Bucătărie mobilată.");
    expect(post).toContain("https://realtrust.ro/proprietate/apartament");
    expect(post).not.toContain("🏡");
    expect(readableSocialPost(post, ["Baie cu duș."])).toBe(post);
  });
});