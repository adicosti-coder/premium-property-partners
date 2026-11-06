import { describe, expect, it } from "vitest";
import { enrichLodgingBusinessSchema } from "./lodgingSchema";

describe("homepage lodging schema", () => {
  it("enriches ApArt Hotel without assigning hotel details to RealEstateAgent", () => {
    const agent = { "@type": "RealEstateAgent", "@id": "https://realtrust.ro/#realestateagent", legalName: "SC Imo Business Centrum SRL" };
    const hotel = { "@type": "LodgingBusiness", "@id": "https://realtrust.ro/#lodgingbusiness" };

    enrichLodgingBusinessSchema([agent, hotel], { ratingValue: "4.9", reviewCount: "12" }, ["https://www.instagram.com/ap.art.hotel/"]);

    expect(hotel).toMatchObject({ openingHours: "Mo-Su 00:00-24:00", currenciesAccepted: "EUR" });
    expect(hotel.aggregateRating).toMatchObject({ ratingValue: "4.9", reviewCount: "12" });
    expect(agent).toEqual({ "@type": "RealEstateAgent", "@id": "https://realtrust.ro/#realestateagent", legalName: "SC Imo Business Centrum SRL" });
  });
});
