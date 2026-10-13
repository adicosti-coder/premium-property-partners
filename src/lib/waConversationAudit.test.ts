import { describe, expect, it } from "vitest";
import { auditWaConversation, latestGeminiTurns } from "../../supabase/functions/_shared/waConversationAudit";
import { autoReplyText, isClearRefusal, publishConsentRequestText, rememberedClientZone } from "../../supabase/functions/_shared/waAutoReply";
describe("WhatsApp regressions", () => {
  it.each(["Bună ziua! Nu, mulțumesc.", "Nu sunt interesată", "Prefer sa nu vand acum"])("stops on %s", text => {
    expect(isClearRefusal(text)).toBe(true);
    expect(autoReplyText(text, { category: "vanzare" })?.kind).toBe("quick_no");
  });
  it("price boundary is not a refusal", () => {
    expect(isClearRefusal("Nu intentionez sa scad pretul sub 80.000")).toBe(false);
    expect(autoReplyText("Nu intentionez sa scad pretul sub 80.000", { category: "vanzare", zone: "Lipovei" })?.kind).toBe("owner_price_context");
  });
  it("sale fee is not management", () => {
    const r = autoReplyText("Cat este comision de vanzare?", { category: "vanzare", zone: "Iosefin" });
    expect(r?.text).toContain("2–4%"); expect(r?.text).not.toContain("15–20%"); expect(r?.text).not.toContain("În ce zonă");
  });
  it("remembers volunteered zone", () => {
    expect(rememberedClientZone([{ direction: "inbound", content: "Caut 2 camere in Lipovei" }])).toBe("Lipovei");
  });
  it("latest turns must end in inbound", () => {
    expect(latestGeminiTurns([{ direction: "inbound", content: "Hi" }, { direction: "outbound", content: "Hello", role: "assistant" }])).toEqual([]);
    expect(latestGeminiTurns([{ direction: "outbound", content: "intro", role: "assistant" }, { direction: "inbound", content: "Pret 84000" }, { direction: "outbound", error: "AI 400", role: "system", content: "" }]).at(-1)?.parts[0].text).toBe("Pret 84000");
  });
  it("flags post-refusal commercial reply, not ack", () => {
    const f = auditWaConversation([{ direction: "inbound", content: "Nu sunt interesată" }, { direction: "outbound", content: "Am înțeles. Nu vă mai contactăm." }, { direction: "outbound", content: "Vreți o evaluare?" }]);
    expect(f.filter(f => f.code === "after_refusal")).toHaveLength(1);
  });
  it("flags context loss and claims", () => {
    const f = auditWaConversation([{ direction: "inbound", content: "Sunt in Lipovei" }, { direction: "outbound", content: "În ce zonă căutați?" }, { direction: "outbound", content: "Avem deja cumpărători calificați. Comision 0%" }]);
    expect(f.map(f => f.code)).toEqual(expect.arrayContaining(["repeated_zone", "invented_claim", "fee_conflict"]));
  });
  it("safe direct request preserves approved Meta body", () => {
    const safe = publishConsentRequestText({ safeDirect: true });
    expect(safe).toContain("DA PUBLIC"); expect(safe).not.toMatch(/Comision 0|2 minute|investitori activi/);
    expect(publishConsentRequestText()).toContain("Comision 0%");
  });
});
