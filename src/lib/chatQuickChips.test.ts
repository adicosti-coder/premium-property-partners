import { describe, it, expect } from "vitest";
import { QUICK_CHIPS } from "./chatQuickChips";

describe("Andrei quick chips", () => {
  it("offers exactly one voice chip in Romanian, labelled for talking to Andrei", () => {
    const voice = QUICK_CHIPS.ro.filter((c) => c.kind === "voice");
    expect(voice).toHaveLength(1);
    expect(voice[0].label).toBe("🎙️ Vorbește vocal cu Andrei");
  });

  it("offers exactly one voice chip in English", () => {
    expect(QUICK_CHIPS.en.filter((c) => c.kind === "voice")).toHaveLength(1);
  });

  it("keeps the WhatsApp handoff chip in both languages", () => {
    expect(QUICK_CHIPS.ro.some((c) => c.kind === "whatsapp")).toBe(true);
    expect(QUICK_CHIPS.en.some((c) => c.kind === "whatsapp")).toBe(true);
  });
});
