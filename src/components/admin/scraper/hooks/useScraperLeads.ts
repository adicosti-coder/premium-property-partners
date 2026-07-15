import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { usePaginatedQuery, type PageSize } from "@/hooks/admin/usePaginatedQuery";

// NOTE: explicit column list — never "*". String const so select-type parsing
// runs once (see query-builder-type-performance).
const FOUND_LISTING_COLUMNS =
  "id, title, source_platform, source_url, zone, price, currency, rooms, size, contact_phone, contact_name, lead_score, is_active, created_at";

export interface FoundListing {
  id: string;
  title: string | null;
  source_platform: string | null;
  source_url: string | null;
  zone: string | null;
  price: number | null;
  currency: string | null;
  rooms: number | null;
  size: number | null;
  contact_phone: string | null;
  contact_name: string | null;
  lead_score: number | null;
  is_active: boolean;
  created_at: string;
}

export type FoundStatusFilter = "all" | "active" | "inactive";
export type FoundWindow = "24h" | "7d" | "30d";

export interface UseScraperLeadsOptions {
  page: number;
  pageSize: PageSize;
  window: FoundWindow;
  search: string;
  status: FoundStatusFilter;
  source: string; // "all" or specific source_platform
}

export function windowSinceIso(w: FoundWindow): string {
  const ms = w === "24h" ? 86_400_000 : w === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}

/**
 * Paginated server-side query over `prospect_listings` (the scraper "found
 * listings" feed — mapped to `scraper_leads_archive_2026` in the audit plan).
 * Sort is `created_at desc` — `updated_at` doesn't exist on this table.
 */
export function useScraperLeads(opts: UseScraperLeadsOptions) {
  const { page, pageSize, window: w, search, status, source } = opts;
  const trimmedSearch = search.trim();
  const since = useMemo(() => windowSinceIso(w), [w]);

  const applyFilters = useCallback(
    (q: any) => {
      q = q.gte("created_at", since);
      if (status === "active") q = q.eq("is_active", true);
      else if (status === "inactive") q = q.eq("is_active", false);
      if (source && source !== "all") q = q.eq("source_platform", source);
      if (trimmedSearch) {
        const like = `%${trimmedSearch.replace(/[%_]/g, "\\$&")}%`;
        q = q.or(
          `title.ilike.${like},zone.ilike.${like},source_platform.ilike.${like},contact_phone.ilike.${like}`,
        );
      }
      return q;
    },
    [since, status, source, trimmedSearch],
  );

  const paged = usePaginatedQuery<FoundListing>({
    queryKey: ["scraper-found-listings", w, status, source, trimmedSearch],
    table: "prospect_listings",
    columns: FOUND_LISTING_COLUMNS,
    page,
    pageSize,
    order: { column: "created_at", ascending: false },
    applyFilters,
  });

  // Aggregate totals for the summary cards — scoped to the same time window
  // but ignore search/status/source filters so the cards stay stable.
  const totalsQuery = useQuery({
    queryKey: ["scraper-found-totals", w],
    queryFn: async () => {
      const base = () =>
        (supabase.from("prospect_listings") as any)
          .select("id", { count: "exact", head: true })
          .gte("created_at", since);
      const [tot, act, prio] = await Promise.all([
        base(),
        base().eq("is_active", true),
        base().gte("lead_score", 70),
      ]);
      if (tot.error) throw tot.error;
      if (act.error) throw act.error;
      if (prio.error) throw prio.error;
      return { total: tot.count ?? 0, active: act.count ?? 0, priority: prio.count ?? 0 };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Distinct sources in the window — used to populate the source dropdown.
  const sourcesQuery = useQuery({
    queryKey: ["scraper-found-sources", w],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("source_platform")
        .gte("created_at", since)
        .not("source_platform", "is", null)
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.source_platform && set.add(r.source_platform));
      return Array.from(set).sort();
    },
  });

  return {
    rows: paged.rows,
    total: paged.total,
    pageCount: paged.pageCount,
    isLoading: paged.isLoading,
    isFetching: paged.isFetching,
    error: paged.error,
    refetch: paged.refetch,
    totals: totalsQuery.data ?? { total: 0, active: 0, priority: 0 },
    sources: sourcesQuery.data ?? [],
  };
}
