import { describe, expect, it } from "vitest";
import { andreiConversationPolicy, ANDREI_SALES_EXAMPLES, validateCommissionReply, isPrematureClose } from "../../supabase/functions/_shared/andreiConversationPolicy";

describe("Andrei concise policy", () => {
  it("adds sales examples only to sales calls", () => {
    expect(andreiConversationPolicy("vanzare")).toContain(ANDREI_SALES_EXAMPLES);
    expect(andreiConversationPolicy("cazare")).not.toContain(ANDREI_SALES_EXAMPLES);
  });
  it("keeps example replies short", () => {
    const replies = ANDREI_SALES_EXAMPLES.split("\n").filter(line => line.startsWith("Andrei:"));
    expect(replies.length).toBe(16);
    for (const line of replies) expect(line.replace(/^Andrei: /, "").split(/\s+/).length).toBeLessThanOrEqual(30);
  });
  it("retains consent, transparency and factuality rules", () => {
    const policy = andreiConversationPolicy("vanzare");
    for (const rule of ["asistent AI", "necesită acord", "STOP", "nu inventezi", "două camere", "nu sunt date"]) expect(policy).toContain(rule);
  });
});
describe("Andrei open-offer sales strategy", () => {
  it("appears only on sales calls and closes at the apartment", () => {
    expect(andreiConversationPolicy("vanzare")).toContain("OFERTARE DESCHISĂ");
    expect(andreiConversationPolicy("vanzare")).toContain("LA APARTAMENT");
    expect(andreiConversationPolicy("inchiriere")).not.toContain("OFERTARE DESCHISĂ");
    expect(andreiConversationPolicy("cazare")).not.toContain("OFERTARE DESCHISĂ");
  });
  it("bans guarantee claims for the offer process", () => {
    expect(andreiConversationPolicy("vanzare")).toMatch(/Interzis: „licitație”, „100% protejat”, „garantat”/);
  });
});
describe("Andrei value propositions per listing type", () => {
  it("uses only the matching value proposition", () => {
    const v = andreiConversationPolicy("vanzare"), i = andreiConversationPolicy("inchiriere"), c = andreiConversationPolicy("cazare");
    expect(v).toContain("asistență juridică până la semnare".replace("asistență", "Asistență"));
    expect(v).not.toContain("încasarea chiriei");
    expect(i).toContain("încasarea chiriei");
    expect(i).toContain("Airbnb (AirCover)");
    expect(c).toContain("3 niveluri de protecție");
    expect(v).not.toContain("AirCover");
    expect(i).not.toContain("6,5%–9,4%");
    expect(c).toContain("6,5%–9,4%");
    expect(c).not.toContain("calificarea cumpărătorilor");
  });
});
describe("Andrei commission & refusal rules", () => {
  it("accepts commission reply with result-based fee, free analysis and WhatsApp offer", () => {
    expect(validateCommissionReply("Lucrăm doar la rezultat cu un comision standard, însă înainte de toate vă pot trimite gratuit pe WhatsApp o analiză de preț actualizată pentru zonă. Este în regulă să o trimit pe numărul acesta?").ok).toBe(true);
  });
  it("rejects defensive commission reply", () => {
    expect(validateCommissionReply("Nu oferim servicii fără comision.").missing).toEqual(expect.arrayContaining(["analiza_gratuita", "propunere_whatsapp", "formulare_defensiva"]));
  });
  it("rejects commission reply without WhatsApp offer", () => {
    expect(validateCommissionReply("Lucrăm la rezultat, 2-4%, iar analiza e gratuită.").missing).toEqual(["propunere_whatsapp"]);
  });
  it("flags immediate goodbye after soft refusal", () => {
    expect(isPrematureClose("Găsesc singur chiriaș", "Am înțeles, o zi bună!")).toBe(true);
    expect(isPrematureClose("Nu plătesc comision", "Înțeleg perfect! Apartamentul este eliberat deja sau căutați pe termen mai lung?")).toBe(false);
  });
  it("STOP still ends the call immediately", () => {
    expect(isPrematureClose("STOP, nu mă mai sunați", "Am înțeles. Nu vă mai rețin. O zi bună!")).toBe(false);
  });
  it("policy bans defensive phrasing and requires a qualification pivot", () => {
    const p = andreiConversationPolicy("inchiriere");
    expect(p).toContain("Nu oferim servicii fără comision");
    expect(p).toContain("FĂRĂ CAPITULARE PREMATURĂ");
  });
});
