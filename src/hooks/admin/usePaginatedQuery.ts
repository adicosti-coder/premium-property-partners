import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type PageSize = 25 | 50 | 100;

interface Options<Row> {
  /** Stable key for React Query; changes trigger a refetch */
  queryKey: readonly unknown[];
  table: string;
  /** Explicit column list — NEVER "*" */
  columns: string;
  page: number;                                // 0-indexed
  pageSize: PageSize;
  order?: { column: string; ascending?: boolean };
  /** Optional builder for extra filters (`.eq`, `.ilike`, `.in`, etc.) */
  applyFilters?: (q: any) => any;
  enabled?: boolean;
  /** Cast Supabase row shape */
  cast?: (row: any) => Row;
}

export interface PaginatedResult<Row> {
  rows: Row[];
  total: number;
  page: number;
  pageSize: PageSize;
  pageCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePaginatedQuery<Row = any>(opts: Options<Row>): PaginatedResult<Row> {
  const { queryKey, table, columns, page, pageSize, order, applyFilters, enabled = true, cast } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const q = useQuery({
    queryKey: [...queryKey, table, columns, page, pageSize, order?.column, order?.ascending],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = (supabase.from(table as any) as any)
        .select(columns, { count: "exact" })
        .range(from, to);
      if (order) query = query.order(order.column, { ascending: order.ascending ?? false });
      if (applyFilters) query = applyFilters(query);
      const { data, error, count } = await query;
      if (error) throw error;
      return {
        rows: (cast ? (data ?? []).map(cast) : (data ?? [])) as Row[],
        total: count ?? 0,
      };
    },
  });

  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    error: (q.error as Error) ?? null,
    refetch: () => q.refetch(),
  };
}
