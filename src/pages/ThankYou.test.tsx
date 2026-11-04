import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/conversionTracking', () => ({ trackConversion: track }));
vi.mock('@/components/SEOHead', () => ({ default: () => null }));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/thankyou/YieldReportDelivery', () => ({ default: () => null }));
import ThankYou from './ThankYou';
describe('confirmation visits', () => {
  it('does not create a lead conversion on a direct visit or remount', async () => {
    const view = render(<MemoryRouter initialEntries={['/multumire']}><ThankYou /></MemoryRouter>);
    await waitFor(() => expect(view.container.textContent).toContain('Mulțumim'));
    view.unmount();
    render(<MemoryRouter initialEntries={['/multumire']}><ThankYou /></MemoryRouter>);
    expect(track).not.toHaveBeenCalled();
  });
});