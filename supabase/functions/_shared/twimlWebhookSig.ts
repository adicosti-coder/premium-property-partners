// Per-session signed nonce for Twilio TwiML webhook URLs.
// Because Twilio HMAC verification is unreliable in our edge-runtime setup
// (URL rewrite + API-Key vs project token mismatch), we authenticate incoming
// webhook requests using a server-generated HMAC over the sessionId.
//
// The signature is appended to every twimlUrl we hand to Twilio as `sig=...`
// and is validated on every hop of voice-agent-twiml. Rejecting an unsigned or
// mismatched request prevents a leaked sessionId (from logs or dashboards)
// from being used to inject arbitrary SpeechResult / AnsweredBy payloads.

const enc = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64url(sig);
}

export async function signSessionId(sessionId: string): Promise<string> {
  const secret = Deno.env.get("VOICE_TWIML_WEBHOOK_SECRET");
  if (!secret) throw new Error("VOICE_TWIML_WEBHOOK_SECRET not configured");
  return await hmacSha256(secret, sessionId);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySessionSig(
  sessionId: string | null | undefined,
  sig: string | null | undefined,
): Promise<boolean> {
  if (!sessionId || !sig) return false;
  const secret = Deno.env.get("VOICE_TWIML_WEBHOOK_SECRET");
  if (!secret) return false;
  const expected = await hmacSha256(secret, sessionId);
  return timingSafeEqual(expected, sig);
}
