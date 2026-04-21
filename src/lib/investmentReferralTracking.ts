/**
 * Investment Article Referral Tracking
 * ------------------------------------
 * When a visitor lands on or navigates from the pillar article
 * /blog/ghid-investitii-imobiliare-timisoara-2026, we tag their session
 * so that ANY contact / lead form submitted afterwards carries:
 *   simulation_data.provenienta = "articol_investitii_2026"
 *
 * This is the single source of truth for that tracking tag.
 */

const STORAGE_KEY = "provenienta_tracking_v1";
export const INVESTMENT_ARTICLE_TAG = "articol_investitii_2026";
export const INVESTMENT_ARTICLE_SLUG = "ghid-investitii-imobiliare-timisoara-2026";

/** Mark the current session as originating from the investment article. */
export function markInvestmentArticleVisit() {
  try {
    sessionStorage.setItem(STORAGE_KEY, INVESTMENT_ARTICLE_TAG);
  } catch {
    /* ignore storage errors */
  }
}

/** Returns the tracking tag if the visitor came from the investment article. */
export function getProvenientaTag(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Merge the provenienta tracking tag into a lead's simulation_data payload.
 * Safe to call for every form — no-op if the visitor hasn't been tagged.
 */
export function withProvenientaTracking<T extends Record<string, unknown> | null | undefined>(
  simulationData: T,
): Record<string, unknown> | T {
  const tag = getProvenientaTag();
  if (!tag) return simulationData;
  return {
    ...(simulationData ?? {}),
    provenienta: tag,
  };
}
