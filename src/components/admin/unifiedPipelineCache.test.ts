import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  cacheGet,
  cacheSet,
  cacheRead,
  cacheInvalidatePrefix,
  cacheClearAll,
  cacheSize,
  COUNT_CACHE_TTL_MS,
  shouldMockCountError,
  __setMockCountErrorForTests,
  MockCountError,
} from "./unifiedPipelineCache";

describe("unifiedPipelineCache", () => {
  beforeEach(() => cacheClearAll());

  it("set + get roundtrip", () => {
    cacheSet("tabs:a", { observability: 1, prospects: 2, approval: 3 });
    expect(cacheGet("tabs:a")).toEqual({ observability: 1, prospects: 2, approval: 3 });
  });

  it("miss returns undefined", () => {
    expect(cacheGet("missing")).toBeUndefined();
    expect(cacheRead("missing")).toEqual({ hit: false });
  });

  it("cacheRead expune ageMs pe hit", () => {
    cacheSet("active:x", 42);
    const r = cacheRead<number>("active:x");
    expect(r.hit).toBe(true);
    if (r.hit) {
      expect(r.value).toBe(42);
      expect(r.ageMs).toBeGreaterThanOrEqual(0);
      expect(r.ageMs).toBeLessThan(COUNT_CACHE_TTL_MS);
    }
  });

  it("expiră după TTL", () => {
    vi.useFakeTimers();
    try {
      cacheSet("k", 1);
      expect(cacheGet<number>("k")).toBe(1);
      vi.advanceTimersByTime(COUNT_CACHE_TTL_MS + 100);
      expect(cacheGet<number>("k")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cacheInvalidatePrefix șterge doar chei cu prefix (simulează Realtime insert)", () => {
    cacheSet("tabs:a", 1);
    cacheSet("tabs:b", 2);
    cacheSet("active:x", 3);
    cacheSet("other:y", 4);
    expect(cacheSize()).toBe(4);

    // Insert rapid în prospect_listings → Realtime invalidează.
    cacheInvalidatePrefix("tabs:");
    cacheInvalidatePrefix("active:");

    expect(cacheGet("tabs:a")).toBeUndefined();
    expect(cacheGet("tabs:b")).toBeUndefined();
    expect(cacheGet("active:x")).toBeUndefined();
    expect(cacheGet("other:y")).toBe(4); // păstrat
  });

  it("Realtime invalidează chiar și în interiorul ferestrei TTL", () => {
    vi.useFakeTimers();
    try {
      cacheSet("tabs:a", 100);
      vi.advanceTimersByTime(3_000); // încă în TTL de 12s
      expect(cacheGet<number>("tabs:a")).toBe(100);
      // Simulează evenimentul Realtime
      cacheInvalidatePrefix("tabs:");
      expect(cacheGet<number>("tabs:a")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("mock error switch", () => {
  afterEach(() => __setMockCountErrorForTests(null));

  it("dezactivat implicit", () => {
    expect(shouldMockCountError("observability")).toBe(false);
    expect(shouldMockCountError("prospects")).toBe(false);
  });

  it("țintă unică forțează doar acel query", () => {
    __setMockCountErrorForTests("observability");
    expect(shouldMockCountError("observability")).toBe(true);
    expect(shouldMockCountError("prospects")).toBe(false);
    expect(shouldMockCountError("approval")).toBe(false);
  });

  it('"all" forțează toate query-urile', () => {
    __setMockCountErrorForTests("all");
    expect(shouldMockCountError("observability")).toBe(true);
    expect(shouldMockCountError("prospects")).toBe(true);
    expect(shouldMockCountError("approval")).toBe(true);
    expect(shouldMockCountError("active")).toBe(true);
  });

  it("MockCountError are numele și mesajul așteptat", () => {
    const err = new MockCountError("prospects");
    expect(err.name).toBe("MockCountError");
    expect(err.message).toContain("prospects");
  });
});
