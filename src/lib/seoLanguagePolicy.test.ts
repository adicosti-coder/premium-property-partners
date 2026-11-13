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

import { CONSOLIDATED_ARTICLE_REDIRECTS } from "../data/consolidatedArticleRedirects";
import { CONSOLIDATED_ARTICLE_SLUGS } from "../../supabase/functions/_shared/consolidatedArticles";
import { generateRedirectHtml } from "../../plugins/vite-prerender-seo";
import dynamicSitemapXml from "../../public/sitemap-dynamic.xml?raw";

describe("consolidated articles", () => {
  it("sitemap functions exclude exactly the redirected slugs", () => {
    expect([...CONSOLIDATED_ARTICLE_SLUGS].sort()).toEqual(Object.keys(CONSOLIDATED_ARTICLE_REDIRECTS).sort());
  });
  it("are not listed in the sitemap", () => {
    for (const slug of Object.keys(CONSOLIDATED_ARTICLE_REDIRECTS)) {
      expect(dynamicSitemapXml).not.toContain(`<loc>https://realtrust.ro/blog/${slug}<`);
      expect(dynamicSitemapXml).not.toContain(`<loc>https://realtrust.ro/blog/${slug}?`);
    }
  });
  it("the reported address redirects to the investment guide and keeps the English choice", () => {
    const html = generateRedirectHtml(CONSOLIDATED_ARTICLE_REDIRECTS["timisoara-investitii-imobiliare"]);
    expect(html).toContain('<link rel="canonical" href="https://realtrust.ro/blog/ghid-investitii-imobiliare-timisoara-2026" />');
    expect(html).toContain('http-equiv="refresh" content="0; url=https://realtrust.ro/blog/ghid-investitii-imobiliare-timisoara-2026"');
    expect(html).toContain("?lang=en");
    expect(html).not.toContain("noindex");
  });
});

import { isTranslatedStaticPath, mayHaveEnglishVersion, prerenderHeadLinks, TRANSLATED_STATIC_PATHS } from "./seoLanguagePolicy";
import {
  isTranslatedStaticPath as edgeIsTranslatedStatic,
  TRANSLATED_STATIC_PATHS as EDGE_TRANSLATED_STATIC_PATHS,
} from "../../supabase/functions/_shared/seoLanguage";
import { isEnglishVersionAvailable } from "./seoEnglishAvailability";
import staticSitemapXml from "../../public/sitemap-static.xml?raw";

const CAZARE = "https://realtrust.ro/cazare";

describe("/cazare is declared fully translated", () => {
  it("is in the translated list on the site and in the sitemap functions", () => {
    expect(isTranslatedStaticPath("/cazare/")).toBe(true);
    expect(edgeIsTranslatedStatic("/cazare")).toBe(true);
    expect([...EDGE_TRANSLATED_STATIC_PATHS]).toEqual([...TRANSLATED_STATIC_PATHS]);
    expect(mayHaveEnglishVersion("/cazare")).toBe(true);
    expect(mayHaveEnglishVersion("/preturi")).toBe(false);
  });
  it("Romanian canonical is /cazare and English canonical is /cazare?lang=en", () => {
    const available = isEnglishVersionAvailable("/cazare");
    expect(available).toBe(true);
    expect(buildSeoUrls("/cazare", "", available).canonical).toBe(CAZARE);
    expect(buildSeoUrls("/cazare", "?lang=en&utm_source=fb", available).canonical).toBe(`${CAZARE}?lang=en`);
  });
  it("both languages list ro, en and x-default", () => {
    for (const search of ["", "?lang=en"]) {
      expect(buildSeoUrls("/cazare", search, true).alternates).toEqual([
        { hreflang: "ro", href: CAZARE },
        { hreflang: "en", href: `${CAZARE}?lang=en` },
        { hreflang: "x-default", href: CAZARE },
      ]);
    }
  });
  it("prerendered HTML ships no fixed canonical and the full hreflang set", () => {
    const links = prerenderHeadLinks("/cazare", true);
    expect(links.some((l) => l.includes('rel="canonical"'))).toBe(false);
    expect(links).toContain(`<link rel="alternate" hreflang="en" href="${CAZARE}?lang=en" />`);
  });
  it("the sitemap lists /cazare?lang=en with reciprocal alternates", () => {
    const blocks = staticSitemapXml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    for (const loc of [CAZARE, `${CAZARE}?lang=en`]) {
      const block = blocks.find((b) => b.includes(`<loc>${loc}</loc>`));
      expect(block).toBeDefined();
      expect(block).toContain(`hreflang="ro" href="${CAZARE}"`);
      expect(block).toContain(`hreflang="en" href="${CAZARE}?lang=en"`);
      expect(block).toContain(`hreflang="x-default" href="${CAZARE}"`);
    }
  });
});
