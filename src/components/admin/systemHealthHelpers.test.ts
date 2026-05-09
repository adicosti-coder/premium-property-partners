import { describe, it, expect } from "vitest";
import { buildE2ECsv, analyzeIncidents, filterE2E, E2E_CSV_COLUMNS, type E2ERun } from "./systemHealthHelpers";

const baseRow: E2ERun = {
  id: 1, test_type: "voice", status: "passed", duration_ms: 800,
  run_at: "2026-05-09T08:00:00.000Z", retry_count: 0, parent_run_id: null,
  error_message: null, details: { ok: true },
};

describe("buildE2ECsv", () => {
  it("includes header with details column", () => {
    const csv = buildE2ECsv([baseRow]);
    const header = csv.split("\n")[0];
    expect(header).toBe(E2E_CSV_COLUMNS.join(","));
    expect(header).toContain("details");
  });

  it("escapes JSON details inside a CSV cell", () => {
    const row: E2ERun = { ...baseRow, details: { msg: 'has "quotes" and, comma' } };
    const csv = buildE2ECsv([row]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain('""quotes""');
    // cell starts/ends with double-quote (proper escaping)
    expect(lines[1]).toMatch(/,"\{.*\}"$/);
  });

  it("flattens newlines in error_message", () => {
    const row: E2ERun = { ...baseRow, error_message: "line1\nline2\r\nline3" };
    const csv = buildE2ECsv([row]);
    expect(csv).not.toMatch(/line1\n/);
    expect(csv).toMatch(/line1 line2 line3/);
  });

  it("handles null/undefined fields gracefully", () => {
    const row: E2ERun = { ...baseRow, error_message: null, details: undefined as any };
    expect(() => buildE2ECsv([row])).not.toThrow();
  });
});

describe("analyzeIncidents", () => {
  it("returns ok when nothing failing", () => {
    const r = analyzeIncidents({ invalidKeys: [], recentE2E: [baseRow], latencyAlertsCount: 0 });
    expect(r.severity).toBe("ok");
  });

  it("correlates Google key + SEO failure", () => {
    const r = analyzeIncidents({
      invalidKeys: [{ provider: "google" }],
      recentE2E: [{ ...baseRow, test_type: "seo", status: "failed" }],
      latencyAlertsCount: 0,
    });
    expect(r.severity).toBe("critical");
    expect(r.hints.join(" ")).toMatch(/Google/i);
  });

  it("flags voice impact when ElevenLabs invalid", () => {
    const r = analyzeIncidents({
      invalidKeys: [{ provider: "elevenlabs" }],
      recentE2E: [{ ...baseRow, status: "critical" }],
      latencyAlertsCount: 2,
    });
    expect(r.severity).toBe("critical");
    expect(r.impact).toMatch(/Andrei/);
  });
});

describe("filterE2E", () => {
  const rows: E2ERun[] = [
    { ...baseRow, id: 1, test_type: "voice", status: "passed" },
    { ...baseRow, id: 2, test_type: "voice", status: "critical", error_message: "ElevenLabs 401" },
    { ...baseRow, id: 3, test_type: "seo", status: "failed", error_message: "Google quota" },
  ];

  it("filters by status and type", () => {
    expect(filterE2E(rows, { status: "critical", test_type: "all", query: "" })).toHaveLength(1);
    expect(filterE2E(rows, { status: "all", test_type: "seo", query: "" })).toHaveLength(1);
  });

  it("searches across error message", () => {
    expect(filterE2E(rows, { status: "all", test_type: "all", query: "google" })).toHaveLength(1);
    expect(filterE2E(rows, { status: "all", test_type: "all", query: "elevenlabs" })).toHaveLength(1);
  });
});
