import { buildVoiceSessionVariables } from "./voiceSessionVariables";

type StartSessionFn = (options: Record<string, unknown>) => Promise<unknown>;

export type VoiceTokenPayload = { token?: string; signedUrl?: string; agentId?: string };

/**
 * Starts Andrei's website voice session. WebRTC is tried first (best audio);
 * when the network blocks it (corporate Wi-Fi, some mobile carriers) we retry once
 * over WebSocket with the signed URL, so the visitor still gets a voice call.
 */
export async function startAndreiVoiceSession(
  startSession: StartSessionFn,
  payload: VoiceTokenPayload,
  opts: { pagePath?: string; language?: string } = {},
): Promise<"webrtc" | "websocket"> {
  const dynamicVariables = buildVoiceSessionVariables(opts);
  let webrtcError: unknown = null;
  if (payload.token) {
    try {
      await startSession({ conversationToken: payload.token, connectionType: "webrtc", dynamicVariables });
      return "webrtc";
    } catch (err) {
      webrtcError = err;
      console.warn("[voice] WebRTC failed, trying WebSocket fallback:", (err as Error)?.message || err);
    }
  }
  if (payload.signedUrl) {
    await startSession({ signedUrl: payload.signedUrl, connectionType: "websocket", dynamicVariables });
    return "websocket";
  }
  throw webrtcError ?? new Error("No voice token received");
}
