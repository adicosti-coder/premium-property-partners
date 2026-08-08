/**
 * Idempotency keys for form submissions.
 *
 * A key is generated once per submit *attempt* and kept in `sessionStorage`, so a
 * double-click, a retry after a network hiccup or two parallel tabs replaying the
 * same attempt all carry the same key. The edge function stores the key for 30s
 * and returns the cached result instead of inserting a second lead.
 *
 * Call `clearIdempotencyKey(scope)` once a submission definitively succeeded (or
 * the user edits the form for a genuinely new submission) so the next attempt
 * gets a fresh key.
 */

const PREFIX = "rt_idem:";

const uuid = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to manual generation */
  }
  // RFC4122-ish fallback for older/embedded browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const safeSession = (): Storage | null => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
};

/** Returns the current attempt key for `scope`, creating it if missing. */
export const getIdempotencyKey = (scope: string): string => {
  const store = safeSession();
  const storageKey = `${PREFIX}${scope}`;
  if (!store) return uuid();
  const existing = store.getItem(storageKey);
  if (existing) return existing;
  const key = uuid();
  try {
    store.setItem(storageKey, key);
  } catch {
    /* private mode / quota — the in-memory key still de-dupes this request */
  }
  return key;
};

/** Drops the stored key so the next submit attempt is treated as new. */
export const clearIdempotencyKey = (scope: string): void => {
  try {
    safeSession()?.removeItem(`${PREFIX}${scope}`);
  } catch {
    /* noop */
  }
};

/** Header helper: `{ "x-idempotency-key": "..." }`. */
export const idempotencyHeaders = (scope: string): Record<string, string> => ({
  "x-idempotency-key": getIdempotencyKey(scope),
});
