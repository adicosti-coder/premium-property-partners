import { trackCriticalConversion, OWNER_FUNNEL_VALUE_EUR } from './conversionTracking';

/** Only call after persistence; one signal shared by GA4, Pixel and CAPI. */
export function trackSavedOwnerLead(input: { source: string; name?: string; phone?: string; email?: string; wantsYieldAnalysis?: boolean; roiPrefill?: boolean }) {
  trackCriticalConversion('Lead_Submit', {
    source: input.source,
    value: input.wantsYieldAnalysis ? OWNER_FUNNEL_VALUE_EUR.managementRequest : OWNER_FUNNEL_VALUE_EUR.intent,
    currency: 'EUR',
    name: input.name,
    phone: input.phone,
    email: input.email,
    wants_yield_analysis: Boolean(input.wantsYieldAnalysis),
    roi_calculator_prefill: Boolean(input.roiPrefill),
  });
}