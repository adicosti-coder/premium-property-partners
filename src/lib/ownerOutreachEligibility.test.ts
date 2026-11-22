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
