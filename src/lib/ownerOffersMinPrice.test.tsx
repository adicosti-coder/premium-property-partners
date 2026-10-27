import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const table = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (name: string) => table(name),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import OwnerOffers from '@/components/owner/OwnerOffers';

const OFFERS = { A: [{ id: 'o1', amount_eur: 110000 }], B: [], C: [{ id: 'o2', amount_eur: 90000 }] };
const SETTINGS = { A: { min_price_eur: 120000 }, B: null, C: { min_price_eur: 95000 } };

const upserts: any[] = [];

const buildChain = (propertyId: string) => ({
  select: () => ({
    eq: (_col: string, id: string) => ({
      order: () => Promise.resolve({ data: OFFERS[id as keyof typeof OFFERS] ?? [], error: null }),
      maybeSingle: () => Promise.resolve({ data: SETTINGS[id as keyof typeof SETTINGS] ?? null, error: null }),
    }),
  }),
  upsert: (row: any) => {
    upserts.push(row);
    return Promise.resolve({ error: null });
  },
});

const renderOffers = (propertyId: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OwnerOffers propertyId={propertyId} />
    </QueryClientProvider>,
  );
};

afterEach(cleanup);

describe('Owner offers minimum price', () => {
  it('shows the saved minimum of the selected property', async () => {
    table.mockImplementation(buildChain);
    renderOffers('A');
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
  });

  it('clears the minimum when the next property has none saved', async () => {
    table.mockImplementation(buildChain);
    renderOffers('A');
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sub această sumă nu acceptați nicio ofertă (EUR)'), { target: { value: '999999' } });
    cleanup();
    renderOffers('B');
    await screen.findByText('Încă nu ați primit oferte.');
    expect(screen.getByLabelText('Sub această sumă nu acceptați nicio ofertă (EUR)')).toHaveValue('');
  });

  it('shows the next property own minimum instead of the previous one', async () => {
    table.mockImplementation(buildChain);
    renderOffers('A');
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
    cleanup();
    renderOffers('C');
    expect(await screen.findByDisplayValue('95000')).toBeInTheDocument();
  });

  it('never saves a minimum carried over from another property', async () => {
    upserts.length = 0;
    table.mockImplementation(buildChain);
    renderOffers('A');
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
    cleanup();
    renderOffers('B');
    await screen.findByText('Încă nu ați primit oferte.');
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(upserts).toHaveLength(0);
    expect(table('property_sale_settings')).toBeTruthy();
  });
});
