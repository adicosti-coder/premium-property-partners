// Classifies a Google Search Console URL Inspection result for alerting.
// Pure TypeScript (no Deno/Vite imports): shared by `seo-indexing-alerts`,
// `seo-alert-monitor` and the admin GSC widget, and unit-tested.
//
// Some non-PASS results are the canonical setup working as intended — e.g.
// `/anunturi?tranzactie=vanzare` declaring `/anunturi` as canonical, which
// Google reports as NEUTRAL "Alternate page with proper canonical tag".
// Those must never raise an indexing alert.

export type InspectionClass = "indexed" | "expected_canonical" | "issue";

export interface InspectionInput {
  url?: string | null;
  verdict?: string | null;
  coverageState?: string | null;
  googleCanonical?: string | null;
  userCanonical?: string | null;
}

/** Coverage states Google itself uses for a correctly canonicalized alternate. */
const EXPECTED_CANONICAL_STATES = [/^alternate page with proper canonical tag$/i];

/** Compares URLs ignoring a trailing slash, the host's case and a #fragment. */
export function normalizeInspectionUrl(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    const u = new URL(value);
    u.hash = "";
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return value.replace(/#.*$/, "").replace(/\/+$/, "");
  }
}

export function classifyInspection(input: InspectionInput): InspectionClass {
  const verdict = (input.verdict ?? "").toUpperCase();
  if (verdict === "PASS") return "indexed";

  const coverage = (input.coverageState ?? "").trim();
  if (EXPECTED_CANONICAL_STATES.some((re) => re.test(coverage))) return "expected_canonical";

  // NEUTRAL with a declared canonical pointing elsewhere that Google accepted.
  if (verdict === "NEUTRAL") {
    const url = normalizeInspectionUrl(input.url);
    const user = normalizeInspectionUrl(input.userCanonical);
    const google = normalizeInspectionUrl(input.googleCanonical);
    if (url && user && google && user !== url && google === user) return "expected_canonical";
  }
  return "issue";
}

/** Keeps only results that need attention (drops indexed + expected canonicals). */
export function realIndexingIssues<T extends InspectionInput>(items: T[] | null | undefined): T[] {
  return (items ?? []).filter((i) => classifyInspection(i) === "issue");
}
