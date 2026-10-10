/** Estimated net income, not guaranteed revenue; retain precision until display. */
export function getPropertyInvestmentMetrics(price?: number | null) {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  const annualNetMin = price * 0.065;
  const annualNetMax = price * 0.094;
  return {
    annualNetMin,
    annualNetMax,
    monthlyNetMin: annualNetMin / 12,
    monthlyNetMax: annualNetMax / 12,
    yieldMin: annualNetMin / price * 100,
    yieldMax: annualNetMax / price * 100,
    multiplierMin: price / annualNetMax,
    multiplierMax: price / annualNetMin,
  };
}