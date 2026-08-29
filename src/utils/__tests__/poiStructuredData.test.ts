import { describe, it, expect } from "vitest";
import { buildPoiSchema, buildPoiItemListSchema } from "@/utils/poiStructuredData";

const base = {
  id: "1",
  name: "Casa Bunicii",
  category: "restaurant",
  latitude: 45.7537,
  longitude: 21.2257,
  url: "https://realtrust.ro/blog/ghid?poi=casa-bunicii",
};

/** Guards against the value shapes Google's Rich Results Test rejects. */
const assertNoEmptyValues = (value: unknown) => {
  if (Array.isArray(value)) return value.forEach(assertNoEmptyValues);
  if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      expect(v, `${key} must not be null/undefined`).not.toBeNull();
      expect(v, `${key} must not be null/undefined`).not.toBeUndefined();
      expect(v, `${key} must not be an empty string`).not.toBe("");
      assertNoEmptyValues(v);
    }
  }
};

describe("poi structured data", () => {
  it("emits a valid Restaurant node without empty properties", () => {
    const node = buildPoiSchema({ ...base, address: null, ratingValue: null, ratingCount: 0 });
    expect(node["@type"]).toBe("Restaurant");
    expect(node.geo).toMatchObject({ "@type": "GeoCoordinates" });
    expect(node.aggregateRating).toBeUndefined();
    assertNoEmptyValues(node);
  });

  it("maps cafes to CafeOrCoffeeShop and rounds the rating", () => {
    const node = buildPoiSchema({
      ...base,
      category: "cafe",
      address: " Str. Alba Iulia 2 ",
      ratingValue: 4.6666,
      ratingCount: 12,
    });
    expect(node["@type"]).toBe("CafeOrCoffeeShop");
    expect((node.address as Record<string, unknown>).streetAddress).toBe("Str. Alba Iulia 2");
    expect(node.aggregateRating).toMatchObject({ ratingValue: 4.7, reviewCount: 12 });
    assertNoEmptyValues(node);
  });

  it("drops out-of-range or unreviewed ratings and invalid coordinates", () => {
    const node = buildPoiSchema({
      ...base,
      latitude: Number.NaN,
      longitude: Number.NaN,
      ratingValue: 9,
      ratingCount: 3,
    });
    expect(node.geo).toBeUndefined();
    expect(node.aggregateRating).toBeUndefined();
  });

  it("builds a positional ItemList", () => {
    const list = buildPoiItemListSchema([base, { ...base, id: "2", name: "Cafe X" }]);
    expect(list["@context"]).toBe("https://schema.org");
    expect(list.numberOfItems).toBe(2);
    const items = list.itemListElement as Array<Record<string, unknown>>;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    assertNoEmptyValues(list);
  });
});
