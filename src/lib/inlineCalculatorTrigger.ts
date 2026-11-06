export const INLINE_CALC_EVENT = "open-inline-calculator";

let pending = false;

/** Explicit visitor request: always opens, even if the popup has not loaded yet. */
export function requestInlineCalculator() {
  pending = true;
  window.dispatchEvent(new CustomEvent(INLINE_CALC_EVENT, { detail: { force: true } }));
}

/** Popup calls this on mount to honour a click made before it loaded. */
export function consumePendingInlineCalculator(): boolean {
  const was = pending;
  pending = false;
  return was;
}

/** Ten-year cumulative net income per year, for the mini chart. */
export function tenYearSeries(annualNet: number): number[] {
  return Array.from({ length: 10 }, (_, i) => Math.round(annualNet * (i + 1)));
}
