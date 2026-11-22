/**
 * Bilet de sesiune pentru asistentul Andrei (`ai-chatbot-stream`): obținut o singură dată
 * prin verificarea anti-robot (`chat-session`), păstrat în sessionStorage până expiră
 * și trimis cu fiecare mesaj — modelul AI plătit nu răspunde fără o sesiune verificată.
 */
const KEY = "rt_chat_session_v1";
/** Biletul se reînnoiește cu un minut înainte de expirare. */
const MARGIN_MS = 60_000;

export function readChatToken(now = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { token?: unknown; exp?: unknown };
    if (typeof v.token !== "string" || !(Number(v.exp) - MARGIN_MS > now)) return null;
    return v.token;
  } catch {
    return null;
  }
}

export function storeChatToken(token: string, exp: number): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ token, exp })); } catch { /* fără stocare: se cere din nou */ }
}

export function clearChatToken(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignorat */ }
}

/** Răspunsul serverului când biletul lipsește sau a expirat. */
export const CHAT_VERIFICATION_STATUS = 401;
