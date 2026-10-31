import { describe, expect, it } from "vitest";
import { buildArticleImagePrompt, canGenerateArticleImage } from "../../supabase/functions/social-post-image/prompt";

describe("article image generation", () => {
  it("uses the actual article title and full body instead of its social caption", () => {
    const prompt = buildArticleImagePrompt({ title: "PFA sau SRL", excerpt: "Rezumat", content: "<p>Impozitare și contabilitate pentru PFA.</p>" });
    expect(prompt).toContain("PFA sau SRL");
    expect(prompt).toContain("Impozitare și contabilitate pentru PFA.");
    expect(prompt).not.toContain("<p>");
  });
  it("uses excerpt when the article body is missing", () => {
    expect(buildArticleImagePrompt({ title: "Administrare", excerpt: "Predarea cheilor" })).toContain("Predarea cheilor");
  });
  it("never generates fictional listing photos", () => {
    expect(canGenerateArticleImage({ type: "property", status: "draft" })).toBe(false);
    expect(canGenerateArticleImage({ type: "blog", status: "draft", property_id: "property-1" })).toBe(false);
  });
  it("generates only for unpublished social drafts", () => {
    expect(canGenerateArticleImage({ type: "blog", status: "draft" })).toBe(true);
    expect(canGenerateArticleImage({ type: "blog", status: "scheduled" })).toBe(true);
    expect(canGenerateArticleImage({ type: "blog", status: "posted" })).toBe(false);
  });
});