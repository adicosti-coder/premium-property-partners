import { describe, expect, it } from "vitest";
import { andreiConversationPolicy, ANDREI_SALES_EXAMPLES } from "../../supabase/functions/_shared/andreiConversationPolicy";

describe("Andrei concise policy", () => {
  it("adds sales examples only to sales calls", () => {
    expect(andreiConversationPolicy("vanzare")).toContain(ANDREI_SALES_EXAMPLES);
    expect(andreiConversationPolicy("cazare")).not.toContain(ANDREI_SALES_EXAMPLES);
  });
  it("keeps example replies short", () => {
    const replies = ANDREI_SALES_EXAMPLES.split("\n").filter(line => line.startsWith("Andrei:"));
    expect(replies.length).toBe(12);
    for (const line of replies) expect(line.replace(/^Andrei: /, "").split(/\s+/).length).toBeLessThanOrEqual(30);
  });
  it("retains consent, transparency and factuality rules", () => {
    const policy = andreiConversationPolicy("vanzare");
    for (const rule of ["asistent AI", "necesită acord", "STOP", "nu inventezi", "două camere", "nu sunt date"]) expect(policy).toContain(rule);
  });
});
describe("Andrei value propositions per listing type", () => {
  it("uses only the matching value proposition", () => {
    const v = andreiConversationPolicy("vanzare"), i = andreiConversationPolicy("inchiriere"), c = andreiConversationPolicy("cazare");
    expect(v).toContain("asistență juridică până la semnare".replace("asistență", "Asistență"));
    expect(v).not.toContain("Încasarea chiriei");
    expect(i).toContain("Încasarea chiriei");
    expect(i).not.toContain("6,5%–9,4%");
    expect(c).toContain("6,5%–9,4%");
    expect(c).not.toContain("calificarea cumpărătorilor");
  });
});
