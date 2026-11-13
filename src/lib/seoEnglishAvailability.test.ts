import { afterEach, describe, expect, it } from "vitest";
import { buildSeoUrls } from "./seoLanguagePolicy";
import { declareEnglishVersion, isEnglishVersionAvailable, resetEnglishVersions } from "./seoEnglishAvailability";

const PATH = "/blog/ghid-investitii-imobiliare-timisoara-2026";

afterEach(() => {
  resetEnglishVersions();
  document.documentElement.removeAttribute("data-en-path");
});

describe("English availability while an article loads", () => {
  it("keeps the prerendered English seed until the article declares itself", () => {
    document.documentElement.setAttribute("data-en-path", PATH);
    // Nothing declared yet (article still loading): the ?lang=en canonical stays English.
    expect(isEnglishVersionAvailable(PATH)).toBe(true);
    expect(buildSeoUrls(PATH, "?lang=en", isEnglishVersionAvailable(PATH)).canonical).toBe(
      `https://realtrust.ro${PATH}?lang=en`,
    );
  });

  it("an untranslated page opened with ?lang=en canonicalizes to Romanian without an English alternate", () => {
    declareEnglishVersion("/preturi", false);
    const urls = buildSeoUrls("/preturi", "?lang=en&utm_source=x", isEnglishVersionAvailable("/preturi"));
    expect(urls.canonical).toBe("https://realtrust.ro/preturi");
    expect(urls.alternates.map((a) => a.hreflang)).toEqual(["ro", "x-default"]);
  });
});
