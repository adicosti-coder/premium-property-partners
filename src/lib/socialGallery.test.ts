import { describe, expect, it } from "vitest";
import { requireSocialGallery, selectedGalleryUrls } from "./socialGallery";
describe("social gallery minimum", () => {
  it("rejects two selected images", () => {
    expect(() => requireSocialGallery([{ url: "a", selected: true }, { url: "b", selected: true }])).toThrow();
  });
  it("saves all three selected URLs in order", () => {
    expect(requireSocialGallery(["a", "b", "c"].map(url => ({ url, selected: true })))).toEqual(["a", "b", "c"]);
  });
  it("excludes deselected images and rejects duplicates below minimum", () => {
    const images = [{ url: "a", selected: true }, { url: "b", selected: false }, { url: "a", selected: true }, { url: "c", selected: true }];
    expect(selectedGalleryUrls(images)).toEqual(["a", "c"]);
    expect(() => requireSocialGallery(images)).toThrow();
  });
});