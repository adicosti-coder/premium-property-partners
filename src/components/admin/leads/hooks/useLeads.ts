import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { usePaginatedQuery, type PageSize } from "@/hooks/admin/usePaginatedQuery";
import { subDays } from "date-fns";

// NOTE: explicit column list — never "*".
const LEAD_COLUMNS = [
  "id",
  "name",
  "whatsapp_number",
  "email",
  "property_type",
  "property_area",
  "calculated_net_profit",
  "calculated_yearly_profit",
  "simulation_data",
  "source",
  "message",
  "is_read",
  "follow_up_date",
  "created_at",
  "lead_score",
  "lead_grade",
  "score_breakdown",
  "engagement_status",
  "touch_count",
  "alert_status",
  "alert_attempts",
  "alert_last_error",
  "alert_sent_at",
].join(", ");

export interface LeadRow {
  id: string;
  name: string;
  whatsapp_number: string;
  email: string | null;
  property_type: string;
  property_area: number;
  calculated_net_profit: number | null;
  calculated_yearly_profit: number | null;
  simulation_data: {
    adr?: number;
    occupancy?: number;
    cleaningCost?: number;
    managementFee?: number;
    platformFee?: number;
    avgStayDuration?: number;
    city?: string;
    roomType?: string;
    location?: string;
    estimatedIncome?: number;
    scor?: number;
    max_scor?: number;
    zona?: string;
    roi_estimat?: string;
    tarif_noapte?: number;
    note_consultant?: string;
    recomandari?: string[];
    categorie?: string;
    campaign?: string;
    utm_campaign?: string;
  } | null;
  source: string | null;
  message: string | null;
  is_read: boolean;
  follow_up_date: string | null;
  created_at: string;
  /** Automatic scoring (0-100) computed in the database on insert */
  lead_score: number | null;
  lead_grade: "hot" | "warm" | "cool" | "cold" | null;
  score_breakdown: {
    zone?: number;
    rooms?: number;
    income?: number;
    area?: number;
    contact?: number;
    inputs?: Record<string, unknown>;
  } | null;
  engagement_status: string | null;
  touch_count: number | null;
  /** WhatsApp/CRM alert delivery state written by lead-score-dispatch */
  alert_status: string | null;
  alert_attempts: number | null;
  alert_last_error: string | null;
  alert_sent_at: string | null;
}

export type LeadReadFilter = "all" | "unread" | "read";
export type LeadDateFilter = "all" | "7days" | "30days" | "90days" | "custom";
export type LeadGradeFilter = "all" | "hot" | "warm" | "cool" | "cold";
export type LeadStatusFilter = "all" | "new" | "re_engaged" | "alert_failed";

export interface UseLeadsOptions {
  page: number;
  pageSize: PageSize;
  search: string;
  source: string; // "all" or specific
  read: LeadReadFilter;
  date: LeadDateFilter;
  grade?: LeadGradeFilter;
  status?: LeadStatusFilter;
  campaign?: string;
  /** ISO date (yyyy-MM-dd) — used when date === "custom" */
  dateFrom?: string;
  dateTo?: string;
}

function dateFilterSince(date: LeadDateFilter): Date | null {
  if (date === "7days") return subDays(new Date(), 7);
  if (date === "30days") return subDays(new Date(), 30);
  if (date === "90days") return subDays(new Date(), 90);
  return null;
}

export function useLeads(opts: UseLeadsOptions) {
  const {
    page,
    pageSize,
    search,
    source,
    read,
    date,
    grade = "all",
    status = "all",
    campaign = "",
    dateFrom = "",
    dateTo = "",
  } = opts;
  const trimmedSearch = search.trim();
  const trimmedCampaign = campaign.trim();
  const qc = useQueryClient();

  const applyFilters = useCallback(
    (q: any) => {
      // Source: "calculator" is a legacy alias that also matches "profit-calculator".
      if (source !== "all") {
        if (source === "calculator") q = q.in("source", ["calculator", "profit-calculator"]);
        else q = q.eq("source", source);
      }
      if (read === "unread") q = q.eq("is_read", false);
      else if (read === "read") q = q.eq("is_read", true);

      if (grade !== "all") q = q.eq("lead_grade", grade);

      if (status === "re_engaged") q = q.eq("engagement_status", "re_engaged");
      else if (status === "new") q = q.or("engagement_status.is.null,engagement_status.eq.new");
      else if (status === "alert_failed") q = q.eq("alert_status", "failed");

      if (date === "custom") {
        if (dateFrom) q = q.gte("created_at", new Date(`${dateFrom}T00:00:00`).toISOString());
        if (dateTo) q = q.lte("created_at", new Date(`${dateTo}T23:59:59`).toISOString());
      } else {
        const since = dateFilterSince(date);
        if (since) q = q.gte("created_at", since.toISOString());
      }

      if (trimmedCampaign) {
        const like = `%${trimmedCampaign.replace(/[%_]/g, "\\$&")}%`;
        q = q.or(
          `simulation_data->>campaign.ilike.${like},simulation_data->>utm_campaign.ilike.${like}`,
        );
      }

      if (trimmedSearch) {
        const like = `%${trimmedSearch.replace(/[%_]/g, "\\$&")}%`;
        q = q.or(`name.ilike.${like},whatsapp_number.ilike.${like},email.ilike.${like}`);
      }
      return q;
    },
    [source, read, date, grade, status, trimmedCampaign, trimmedSearch, dateFrom, dateTo],
  );

  const paged = usePaginatedQuery<LeadRow>({
    queryKey: [
      "admin-leads",
      source,
      read,
      date,
      grade,
      status,
      trimmedCampaign,
      dateFrom,
      dateTo,
      trimmedSearch,
    ],
    table: "leads",
    columns: LEAD_COLUMNS,
    page,
    pageSize,
    order: { column: "created_at", ascending: false },
    applyFilters,
    cast: (row: any) => ({
      ...row,
      simulation_data: row.simulation_data as LeadRow["simulation_data"],
    }),
  });

  // Snapshot for stats + charts. Lightweight columns only, last 90 days, capped.
  const snapshotQuery = useQuery({
    queryKey: ["admin-leads-snapshot"],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, source, property_type, created_at, calculated_net_profit, property_area, is_read",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        source: string | null;
        property_type: string;
        created_at: string;
        calculated_net_profit: number | null;
        property_area: number;
        is_read: boolean;
      }>;
    },
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
    qc.invalidateQueries({ queryKey: ["admin-leads-snapshot"] });
  }, [qc]);

  /**
   * Fetches every row matching the active filters (capped) for CSV export.
   * Runs server-side with the same filters as the table, so the export always
   * matches what the admin sees — not just the current page.
   */
  const fetchAllFiltered = useCallback(
    async (limit = 5000): Promise<LeadRow[]> => {
      let q = supabase.from("leads").select(LEAD_COLUMNS);
      q = applyFilters(q);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
    [applyFilters],
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleReadMutation = useMutation({
    mutationFn: async (p: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from("leads")
        .update({ is_read: !p.is_read })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("leads")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async (p: { id: string; date: string | null }) => {
      const { error } = await supabase
        .from("leads")
        .update({ follow_up_date: p.date })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Manual re-send of a failed WhatsApp/CRM alert (admin-only edge function). */
  const resendAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("resend-lead-alert", {
        body: { lead_id: id },
      });
      if (error) throw error;
      return data as { ok?: boolean; attempts?: number };
    },
    onSuccess: invalidate,
  });

  return {
    rows: paged.rows,
    total: paged.total,
    pageCount: paged.pageCount,
    isLoading: paged.isLoading,
    isFetching: paged.isFetching,
    error: paged.error,
    refetch: () => {
      paged.refetch();
      snapshotQuery.refetch();
    },
    invalidate,
    snapshot: snapshotQuery.data ?? [],
    fetchAllFiltered,
    deleteLead: deleteMutation.mutateAsync,
    isDeletingId: deleteMutation.isPending ? (deleteMutation.variables as string | undefined) : undefined,
    toggleRead: toggleReadMutation.mutateAsync,
    isTogglingReadId: toggleReadMutation.isPending
      ? (toggleReadMutation.variables as { id: string } | undefined)?.id
      : undefined,
    markAllRead: markAllReadMutation.mutateAsync,
    updateFollowUp: updateFollowUpMutation.mutateAsync,
    resendAlert: resendAlertMutation.mutateAsync,
    isResendingId: resendAlertMutation.isPending
      ? (resendAlertMutation.variables as string | undefined)
      : undefined,
  };
}
