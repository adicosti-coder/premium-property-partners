import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScrapedListingsTriage from "./ScrapedListingsTriage";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: mocks.rpc, functions: { invoke: mocks.invoke } } }));

const listing = {
  id: "private-override-test", source_platform: "publi24",
  source_url: "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/apartamente-2-camere/anunt/proprietar/123456.html",
  title: "Proprietar vând apartament 2 camere", description: "Apartament în Timișoara",
  zone: "Sagului", rooms: 2, size: 50, price: 85000, category: "vanzare",
  contact_phone: "+40722123456", phone_normalized: "+40722123456",
  seller_type: "agency", lead_score: 58, is_active: true, lifecycle_status: "new", tags: [],
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false }, mutations: { retry: false } } });
  client.setQueryData(["scraped-listings-triage"], [listing]);
  render(<QueryClientProvider client={client}><ScrapedListingsTriage /></QueryClientProvider>);
  return client;
}

describe("Triage private override confirmation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirms directly from the separate dialog with agency override and updates eligibility without sending", async () => {
    mocks.rpc.mockResolvedValue({ data: { listing: { ...listing, seller_type: "privat", lead_score: 75, agency_suspicion_score: 0 } }, error: null });
    const client = setup();
    fireEvent.click(screen.getByRole("button", { name: "Nu e agenție? Confirmă privat, cu verificare separată" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmă privat" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("admin_confirm_prospect_private", { p_id: listing.id, p_override_agency: true }));
    await waitFor(() => expect(client.getQueryData<typeof listing[]>(["scraped-listings-triage"])?.[0].seller_type).toBe("privat"));
    expect(screen.getByRole("button", { name: "Trimite către Andrei (WhatsApp)" })).toBeEnabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("prevents a second confirmation while saving and allows retry after failure", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.rpc.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Nu e agenție? Confirmă privat, cu verificare separată" }));
    const confirm = within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmă privat" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    finish?.({ data: null, error: new Error("Temporary failure") });
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});