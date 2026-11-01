import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { leadingFailures, shouldAlert } from "./consecutiveFailures.ts";

const now = Date.parse("2026-11-01T12:00:00Z");
const at = (h: number) => new Date(now - h * 3600_000).toISOString();

Deno.test("2 consecutive failures do not alert", () => {
  assertEquals(shouldAlert([{ status: "failed", started_at: at(1) }, { status: "failed", started_at: at(2) }, { status: "success", started_at: at(3) }], now), false);
});
Deno.test("3 consecutive failures alert", () => {
  assertEquals(shouldAlert([{ status: "failed", started_at: at(1) }, { status: "error", started_at: at(2) }, { status: "failed", started_at: at(3) }], now), true);
});
Deno.test("runs stuck in started for over 2h count as failures", () => {
  assertEquals(leadingFailures([{ status: "started", started_at: at(5) }, { status: "started", started_at: at(29) }, { status: "started", started_at: at(53) }], now), 3);
});
Deno.test("a run still in progress is skipped, not counted", () => {
  assertEquals(leadingFailures([{ status: "started", started_at: at(0.1) }, { status: "failed", started_at: at(24) }, { status: "success", started_at: at(48) }], now), 1);
});
