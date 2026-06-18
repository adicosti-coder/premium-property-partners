/**
 * Tiny retry helper for transient Supabase/network failures.
 *
 * Use for *read-only* public queries from page components. Mutations
 * (insert/update/delete/upsert) should NOT use this — retrying a write
 * after an ambiguous error can double-write.
 *
 * Strategy: exponential backoff with jitter, capped attempts.
 *   attempt 1 → immediate
 *   attempt 2 → ~250ms
 *   attempt 3 → ~750ms
 *   attempt 4 → ~1750ms
 *
 * Only retries on transient signals:
 *   - thrown network errors (TypeError "Failed to fetch", AbortError)
 *   - PostgREST/Supabase responses with HTTP 5xx or 408/429
 *   - PostgREST error code starting with "PGRST" + HTTP >= 500
 *
 * 4xx (RLS, validation, not found) fails fast — no retry.
 */

export type SupabaseLike<T> = { data: T | null; error: { message?: string; code?: string; status?: number } | null };

interface RetryOpts {
  retries?: number;       // total attempts including the first (default 3)
  baseDelayMs?: number;   // backoff base (default 250)
  maxDelayMs?: number;    // cap per-attempt sleep (default 2000)
}

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

const isTransientError = (err: unknown): boolean => {
  if (!err) return false;
  if (err instanceof TypeError) return true; // network "Failed to fetch"
  const e = err as { name?: string; message?: string; status?: number; code?: string };
  if (e.name === "AbortError") return false;
  if (typeof e.status === "number" && TRANSIENT_HTTP.has(e.status)) return true;
  if (e.code === "ETIMEDOUT" || e.code === "ECONNRESET") return true;
  const msg = (e.message || "").toLowerCase();
  return msg.includes("fetch failed") || msg.includes("network") || msg.includes("timeout");
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Wrap a Supabase query builder factory (must return a Thenable each call,
 * because PostgrestBuilders are one-shot).
 */
export async function fetchWithRetry<T>(
  build: () => PromiseLike<SupabaseLike<T>>,
  opts: RetryOpts = {},
): Promise<SupabaseLike<T>> {
  const retries = Math.max(1, opts.retries ?? 3);
  const base = opts.baseDelayMs ?? 250;
  const max = opts.maxDelayMs ?? 2000;

  let lastErr: SupabaseLike<T>["error"] | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await build();
      if (!res.error) return res;
      lastErr = res.error;
      const status = (res.error as { status?: number }).status;
      const transient = isTransientError(res.error) || (typeof status === "number" && TRANSIENT_HTTP.has(status));
      if (!transient || attempt === retries) return res;
    } catch (thrown) {
      lastErr = thrown as SupabaseLike<T>["error"];
      if (!isTransientError(thrown) || attempt === retries) {
        return { data: null, error: lastErr };
      }
    }
    const jitter = Math.floor(Math.random() * 100);
    const delay = Math.min(max, base * Math.pow(3, attempt - 1)) + jitter;
    await sleep(delay);
  }
  return { data: null, error: lastErr };
}
