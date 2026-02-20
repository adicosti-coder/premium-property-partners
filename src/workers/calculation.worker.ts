/**
 * calculation.worker.ts
 * Runs heavy ROI/profit number-crunching off the main thread.
 * Import via: new Worker(new URL('./calculation.worker.ts', import.meta.url), { type: 'module' })
 */

export type CalcRequest =
  | { type: 'roi'; payload: RoiPayload }
  | { type: 'profit'; payload: ProfitPayload };

export interface RoiPayload {
  purchasePrice: number;
  monthlyRevenue: number;
  managementFee: number; // percent 0-1
  occupancyRate: number; // percent 0-1
  nights: number;
  nightlyRate: number;
  cleaningCost: number;
  platformFee: number; // percent 0-1
}

export interface ProfitPayload {
  area: number;
  location: string;
  nighlyRate: number;
  occupancy: number;
  managementFee: number;
  platformFee: number;
  cleaningCostPerStay: number;
  avgStayDuration: number;
  monthlyFixedCosts: number;
}

export interface CalcResult {
  type: string;
  result: Record<string, number>;
}

self.onmessage = (e: MessageEvent<CalcRequest>) => {
  const { type, payload } = e.data;

  if (type === 'roi') {
    const p = payload as RoiPayload;
    const staysPerMonth = (p.occupancyRate * p.nights) / (p.nights || 3);
    const grossRevenue = p.nightlyRate * p.occupancyRate * 30;
    const platformCut = grossRevenue * p.platformFee;
    const cleaningTotal = staysPerMonth * p.cleaningCost;
    const managementCut = (grossRevenue - platformCut) * p.managementFee;
    const netMonthly = grossRevenue - platformCut - cleaningTotal - managementCut;
    const netYearly = netMonthly * 12;
    const roiPercent = p.purchasePrice > 0 ? (netYearly / p.purchasePrice) * 100 : 0;

    self.postMessage({
      type: 'roi',
      result: { grossRevenue, netMonthly, netYearly, roiPercent },
    } as CalcResult);
    return;
  }

  if (type === 'profit') {
    const p = payload as ProfitPayload;
    const staysPerMonth = 30 / (p.avgStayDuration || 3);
    const daysOccupied = 30 * p.occupancy;
    const grossRevenue = p.nighlyRate * daysOccupied;
    const platformCut = grossRevenue * (p.platformFee / 100);
    const cleaningTotal = staysPerMonth * p.cleaningCostPerStay * p.occupancy;
    const netBeforeMgmt = grossRevenue - platformCut - cleaningTotal - p.monthlyFixedCosts;
    const managementCut = netBeforeMgmt > 0 ? netBeforeMgmt * (p.managementFee / 100) : 0;
    const netMonthly = netBeforeMgmt - managementCut;

    self.postMessage({
      type: 'profit',
      result: {
        grossRevenue,
        platformCut,
        cleaningTotal,
        managementCut,
        netMonthly,
        netYearly: netMonthly * 12,
      },
    } as CalcResult);
    return;
  }
};
