import { describe, expect, it } from "vitest";
import { resolveListingBedrooms } from "../../supabase/functions/_shared/listingRooms";
import { advisorDirection, buildAdvisorGeoContext } from "../../supabase/functions/_shared/advisorGeo";

describe("Source bedroom mapping", () => {
  it("maps 2 rooms to 1 bedroom, not 2", () => {
    expect(resolveListingBedrooms(2, "Apartament 2 camere decomandat")).toBe(1);
  });
  it("honors explicit separate bedrooms in source descriptions", () => {
    expect(resolveListingBedrooms(2, "Două dormitoare separate, fără living")).toBe(2);
    expect(resolveListingBedrooms(2, "2 dormitoare separate")).toBe(2);
  });
  it("does not treat a negation as an explicit bedroom count", () => {
    expect(resolveListingBedrooms(2, "Nu 2 dormitoare, ci living și dormitor")).toBe(1);
  });
  it("handles missing rooms and other room counts", () => {
    expect(resolveListingBedrooms(null, "Apartament")).toBeNull();
    expect(resolveListingBedrooms(3, "3 camere")).toBe(2);
    expect(resolveListingBedrooms(1, "Garsonieră")).toBe(1);
  });
});

describe("Advisor geographic grounding", () => {
  it("places Martirilor south, never west", () => {
    expect(advisorDirection(45.7228, 21.2335)).toBe("Sud / South");
    expect(buildAdvisorGeoContext("Calea Martirilor")).toContain("latitude=45.7228");
  });
  it("places the county hospital southeast", () => {
    expect(advisorDirection(45.732, 21.241)).toBe("Sud-Est / Southeast");
    expect(buildAdvisorGeoContext("Spitalul Județean")).toContain("latitude=45.732");
  });
  it("prioritizes valid property GPS over approximate zone references", () => {
    const context = buildAdvisorGeoContext("Martirilor", 45.731, 21.239);
    expect(context).toContain("latitude=45.731");
    expect(context).toContain("stored property GPS");
  });
  it("never invents GPS for unknown areas or invalid coordinates", () => {
    expect(buildAdvisorGeoContext("Timișoara", 0, 0)).toContain("exact position unknown");
  });
});