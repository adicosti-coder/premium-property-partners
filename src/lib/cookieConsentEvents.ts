/**
 * Shared cookie-consent event contract.
 *
 * Lives outside `CookieConsent.tsx` so that consumers (Footer, MobileCTABar)
 * can import the constants without pulling the banner component into their
 * bundle chunk.
 */

/** Fire this on window to reopen the preferences panel (e.g. from the footer). */
export const OPEN_COOKIE_PREFERENCES_EVENT = "realtrust:open-cookie-preferences";

/**
 * Broadcast whenever the banner shows/hides, so bottom-anchored UI
 * (e.g. the mobile sticky CTA bar) can step aside instead of overlapping it.
 */
export const COOKIE_BANNER_STATE_EVENT = "realtrust:cookie-banner-state";

const FLAG = "__rtCookieBannerVisible" as const;

type FlagWindow = Window & { [FLAG]?: boolean };

/** Called by the banner on every visibility change. */
export const setCookieBannerVisible = (visible: boolean) => {
  if (typeof window === "undefined") return;
  (window as FlagWindow)[FLAG] = visible;
  window.dispatchEvent(new CustomEvent(COOKIE_BANNER_STATE_EVENT, { detail: { visible } }));
};

/**
 * Late-mounted consumers (the sticky CTA bar is lazy-loaded after the first
 * interaction) read the current state instead of waiting for the next event.
 */
export const isCookieBannerVisible = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean((window as FlagWindow)[FLAG]);
};
