import { describe, expect, it } from "vitest";
import { buildHandoffText, buildHandoffUrl, HANDOFF_MAX_CHARS, plainChatLine } from "./chatWhatsAppHandoff";

describe("chat WhatsApp handoff", () => {
  it("summarises the visitor's messages and Andrei's replies, skipping the greeting", () => {
    const text = buildHandoffText([
      { id: "greeting", role: "assistant", content: "Bună! Sunt **Andrei**." },
      { role: "user", content: "Am 2 camere, 55 mp în Iosefin" },
      { role: "assistant", content: "⚡ **Estimare rapidă:** 100.000 € – 110.000 € 👇" },
    ]);
    expect(text).toContain("Rezumatul discuției:");
    expect(text).toContain("• Eu: Am 2 camere, 55 mp în Iosefin");
    expect(text).toContain("• Andrei: Estimare rapidă: 100.000 € – 110.000 €");
    expect(text).not.toContain("Sunt Andrei");
  });

  it("uses a neutral opener when the visitor has not written anything", () => {
    const text = buildHandoffText([{ id: "greeting", role: "assistant", content: "Bună!" }]);
    expect(text).toBe("Bună ziua, Andrei! Aș dori să discutăm despre proprietatea mea din Timișoara.");
  });

  it("never exceeds the maximum pre-filled length", () => {
    const long = Array.from({ length: 20 }, (_, i) => ({ role: "user" as const, content: `mesaj ${i} ${"x".repeat(400)}` }));
    expect(buildHandoffText(long).length).toBeLessThanOrEqual(HANDOFF_MAX_CHARS);
  });

  it("ignores failed or still-streaming replies", () => {
    const text = buildHandoffText([
      { role: "user", content: "Salut" },
      { role: "assistant", content: "A apărut o eroare.", isError: true },
      { role: "assistant", content: "Scriu...", isStreaming: true },
    ]);
    expect(text).not.toContain("eroare");
    expect(text).not.toContain("Scriu");
  });

  it("turns markdown links into their label", () => {
    expect(plainChatLine("Vezi [Anunțuri](/imobiliare) acum")).toBe("Vezi Anunțuri acum");
  });

  it("opens the RealTrust WhatsApp number with the encoded summary", () => {
    const url = buildHandoffUrl([{ role: "user", content: "Salut" }], { pageUrl: "https://realtrust.ro/" });
    expect(url.startsWith("https://wa.me/40799069256?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("Pagina: https://realtrust.ro/");
  });
});
