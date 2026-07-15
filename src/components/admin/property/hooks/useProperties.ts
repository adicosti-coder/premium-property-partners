import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { usePaginatedQuery, type PageSize } from "@/hooks/admin/usePaginatedQuery";

// NOTE: explicit column list — never "*". Cast as `string` at usage to skip
// deep select-string type parsing (see query-builder-type-performance).
const PROPERTY_COLUMNS = [
  "id",
  "name",
  "location",
  "latitude",
  "longitude",
  "description_ro",
  "description_en",
  "features",
  "booking_url",
  "tag",
  "image_path",
  "is_active",
  "display_order",
  "created_at",
  "updated_at",
  "status_operativ",
  "estimated_revenue",
  "roi_percentage",
  "capital_necesar",
  "listing_type",
  "booking_rating",
  "booking_review_count",
  "base_price_per_night",
  "weekend_price_per_night",
  "source_url",
  "source_platform",
  "capacity",
  "bedrooms",
].join(", ");

export interface PropertyRow {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  display_order: number;
  listing_type: string | null;
  tag: string | null;
  base_price_per_night: number | null;
  capacity: number | null;
  bedrooms: number | null;
  capital_necesar: number | null;
  roi_percentage: string | null;
  source_url: string | null;
  source_platform: string | null;
  updated_at: string;
  // hydrated from property_contact_details
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export type PropertyStatusFilter = "all" | "active" | "inactive";

export interface UsePropertiesOptions {
  page: number;
  pageSize: PageSize;
  search: string;
  listingType: string; // "all" or specific
  status: PropertyStatusFilter;
}

export function useProperties(opts: UsePropertiesOptions) {
  const { page, pageSize, search, listingType, status } = opts;
  const trimmedSearch = search.trim();
  const qc = useQueryClient();

  const applyFilters = useCallback(
    (q: any) => {
      // Preserve legacy base filter: PropertyManager historically excluded pure "cazare" rows
      // (those live in a separate cazare-focused tab).
      q = q.neq("listing_type", "cazare");

      if (listingType && listingType !== "all") q = q.eq("listing_type", listingType);
      if (status === "active") q = q.eq("is_active", true);
      else if (status === "inactive") q = q.eq("is_active", false);

      if (trimmedSearch) {
        const like = `%${trimmedSearch.replace(/[%_]/g, "\\$&")}%`;
        // NOTE: contact_name / contact_phone live in property_contact_details
        // and are NOT part of this server-side search (see summary).
        q = q.or(
          `name.ilike.${like},location.ilike.${like},tag.ilike.${like},source_url.ilike.${like},source_platform.ilike.${like}`,
        );
      }
      return q;
    },
    [listingType, status, trimmedSearch],
  );

  const paged = usePaginatedQuery<PropertyRow>({
    queryKey: ["admin-properties", listingType, status, trimmedSearch],
    table: "properties",
    columns: PROPERTY_COLUMNS,
    page,
    pageSize,
    order: { column: "updated_at", ascending: false },
    applyFilters,
  });

  // Bulk-hydrate contacts for the current page only.
  const ids = useMemo(() => paged.rows.map((r) => r.id).sort(), [paged.rows]);
  const idsKey = ids.join(",");

  const contactsQuery = useQuery({
    queryKey: ["admin-properties-contacts", idsKey],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_contact_details" as any)
        .select("property_id, contact_name, contact_phone, contact_email")
        .in("property_id", ids as never);
      if (error) throw error;
      const map: Record<string, Pick<PropertyRow, "contact_name" | "contact_phone" | "contact_email">> = {};
      for (const r of ((data as unknown) as any[]) ?? []) {
        map[r.property_id] = {
          contact_name: r.contact_name,
          contact_phone: r.contact_phone,
          contact_email: r.contact_email,
        };
      }
      return map;
    },
  });

  const rows: PropertyRow[] = useMemo(() => {
    const contacts = contactsQuery.data ?? {};
    return paged.rows.map((r) => ({ ...r, ...(contacts[r.id] ?? {}) }));
  }, [paged.rows, contactsQuery.data]);

  // Lightweight aggregate counts for the header stats cards.
  const statsQuery = useQuery({
    queryKey: ["admin-properties-stats"],
    queryFn: async () => {
      const base = () =>
        (supabase.from("properties") as any).select("id", { count: "exact", head: true }).neq(
          "listing_type",
          "cazare",
        );
      const [totalRes, activeRes, inactiveRes] = await Promise.all([
        base(),
        base().eq("is_active", true),
        base().eq("is_active", false),
      ]);
      if (totalRes.error) throw totalRes.error;
      if (activeRes.error) throw activeRes.error;
      if (inactiveRes.error) throw inactiveRes.error;
      return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        inactive: inactiveRes.count ?? 0,
      };
    },
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-properties"] });
    qc.invalidateQueries({ queryKey: ["admin-properties-contacts"] });
    qc.invalidateQueries({ queryKey: ["admin-properties-stats"] });
  }, [qc]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (p: Pick<PropertyRow, "id" | "is_active">) => {
      const { error } = await supabase
        .from("properties")
        .update({ is_active: !p.is_active })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    rows,
    total: paged.total,
    pageCount: paged.pageCount,
    isLoading: paged.isLoading,
    isFetching: paged.isFetching,
    error: paged.error,
    stats: statsQuery.data ?? { total: 0, active: 0, inactive: 0 },
    refetch: () => {
      paged.refetch();
      contactsQuery.refetch();
      statsQuery.refetch();
    },
    invalidate,
    deleteProperty: deleteMutation.mutateAsync,
    isDeletingId: deleteMutation.isPending ? (deleteMutation.variables as string | undefined) : undefined,
    toggleActive: toggleActiveMutation.mutateAsync,
  };
}
