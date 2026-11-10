import { describe, expect, it, vi } from "vitest";
import { reauditWithRecovery, runSequential, isLegacyAuditPath, canonicalAuditPath, type ReauditDeps } from "./seoReaudit";
import { auditUrlVariants } from "../../supabase/functions/_shared/seoAuditTarget";
import { applyActiveOverride, countPageHeadings, overrideNewerThan } from "../../supabase/functions/seo-ai-optimizer/auditInputs";

const noSleep = () => Promise.resolve();

describe("reauditWithRecovery", () => {
  it("uses the audit saved in the database when the call times out", async () => {
    const saved = { url: "https://www.realtrust.ro/contact", overall_score: 82, created_at: new Date().toISOString() };
    const findRecent = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(saved);
    const deps: ReauditDeps = {
      invoke: async () => ({ data: null, error: Object.assign(new Error("Request timed out"), { name: "FunctionsFetchError" }) }),
      findRecent,
      sleep: noSleep,
    };
    const res = await reauditWithRecovery("/contact", "ro", "www.realtrust.ro", deps);
    expect(res.recovered).toBe(true);
    expect(res.score).toBe(82);
    expect(findRecent).toHaveBeenCalledTimes(2);
  });

  it("still reports a failure when nothing was saved after the timeout", async () => {
    const deps: ReauditDeps = {
      invoke: async () => ({ data: null, error: new Error("Failed to fetch") }),
      findRecent: async () => null,
      sleep: noSleep,
      pollAttempts: 2,
    };
    await expect(reauditWithRecovery("/contact", "ro", "www.realtrust.ro", deps)).rejects.toThrow("Failed to fetch");
  });

  it("does not read the database for a real (non-network) error", async () => {
    const findRecent = vi.fn();
    const deps: ReauditDeps = {
      invoke: async () => ({ data: null, error: Object.assign(new Error("Unauthorized"), { status: 401 }) }),
      findRecent,
      sleep: noSleep,
    };
    await expect(reauditWithRecovery("/contact", "ro", "www.realtrust.ro", deps)).rejects.toThrow("Unauthorized");
    expect(findRecent).not.toHaveBeenCalled();
  });

  it("audits /calculator-roi as /calculator-randament", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { audit: { overall_score: 70 } }, error: null });
    await reauditWithRecovery("/calculator-roi", "ro", "www.realtrust.ro", { invoke, findRecent: async () => null });
    expect(invoke).toHaveBeenCalledWith("https://www.realtrust.ro/calculator-randament", "ro");
  });
});

describe("runSequential", () => {
  it("never runs two re-audits at the same time and pauses between them", async () => {
    let active = 0, maxActive = 0;
    const gaps: number[] = [];
    await runSequential([1, 2, 3], async () => {
      active++; maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active--;
    }, { gapMs: 1500, sleep: async (ms) => { gaps.push(ms); } });
    expect(maxActive).toBe(1);
    expect(gaps).toEqual([1500, 1500]);
  });
});

describe("legacy audit paths", () => {
  it("treats client-side redirects as aliases", () => {
    expect(isLegacyAuditPath("https://www.realtrust.ro/calculator-roi")).toBe(true);
    expect(isLegacyAuditPath("/contact")).toBe(false);
    expect(canonicalAuditPath("/calculator-roi/")).toBe("/calculator-randament");
    expect(auditUrlVariants("/contact")).toEqual(["https://realtrust.ro/contact", "https://www.realtrust.ro/contact"]);
  });
});

describe("audit inputs", () => {
  it("counts the prerendered H1 only when the page has no other H1", () => {
    expect(countPageHeadings('<h1 data-prerender-title>Contact</h1><h2>A</h2>')).toEqual({ h1Count: 1, h2Count: 1 });
    expect(countPageHeadings('<h1>Hero</h1><h1 data-prerender-title>X</h1>')).toEqual({ h1Count: 1, h2Count: 0 });
    expect(countPageHeadings('<h1 aria-hidden="true">X</h1>')).toEqual({ h1Count: 0, h2Count: 0 });
  });

  it("scores the active override title and meta instead of the static ones", () => {
    const { scraped, override } = applyActiveOverride(
      { title: "Static", metaDescription: "Static meta" },
      { title: "Override title", meta_description: null, updated_at: "2026-11-10T08:00:00Z" },
    );
    expect(scraped.title).toBe("Override title");
    expect(scraped.metaDescription).toBe("Static meta");
    expect(override.static_title).toBe("Static");
    expect(overrideNewerThan(override, "2026-11-10T07:00:00Z")).toBe(true);
    expect(overrideNewerThan(override, "2026-11-10T09:00:00Z")).toBe(false);
  });
});
