import { beforeEach, describe, expect, it } from "vitest";
import { buildStaticRoutes, generateHtml } from "../../plugins/vite-prerender-seo";
import { LODGING_BUSINESS_SCHEMA, REAL_ESTATE_AGENT_SCHEMA } from "./orgIdentity";
import { generateLocalBusinessSchema } from "../utils/schemaGenerators";

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

  it("keeps the Romanian canonical for an untranslated page opened with ?lang=en, without noindex", () => {
    document.head.innerHTML = homepageHtml().match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
    window.history.replaceState({}, "", "/?lang=en");
    const languageScript = Array.from(document.head.querySelectorAll("script")).find((script) => script.textContent?.includes("URLSearchParams"));
    if (!languageScript?.textContent) throw new Error("English head switch missing");
    window.eval(languageScript.textContent);

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://realtrust.ro/");
    expect(document.head.querySelector('link[hreflang="en"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("index, follow");
  });

  it("gives a translated article one self-referencing canonical per language and reciprocal hreflang", () => {
    const route = {
      path: "/blog/timisoara-investitii-imobiliare",
      title: "Investiții",
      description: "RO",
      h1: "Investiții",
      jsonLd: [],
      canonical: "https://realtrust.ro/blog/timisoara-investitii-imobiliare",
      englishAvailable: true,
      english: { title: "Real estate investment | RealTrust", description: "EN" },
    };
    const html = generateHtml(template, route, []);
    // Raw HTML must not contradict the ?lang=en variant served from the same file.
    expect(html).not.toMatch(/<link rel="canonical"/);
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://realtrust.ro/blog/timisoara-investitii-imobiliare?lang=en" />');
    expect(html).toContain('data-en-path="/blog/timisoara-investitii-imobiliare"');

    for (const [search, expected] of [
      ["?lang=en&utm_source=gsc", "https://realtrust.ro/blog/timisoara-investitii-imobiliare?lang=en"],
      ["", "https://realtrust.ro/blog/timisoara-investitii-imobiliare"],
    ]) {
      document.head.innerHTML = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
      window.history.replaceState({}, "", `/blog/timisoara-investitii-imobiliare${search}`);
      const script = Array.from(document.head.querySelectorAll("script")).find((node) => node.textContent?.includes("URLSearchParams"));
      window.eval(script?.textContent ?? "");
      expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(expected);
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("index, follow");
    }
    expect(document.head.querySelector('link[hreflang="ro"]')?.getAttribute("href")).toBe("https://realtrust.ro/blog/timisoara-investitii-imobiliare");
    expect(document.head.querySelector('link[hreflang="x-default"]')?.getAttribute("href")).toBe("https://realtrust.ro/blog/timisoara-investitii-imobiliare");
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

  it("uses the shared orgIdentity nodes for the hotel and the agency", () => {
    document.body.innerHTML = homepageHtml().match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? "";
    const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script) => JSON.parse(script.textContent || "{}"));
    const hotel = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#lodgingbusiness");
    const agent = schemas.find((schema) => schema["@id"] === "https://realtrust.ro/#realestateagent");

    const { aggregateRating, ...hotelIdentity } = hotel;
    expect(hotelIdentity).toEqual(JSON.parse(JSON.stringify(LODGING_BUSINESS_SCHEMA)));
    expect(agent).toEqual(JSON.parse(JSON.stringify(REAL_ESTATE_AGENT_SCHEMA)));
    expect(generateLocalBusinessSchema()).toEqual(hotelIdentity);
    // Static HTML and the runtime homepage carry the same 9.7/10 brand rating.
    expect(aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 9.7, reviewCount: 500, bestRating: 10, worstRating: 1 });
    const runtimeHotel = generateHomepageSchemas().find((schema) => schema["@id"] === "https://realtrust.ro/#lodgingbusiness");
    expect(runtimeHotel?.aggregateRating).toEqual(aggregateRating);
  });

  it("states the management fee as 15–20% of net income in the ApArt Hotel node", () => {
    const offers = (LODGING_BUSINESS_SCHEMA.hasOfferCatalog.itemListElement as readonly { itemOffered: { name: string }; priceSpecification: Record<string, string> }[]);
    const management = offers.find((offer) => offer.itemOffered.name === "Property Management");
    expect(management?.priceSpecification.minPrice).toBe("15");
    expect(management?.priceSpecification.maxPrice).toBe("20");
    expect(management?.priceSpecification.unitText).toContain("venitul net");
    expect(management?.priceSpecification).not.toHaveProperty("price");
  });
});
