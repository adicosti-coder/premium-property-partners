// chat-session — emite biletul de sesiune pentru asistentul Andrei (`ai-chatbot-stream`).
// Vizitatorii publici trec o singură dată verificarea anti-robot (Turnstile, fail-closed);
// utilizatorii autentificați primesc biletul direct. Biletul e semnat HMAC, valabil 6 ore,
// deci apelurile la modelul AI plătit cer o sesiune verificată, nu doar cheia publică.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { applyRateLimit } from "../_shared/rateLimiter.ts";
import { issueTicket } from "../_shared/signedTicket.ts";

export const CHAT_SESSION_PURPOSE = "chat-session";
const TTL_MS = 6 * 3600_000;

async function signedInUser(req: Request): Promise<boolean> {
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer || bearer === Deno.env.get("SUPABASE_ANON_KEY")) return false;
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data } = await sb.auth.getUser(bearer);
    return !!data?.user?.id;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = applyRateLimit(req, cors, { maxRequests: 3, windowMs: 60_000 });
  if (limited) return limited;

  let verified = await signedInUser(req);
  if (!verified) {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.turnstileToken === "string" ? body.turnstileToken.slice(0, 4096) : "";
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret || !token) return json({ error: "captcha_required" }, 403);
    try {
      const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      });
      const j = await r.json().catch(() => ({}));
      verified = j?.success === true;
    } catch {
      verified = false;
    }
    if (!verified) return json({ error: "captcha_failed" }, 403);
  }

  const t = await issueTicket(CHAT_SESSION_PURPOSE, TTL_MS);
  if (!t) return json({ error: "config_error" }, 503);
  return json({ token: t.ticket, expires_at: t.expiresAt });
});
