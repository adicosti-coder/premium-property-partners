import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assistantCompanyFactsBlock } from "../../supabase/functions/_shared/assistantCompanyFacts";
import { SYSTEM_PROMPT_EN, SYSTEM_PROMPT_RO } from "../../supabase/functions/ai-chatbot/prompts";

const OUTDATED = [/4[.,]9\s*\/\s*5/, /98\s*%/, /ocupare[^\n]{0,25}9\d\s*%\+?/i, /occupancy[^\n]{0,25}9\d\s*%/i, /25\+\s*ani/];
const src = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("Andrei assistant approved facts", () => {
  const ro = assistantCompanyFactsBlock("ro");
  const en = assistantCompanyFactsBlock("en");

  it("states the guest score as 9,7/10", () => {
    expect(ro).toContain("9,7/10 pe Booking.com");
    expect(en).toContain("9.7/10 on Booking.com");
  });

  it("states annual occupancy as 65–75%", () => {
    expect(ro).toContain("Ocupare anuală asumată: 65–75%");
    expect(en).toContain("Assumed annual occupancy: 65–75%");
  });

  it("keeps the 15–20% management fee on net income", () => {
    expect(ro).toContain("15–20% din venitul net");
    expect(en).toContain("15–20% of net income");
  });

  it("names the legal entity, Timișoara and the 0799 069 256 handoff", () => {
    for (const block of [ro, en]) {
      expect(block).toContain("SC Imo Business Centrum SRL");
      expect(block).toContain("Timișoara");
      expect(block).toContain("0799 069 256");
    }
  });

  it("legacy chatbot prompts include the approved facts", () => {
    expect(SYSTEM_PROMPT_RO).toContain(assistantCompanyFactsBlock("ro", "-"));
    expect(SYSTEM_PROMPT_EN).toContain(assistantCompanyFactsBlock("en", "-"));
  });

  it("no assistant prompt source keeps the old rating or occupancy", () => {
    const sources = {
      facts: ro + en,
      legacyRo: SYSTEM_PROMPT_RO,
      legacyEn: SYSTEM_PROMPT_EN,
      stream: src("supabase/functions/ai-chatbot-stream/index.ts"),
      voice: src("supabase/functions/voice-agent-context/index.ts"),
      widget: src("src/components/AIChatbot.tsx"),
    };
    for (const [name, text] of Object.entries(sources)) {
      for (const re of OUTDATED) expect({ name, match: text.match(re)?.[0] ?? null }).toEqual({ name, match: null });
    }
  });

  it("the streaming assistant injects the shared facts block", () => {
    expect(src("supabase/functions/ai-chatbot-stream/index.ts")).toContain("${assistantCompanyFactsBlock(language)}");
  });
});
