import { describe, expect, it } from "vitest";
import { describeSocialImage, readableSocialPost, socialImageKey, formatSocialCaption, instagramPostDescription } from "./socialDraftContent";

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

describe("platform caption formatting", () => {
  const raw = "🔑 BINE DE ȘTIUT | Smart Lock & PMS\n\nAcces simplificat. #RealTrust\n\nAdministrare eficientă. Citește https://realtrust.ro/blog/smart-lock\n#realtrust #Timisoara #SmartLock";
  it("removes Instagram URLs and collects 5–8 unique hashtags at the end", () => {
    const caption = formatSocialCaption(raw, { platform: "instagram", type: "blog" });
    expect(caption).not.toMatch(/https?:\/\/|www\./);
    expect(caption).toContain("🔗 Link în Bio pentru articolul complet!");
    expect(caption).toMatch(/^🔑/u);
    const chunks = caption.split("\n\n");
    const tags = chunks[chunks.length - 1]?.split(" ") ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(5);
    expect(tags.length).toBeLessThanOrEqual(8);
    expect(new Set(tags.map((t) => t.toLowerCase())).size).toBe(tags.length);
    expect(chunks.slice(0, -1).join(" ")).not.toContain("#");
    expect(chunks.length).toBeGreaterThanOrEqual(5);
    expect(formatSocialCaption(caption, { platform: "instagram", type: "blog" })).toBe(caption);
  });
  it("restores the Facebook source link from an Instagram caption", () => {
    const ig = formatSocialCaption(raw, { platform: "instagram", type: "blog" });
    const fb = formatSocialCaption(ig, { platform: "facebook", type: "blog", sourceUrl: "https://realtrust.ro/blog/smart-lock" });
    expect(fb).toContain("https://realtrust.ro/blog/smart-lock");
    expect(fb).not.toContain("Link în Bio");
  });
  it("keeps Instagram CTA and final tags within 2200 characters", () => {
    const caption = instagramPostDescription(`Apartament\n${"Detaliu verificat. ".repeat(300)}\nDetalii și toate pozele: https://realtrust.ro/proprietate/test`, "#RealTrust #realtrust");
    expect(caption.length).toBeLessThanOrEqual(2200);
    expect(caption).not.toContain("https://");
    expect(caption).toContain("📥 Salvează postarea");
  });
  it("strips markdown links, www URLs and inline tags without losing their label", () => {
    const caption = formatSocialCaption("Titlu\n[Citește ghidul](https://realtrust.ro/blog/test) și www.realtrust.ro/blog/test #RealTrust\nAlt paragraf.", { platform: "instagram", type: "blog" });
    expect(caption).not.toMatch(/https?:\/\/|www\./);
    expect(caption).toContain("Citește ghidul");
  });
});