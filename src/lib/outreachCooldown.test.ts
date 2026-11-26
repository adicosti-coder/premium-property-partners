import { describe, it, expect } from "vitest";
import { buildOutreachCooldownMap, outreachCooldownFor, outreachCooldownHint } from "./scrapedListingsTriage";

const now = Date.parse("2026-11-26T09:00:00Z");
const rows = [
  { id: "a", phone_normalized: "+40763068124", outreach_status: "sent", outreach_status_at: "2026-11-17T10:00:00Z" },
  { id: "b", phone_normalized: "+40711111111", outreach_status: "failed", outreach_status_at: "2026-11-20T10:00:00Z" },
  { id: "c", phone_normalized: "+40722222222", outreach_status: "sent", outreach_status_at: "2026-10-01T10:00:00Z" },
];
const map = buildOutreachCooldownMap(rows, now);

describe("fereastra de 30 de zile pe număr", () => {
  it("blochează alt anunț cu același număr și arată 17 nov → 17 dec", () => {
    const c = outreachCooldownFor({ id: "x", contact_phone: "0763 068 124" } as never, map);
    expect(c).not.toBeNull();
    expect(outreachCooldownHint(c)).toBe("Numărul a primit deja un mesaj pe 17 nov — următorul e posibil după 17 dec");
  });
  it("ignoră mesajele eșuate și cele mai vechi de 30 de zile", () => {
    expect(outreachCooldownFor({ id: "x", phone_normalized: "+40711111111" } as never, map)).toBeNull();
    expect(outreachCooldownFor({ id: "x", phone_normalized: "+40722222222" } as never, map)).toBeNull();
  });
  it("nu se blochează pe propriul mesaj", () => {
    expect(outreachCooldownFor({ id: "a", phone_normalized: "+40763068124" } as never, map)).toBeNull();
  });
});
