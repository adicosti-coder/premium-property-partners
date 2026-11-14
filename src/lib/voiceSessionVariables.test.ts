import { describe, it, expect } from "vitest";
import { buildVoiceSessionVariables, isVoiceErrorDisconnect, WEB_VISITOR_CALLER_ID } from "./voiceSessionVariables";

describe("buildVoiceSessionVariables", () => {
  it("always sends a non-empty caller number required by the agent's context tool", () => {
    const vars = buildVoiceSessionVariables({ pagePath: "/cazare", language: "ro" });
    expect(vars.callerphone_number).toBe(WEB_VISITOR_CALLER_ID);
    expect(vars.callerphone_number.length).toBeGreaterThan(0);
  });

  it("fills every variable referenced by the agent prompt with a non-empty value", () => {
    for (const language of ["ro", "en"]) {
      const vars = buildVoiceSessionVariables({ language });
      for (const key of ["agent_memory_context", "lead_zone", "lead_price"] as const) {
        expect(vars[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("does not look like a phone number, so no owner record is matched", () => {
    expect(/\d/.test(WEB_VISITOR_CALLER_ID)).toBe(false);
  });
});

describe("isVoiceErrorDisconnect", () => {
  it("flags only error disconnects", () => {
    expect(isVoiceErrorDisconnect({ reason: "error", message: "x" })).toBe(true);
    expect(isVoiceErrorDisconnect({ reason: "user" })).toBe(false);
    expect(isVoiceErrorDisconnect({ reason: "agent" })).toBe(false);
    expect(isVoiceErrorDisconnect(undefined)).toBe(false);
  });
});
