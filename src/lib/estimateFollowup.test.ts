import { describe, expect, it } from "vitest";
import {
  estimateFollowupBadges, estimateFollowupBlockReason, estimateFollowupDueAt, estimateFollowupParams,
  estimateFollowupText, isPreviewBot, ESTIMATE_FOLLOWUP_BODY,
} from "../../supabase/functions/_shared/estimateFollowup";

const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

describe("boții de previzualizare Open Graph nu contează ca deschidere", () => {
  it.each([
    "WhatsApp/2.24.25.80 A",
    "WhatsApp/2.23.20.0 i",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "TelegramBot (like TwitterBot)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
    "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    "curl/8.5.0",
    "",
  ])("%s → bot", (ua) => expect(isPreviewBot(ua)).toBe(true));
  it("telefoanele reale contează", () => {
    expect(isPreviewBot(CHROME_ANDROID)).toBe(false);
    expect(isPreviewBot(SAFARI_IOS)).toBe(false);
  });
});

describe("programarea la 24 de ore, doar 09:00–19:30", () => {
  it("deschis la 10:00 → follow-up a doua zi la 10:00", () => {
    // 22 nov 2026, 10:00 ora României = 08:00 UTC
    expect(estimateFollowupDueAt(new Date("2026-11-22T08:00:00Z")).toISOString()).toBe("2026-11-23T08:00:00.000Z");
  });
  it("deschis la 21:00 → a doua zi ar fi 21:00, deci pleacă poimâine la 09:00", () => {
    expect(estimateFollowupDueAt(new Date("2026-11-22T19:00:00Z")).toISOString()).toBe("2026-11-24T07:00:00.000Z");
  });
  it("deschis la 07:30 → a doua zi 07:30 e prea devreme, pleacă la 09:00 aceeași zi", () => {
    expect(estimateFollowupDueAt(new Date("2026-11-22T05:30:00Z")).toISOString()).toBe("2026-11-23T07:00:00.000Z");
  });
  it("19:30 e încă în interval; 19:31 nu", () => {
    expect(estimateFollowupDueAt(new Date("2026-11-22T17:30:00Z")).toISOString()).toBe("2026-11-23T17:30:00.000Z");
    expect(estimateFollowupDueAt(new Date("2026-11-22T17:31:00Z")).toISOString()).toBe("2026-11-24T07:00:00.000Z");
  });
  it("ora de vară: deschis la 10:00 în iulie → a doua zi 10:00 (07:00 UTC)", () => {
    expect(estimateFollowupDueAt(new Date("2026-07-10T07:00:00Z")).toISOString()).toBe("2026-07-11T07:00:00.000Z");
  });
});

const owner = {
  seller_type: "privat", lead_score: 75, outreach_status: "whatsapp_delivered", is_active: true,
  short_code: "k7m2qx9a", zone: "Iosefin", estimate_followup_status: null, do_not_call: false,
};

describe("eligibilitate și anulare", () => {
  it("particular confirmat, scor > 60, primul mesaj trimis, fără răspuns → se programează", () => {
    expect(estimateFollowupBlockReason({ prospect: owner, hasInbound: false, optedOut: false })).toBeNull();
  });
  it("agențiile și scorul ≤ 60 sunt blocate", () => {
    expect(estimateFollowupBlockReason({ prospect: { ...owner, contact_name: "Imobiliare Vest SRL" }, hasInbound: false, optedOut: false })).toBe("blocked_agency");
    expect(estimateFollowupBlockReason({ prospect: { ...owner, outreach_status: "blocked_agency" }, hasInbound: false, optedOut: false })).toBe("blocked_agency");
    expect(estimateFollowupBlockReason({ prospect: { ...owner, lead_score: 60 }, hasInbound: false, optedOut: false })).toBe("low_score");
    expect(estimateFollowupBlockReason({ prospect: { ...owner, seller_type: "de_verificat" }, hasInbound: false, optedOut: false })).toBe("not_private");
  });
  it("orice răspuns (inclusiv „DA”) sau opt-out oprește follow-up-ul", () => {
    expect(estimateFollowupBlockReason({ prospect: owner, hasInbound: true, optedOut: false })).toBe("replied");
    expect(estimateFollowupBlockReason({ prospect: owner, hasInbound: false, optedOut: true })).toBe("opted_out");
    expect(estimateFollowupBlockReason({ prospect: { ...owner, outreach_status: "unsubscribed" }, hasInbound: false, optedOut: false })).toBe("opted_out");
  });
  it("niciodată mai mult de un follow-up per anunț", () => {
    for (const s of ["scheduled", "sent", "cancelled_replied"]) {
      expect(estimateFollowupBlockReason({ prospect: { ...owner, estimate_followup_status: s }, hasInbound: false, optedOut: false })).toBe("already_handled");
    }
  });
  it("fără primul mesaj trimis nu există follow-up", () => {
    expect(estimateFollowupBlockReason({ prospect: { ...owner, outreach_status: null }, hasInbound: false, optedOut: false })).toBe("no_first_message");
  });
});

describe("textul mesajului și etichetele din admin", () => {
  it("textul are zona, linkul scurt și telefonul", () => {
    const [zone, link] = estimateFollowupParams(owner)!;
    expect(estimateFollowupText(zone, link)).toBe(
      "Bună ziua! Am văzut că ați deschis estimarea pentru proprietatea din Iosefin (https://realtrust.ro/e/k7m2qx9a). Cum vi se par cifrele comparativ cu ce obțineți acum? Dacă vreți să vedem rapid cum am ajuns la ele, îmi puteți scrie aici sau suna la 0799 069 256.");
    expect(ESTIMATE_FOLLOWUP_BODY.trim().endsWith("}}")).toBe(false);
  });
  it("etichetele urmează starea", () => {
    const opened = "2026-11-22T08:00:00Z";
    expect(estimateFollowupBadges({ estimate_opened_at: opened, estimate_followup_status: "scheduled", estimate_followup_at: "2026-11-23T08:00:00Z" }).map((b) => b.label))
      .toEqual(["Link deschis", "Follow-up programat"]);
    expect(estimateFollowupBadges({ estimate_opened_at: opened, estimate_followup_status: "sent" }).map((b) => b.label)).toEqual(["Link deschis", "Follow-up trimis"]);
    expect(estimateFollowupBadges({ estimate_opened_at: opened, estimate_followup_status: "cancelled_replied" }).map((b) => b.label)).toEqual(["Link deschis", "Anulat – a răspuns"]);
    expect(estimateFollowupBadges({ estimate_opened_at: null })).toEqual([]);
  });
});
