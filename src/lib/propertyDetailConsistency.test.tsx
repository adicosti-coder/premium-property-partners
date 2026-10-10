import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { getPropertyInvestmentMetrics } from './propertyInvestmentMetrics';
import { getPropertyPois, resolvePropertyCoordinates } from '@/utils/propertyGeo';
import PropertyQuickFacts from '@/components/PropertyQuickFacts';
import PropertyPremiumSpecs from '@/components/PropertyPremiumSpecs';
import PropertyOfferBox from '@/components/PropertyOfferBox';

vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => ({ language: 'ro' }) }));
afterEach(cleanup);

describe('Property detail consistency', () => {
  it('rejects imported center placeholder for Iosefin', () => {
    expect(resolvePropertyCoordinates({ name: 'RT-154 Iosefin', location: 'Iosefin, Timișoara', latitude: 45.7537, longitude: 21.2246 })).toEqual([21.207, 45.747]);
  });
  it('keeps real listing GPS ahead of district references', () => {
    expect(resolvePropertyCoordinates({ location: 'Iosefin', latitude: 45.7462, longitude: 21.2052 })).toEqual([21.2052, 45.7462]);
  });
  it('recalculates proximity when listing GPS moves', () => {
    const atStation = getPropertyPois({ location: 'Iosefin', latitude: 45.749, longitude: 21.207 });
    const south = getPropertyPois({ location: 'Iosefin', latitude: 45.744, longitude: 21.207 });
    expect(atStation.find(p => p.name === 'Gara de Nord')?.minutes).toBe(1);
    expect(south.find(p => p.name === 'Gara de Nord')?.minutes).toBeGreaterThan(1);
  });
  it('derives ROI and annual rental multiplier from unrounded net income', () => {
    const metrics = getPropertyInvestmentMetrics(89000);
    expect(metrics?.monthlyNetMin).toBeCloseTo(482.083333);
    expect(metrics?.monthlyNetMax).toBeCloseTo(697.166667);
    expect(metrics?.yieldMin).toBeCloseTo(6.5);
    expect(metrics?.yieldMax).toBeCloseTo(9.4);
    expect(metrics?.multiplierMin).toBeCloseTo(10.638298);
    expect(metrics?.multiplierMax).toBeCloseTo(15.384615);
    expect(getPropertyInvestmentMetrics(0)).toBeNull();
    expect(getPropertyInvestmentMetrics(NaN)).toBeNull();
  });
  it('shows the same monthly income range in the offer', () => {
    render(<PropertyOfferBox name="Iosefin" price={89000} />);
    expect(screen.getByText(/482 €–697 €/)).toBeInTheDocument();
  });
  it('shows rooms and bedrooms separately in both summary and specifications', () => {
    render(<><PropertyQuickFacts name="Iosefin" rooms={2} bedrooms={1} /><PropertyPremiumSpecs specs={{ rooms: 2, bedrooms: 1 }} /></>);
    const summary = screen.getByRole('region', { name: 'Apartamentul pe scurt' });
    expect(within(summary).getByText('Camere (cu living)')).toBeInTheDocument();
    expect(within(summary).getByText('Dormitoare')).toBeInTheDocument();
    expect(screen.getByText('Camere (total, cu living)')).toBeInTheDocument();
    expect(screen.getByText('Dormitoare (doar pentru somn)')).toBeInTheDocument();
  });
});