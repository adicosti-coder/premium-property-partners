import { describe, expect, it } from "vitest";
import {
  autoOutreachBlockReason, hasAgencyKeyword, isAgencyProspect, OUTREACH_MIN_SCORE,
} from "../../supabase/functions/_shared/ownerOutreachEligibility";

const owner = { seller_type: "privat", lead_score: 75, contact_name: "Maria Popescu", title: "Apartament 2 camere Iosefin, proprietar" };

describe("blocarea agențiilor", () => {
  it.each(["Agenție Imobiliară Vest", "Agentie Nord", "Best Agency", "Agent imobiliar Ion", "Broker Timișoara", "Imobiliare Premium", "Casa Bună SRL", "Consultant imobiliar Dan"])(
    "%s este agenție", (name) => {
      expect(hasAgencyKeyword(name)).toBe(true);
      expect(isAgencyProspect({ ...owner, contact_name: name })).toBe(true);
    });

  it("blochează după etichetă, categorie și tipul de contact", () => {
    expect(isAgencyProspect({ ...owner, seller_type: "agentie" })).toBe(true);
    expect(isAgencyProspect({ ...owner, prospect_type: "agency" })).toBe(true);
    expect(isAgencyProspect({ ...owner, owner_sentiment: "agentie" })).toBe(true);
    expect(isAgencyProspect({ ...owner, tags: ["agentie"] })).toBe(true);
    expect(isAgencyProspect({ ...owner, agency_suspicion_score: 70 })).toBe(true);
  });

  it("nu blochează proprietarii care refuză agențiile sau portalul imobiliare.ro", () => {
    expect(hasAgencyKeyword("Proprietar, fără agenții")).toBe(false);
    expect(hasAgencyKeyword("Vând direct, fără comision agenție")).toBe(false);
    expect(hasAgencyKeyword("Rog agențiile imobiliare să nu sune")).toBe(false);
    expect(hasAgencyKeyword("Nu doresc agenți")).toBe(false);
    expect(hasAgencyKeyword("Anunț de pe imobiliare.ro")).toBe(false);
    expect(isAgencyProspect({ ...owner, title: "apartament paltim ' Imobiliare ' OLX.ro" })).toBe(false);
    expect(isAgencyProspect({ ...owner, title: "Sedako Group - Agentie imobiliara din Judetul Timis" })).toBe(true);
    expect(isAgencyProspect({ ...owner, tags: ["scrape-prospects", "agency-suspect"] })).toBe(true);
    expect(isAgencyProspect(owner)).toBe(false);
  });
});

describe("trimiterea automată", () => {
  it("pleacă doar la proprietar particular confirmat cu scor peste 60", () => {
    expect(autoOutreachBlockReason(owner)).toBeNull();
    expect(autoOutreachBlockReason({ ...owner, lead_score: OUTREACH_MIN_SCORE + 1 })).toBeNull();
  });
  it("scorul 60 sau lipsa scorului nu e suficient", () => {
    expect(autoOutreachBlockReason({ ...owner, lead_score: 60 })).toBe("low_score");
    expect(autoOutreachBlockReason({ ...owner, lead_score: null })).toBe("low_score");
  });
  it("proprietarul neconfirmat nu primește mesaj automat", () => {
    expect(autoOutreachBlockReason({ ...owner, seller_type: "de_verificat" })).toBe("not_private");
  });
  it("agenția e blocată chiar și cu scor mare", () => {
    expect(autoOutreachBlockReason({ ...owner, contact_name: "Imobiliare Vest SRL", lead_score: 95 })).toBe("blocked_agency");
    expect(autoOutreachBlockReason({ ...owner, outreach_status: "blocked_agency" })).toBe("blocked_agency");
  });
});

import {
  AUTO_OUTREACH_MAX_AGE_DAYS, autoFirstMessageSkip, validOutreachMobile,
} from "../../supabase/functions/_shared/ownerOutreachEligibility";

describe("Primul mesaj automat după clasificarea periodică", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const base = {
    seller_type: "privat", lead_score: 61, phone_normalized: "+40722111222", contact_name: "Maria Popescu",
    title: "Apartament 2 camere Iosefin, fără agenții", tags: [], outreach_status: null, is_active: true,
    lifecycle_status: "new", expiry_check_status: null, do_not_call: false, auto_blacklisted_at: null,
    published_at: daysAgo(3), created_at: daysAgo(3),
  };

  it("pleacă doar la particular, scor > 60, telefon mobil valid, anunț ≤ 14 zile", () => {
    expect(AUTO_OUTREACH_MAX_AGE_DAYS).toBe(14);
    expect(autoFirstMessageSkip(base, now)).toBeNull();
  });
  it("blochează agențiile, neconfirmații și scorul ≤ 60", () => {
    expect(autoFirstMessageSkip({ ...base, contact_name: "Casa Imobiliare SRL" }, now)).toBe("blocked_agency");
    expect(autoFirstMessageSkip({ ...base, outreach_status: "blocked_agency" }, now)).toBe("blocked_agency");
    expect(autoFirstMessageSkip({ ...base, seller_type: "de_verificat" }, now)).toBe("not_private");
    expect(autoFirstMessageSkip({ ...base, lead_score: 60 }, now)).toBe("low_score");
  });
  it("„Imobiliare” din titlu și „fără agenții” nu blochează un particular", () => {
    expect(autoFirstMessageSkip({ ...base, title: "Apartament 3 camere ' Imobiliare ' OLX.ro" }, now)).toBeNull();
  });
  it("fără număr mobil valid nu pleacă nimic", () => {
    expect(autoFirstMessageSkip({ ...base, phone_normalized: null, contact_phone: null }, now)).toBe("no_phone");
    expect(autoFirstMessageSkip({ ...base, phone_normalized: "+40256123456" }, now)).toBe("no_phone");
  });
  it("anunțurile vechi de peste 14 zile nu primesc mesaj automat", () => {
    expect(autoFirstMessageSkip({ ...base, published_at: daysAgo(15), created_at: daysAgo(15) }, now)).toBe("stale");
    expect(autoFirstMessageSkip({ ...base, published_at: null, created_at: daysAgo(13) }, now)).toBeNull();
    expect(autoFirstMessageSkip({ ...base, published_at: null, created_at: daysAgo(30) }, now)).toBe("stale");
  });
  it("anunțurile parcate primesc mesajul, cele scoase de pe portal nu", () => {
    expect(autoFirstMessageSkip({ ...base, is_active: false }, now)).toBeNull();
    expect(autoFirstMessageSkip({ ...base, expiry_check_status: "inactiv_sursa" }, now)).toBe("inactive_on_source");
    expect(autoFirstMessageSkip({ ...base, lifecycle_status: "expired" }, now)).toBe("closed");
  });
  it("opt-out, excluderi și contact anterior opresc mesajul", () => {
    expect(autoFirstMessageSkip({ ...base, outreach_status: "unsubscribed" }, now)).toBe("already_contacted");
    expect(autoFirstMessageSkip({ ...base, outreach_status: "outreach_pending" }, now)).toBe("already_contacted");
    expect(autoFirstMessageSkip({ ...base, do_not_call: true }, now)).toBe("excluded");
  });
  it("normalizează doar mobilele românești", () => {
    expect(validOutreachMobile("0722 111 222")).toBe("+40722111222");
    expect(validOutreachMobile("0040722111222")).toBe("+40722111222");
    expect(validOutreachMobile("+40 256 123 456")).toBeNull();
    expect(validOutreachMobile("")).toBeNull();
  });
});
