import { describe, expect, it } from "vitest";
import {
  OWNER_OUTREACH_BUTTONS, WA_OWNER_OUTREACH_FOOTER, isHotelCalcRequest, looksLikeOwnerQuestion, ownerOutreachPreviewUrl,
} from "./waOwnerOutreachTemplate";
import { detectPublishIntent, isClearRefusal, quickReplyText, OWNER_HANDOVER_KINDS } from "./waAutoReply";

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
  it("butonul „DA, activează gratuit” este acord oricând", () => {
    expect(detectPublishIntent(OWNER_OUTREACH_BUTTONS.consent)).toBe("consent");
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
