import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const table = vi.fn();
const upserts: any[] = [];

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: (name: string) => table(name) },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import OwnerOffers from '@/components/owner/OwnerOffers';

const OFFERS: Record<string, any[]> = {
  A: [{ id: 'o1', amount_eur: 110000 }],
  B: [],
  C: [{ id: 'o2', amount_eur: 90000 }],
};
const SETTINGS: Record<string, any> = {
  A: { min_price_eur: 120000 },
  B: null,
  C: { min_price_eur: 95000 },
};

const buildChain = () => ({
  select: () => ({
    eq: (_col: string, id: string) => ({
      order: () => Promise.resolve({ data: OFFERS[id] ?? [], error: null }),
      maybeSingle: () => Promise.resolve({ data: SETTINGS[id] ?? null, error: null }),
    }),
  }),
  upsert: (row: any) => {
    upserts.push(row);
    return Promise.resolve({ error: null });
  },
});

const LABEL = 'Sub această sumă nu acceptați nicio ofertă (EUR)';

// The dashboard keeps the panel mounted and only swaps the propertyId prop,
// so the test must switch properties inside one mounted instance.
const Harness = ({ start }: { start: string }) => {
  const [id, setId] = useState(start);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <button onClick={() => setId('B')}>select B</button>
      <button onClick={() => setId('C')}>select C</button>
      <OwnerOffers propertyId={id} />
    </QueryClientProvider>
  );
};

afterEach(cleanup);

describe('Owner offers minimum price', () => {
  it('shows the saved minimum of the selected property', async () => {
    table.mockImplementation(buildChain);
    render(<Harness start="A" />);
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
  });

  it('clears the minimum when the next property has none saved', async () => {
    table.mockImplementation(buildChain);
    render(<Harness start="A" />);
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'select B' }));
    await screen.findByText(/nu ați primit oferte/);
    expect(screen.getByLabelText(LABEL)).toHaveValue('');
  });

  it('shows the next property own minimum instead of the previous one', async () => {
    table.mockImplementation(buildChain);
    render(<Harness start="A" />);
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'select C' }));
    expect(await screen.findByDisplayValue('95000')).toBeInTheDocument();
  });

  it('never saves a minimum carried over from another property', async () => {
    upserts.length = 0;
    table.mockImplementation(buildChain);
    render(<Harness start="A" />);
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'select B' }));
    await screen.findByText(/nu ați primit oferte/);
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(upserts).toHaveLength(0);
  });
});
