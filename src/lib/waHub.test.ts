import { describe, expect, it } from "vitest";
import {
  canSendTest, classifyAttention, classifyQueueItem, computeQueueMetrics, countBuckets, filterQueue,
  handoffMessage, isAllowedTestTemplate, isRetryEligible, isWithinSendingHours, maskPhone, metaErrorCode,
  needsAttention, resolvedConversationPatch, MAX_TEST_SENDS_PER_HOUR,
} from "../../supabase/functions/_shared/waHubRules";
import { ADMIN_GROUPS, WA_HUB_VIEWS, findTab } from "@/components/admin/adminNavConfig";
import { ADMIN_TAB_KEYS } from "@/components/admin/adminTabLoaders";

const NOW = Date.parse("2026-11-21T10:00:00.000Z"); // sâmbătă, 12:00 în România
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const row = (over: Partial<Parameters<typeof classifyQueueItem>[0]> & { phone_normalized?: string; template_name?: string; source?: string }) => ({
  status: "failed", last_error: null, scheduled_at: minsAgo(60), created_at: minsAgo(60), ...over,
});

// Erori reale din coadă
const E131042 = 'meta_status_failed: [{"code":131042,"title":"Business eligibility payment issue"}]';
const E131031 = 'meta_status_failed: [{"code":131031,"title":"Account has been locked"}]';
const E131026 = 'undeliverable_131026: [{"code":131026,"title":"Message undeliverable"}]';
const EDUP = "duplicat: mesaj deja trimis către acest număr în ultimele 72h";
const EMAYBE = "fără răspuns de la WhatsApp — posibil trimis, nu se retrimite automat (timeout)";

describe("Centru WhatsApp — clasificarea cozii", () => {
  it("131042 și 131031 sunt erori critice de cont Meta", () => {
    expect(classifyQueueItem(row({ last_error: E131042 }), { now: NOW })).toBe("critical");
    expect(classifyQueueItem(row({ last_error: E131031 }), { now: NOW })).toBe("critical");
    expect(metaErrorCode(E131042)).toBe("131042");
  });
  it("131026, dublurile refuzate și numerele excluse sunt cazuri normale", () => {
    expect(classifyQueueItem(row({ last_error: E131026 }), { now: NOW })).toBe("benign");
    expect(classifyQueueItem(row({ status: "cancelled", last_error: EDUP }), { now: NOW })).toBe("benign");
    expect(classifyQueueItem(row({ status: "cancelled", last_error: "blocat: număr intern RealTrust" }), { now: NOW })).toBe("benign");
    expect(classifyQueueItem(row({ status: "cancelled", last_error: "stale_over_10_days" }), { now: NOW })).toBe("benign");
  });
  it("„posibil trimis” cere verificare și nu e eșec tehnic", () => {
    expect(classifyQueueItem(row({ last_error: EMAYBE }), { now: NOW })).toBe("uncertain");
  });
  it("http_409 / http_400 se pot relua", () => {
    expect(classifyQueueItem(row({ last_error: "http_409" }), { now: NOW })).toBe("retryable");
    expect(classifyQueueItem(row({ last_error: "http_400" }), { now: NOW })).toBe("retryable");
  });
  it("programate, în așteptare și blocate", () => {
    expect(classifyQueueItem(row({ status: "pending", scheduled_at: minsAgo(-30) }), { now: NOW })).toBe("scheduled");
    expect(classifyQueueItem(row({ status: "pending", scheduled_at: minsAgo(10) }), { now: NOW })).toBe("waiting");
    expect(classifyQueueItem(row({ status: "pending", scheduled_at: minsAgo(45) }), { now: NOW })).toBe("stuck");
    // în afara orelor de trimitere, întârzierea e normală
    expect(classifyQueueItem(row({ status: "pending", scheduled_at: minsAgo(45) }), { now: NOW, withinSendingHours: false })).toBe("waiting");
    // cu trimiterile oprite, orice mesaj scadent e blocat
    expect(classifyQueueItem(row({ status: "pending", scheduled_at: minsAgo(1) }), { now: NOW, paused: true })).toBe("stuck");
    expect(classifyQueueItem(row({ status: "sending", scheduled_at: minsAgo(15) }), { now: NOW })).toBe("stuck");
    expect(classifyQueueItem(row({ status: "sending", scheduled_at: minsAgo(3) }), { now: NOW })).toBe("waiting");
    expect(classifyQueueItem(row({ status: "sent", last_error: "duplicat: prim contact deja trimis" }), { now: NOW })).toBe("sent");
  });
});

describe("Centru WhatsApp — filtrare", () => {
  const items = [
    row({ last_error: E131042, phone_normalized: "+40711111111", template_name: "prospect_intro_premium_v6" }),
    row({ last_error: "http_409", phone_normalized: "+40722222222", template_name: "andrei_followup_ro", source: "followup" }),
    row({ last_error: E131026, phone_normalized: "+40733333333" }),
    row({ last_error: EMAYBE, phone_normalized: "+40744444444" }),
    row({ status: "pending", scheduled_at: minsAgo(-60), phone_normalized: "+40755555555" }),
    row({ status: "sent", phone_normalized: "+40766666666" }),
  ];
  it("„De rezolvat” arată doar critice, de reluat, posibil trimise și blocate", () => {
    expect(filterQueue(items, "action", "", { now: NOW }).map((i) => i.phone_normalized)).toEqual(["+40711111111", "+40722222222", "+40744444444"]);
  });
  it("filtrele pe categorie separă 131026 de 131042", () => {
    expect(filterQueue(items, "critical", "", { now: NOW })).toHaveLength(1);
    expect(filterQueue(items, "benign", "", { now: NOW })[0].phone_normalized).toBe("+40733333333");
    expect(filterQueue(items, "scheduled", "", { now: NOW })).toHaveLength(1);
    expect(filterQueue(items, "all", "", { now: NOW })).toHaveLength(6);
  });
  it("căutarea după cifrele telefonului, șablon sau sursă", () => {
    expect(filterQueue(items, "all", "0722 222", { now: NOW })).toHaveLength(1);
    expect(filterQueue(items, "all", "followup", { now: NOW })).toHaveLength(1);
  });
  it("numărătoarea pe categorii", () => {
    const c = countBuckets(items, { now: NOW });
    expect(c).toMatchObject({ critical: 1, retryable: 1, benign: 1, uncertain: 1, scheduled: 1, sent: 1 });
  });
});

describe("Centru WhatsApp — acțiunea „Reîncearcă / Deblochează”", () => {
  it("reluarea în bloc ia doar eșecurile tehnice", () => {
    expect(isRetryEligible(row({ last_error: "http_409" }), "bulk")).toBe(true);
    expect(isRetryEligible(row({ last_error: E131042 }), "bulk")).toBe(false);
    expect(isRetryEligible(row({ last_error: E131026 }), "bulk")).toBe(false);
    expect(isRetryEligible(row({ last_error: EMAYBE }), "bulk")).toBe(false);
  });
  it("o eroare de cont Meta se reia doar individual", () => {
    expect(isRetryEligible(row({ last_error: E131042 }), "single")).toBe(true);
  });
  it("niciodată 131026, posibil trimise sau mesaje care nu sunt eșuate", () => {
    expect(isRetryEligible(row({ last_error: E131026 }), "single")).toBe(false);
    expect(isRetryEligible(row({ last_error: EMAYBE }), "single")).toBe(false);
    expect(isRetryEligible(row({ status: "cancelled", last_error: EDUP }), "single")).toBe(false);
    expect(isRetryEligible(row({ status: "pending" }), "single")).toBe(false);
  });
});

describe("Centru WhatsApp — orele de trimitere (ora României)", () => {
  const weekdaysAndSat = [1, 2, 3, 4, 5, 6];
  it("sâmbătă 12:00 este în intervalul 9–20 L–S", () => {
    expect(isWithinSendingHours(new Date(NOW), 9, 20, weekdaysAndSat)).toBe(true);
  });
  it("ora 20:00 și duminica sunt în afara intervalului", () => {
    expect(isWithinSendingHours(new Date("2026-11-21T18:00:00Z"), 9, 20, weekdaysAndSat)).toBe(false);
    expect(isWithinSendingHours(new Date("2026-11-22T10:00:00Z"), 9, 20, weekdaysAndSat)).toBe(false);
  });
});

describe("Centru WhatsApp — rapoarte compacte", () => {
  it("rata de eroare nu include cazurile normale (131026, dubluri)", () => {
    const items = [
      ...Array.from({ length: 8 }, () => row({ status: "sent", sent_at: minsAgo(30), delivered_at: minsAgo(29) })),
      row({ status: "replied", sent_at: minsAgo(30), delivered_at: minsAgo(29), read_at: minsAgo(28), replied_at: minsAgo(20) }),
      row({ last_error: E131042 }),
      row({ last_error: E131026 }),
      row({ status: "cancelled", last_error: EDUP }),
    ];
    const m = computeQueueMetrics(items, 7, NOW);
    expect(m.sent).toBe(9);
    expect(m.deliveryRate).toBe(100);
    expect(m.replyRate).toBe(11);
    expect(m.failedReal).toBe(1);
    expect(m.critical).toBe(1);
    expect(m.benign).toBe(2);
    expect(m.errorRate).toBe(10);
  });
  it("mesajele mai vechi decât perioada nu intră", () => {
    const old = row({ status: "sent", sent_at: minsAgo(60 * 24 * 10), created_at: minsAgo(60 * 24 * 10) });
    expect(computeQueueMetrics([old], 7, NOW).sent).toBe(0);
    expect(computeQueueMetrics([old], 30, NOW).sent).toBe(1);
  });
});

describe("Centru WhatsApp — atenție manuală", () => {
  it("întrebările despre comisionul de 15–20% sunt separate", () => {
    expect(classifyAttention({ status: "active", handoff_reason: "owner_question_handoff: Cât luați comision?" })).toBe("commission");
    expect(classifyAttention({ status: "awaiting_human", handoff_reason: null, last_inbound_text: "20% e mult, puteți 15%?" })).toBe("commission");
  });
  it("negocierile de preț", () => {
    expect(classifyAttention({ status: "awaiting_human", handoff_reason: "assistant_handoff: client", last_inbound_text: "Care e ultimul preț? Se poate negocia?" })).toBe("negotiation");
  });
  it("corecturile proprietarului sunt modificări, chiar dacă pomenesc costuri", () => {
    expect(classifyAttention({ status: "active", handoff_reason: "owner_custom_notes_handoff: prețul nou e 90.000, fără comision" })).toBe("owner_change");
    expect(classifyAttention({ status: "active", handoff_reason: "owner_question_handoff: Am modificat suprafața" })).toBe("owner_change");
  });
  it("restul sunt predări către operator", () => {
    expect(classifyAttention({ status: "awaiting_human", handoff_reason: "outside_office_hours", last_inbound_text: "Bună seara" })).toBe("handover");
    expect(classifyAttention({ status: "escalated_to_call", handoff_reason: "admin_escalated" })).toBe("handover");
  });
  it("ce intră în lista de atenție", () => {
    expect(needsAttention({ status: "awaiting_human", handoff_reason: null })).toBe(true);
    expect(needsAttention({ status: "escalated_to_call", handoff_reason: null })).toBe(true);
    expect(needsAttention({ status: "active", handoff_reason: "owner_question_handoff: ?" })).toBe(true);
    expect(needsAttention({ status: "active", handoff_reason: null })).toBe(false);
    expect(needsAttention({ status: "closed", handoff_reason: "x" })).toBe(false);
  });
  it("„Rezolvat” readuce Andrei doar pentru conversațiile care așteptau operator", () => {
    expect(resolvedConversationPatch("awaiting_human")).toEqual({ handoff_reason: null, status: "active" });
    expect(resolvedConversationPatch("escalated_to_call")).toEqual({ handoff_reason: null });
    expect(resolvedConversationPatch("active")).toEqual({ handoff_reason: null });
  });
  it("mesajul din motivul salvat", () => {
    expect(handoffMessage("owner_question_handoff: Bună ziua, nu înțeleg")).toBe("Bună ziua, nu înțeleg");
    expect(handoffMessage("outside_office_hours")).toBe("");
  });
});

describe("Centru WhatsApp — mesajul de test", () => {
  it("doar șabloanele aprobate", () => {
    expect(isAllowedTestTemplate("prospect_intro_premium_v6")).toBe(true);
    expect(isAllowedTestTemplate("andrei_followup_ro")).toBe(true);
    expect(isAllowedTestTemplate("orice_altceva")).toBe(false);
  });
  it("maximum 5 teste pe oră", () => {
    expect(MAX_TEST_SENDS_PER_HOUR).toBe(5);
    expect(canSendTest(4)).toBe(true);
    expect(canSendTest(5)).toBe(false);
  });
  it("numărul de test apare mascat, doar ultimele 3 cifre", () => {
    expect(maskPhone("40723154520")).toBe("+40 7•• ••• 520");
    expect(maskPhone("+40723154520")).not.toContain("231545");
  });
});

describe("Centru WhatsApp — meniul admin", () => {
  const menu = ADMIN_GROUPS.flatMap((g) => g.items.map((i) => i.value));
  it("un singur „Centru WhatsApp” în meniu, fără paginile vechi împrăștiate", () => {
    expect(menu).toContain("hub-whatsapp");
    for (const v of ["hub-wa-conversations", "hub-wa-sending", "hub-wa-reports", "whatsapp-queue", "whatsapp-meetings"]) {
      expect(menu).not.toContain(v);
    }
  });
  it("toate paginile vechi rămân accesibile (adrese și instrumente)", () => {
    for (const v of [...WA_HUB_VIEWS, "hub-wa-conversations", "hub-wa-sending", "hub-wa-reports", "hub-whatsapp"]) {
      expect(findTab(v), v).toBeTruthy();
      expect(ADMIN_TAB_KEYS, v).toContain(v);
    }
    expect(WA_HUB_VIEWS.length).toBeGreaterThanOrEqual(24);
  });
});
