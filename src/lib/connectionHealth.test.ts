import { describe, expect, it } from "vitest";
import {
  applyStaleness, evaluateDatabase, evaluateMake, evaluateWhatsApp, offlineSnapshot, overallStatus,
} from "../../supabase/functions/_shared/connectionHealthRules";

const at = "2026-11-21T10:00:00.000Z";
const waBase = {
  tokenPresent: true,
  tokenCheck: { httpStatus: 200, canSendMessage: "AVAILABLE" },
  recentFailures: [] as { last_error: string | null; updated_at: string }[],
  stuckPending: 0, withinSendingHours: true, sent24h: 12, checkedAt: at,
};
const makeBase = { configured: [{ name: "MAKE_WEBHOOK_URL", present: true }], deliveries: [], leadEventsFailed24h: 0, checkedAt: at };

describe("overall status", () => {
  it("is green only when every service is green, red when any is red", () => {
    expect(overallStatus([{ status: "green" }, { status: "green" }, { status: "green" }])).toBe("green");
    expect(overallStatus([{ status: "green" }, { status: "yellow" }, { status: "green" }])).toBe("yellow");
    expect(overallStatus([{ status: "yellow" }, { status: "red" }, { status: "green" }])).toBe("red");
  });
});

describe("database", () => {
  it("green when read and write work quickly", () => {
    expect(evaluateDatabase({ readOk: true, writeOk: true, latencyMs: 120, checkedAt: at }).status).toBe("green");
  });
  it("yellow when slower than 2 seconds", () => {
    expect(evaluateDatabase({ readOk: true, writeOk: true, latencyMs: 2500, checkedAt: at }).status).toBe("yellow");
  });
  it("red with a pause/credits warning when the project is paused", () => {
    const r = evaluateDatabase({ readOk: false, writeOk: false, latencyMs: null, error: "Your project is paused", checkedAt: at });
    expect(r.status).toBe("red");
    expect(r.summary).toMatch(/pauză sau credite/);
  });
  it("red when the health endpoint is unreachable (backend down)", () => {
    const s = offlineSnapshot("Failed to fetch", new Date(at));
    expect(overallStatus(s)).toBe("red");
    expect(s[0]).toMatchObject({ key: "database", status: "red" });
  });
});

describe("WhatsApp", () => {
  it("green with a valid token and normal per-recipient failures (131026, duplicate guard)", () => {
    const r = evaluateWhatsApp({ ...waBase, recentFailures: [
      { last_error: "undeliverable_131026: Message undeliverable", updated_at: at },
      { last_error: "http_409", updated_at: at }, { last_error: "http_409", updated_at: at },
    ] });
    expect(r.status).toBe("green");
  });
  it("red immediately on payment/eligibility error 131042", () => {
    const r = evaluateWhatsApp({ ...waBase, recentFailures: [{ last_error: '[{"code":131042,"title":"Business eligibility payment issue"}]', updated_at: at }] });
    expect(r.status).toBe("red");
    expect(r.summary).toMatch(/131042/);
  });
  it("red on invalid/expired token or a missing token", () => {
    expect(evaluateWhatsApp({ ...waBase, tokenCheck: { httpStatus: 401, errorCode: 190 } }).status).toBe("red");
    expect(evaluateWhatsApp({ ...waBase, tokenPresent: false }).status).toBe("red");
  });
  it("red when Meta reports the number as BLOCKED, yellow when LIMITED", () => {
    expect(evaluateWhatsApp({ ...waBase, tokenCheck: { httpStatus: 200, canSendMessage: "BLOCKED" } }).status).toBe("red");
    expect(evaluateWhatsApp({ ...waBase, tokenCheck: { httpStatus: 200, canSendMessage: "LIMITED" } }).status).toBe("yellow");
  });
  it("messages stuck in the queue: yellow from 1, red from 25, ignored outside sending hours", () => {
    expect(evaluateWhatsApp({ ...waBase, stuckPending: 1 }).status).toBe("yellow");
    expect(evaluateWhatsApp({ ...waBase, stuckPending: 25 }).status).toBe("red");
    expect(evaluateWhatsApp({ ...waBase, stuckPending: 40, withinSendingHours: false }).status).toBe("green");
  });
  it("yellow from 3 real send failures in 24h", () => {
    const f = { last_error: "http_500", updated_at: at };
    expect(evaluateWhatsApp({ ...waBase, recentFailures: [f, f] }).status).toBe("green");
    expect(evaluateWhatsApp({ ...waBase, recentFailures: [f, f, f] }).status).toBe("yellow");
  });
});

describe("Make.com", () => {
  const d = (event: string, status: string, last_status: number | null, last_error: string | null, created_at = at) =>
    ({ event, status, last_status, last_error, created_at });

  it("green when the latest delivery of each event succeeded", () => {
    const r = evaluateMake({ ...makeBase, deliveries: [
      d("lead", "failed", 500, "boom", "2026-11-21T08:00:00Z"), d("lead", "delivered", 200, null, "2026-11-21T09:00:00Z"),
    ] });
    expect(r.status).toBe("green");
  });
  it("red when a webhook has no active scenario (410)", () => {
    const r = evaluateMake({ ...makeBase, deliveries: [d("wa_outbound_sent", "failed", 410, "There is no scenario listening for this webhook.")] });
    expect(r.status).toBe("red");
    expect(r.lastError).toMatch(/410/);
  });
  it("yellow on timeouts and 5xx", () => {
    expect(evaluateMake({ ...makeBase, deliveries: [d("lead", "failed", null, "The signal has been aborted (timeout)")] }).status).toBe("yellow");
    expect(evaluateMake({ ...makeBase, deliveries: [d("lead", "failed", 502, "Bad gateway")] }).status).toBe("yellow");
  });
  it("red when the main lead webhook is not configured; other missing webhooks are only listed", () => {
    expect(evaluateMake({ ...makeBase, configured: [{ name: "MAKE_WEBHOOK_URL", present: false }] }).status).toBe("red");
    const r = evaluateMake({ ...makeBase, configured: [{ name: "MAKE_WEBHOOK_URL", present: true }, { name: "MAKE_MONTHLY_ALERT_WEBHOOK", present: false }] });
    expect(r.status).toBe("green");
    expect(r.details?.missingWebhooks).toEqual(["MAKE_MONTHLY_ALERT_WEBHOOK"]);
  });
});

describe("staleness", () => {
  it("turns a green result older than 30 minutes into yellow", () => {
    const g = evaluateDatabase({ readOk: true, writeOk: true, latencyMs: 100, checkedAt: at });
    expect(applyStaleness([g], new Date("2026-11-21T10:20:00Z"))[0].status).toBe("green");
    expect(applyStaleness([g], new Date("2026-11-21T10:31:00Z"))[0].status).toBe("yellow");
  });
});
