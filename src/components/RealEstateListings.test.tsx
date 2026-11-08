import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rows = Array.from({ length: 7 }, (_, i) => ({
  id: `p${i}`, slug: `p${i}`, name: `Apartament ${i}`, location: "Timișoara", listing_type: "vanzare",
  capital_necesar: 100000, image_path: null, images: null, size: 50, bedrooms: 1, property_images: [],
}));
vi.mock("@/lib/supabaseRetry", () => ({ fetchWithRetry: async () => ({ data: rows, error: null }) }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/components/ViewingRequestModal", () => ({ default: () => null }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ro" }) }));

import RealEstateListings, { allListingsHref } from "./RealEstateListings";

describe("homepage listings section", () => {
  it("shows at most 4 cards and links to /anunturi", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><RealEstateListings limit={4} compact /></MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText("Apartament 0");
    expect(screen.getAllByText(/^Apartament \d$/)).toHaveLength(4);
    expect(screen.getByRole("link", { name: /Vezi toate anunțurile imobiliare/ })).toHaveAttribute("href", "/anunturi");
  });
  it("rent tab links to filtered listings", () => {
    expect(allListingsHref("inchiriere")).toBe("/anunturi?tranzactie=inchiriere");
  });
});
