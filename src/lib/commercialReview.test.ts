import { describe, expect, it } from 'vitest';
import { annualIllustrativeGross, COMMERCIAL_REVIEW } from './commercialReview';
describe('commercial review safeguards', () => {
  it('does not choose a managed portfolio count', () => expect(COMMERCIAL_REVIEW.metrics.managedProperties.value).toBeNull());
  it('requires approval before activation', () => expect(COMMERCIAL_REVIEW.activation).toBe('pending_admin_confirmation'));
  it('reconciles the 480 EUR rent and 65 EUR ADR at 78% with 30-day months', () => {
    expect(annualIllustrativeGross({ monthlyRent: 480, adr: 65, occupancy: .78, daysPerMonth: 30 })).toEqual({ classicGross: 5760, hotelGross: 18252 });
  });
});