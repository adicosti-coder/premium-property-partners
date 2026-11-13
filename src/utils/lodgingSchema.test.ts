import { describe, expect, it } from "vitest";
import { enrichLodgingBusinessSchema } from "./lodgingSchema";
import { generateHomepageSchemas } from "./schemaGenerators";

const LODGING_ID = "https://realtrust.ro/#lodgingbusiness";

describe("homepage lodging schema", () => {
  it("enriches ApArt Hotel without assigning hotel details to RealEstateAgent", () => {
    const agent = { "@type": "RealEstateAgent", "@id": "https://realtrust.ro/#realestateagent", legalName: "SC Imo Business Centrum SRL" };
    const hotel: Record<string, unknown> = { "@type": "LodgingBusiness", "@id": LODGING_ID };

    enrichLodgingBusinessSchema([agent, hotel], ["https://www.instagram.com/ap.art.hotel/"]);

    expect(hotel).toMatchObject({ openingHours: "Mo-Su 00:00-24:00", currenciesAccepted: "EUR" });
    expect(agent).toEqual({ "@type": "RealEstateAgent", "@id": "https://realtrust.ro/#realestateagent", legalName: "SC Imo Business Centrum SRL" });
  });

  it("uses the visible 9.7/10 score from 500 reviews on the 1–10 scale", () => {
    const hotel: Record<string, unknown> = { "@type": "LodgingBusiness", "@id": LODGING_ID };
    enrichLodgingBusinessSchema([hotel], []);
    expect(hotel.aggregateRating).toEqual({
      "@type": "AggregateRating", ratingValue: 9.7, reviewCount: 500, bestRating: 10, worstRating: 1,
    });
  });

  it("emits exactly one rating on the homepage, with no 1–5 scale and no review sample", () => {
    const schemas = generateHomepageSchemas();
    const rated = schemas.filter((s) => s.aggregateRating);
    expect(rated).toHaveLength(1);
    expect(rated[0]["@id"]).toBe(LODGING_ID);
    expect(rated[0].aggregateRating).toMatchObject({ ratingValue: 9.7, reviewCount: 500, bestRating: 10 });
    expect(JSON.stringify(schemas)).not.toMatch(/"bestRating":"?5"?/);
    expect(rated[0].review).toBeUndefined();
  });
});
