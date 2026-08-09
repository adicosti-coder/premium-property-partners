// Shared HTTP retry helper for outbound alerts / provider APIs (Meta WhatsApp, webhooks).
// Retries only on transient failures: network errors, HTTP 429 and 5xx.
// Exponential backoff with jitter, honouring Retry-After when the provider sends it.

export interface RetryResult {
  ok: boolean;
  status: number;
  body: string;
  attempts: number;
  error?: string;
}

export interface RetryOptions {
  /** Total attempts, including the first one. Default 3. */
  maxAttempts?: number;
  /** Base delay in ms for the exponential backoff. Default 500. */
  baseDelayMs?: number;
  /** Upper bound for a single wait. Default 8000. */
  maxDelayMs?: number;
  /** Per-attempt timeout in ms. Default 10000. */
  timeoutMs?: number;
  /** Label used in logs. */
  label?: string;
  /** Max characters kept from the response body. Default 1000. Raise it when the
   *  caller needs to parse the full payload (e.g. AI gateway JSON responses). */
  maxBodyChars?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function backoffDelay(attempt: number, base: number, max: number): number {
  // attempt is 1-based: 500ms, 1000ms, 2000ms ... + up to 30% jitter
  const raw = base * Math.pow(2, attempt - 1);
  const jitter = raw * 0.3 * Math.random();
  return Math.min(max, Math.round(raw + jitter));
}

function retryAfterMs(res: Response): number | null {
  const h = res.headers.get("retry-after");
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.min(30_000, Math.max(0, secs * 1000));
  const when = Date.parse(h);
  if (!Number.isNaN(when)) return Math.min(30_000, Math.max(0, when - Date.now()));
  return null;
}

/**
 * fetch() with exponential backoff on 429 / 5xx / network errors.
 * Never throws — always resolves with a RetryResult.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {},
): Promise<RetryResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const label = opts.label ?? "fetchWithRetry";
  const maxBodyChars = opts.maxBodyChars ?? 1000;

  let lastStatus = 0;
  let lastBody = "";
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      lastStatus = res.status;
      lastBody = (await res.text().catch(() => "")).slice(0, maxBodyChars);

      if (res.ok) {
        return { ok: true, status: res.status, body: lastBody, attempts: attempt };
      }

      if (!isRetryableStatus(res.status) || attempt === maxAttempts) {
        console.error(`[${label}] failed [${res.status}] attempt ${attempt}/${maxAttempts}: ${lastBody}`);
        return {
          ok: false,
          status: res.status,
          body: lastBody,
          attempts: attempt,
          error: `http_${res.status}`,
        };
      }

      const wait = retryAfterMs(res) ?? backoffDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(`[${label}] transient ${res.status} — retry ${attempt + 1}/${maxAttempts} in ${wait}ms`);
      await sleep(wait);
    } catch (e) {
      clearTimeout(timer);
      lastError = String(e);
      if (attempt === maxAttempts) {
        console.error(`[${label}] network error attempt ${attempt}/${maxAttempts}: ${lastError}`);
        return { ok: false, status: 0, body: "", attempts: attempt, error: lastError };
      }
      const wait = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(`[${label}] network error — retry ${attempt + 1}/${maxAttempts} in ${wait}ms: ${lastError}`);
      await sleep(wait);
    }
  }

  return { ok: false, status: lastStatus, body: lastBody, attempts: maxAttempts, error: lastError };
}
