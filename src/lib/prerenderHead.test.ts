import { beforeEach, describe, expect, it } from "vitest";
import { buildStaticRoutes, generateHtml } from "../../plugins/vite-prerender-seo";

const template = `<!doctype html><html lang="ro"><head><title>Template</title><meta name="description" content="Template"><meta name="robots" content="index, follow"></head><body><div id="root"></div></body></html>`;

function homepageHtml() {
  const route = buildStaticRoutes().find((item) => item.path === "/");
  if (!route) throw new Error("Homepage route missing");
  return generateHtml(template, route, []);
}

describe("prerendered homepage head", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("ships one Romanian canonical and index,follow in the static HTML", () => {
    const html = homepageHtml();
    expect(html.match(/<link rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('<link rel="canonical" href="https://realtrust.ro/" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
  });

  it("keeps the English query in canonical and applies noindex,follow before React", () => {
    document.head.innerHTML = homepageHtml().match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
    window.history.replaceState({}, "", "/?lang=en");
    const languageScript = Array.from(document.head.querySelectorAll("script")).find((script) => script.textContent?.includes("URLSearchParams"));
    if (!languageScript?.textContent) throw new Error("English head switch missing");
    window.eval(languageScript.textContent);

    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://realtrust.ro/?lang=en");
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, follow");
  });

  it("keeps ApArt Hotel and RealTrust as distinct entities under the legal organization", () => {
    document.body.innerHTML = homepageHtml().match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? "";
    const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script) => JSON.parse(script.textContent || "{}"));
    const hotel = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#lodgingbusiness");
    const agent = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#realestateagent");
    const organization = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#organization");

    expect(hotel["@type"]).toBe("LodgingBusiness");
    expect(agent["@type"]).toBe("RealEstateAgent");
    expect(agent.legalName).toBe("SC Imo Business Centrum SRL");
    expect(organization.legalName).toBe("SC Imo Business Centrum SRL");
    expect(hotel.parentOrganization).toEqual({ "@id": organization["@id"] });
    expect(agent.parentOrganization).toEqual({ "@id": organization["@id"] });
  });
});
