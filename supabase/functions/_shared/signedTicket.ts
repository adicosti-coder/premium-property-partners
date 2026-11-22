// Bilete semnate HMAC (fără stare) pentru acțiuni publice limitate:
// sesiunea de chat obținută după verificarea anti-robot și numărarea descărcării
// PDF pentru o analiză servită. Cheia derivă din secretul serverului per scop,
// deci un bilet pentru un scop nu e valid pentru altul. Fără secret → refuz.

const enc = new TextEncoder();
// Acces prin globalThis: fișierul e importat și de testele aplicației (fără tipurile Deno).
const env = (k: string): string | undefined =>
  (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno?.env.get(k);

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

async function key(purpose: string): Promise<CryptoKey | null> {
  const secret = env("SIGNED_TICKET_SECRET") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return null;
  return crypto.subtle.importKey("raw", enc.encode(`${purpose}:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function sign(purpose: string, body: string): Promise<string | null> {
  const k = await key(purpose);
  if (!k) return null;
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(body))));
}

/** Bilet `<payload>.<semnătură>` cu expirare; `subject` leagă biletul de o resursă (opțional). */
export async function issueTicket(purpose: string, ttlMs: number, subject = ""): Promise<{ ticket: string; expiresAt: number } | null> {
  const expiresAt = Date.now() + ttlMs;
  const payload = b64url(enc.encode(JSON.stringify({ e: expiresAt, s: subject, n: crypto.randomUUID().slice(0, 8) })));
  const sig = await sign(purpose, payload);
  return sig ? { ticket: `${payload}.${sig}`, expiresAt } : null;
}

/** Valid doar dacă semnătura e corectă, nu a expirat și (când e dat) subiectul coincide. */
export async function verifyTicket(purpose: string, ticket: unknown, subject?: string): Promise<boolean> {
  if (typeof ticket !== "string" || ticket.length > 512) return false;
  const [payload, sig] = ticket.split(".");
  if (!payload || !sig) return false;
  const expected = await sign(purpose, payload);
  if (!expected || expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const data = JSON.parse(fromB64url(payload)) as { e?: number; s?: string };
    if (!(Number(data.e) > Date.now())) return false;
    if (subject !== undefined && data.s !== subject) return false;
    return true;
  } catch {
    return false;
  }
}
