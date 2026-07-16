import { useMemo } from "react";
import { usePaginatedQuery, type PageSize } from "@/hooks/admin/usePaginatedQuery";

export type AutomationRunRow = {
  id: string;
  job_key: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: "success" | "failed" | "timeout" | "skipped" | "running";
  error: string | null;
  triggered_by: string | null;
  retry_count: number;
};

const COLUMNS =
  "id,job_key,started_at,finished_at,duration_ms,status,error,triggered_by,retry_count";

interface Params {
  page: number;
  pageSize: PageSize;
  jobKey: string;   // "__all__" for none
  status: string;   // "__all__" for none
}

export function useAutomationRuns({ page, pageSize, jobKey, status }: Params) {
  const applyFilters = useMemo(() => {
    return (q: any) => {
      let out = q;
      if (jobKey && jobKey !== "__all__") out = out.eq("job_key", jobKey);
      if (status && status !== "__all__") out = out.eq("status", status);
      return out;
    };
  }, [jobKey, status]);

  return usePaginatedQuery<AutomationRunRow>({
    queryKey: ["automation_runs", jobKey, status],
    table: "automation_runs",
    columns: COLUMNS,
    page,
    pageSize,
    order: { column: "started_at", ascending: false },
    applyFilters,
  });
}
