import { describe, expect, it } from "vitest";
import { buildSeoUrls, hasEnglishTranslation, prerenderLanguageScript, seoRobots } from "./seoLanguagePolicy";
import {
  hasEnglishTranslation as edgeHasEnglish,
  sitemapAlternateLinks,
  sitemapLanguageBlocks,
} from "../../supabase/functions/_shared/seoLanguage";

const ARTICLE = "https://realtrust.ro/blog/timisoara-investitii-imobiliare";

describe("canonical for ?lang=en", () => {
  it("translated page self-canonicalizes in English", () => {
    expect(buildSeoUrls("/blog/timisoara-investitii-imobiliare", "?lang=en", true).canonical).toBe(`${ARTICLE}?lang=en`);
  });
  it("translated page lists ro, en and x-default in both languages", () => {
    for (const search of ["", "?lang=en"]) {
      expect(buildSeoUrls("/blog/timisoara-investitii-imobiliare", search, true).alternates).toEqual([
        { hreflang: "ro", href: ARTICLE },
        { hreflang: "en", href: `${ARTICLE}?lang=en` },
        { hreflang: "x-default", href: ARTICLE },
      ]);
    }
  });
  it("untranslated page opened with ?lang=en canonicalizes to the clean Romanian URL", () => {
    const urls = buildSeoUrls("/preturi", "?lang=en", false);
    expect(urls.canonical).toBe("https://realtrust.ro/preturi");
    expect(urls.alternates.map((a) => a.hreflang)).toEqual(["ro", "x-default"]);
  });
});

describe("other query parameters", () => {
  it("drops tracking parameters and trailing slashes", () => {
    expect(buildSeoUrls("/blog/timisoara-investitii-imobiliare/", "?utm_source=fb&gclid=1&lang=ro", true).canonical).toBe(ARTICLE);
  });
  it("keeps page 2+ only on paginated blog archives", () => {
    expect(buildSeoUrls("/blog/categorie/investitii-imobiliare", "?page=2&utm_medium=x", false).canonical).toBe(
      "https://realtrust.ro/blog/categorie/investitii-imobiliare?page=2",
    );
    expect(buildSeoUrls("/blog/categorie/investitii-imobiliare", "?page=1", false).canonical).toBe(
      "https://realtrust.ro/blog/categorie/investitii-imobiliare",
    );
    expect(buildSeoUrls("/preturi", "?page=2", false).canonical).toBe("https://realtrust.ro/preturi");
  });
});

describe("robots", () => {
  it("does not noindex a page because it is shown in English", () => {
    expect(seoRobots(false)).toBe("index, follow");
    expect(seoRobots(true)).toBe("noindex, nofollow");
  });
});

describe("what counts as a real translation", () => {
  it("needs both the English title and body", () => {
    expect(hasEnglishTranslation({ title_en: "T", content_en: "Body" })).toBe(true);
    expect(hasEnglishTranslation({ title_en: "T", content_en: "  " })).toBe(false);
    expect(hasEnglishTranslation({ title_en: null, content_en: "Body" })).toBe(false);
  });
  it("is the same rule in the sitemap functions", () => {
    for (const fields of [{ title_en: "T", content_en: "B" }, { title_en: "T", content_en: "" }, null]) {
      expect(edgeHasEnglish(fields)).toBe(hasEnglishTranslation(fields));
    }
  });
});

describe("sitemap and page agree", () => {
  it("sitemap alternates equal the page's hreflang", () => {
    for (const translated of [true, false]) {
      const hrefs = Array.from(sitemapAlternateLinks("/blog/timisoara-investitii-imobiliare", translated).matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)).map((m) => ({ hreflang: m[1], href: m[2] }));
      expect(hrefs).toEqual(buildSeoUrls("/blog/timisoara-investitii-imobiliare", "", translated).alternates);
    }
  });
  it("lists the ?lang=en URL only for translated pages", () => {
    expect(sitemapLanguageBlocks("/blog/a", true)).toContain("<loc>https://realtrust.ro/blog/a?lang=en</loc>");
    expect(sitemapLanguageBlocks("/blog/a", false)).not.toContain("?lang=en");
  });
});

describe("prerender head script", () => {
  const run = (path: string, search: string, translated: boolean) => {
    document.head.innerHTML = "";
    window.history.replaceState({}, "", `${path}${search}`);
    const source = prerenderLanguageScript(path, translated).replace(/^<script>|<\/script>$/g, "");
    window.eval(source);
    return Array.from(document.head.querySelectorAll('link[rel="canonical"]')).map((l) => l.getAttribute("href"));
  };
  it("inserts the same canonical the app emits", () => {
    const cases: Array<[string, string, boolean]> = [
      ["/blog/timisoara-investitii-imobiliare", "?lang=en", true],
      ["/blog/timisoara-investitii-imobiliare", "?utm_source=x", true],
      ["/blog/categorie/investitii-imobiliare", "?page=3&lang=en", false],
      ["/blog/locatie/iosefin", "?page=abc", false],
    ];
    for (const [path, search, translated] of cases) {
      expect(run(path, search, translated)).toEqual([buildSeoUrls(path, search, translated).canonical]);
    }
  });
});
