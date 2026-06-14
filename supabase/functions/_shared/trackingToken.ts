// Shared HMAC signer/verifier for email tracking URLs.
// Prevents anonymous attackers from forging tracking events for arbitrary user_ids.
// Uses node:crypto for synchronous HMAC (templates that build URLs are sync).

import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  return (
    Deno.env.get("EMAIL_TRACKING_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "fallback-dev-secret-do-not-use"
  );
}

function canonical(parts: Record<string, string | null | undefined>): string {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k] ?? ""}`)
    .join("&");
}

export function signTrackingPayload(
  parts: Record<string, string | null | undefined>,
): string {
  return createHmac("sha256", getSecret()).update(canonical(parts)).digest("hex");
}

export function verifyTrackingPayload(
  parts: Record<string, string | null | undefined>,
  sig: string | null,
): boolean {
  if (!sig) return false;
  const expected = signTrackingPayload(parts);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
