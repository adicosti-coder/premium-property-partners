/** Official commercial rules; operating-cost inputs remain explicit estimates. */
export const MANAGEMENT_POLICY = {
  commissionMin: 0.15,
  commissionMax: 0.20,
  occupancyDefault: 0.70,
  occupancyMin: 0.65,
  occupancyMax: 0.75,
  contractMonths: 12,
  trialDays: 90,
  noticeDays: 30,
  yieldMin: 0.065,
  yieldMax: 0.094,
  activeStaysFallback: 13,
} as const;

export function calculateManagedIncome(input: {
  gross: number;
  channelFees: number;
  utilities: number;
  commissionRate?: number;
  cleaningFromGross?: number;
  otherCosts?: number;
}) {
  const positive = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
  const gross = positive(input.gross);
  const channelFees = positive(input.channelFees);
  const utilities = positive(input.utilities);
  const requested = input.commissionRate ?? MANAGEMENT_POLICY.commissionMax;
  const commissionRate = Math.min(MANAGEMENT_POLICY.commissionMax, Math.max(MANAGEMENT_POLICY.commissionMin, Number.isFinite(requested) ? requested : MANAGEMENT_POLICY.commissionMax));
  const commissionBase = Math.max(0, gross - channelFees - utilities);
  const managementFee = commissionBase * commissionRate;
  const cleaningFromGross = positive(input.cleaningFromGross ?? 0);
  const ownerIncome = gross - channelFees - utilities - managementFee - cleaningFromGross - positive(input.otherCosts ?? 0);
  return { gross, channelFees, utilities, commissionBase, commissionRate, managementFee, cleaningFromGross, ownerIncome };
}