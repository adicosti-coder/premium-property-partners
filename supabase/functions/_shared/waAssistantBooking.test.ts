import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateEvaluationSlot } from "./waAssistantBooking.ts";

// Duminică 1 noiembrie 2026, 18:00 ora României
const NOW = new Date("2026-11-01T16:00:00Z");
const reason = (date: string, time: string) => {
  const r = validateEvaluationSlot({ date, time }, NOW);
  return r.ok ? "ok" : r.reason;
};

Deno.test("evaluare luni 10:00 se acceptă", () => assertEquals(reason("2026-11-02", "10:00"), "ok"));
Deno.test("evaluare sâmbătă 19:00 se acceptă", () => assertEquals(reason("2026-11-07", "19:00"), "ok"));
Deno.test("duminica nu se programează", () => assertEquals(reason("2026-11-08", "11:00"), "sunday"));
Deno.test("înainte de 09:00 se refuză", () => assertEquals(reason("2026-11-03", "08:30"), "outside_hours"));
Deno.test("după 19:00 se refuză", () => assertEquals(reason("2026-11-03", "19:30"), "outside_hours"));
Deno.test("în trecut se refuză", () => assertEquals(reason("2026-10-31", "10:00"), "too_soon"));
Deno.test("peste 30 de zile se refuză", () => assertEquals(reason("2026-12-15", "10:00"), "too_far"));
