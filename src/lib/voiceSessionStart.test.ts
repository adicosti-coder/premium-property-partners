import { describe, it, expect, vi } from "vitest";
import { startAndreiVoiceSession } from "./voiceSessionStart";

describe("startAndreiVoiceSession", () => {
  it("uses WebRTC with the required caller variable when it connects", async () => {
    const start = vi.fn().mockResolvedValue(undefined);
    const mode = await startAndreiVoiceSession(start, { token: "t", signedUrl: "wss://x" }, { language: "ro" });
    expect(mode).toBe("webrtc");
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0]).toMatchObject({ connectionType: "webrtc", conversationToken: "t" });
    expect((start.mock.calls[0][0] as any).dynamicVariables.callerphone_number).toBe("vizitator-site");
  });

  it("falls back to WebSocket once when WebRTC cannot connect", async () => {
    const start = vi.fn().mockRejectedValueOnce(new Error("could not establish pc connection")).mockResolvedValueOnce(undefined);
    const mode = await startAndreiVoiceSession(start, { token: "t", signedUrl: "wss://x" });
    expect(mode).toBe("websocket");
    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[1][0]).toMatchObject({ connectionType: "websocket", signedUrl: "wss://x" });
    expect((start.mock.calls[1][0] as any).dynamicVariables.callerphone_number).toBe("vizitator-site");
  });

  it("rethrows the WebRTC error when there is no fallback address", async () => {
    const start = vi.fn().mockRejectedValue(new Error("could not establish pc connection"));
    await expect(startAndreiVoiceSession(start, { token: "t" })).rejects.toThrow("pc connection");
  });
});
