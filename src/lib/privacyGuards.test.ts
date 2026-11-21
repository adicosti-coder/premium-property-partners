import { describe, expect, it } from "vitest";
import {
  bucharestDate, guestGuideAccess, redactGuestGuide,
} from "../../supabase/functions/_shared/guestGuideAccess";
import {
  publicVisitorMemory, sanitizePreferenceEvent, sanitizeViewEvent,
} from "../../supabase/functions/_shared/visitorMemoryPolicy";
import { deviceClass, referrerOrigin } from "./viewPrivacy";

const stay = { check_in_date: "2026-12-10", check_out_date: "2026-12-13" };
const guide = {
  ...stay,
  property_name: "Ap. Cetate",
  wifi_name: "ApArt",
  pin_code: "4821",
  wifi_password: "secret-wifi",
  access_instructions: "Bariera: cod 1234",
  access_video_url: "https://video.example/acces",
  parking_instructions: "Locul 12",
};
// Noon in Bucharest on the given day.
const at = (day: string) => new Date(`${day}T10:00:00Z`);

describe("guest guide access window", () => {
  it("hides every secret more than one day before check-in", () => {
    const g = redactGuestGuide(guide, guestGuideAccess(stay, at("2026-12-08")));
    expect([g.pin_code, g.wifi_password, g.access_instructions, g.access_video_url, g.parking_instructions])
      .toEqual([null, null, null, null, null]);
    expect(g.access).toMatchObject({ state: "upcoming", has_pin: true, has_wifi_password: true, has_instructions: true });
  });

  it("shows access and parking instructions the day before check-in, but not the PIN or Wi-Fi password", () => {
    const g = redactGuestGuide(guide, guestGuideAccess(stay, at("2026-12-09")));
    expect(g.access.state).toBe("arrival_soon");
    expect(g.access_instructions).toBe("Bariera: cod 1234");
    expect(g.parking_instructions).toBe("Locul 12");
    expect(g.pin_code).toBeNull();
    expect(g.wifi_password).toBeNull();
  });

  it("shows the PIN and Wi-Fi password from check-in day through check-out day", () => {
    for (const day of ["2026-12-10", "2026-12-13"]) {
      const g = redactGuestGuide(guide, guestGuideAccess(stay, at(day)));
      expect(g.pin_code).toBe("4821");
      expect(g.wifi_password).toBe("secret-wifi");
    }
  });

  it("hides every secret after check-out", () => {
    const g = redactGuestGuide(guide, guestGuideAccess(stay, at("2026-12-14")));
    expect(g.access.state).toBe("ended");
    expect([g.pin_code, g.wifi_password, g.access_instructions]).toEqual([null, null, null]);
  });

  it("hides every secret when stay dates are missing or inverted", () => {
    expect(guestGuideAccess({ check_in_date: null, check_out_date: null }, at("2026-12-10")).pin).toBe(false);
    expect(guestGuideAccess({ check_in_date: "2026-12-13", check_out_date: "2026-12-10" }, at("2026-12-11")).state).toBe("unknown");
  });

  it("uses the Bucharest calendar day (23:30 UTC on 9 Dec is already check-in day)", () => {
    expect(bucharestDate(new Date("2026-12-09T23:30:00Z"))).toBe("2026-12-10");
    expect(guestGuideAccess(stay, new Date("2026-12-09T23:30:00Z")).pin).toBe(true);
  });

  it("lets administrators preview every field at any time", () => {
    const a = guestGuideAccess(stay, at("2027-01-30"), true);
    expect(a).toMatchObject({ pin: true, wifiPassword: true, instructions: true });
  });
});

describe("visitor memory policy", () => {
  it("never returns internal ids, the linked account or the lead score", () => {
    const out = publicVisitorMemory({
      id: "row", session_id: "s", user_id: "u", lead_score: 80, metadata: { ip: "1.2.3.4" },
      viewed_properties: [{ id: "p1" }], budget_max: 90000,
    }) as Record<string, unknown>;
    expect(out).not.toHaveProperty("id");
    expect(out).not.toHaveProperty("session_id");
    expect(out).not.toHaveProperty("user_id");
    expect(out).not.toHaveProperty("lead_score");
    expect(out).not.toHaveProperty("metadata");
    expect(out.budget_max).toBe(90000);
  });

  it("drops oversized or invalid preference values", () => {
    const out = sanitizePreferenceEvent({
      budget_min: -5, budget_max: "120000", preferred_rooms: 99,
      preferred_listing_type: "<script>", preferred_neighborhoods: Array(30).fill("Iosefin"),
    });
    expect(out).toEqual({ budget_max: 120000, preferred_neighborhoods: Array(10).fill("Iosefin") });
  });

  it("keeps a view only with a property id and caps the name length", () => {
    expect(sanitizeViewEvent({})).toBeNull();
    expect(sanitizeViewEvent({ propertyId: "abc", name: "x".repeat(500) })?.name).toHaveLength(120);
  });
});

describe("property view privacy", () => {
  it("keeps only the referring site, never its path or query string", () => {
    expect(referrerOrigin("https://www.Google.com/search?q=apartament+telefon+0722")).toBe("https://www.google.com");
    expect(referrerOrigin("")).toBeNull();
    expect(referrerOrigin("android-app://com.facebook")).toBeNull();
  });

  it("stores a device class instead of the browser signature", () => {
    expect(deviceClass("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148")).toBe("mobile");
    expect(deviceClass("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceClass("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(deviceClass(null)).toBeNull();
  });
});
