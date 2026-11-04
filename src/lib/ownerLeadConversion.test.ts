import { describe, expect, it, vi } from 'vitest';
const track = vi.hoisted(() => vi.fn());
vi.mock('./conversionTracking', () => ({ trackCriticalConversion: track, OWNER_FUNNEL_VALUE_EUR: { intent: 90, managementRequest: 550 } }));
import { trackSavedOwnerLead } from './ownerLeadConversion';
describe('saved owner lead', () => {
  it('emits one Lead even when both optional analyses are selected', () => {
    trackSavedOwnerLead({ source: 'owners_form', wantsYieldAnalysis: true, roiPrefill: true });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('Lead_Submit', expect.objectContaining({ wants_yield_analysis: true, roi_calculator_prefill: true }));
  });
});