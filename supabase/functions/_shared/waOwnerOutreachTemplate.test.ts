import { describe, expect, it } from "bun:test";
import {
  OWNER_OUTREACH_BUTTONS, WA_OWNER_OUTREACH_FOOTER, WA_OWNER_OUTREACH_TEMPLATE, isHotelCalcRequest, looksLikeOwnerQuestion,
  ownerOutreachConsentCheck, ownerOutreachPreviewUrl,
} from "./waOwnerOutreachTemplate.ts";
import { detectPublishIntent, isClearRefusal, quickReplyText, OWNER_HANDOVER_KINDS } from "./waAutoReply.ts";

describe("primul mesaj către proprietari", () => {
  it("butoanele și subsolul respectă limitele Meta", () => {
    for (const b of Object.values(OWNER_OUTREACH_BUTTONS)) expect(b.length).toBeLessThanOrEqual(25);
    expect(WA_OWNER_OUTREACH_FOOTER.length).toBeLessThanOrEqual(60);
  });

  it("linkul duce la analiza existentă cu zona și tipul", () => {
    const u = new URL(ownerOutreachPreviewUrl({ zone: "Iosefin", category: "vanzare", source_url: "https://www.olx.ro/d/oferta/x" }));
    expect(u.pathname).toBe("/analiza-anunt");
    expect(u.searchParams.get("zona")).toBe("Iosefin");
    expect(u.searchParams.get("tip")).toBe("vanzare");
    expect(u.searchParams.get("url")).toBe("https://www.olx.ro/d/oferta/x");
    expect(new URL(ownerOutreachPreviewUrl({ category: "inchiriere" })).searchParams.get("tip")).toBe("inchiriere");
  });
});

describe("răspunsurile proprietarului", () => {
  it("butonul „DA, activează gratuit” e acord doar cu șablonul outreach_proprietar_butoane_v1 confirmat", () => {
    expect(WA_OWNER_OUTREACH_TEMPLATE).toBe("outreach_proprietar_butoane_v1");
    expect(ownerOutreachConsentCheck(OWNER_OUTREACH_BUTTONS.consent, "outreach_proprietar_butoane_v1"))
      .toEqual({ status: "valid", trigger: "outreach_button" });
    expect(ownerOutreachConsentCheck(OWNER_OUTREACH_BUTTONS.consent, null).status).toBe("missing_template");
    expect(ownerOutreachConsentCheck(OWNER_OUTREACH_BUTTONS.consent, "alt_sablon").status).toBe("missing_template");
    expect(detectPublishIntent(OWNER_OUTREACH_BUTTONS.consent, { pendingConsent: true })).toBeNull();
  });

  it("DA, Puteți publica și E în regulă sunt acord valid cu șablonul confirmat", () => {
    for (const t of ["DA", "Da!", "Puteți publica", "E în regulă", "Da, puteți publica"]) {
      expect(ownerOutreachConsentCheck(t, "outreach_proprietar_butoane_v1"))
        .toEqual({ status: "valid", trigger: "outreach_text" });
    }
    expect(ownerOutreachConsentCheck("Nu doresc", "outreach_proprietar_butoane_v1").status).toBe("not_applicable");
    expect(ownerOutreachConsentCheck("Da, dar cât costă?", "outreach_proprietar_butoane_v1").status).toBe("not_applicable");
  });

  it("„E în regulă” și „Puteți publica” sunt acord după cererea noastră", () => {
    expect(detectPublishIntent("E în regulă", { pendingConsent: true })).toBe("consent");
    expect(detectPublishIntent("Puteți publica")).toBe("consent");
    expect(detectPublishIntent("E în regulă")).toBeNull();
  });

  it("butonul „Nu doresc” este refuz", () => {
    expect(isClearRefusal(OWNER_OUTREACH_BUTTONS.decline)).toBe(true);
    expect(quickReplyText(OWNER_OUTREACH_BUTTONS.decline)?.kind).toBe("quick_no");
  });

  it("butonul de calcul hotelier predă conversația unui om", () => {
    expect(isHotelCalcRequest(OWNER_OUTREACH_BUTTONS.hotelCalc)).toBe(true);
    expect(isHotelCalcRequest("Vreau calcul Regim Hotelier")).toBe(true);
    const r = quickReplyText(OWNER_OUTREACH_BUTTONS.hotelCalc);
    expect(r?.kind).toBe("owner_hotel_calc");
    expect(OWNER_HANDOVER_KINDS.has("owner_hotel_calc")).toBe(true);
  });

  it("întrebările scrise declanșează alertă", () => {
    expect(looksLikeOwnerQuestion("Cât costă promovarea?")).toBe(true);
    expect(looksLikeOwnerQuestion("cum functioneaza exact")).toBe(true);
    expect(looksLikeOwnerQuestion("Da")).toBe(false);
    expect(looksLikeOwnerQuestion("Mulțumesc frumos")).toBe(false);
  });
});

import {
  OWNER_OUTREACH_FEE_REPLY, OWNER_OUTREACH_SAFETY_REPLY, WA_OWNER_OUTREACH_BODY, ownerOutreachReplySignals,
  ownerOutreachObjectionReply, ownerRequestAlertLine,
} from "./waOwnerOutreachTemplate.ts";
import { outreachWindow, OUTREACH_COOLDOWN_DAYS } from "./ownerOutreachPolicy.ts";

describe("mesajul cu butoane — text și link (11 noiembrie)", () => {
  it("textul nou cere acordul de preluare și păstrează cele 2 variabile", () => {
    expect(WA_OWNER_OUTREACH_BODY.startsWith("Bună ziua! Sunt Andrei de la RealTrust Timișoara. Am văzut apartamentul dumneavoastră din {{1}}.")).toBe(true);
    expect(WA_OWNER_OUTREACH_BODY).toContain("am dori acordul dumneavoastră să preluăm anunțul exact așa cum este publicat");
    expect(WA_OWNER_OUTREACH_BODY).toContain("Puteți vedea analiza de prezentare aici: {{2}}");
    expect(WA_OWNER_OUTREACH_BODY).toContain("0 lei costuri, 0% comision proprietar, fără exclusivitate");
    expect(WA_OWNER_OUTREACH_BODY.match(/\{\{\d\}\}/g)).toEqual(["{{1}}", "{{2}}"]);
    expect(WA_OWNER_OUTREACH_BODY.length).toBeLessThanOrEqual(1024);
  });
  it("linkul pentru închiriere poartă listing_type=inchiriere", () => {
    expect(new URL(ownerOutreachPreviewUrl({ category: "inchiriere" })).searchParams.get("listing_type")).toBe("inchiriere");
    expect(new URL(ownerOutreachPreviewUrl({ category: "vanzare" })).searchParams.get("listing_type")).toBe("vanzare");
  });
});

describe("răspunsuri automate după mesajul cu butoane", () => {
  it("cost / comision / preț servicii → 0 lei fix", () => {
    for (const t of ["Cât costă?", "Care e comisionul?", "pret servicii?"]) {
      const s = ownerOutreachReplySignals(t);
      expect(s.fee).toBe(true);
      expect(ownerOutreachObjectionReply(s)).toBe(OWNER_OUTREACH_FEE_REPLY);
    }
    expect(OWNER_OUTREACH_FEE_REPLY).toBe("Comisionul pentru dumneavoastră este fix 0 lei. Promovarea și prezentarea către clienții noștri este complet gratuită pentru proprietar.");
    expect(ownerOutreachReplySignals("pret servicii?").customNotes).toBe(false);
  });
  it("întrebările despre administrare nu primesc „0 lei”", () => {
    expect(ownerOutreachReplySignals("Cât e comisionul la administrare în regim hotelier?").fee).toBe(false);
  });
  it("studenți / stricăciuni / garanție / siguranță → oferta ApArt Hotel", () => {
    for (const t of ["Nu vreau studenți", "mi-e frică de stricăciuni", "aveți garanție?", "e o problemă de siguranță"]) {
      expect(ownerOutreachObjectionReply(ownerOutreachReplySignals(t))).toBe(OWNER_OUTREACH_SAFETY_REPLY);
    }
  });
  it("corecturile (cifre, preț, parcare, negociabil, liber, poze, calcul hotelier) sunt note de proprietar", () => {
    for (const t of ["Prețul e 85000", "are și parcare", "negociabil", "e liber din decembrie", "vă trimit poze noi", OWNER_OUTREACH_BUTTONS.hotelCalc]) {
      expect(ownerOutreachReplySignals(t).customNotes).toBe(true);
    }
    expect(ownerOutreachReplySignals("DA").customNotes).toBe(false);
  });
  it("RETRAG, Nu, S-a vândut, Nu mai e valabil → dezabonare", () => {
    expect(ownerOutreachReplySignals("RETRAG").optOut).toBe("retrag");
    expect(ownerOutreachReplySignals("Nu").optOut).toBe("nu");
    expect(ownerOutreachReplySignals("S-a vândut").optOut).toBe("sold");
    expect(ownerOutreachReplySignals("Nu mai e valabil").optOut).toBe("unavailable");
    expect(ownerOutreachReplySignals("S-a vândut, preț 90000").customNotes).toBe(false);
  });
  it("alerta către admin începe cu prefixul îngroșat și textul exact", () => {
    expect(ownerRequestAlertLine("are parcare")).toBe("*[MODIFICARE/SOLICITARE PROPRIETAR DETECTATĂ]:* are parcare");
  });
});

describe("intervalul de trimitere și limita pe număr", () => {
  it("09:00–19:30 ora României; în afara intervalului → 09:05", () => {
    // 11 nov 2026: ora României = UTC+2
    expect(outreachWindow(new Date("2026-11-11T07:00:00Z")).open).toBe(true);   // 09:00
    expect(outreachWindow(new Date("2026-11-11T17:30:00Z")).open).toBe(true);   // 19:30
    const late = outreachWindow(new Date("2026-11-11T17:31:00Z"));             // 19:31
    expect(late.open).toBe(false);
    expect(late.nextSendAt.toISOString()).toBe("2026-11-12T07:05:00.000Z");
    const early = outreachWindow(new Date("2026-11-11T05:00:00Z"));            // 07:00
    expect(early.open).toBe(false);
    expect(early.nextSendAt.toISOString()).toBe("2026-11-11T07:05:00.000Z");
    // vara: UTC+3
    expect(outreachWindow(new Date("2026-07-01T20:00:00Z")).nextSendAt.toISOString()).toBe("2026-07-02T06:05:00.000Z");
  });
  it("cel mult un mesaj la 30 de zile pe număr", () => {
    expect(OUTREACH_COOLDOWN_DAYS).toBe(30);
  });
});
