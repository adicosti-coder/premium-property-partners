import { describe, expect, it } from "vitest";
import { buildArticleImagePrompt, canGenerateArticleImage, socialImageDimensions, buildEditorImagePrompt } from "../../supabase/functions/social-post-image/prompt";

describe("article image generation", () => {
  it("generates Story at 9:16 and exports 1080 by 1920", () => {
    expect(socialImageDimensions("9:16")).toEqual({ size: "1152x2048", width: 1080, height: 1920 });
  });
  it("generates square Feed at 1:1", () => {
    expect(socialImageDimensions("1:1")).toEqual({ size: "1024x1024", width: 1080, height: 1080 });
  });
  it("generates portrait Feed at 4:5", () => {
    expect(socialImageDimensions("4:5")).toEqual({ size: "1024x1280", width: 1080, height: 1350 });
  });
  it("uses unsaved editor data rather than a stored article", () => {
    const prompt = buildEditorImagePrompt("Predarea cheilor", "Acces digital și verificarea inventarului", "9:16");
    expect(prompt).toContain("Predarea cheilor");
    expect(prompt).toContain("Acces digital și verificarea inventarului");
    expect(prompt).toContain("9:16 composition");
  });
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