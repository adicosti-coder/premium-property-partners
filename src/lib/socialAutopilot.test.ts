import { describe, it, expect } from "vitest";
import {
  autopilotConfig, bucharestTime, upcomingSlots, isAutopilotEligible, planSchedule, withTitleLine, type DraftRow,
} from "../../supabase/functions/_shared/socialAutopilotPlan";

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
});
