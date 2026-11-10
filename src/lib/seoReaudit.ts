import { auditUrlVariants, canonicalAuditPath, isLegacyAuditPath } from "../../supabase/functions/_shared/seoAuditTarget";

export { canonicalAuditPath, isLegacyAuditPath };

/** Client wait before falling back to the saved audit (the server needs up to ~90s). */
export const REAUDIT_CLIENT_TIMEOUT_MS = 75_000;
/** Pause between sequential re-audits in bulk runs ("Aplică toate"). */
export const REAUDIT_GAP_MS = 1_500;
/** How far back a saved audit still counts as the result of this request. */
export const REAUDIT_RECOVERY_SKEW_MS = 10_000;
export const REAUDIT_POLL_ATTEMPTS = 6;
export const REAUDIT_POLL_INTERVAL_MS = 5_000;

export interface SavedAudit {
  id?: string;
  url: string;
  overall_score: number | null;
  created_at: string;
  [key: string]: unknown;
}

export interface ReauditResult {
  audit: SavedAudit | null;
  score: number | null;
  /** True when the score was read from the database after a timeout/disconnect. */
  recovered: boolean;
}

const errStatus = (e: any): number | undefined => e?.context?.status ?? e?.status;

/**
 * Errors after which the audit may still have finished server-side:
 * client timeout/abort, network drop, gateway timeouts, or an audit already
 * running for the URL (409 inflight).
 */
export function isRecoverableAuditError(e: any): boolean {
  if (!e) return false;
  const status = errStatus(e);
  if (status === 408 || status === 409 || status === 502 || status === 504 || status === 546) return true;
  const name = String(e?.name || "");
  if (/AbortError|TimeoutError|FunctionsFetchError|FunctionsRelayError/i.test(name)) return true;
  const msg = String(e?.message || e || "");
  return /timeout|timed out|aborted|failed to fetch|network|load failed|failed to send a request|inflight|already running/i.test(msg);
}

export interface ReauditDeps {
  invoke: (url: string, language: string) => Promise<{ data: any; error: any }>;
  findRecent: (path: string, language: string, sinceIso: string) => Promise<SavedAudit | null>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  pollAttempts?: number;
  pollIntervalMs?: number;
}

/**
 * Re-audits one page. When the call times out or the connection drops, the
 * newest audit saved for that page since the request started is used instead
 * of reporting a false failure.
 */
export async function reauditWithRecovery(
  path: string,
  language: string,
  host: string,
  deps: ReauditDeps,
): Promise<ReauditResult> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const target = canonicalAuditPath(path);
  const sinceIso = new Date(now() - REAUDIT_RECOVERY_SKEW_MS).toISOString();

  let failure: any = null;
  try {
    const { data, error } = await deps.invoke(`https://${host}${target}`, language || "ro");
    if (error) throw error;
    if (data?.error) {
      const e: any = new Error(String(data.error));
      if (data?.inflight) e.status = 409;
      throw e;
    }
    const audit = (data?.audit ?? null) as SavedAudit | null;
    const score = audit?.overall_score ?? data?.overall_score ?? null;
    return { audit, score, recovered: false };
  } catch (e) {
    failure = e;
  }

  if (!isRecoverableAuditError(failure)) throw failure;

  const attempts = deps.pollAttempts ?? REAUDIT_POLL_ATTEMPTS;
  const interval = deps.pollIntervalMs ?? REAUDIT_POLL_INTERVAL_MS;
  for (let i = 0; i < attempts; i++) {
    const saved = await deps.findRecent(target, language || "ro", sinceIso).catch(() => null);
    if (saved) return { audit: saved, score: saved.overall_score ?? null, recovered: true };
    if (i < attempts - 1) await sleep(interval);
  }
  throw failure;
}

/** Supabase-backed dependencies used by the admin SEO panels. */
export function supabaseReauditDeps(client: any, timeoutMs = REAUDIT_CLIENT_TIMEOUT_MS): ReauditDeps {
  return {
    invoke: (url, language) =>
      client.functions.invoke("seo-ai-optimizer", {
        body: { url, language, forceRefresh: true },
        timeout: timeoutMs,
      }),
    findRecent: async (path, language, sinceIso) => {
      const { data, error } = await client
        .from("seo_audits")
        .select("*")
        .in("url", auditUrlVariants(path))
        .eq("language", language)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as SavedAudit | null) ?? null;
    },
  };
}

/** Runs items one after another with a short pause between them. */
export async function runSequential<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  opts: { gapMs?: number; shouldStop?: () => boolean; sleep?: (ms: number) => Promise<void> } = {},
): Promise<void> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let i = 0; i < items.length; i++) {
    if (opts.shouldStop?.()) return;
    await worker(items[i], i);
    if (i < items.length - 1 && (opts.gapMs ?? 0) > 0) await sleep(opts.gapMs!);
  }
}
