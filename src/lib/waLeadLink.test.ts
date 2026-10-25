import { describe, expect, it } from "vitest";
import { waLeadLink } from "./waLeadLink";

describe("waLeadLink (cereri randament)", () => {
  it("links a stored Romanian mobile to wa.me with international digits", () => {
    expect(waLeadLink("+40 724 266 651")).toBe("https://wa.me/40724266651");
    expect(waLeadLink("0799069256")).toBe("https://wa.me/40799069256");
    expect(waLeadLink("799069256")).toBe("https://wa.me/40799069256");
  });

  it("shows no link for sentinel or missing phones", () => {
    expect(waLeadLink("PRECALC_NO_PHONE")).toBeNull();
    expect(waLeadLink("-")).toBeNull();
    expect(waLeadLink("0")).toBeNull();
    expect(waLeadLink("n/a")).toBeNull();
    expect(waLeadLink("")).toBeNull();
    expect(waLeadLink(null)).toBeNull();
    expect(waLeadLink(undefined)).toBeNull();
  });

  it("rejects landlines and too-short numbers", () => {
    expect(waLeadLink("0213333333")).toBeNull();
    expect(waLeadLink("0755555")).toBeNull();
  });

  it("keeps a foreign mobile as plain international digits", () => {
    expect(waLeadLink("+39 333 123 4567")).toBe("https://wa.me/393331234567");
  });
});
