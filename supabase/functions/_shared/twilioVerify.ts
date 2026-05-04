// Twilio webhook signature validation (HMAC-SHA1).
// See https://www.twilio.com/docs/usage/webhooks/webhooks-security

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  // base64
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/**
 * Validate a Twilio webhook request. Reads the body as form-data when applicable.
 * Returns { ok: true, params } on success, or { ok: false, response } to short-circuit.
 *
 * IMPORTANT: this consumes the request body. Pass back `params` to avoid re-parsing.
 */
export async function verifyTwilioRequest(
  req: Request,
): Promise<
  | { ok: true; params: URLSearchParams; rawUrl: string }
  | { ok: false; response: Response }
> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const signature = req.headers.get("x-twilio-signature") || req.headers.get("X-Twilio-Signature");
  const plain = (message: string, status: number) => new Response(message, { status });

  // Reconstruct full URL Twilio used. Honor x-forwarded-* if present (Supabase edge).
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const fullUrl = `${proto}://${host}${url.pathname}${url.search}`;

  // Parse body as form-data if content-type indicates so
  let params = new URLSearchParams();
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      for (const [k, v] of form.entries()) params.append(k, String(v));
    } catch {
      // ignore
    }
  }

  if (!authToken) {
    // Fail-closed if not configured — webhook must be authenticated
    return {
      ok: false,
      response: plain("Semnătura apelului nu poate fi verificată momentan.", 500),
    };
  }
  if (!signature) {
    return { ok: false, response: plain("Semnătura apelului lipsește.", 403) };
  }

  // Twilio signing string: full URL + sorted (key+value) concatenation
  const sortedKeys = [...params.keys()].sort();
  let signingString = fullUrl;
  for (const k of sortedKeys) {
    for (const v of params.getAll(k)) signingString += k + v;
  }

  const expected = await hmacSha1Base64(authToken, signingString);
  if (!timingSafeEqual(expected, signature)) {
    return { ok: false, response: plain("Semnătura apelului este invalidă.", 403) };
  }

  return { ok: true, params, rawUrl: fullUrl };
}
