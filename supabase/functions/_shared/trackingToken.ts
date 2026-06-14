// Shared HMAC signer/verifier for email tracking URLs.
// Prevents anonymous attackers from forging tracking events for arbitrary user_ids.

function getSecret(): string {
  return (
    Deno.env.get("EMAIL_TRACKING_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "fallback-dev-secret-do-not-use"
  );
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonical(parts: Record<string, string | null | undefined>): string {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ""}`)
    .join("&");
}

export async function signTrackingPayload(
  parts: Record<string, string | null | undefined>,
): Promise<string> {
  return hmacHex(canonical(parts), getSecret());
}

export async function verifyTrackingPayload(
  parts: Record<string, string | null | undefined>,
  sig: string | null,
): Promise<boolean> {
  if (!sig) return false;
  const expected = await hmacHex(canonical(parts), getSecret());
  if (expected.length !== sig.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}
