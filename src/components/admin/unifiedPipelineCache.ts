/**
 * In-memory TTL cache for Unified Pipeline COUNT queries + dev mock error switch.
 * Extras din UnifiedPipelinePanel.tsx pentru a fi acoperit cu teste unitare.
 */

export const COUNT_CACHE_TTL_MS = 12_000;

type CacheEntry<T> = { at: number; value: T };
const countCache = new Map<string, CacheEntry<unknown>>();

export type CountCacheReadResult<T> =
  | { hit: true; value: T; ageMs: number }
  | { hit: false };

export function cacheGet<T>(key: string): T | undefined {
  const hit = countCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > COUNT_CACHE_TTL_MS) {
    countCache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheRead<T>(key: string): CountCacheReadResult<T> {
  const hit = countCache.get(key);
  if (!hit) return { hit: false };
  const age = Date.now() - hit.at;
  if (age > COUNT_CACHE_TTL_MS) {
    countCache.delete(key);
    return { hit: false };
  }
  return { hit: true, value: hit.value as T, ageMs: age };
}

export function cacheSet<T>(key: string, value: T): void {
  countCache.set(key, { at: Date.now(), value });
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const k of Array.from(countCache.keys())) {
    if (k.startsWith(prefix)) countCache.delete(k);
  }
}

export function cacheClearAll(): void {
  countCache.clear();
}

export function cacheSize(): number {
  return countCache.size;
}

// ────────────────────────────────────────────────────────────────
// Dev-only mock error switch — permite forțarea unui eșec pe un
// query de COUNT ca să validăm fallback-ul vizual "!" roșu.
// Activare din consolă:
//   window.__unifiedPipelineForceCountError = "observability"
//   window.__unifiedPipelineForceCountError = "prospects"
//   window.__unifiedPipelineForceCountError = "approval"
//   window.__unifiedPipelineForceCountError = "active"
//   delete window.__unifiedPipelineForceCountError
// ────────────────────────────────────────────────────────────────

export type CountQueryKind = "active" | "observability" | "prospects" | "approval";

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __unifiedPipelineForceCountError?: CountQueryKind | "all" | null;
  }
}

let testOverride: CountQueryKind | "all" | null = null;

/** Test-only helper: bypass window global (permite unit tests fără DOM). */
export function __setMockCountErrorForTests(v: CountQueryKind | "all" | null): void {
  testOverride = v;
}

// Hard-eliminate în producție: dublă poartă (Vite tree-shake pe DEV + NODE_ENV).
// În build-ul de producție ambele constante sunt inlined ca `false`, deci întregul
// bloc (inclusiv accesul la `window.__unifiedPipelineForceCountError`) e eliminat
// de bundler ca dead-code. Zero suprafață expusă utilizatorului final.
const __MOCK_SWITCH_ENABLED__ =
  import.meta.env.DEV && process.env.NODE_ENV !== "production";

export function shouldMockCountError(kind: CountQueryKind): boolean {
  if (testOverride) return testOverride === "all" || testOverride === kind;
  if (!__MOCK_SWITCH_ENABLED__) return false;
  if (typeof window === "undefined") return false;
  const flag = window.__unifiedPipelineForceCountError;
  return !!flag && (flag === "all" || flag === kind);
}

export class MockCountError extends Error {
  constructor(kind: CountQueryKind) {
    super(`[dev-mock] forced failure on "${kind}" count query`);
    this.name = "MockCountError";
  }
}
