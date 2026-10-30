import { assertEquals } from "jsr:@std/assert@1";
import { buildAutoReplyMessage, shouldAutoReply } from "./autoReply.ts";

const base = { source: "lead_engagement_widget:/contact", score: 60, phone: "40722123456", reEngaged: false };

Deno.test("widget lead at 60 points with phone gets auto-reply", () => {
  assertEquals(shouldAutoReply(base), true);
});
Deno.test("score 59 does not trigger", () => {
  assertEquals(shouldAutoReply({ ...base, score: 59 }), false);
});
Deno.test("non-widget source does not trigger", () => {
  assertEquals(shouldAutoReply({ ...base, source: "calculator_roi_widget" }), false);
});
Deno.test("missing phone does not trigger", () => {
  assertEquals(shouldAutoReply({ ...base, phone: null }), false);
});
Deno.test("re-engaged lead does not get a second first message", () => {
  assertEquals(shouldAutoReply({ ...base, reEngaged: true }), false);
});
Deno.test("hotel intent mentions hotel management", () => {
  assertEquals(buildAutoReplyMessage("Ion Pop", "Administrare regim hotelier").includes("regim hotelier"), true);
});
