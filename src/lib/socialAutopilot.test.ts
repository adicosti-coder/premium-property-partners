import { describe, it, expect } from "vitest";
import {
  autopilotConfig, bucharestTime, upcomingSlots, isAutopilotEligible, planSchedule, withTitleLine, type DraftRow,
  manualFixUpdate, MANUAL_FIX_PREFIX, rotationNeeds, isManualFixFlag, manualFixText,
} from "../../supabase/functions/_shared/socialAutopilotPlan";
import { normalizeYieldClaims, guardSocialPostYield, postYieldValue } from "../../supabase/functions/_shared/socialYieldGuard";
import { formatSocialCaption } from "../../supabase/functions/_shared/socialCaption";

const draft = (o: Partial<DraftRow>): DraftRow => ({
  id: "d1", type: "blog", title: "Ghid", caption: "x".repeat(200), media_type: "IMAGE", video_url: null,
  image_url: "https://realtrust.ro/a.jpg", image_urls: [], property_id: null,
  source_url: "https://realtrust.ro/blog/ghid", last_error: null, created_at: "2026-11-01T10:00:00Z", ...o,
});
const ctx = { activePropertyIds: new Set(["p1"]), publishedBlogSlugs: new Set(["ghid"]), minCaption: 80 };

describe("social autopilot", () => {
  it("defaults to 2 feed posts a day at 10:00 and 18:00, 7 days ahead", () => {
    expect(autopilotConfig({})).toMatchObject({ days_ahead: 7, slots: ["10:00", "18:00"] });
  });
  it("ignores slots outside the 09–21 publishing window", () => {
    expect(autopilotConfig({ slots: ["07:00", "22:00"] }).slots).toEqual(["10:00", "18:00"]);
  });
  it("converts Bucharest local time across the DST change", () => {
    expect(bucharestTime(2026, 11, 10, 10, 0).toISOString()).toBe("2026-11-10T08:00:00.000Z");
    expect(bucharestTime(2026, 7, 10, 10, 0).toISOString()).toBe("2026-07-10T07:00:00.000Z");
  });
  it("skips today's slots that are less than 30 minutes away", () => {
    const now = new Date("2026-11-09T07:45:00Z"); // 09:45 Bucharest
    const slots = upcomingSlots(now, autopilotConfig({ days_ahead: 1 }));
    expect(slots.map((s) => s.toISOString())).toEqual(["2026-11-09T16:00:00.000Z"]);
  });
  it("never auto-schedules Stories, failed drafts, inactive properties or unpublished articles", () => {
    expect(isAutopilotEligible(draft({ media_type: "STORY" }), ctx)).toBe(false);
    expect(isAutopilotEligible(draft({ last_error: "Upstream 404" }), ctx)).toBe(false);
    expect(isAutopilotEligible(draft({ type: "property", property_id: "p2" }), ctx)).toBe(false);
    expect(isAutopilotEligible(draft({ source_url: "https://realtrust.ro/blog/ascuns" }), ctx)).toBe(false);
    expect(isAutopilotEligible(draft({ image_url: null, image_urls: [] }), ctx)).toBe(false);
    expect(isAutopilotEligible(draft({}), ctx)).toBe(true);
  });
  it("fills only free slots and alternates properties with articles", () => {
    const slots = [new Date("2026-11-10T08:00:00Z"), new Date("2026-11-10T16:00:00Z"), new Date("2026-11-11T08:00:00Z")];
    const taken = [new Date("2026-11-10T08:30:00Z")];
    const plan = planSchedule(slots, taken, [
      draft({ id: "b1" }), draft({ id: "b2", created_at: "2026-11-02T00:00:00Z" }),
      draft({ id: "p1", type: "property", property_id: "p1" }),
    ]);
    expect(plan.map((p) => [p.id, p.at.toISOString()])).toEqual([
      ["p1", "2026-11-10T16:00:00.000Z"], ["b1", "2026-11-11T08:00:00.000Z"],
    ]);
  });
  it("opens auto-extracted captions with the real title once", () => {
    expect(withTitleLine("City of Mara", "Apartament nou")).toBe("City of Mara\n\nApartament nou");
    expect(withTitleLine("City of Mara", "City of Mara: apartament")).toBe("City of Mara: apartament");
  });
  it("continues the property/article rotation after the last post already in the calendar", () => {
    const slots = [new Date("2026-11-10T08:00:00Z"), new Date("2026-11-10T16:00:00Z")];
    const plan = planSchedule(slots, [], [draft({ id: "b1" }), draft({ id: "p1", type: "property", property_id: "p1" })], "property");
    expect(plan.map((p) => p.id)).toEqual(["b1", "p1"]);
  });
  it("alternates around posts already scheduled in between", () => {
    const slots = ["2026-11-14T08:00:00Z", "2026-11-14T16:00:00Z", "2026-11-15T08:00:00Z", "2026-11-15T16:00:00Z"].map((s) => new Date(s));
    const taken = [{ at: slots[0], type: "property" }, { at: slots[2], type: "property" }];
    const plan = planSchedule(slots, taken, [draft({ id: "p9", type: "property", property_id: "p1" }), draft({ id: "b1" }), draft({ id: "b2", created_at: "2026-11-02T00:00:00Z" })]);
    expect(plan.map((p) => [p.id, p.at.toISOString()])).toEqual([["b1", "2026-11-14T16:00:00.000Z"], ["b2", "2026-11-15T16:00:00.000Z"]]);
  });
});

describe("social autopilot rotation needs", () => {
  it("asks for two articles when free 18:00 slots follow scheduled properties", () => {
    const slots = ["2026-11-14T08:00:00Z", "2026-11-14T16:00:00Z", "2026-11-15T08:00:00Z", "2026-11-15T16:00:00Z"].map((s) => new Date(s));
    expect(rotationNeeds(slots, [{ at: slots[0], type: "property" }, { at: slots[2], type: "property" }])).toEqual({ property: 0, blog: 2 });
  });
});

describe("social autopilot yield guard", () => {
  it("replaces „Yield 9%+” in titles with the approved range", () => {
    expect(normalizeYieldClaims("Apartament 2 Camere, Bv. Regele Carol I | Yield 9%+"))
      .toBe("Apartament 2 Camere, Bv. Regele Carol I | Randament 6,5% – 9,4% net estimat");
  });
  it("replaces „peste 9%” in descriptions with the approved range", () => {
    expect(normalizeYieldClaims("te bucuri de un randament estimat de peste 9% și de management"))
      .toBe("te bucuri de un randament 6,5% – 9,4% net estimat și de management");
  });
  it("uses an explicit property-level value only when one is set", () => {
    expect(normalizeYieldClaims("Yield 9%+", 8.2)).toBe("Randament 8,2% net estimat");
    expect(normalizeYieldClaims("Yield 9%+", null)).toBe("Randament 6,5% – 9,4% net estimat");
  });
  it("leaves commission, occupancy and tax percentages untouched", () => {
    const t = "Comision 15–20% din venitul net, ocupare 70%, impozit 10%";
    expect(normalizeYieldClaims(t)).toBe(t);
  });
  it("also fixes per-format captions and Story overlay text", () => {
    const g = guardSocialPostYield({ title: "x", caption: "y", content_variants: { STORY: { caption: "randament 9%+", overlay_text: "Randament 9%+ | 79.000 EUR" } } });
    expect(g.content_variants).toEqual({ STORY: { caption: "randament 6,5% – 9,4% net estimat", overlay_text: "Randament 6,5% – 9,4% net estimat | 79.000 EUR" } });
  });
});

describe("social autopilot manual-fix flag", () => {
  it("flags drafts without images and keeps them out of the automatic schedule", () => {
    const flag = manualFixUpdate(draft({ image_url: null, image_urls: [] }));
    expect(flag).toBe(`${MANUAL_FIX_PREFIX}lipsesc imaginile obligatorii`);
    expect(isAutopilotEligible(draft({ last_error: flag! }), ctx)).toBe(false);
  });
  it("flags Story drafts as an unsupported autopilot format", () => {
    expect(manualFixUpdate(draft({ media_type: "STORY" }))).toMatch(/^Necesită verificare manuală: format Story/);
  });
  it("flags carousels with fewer than 2 images", () => {
    expect(manualFixUpdate(draft({ media_type: "CAROUSEL", image_urls: [] }))).toBe(`${MANUAL_FIX_PREFIX}caruselul are nevoie de cel puțin 2 imagini`);
  });
  it("clears a media flag once the images are added", () => {
    expect(manualFixUpdate(draft({ last_error: `${MANUAL_FIX_PREFIX}lipsesc imaginile obligatorii` }))).toBeNull();
  });
  it("keeps drafts with an earlier error flagged until a person fixes them", () => {
    const flag = manualFixUpdate(draft({ last_error: "Upstream 404", image_url: null }))!;
    expect(flag).toContain("Upstream 404");
    expect(manualFixUpdate(draft({ last_error: flag }))).toBeUndefined();
  });
});

describe("social yield by post type", () => {
  it("service and owner-acquisition posts always use the approved range", () => {
    expect(postYieldValue("blog", { listing_type: "investitie", roi_percentage: "9.1%" })).toBeNull();
    expect(normalizeYieldClaims("Randament peste 9%", postYieldValue("blog", null))).toBe("Randament 6,5% – 9,4% net estimat");
  });
  it("a sale/investment listing shows its own stored yield (9.1%)", () => {
    const v = postYieldValue("property", { listing_type: "investitie", roi_percentage: "9.1%" });
    expect(v).toBe(9.1);
    expect(normalizeYieldClaims("Yield 9%+", v)).toBe("Randament 9,1% net estimat");
  });
  it("a listing without a stored yield falls back to the approved range", () => {
    expect(postYieldValue("property", { listing_type: "vanzare", roi_percentage: null })).toBeNull();
  });
  it("stays and rentals never show a listing figure", () => {
    expect(postYieldValue("property", { listing_type: "cazare", roi_percentage: "9.1%" })).toBeNull();
    expect(postYieldValue("property", { listing_type: "inchiriere", roi_percentage: "9.1%" })).toBeNull();
  });
  it("automatic listing figures above 9.5% fall back to the range; the explicit social field wins", () => {
    expect(postYieldValue("property", { listing_type: "investitie", roi_percentage: "17.5%" })).toBeNull();
    expect(postYieldValue("property", { listing_type: "investitie", roi_percentage: "17.5%", social_yield_override: 8.4 })).toBe(8.4);
  });
  it("rewrites the earlier range wording to the new spacing", () => {
    expect(normalizeYieldClaims("Randament 6,5%–9,4% net estimat")).toBe("Randament 6,5% – 9,4% net estimat");
  });
});

describe("Needs Manual Review flag wording", () => {
  it("uses „Necesită verificare manuală” and still recognises the earlier wording", () => {
    expect(MANUAL_FIX_PREFIX).toBe("Necesită verificare manuală: ");
    const legacy = "Necesită corectare manuală: lipsesc imaginile obligatorii";
    expect(isManualFixFlag(legacy)).toBe(true);
    expect(manualFixText(legacy)).toBe("lipsesc imaginile obligatorii");
    expect(manualFixUpdate(draft({ image_url: null, last_error: legacy }))).toBe(`${MANUAL_FIX_PREFIX}lipsesc imaginile obligatorii`);
  });
});

describe("platform captions", () => {
  const raw = "🔑 Apartament 2 camere\n\nDetalii reale. https://realtrust.ro/proprietate/x";
  it("Facebook keeps the inline listing link", () => {
    expect(formatSocialCaption(raw, { platform: "facebook", type: "property", sourceUrl: "https://realtrust.ro/proprietate/x" })).toContain("https://realtrust.ro/proprietate/x");
  });
  it("Instagram drops the URL and uses a Link în Bio CTA for listings and articles", () => {
    const ig = formatSocialCaption(raw, { platform: "instagram", type: "property" });
    expect(ig).not.toContain("https://");
    expect(ig).toContain("Link în Bio");
    expect(formatSocialCaption(raw, { platform: "instagram", type: "blog" })).toContain("Link în Bio");
  });
});
