import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ListTree, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { AdminPagination } from "../shared/AdminPagination";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";
import { useAutomationRuns, type AutomationRunRow } from "./hooks/useAutomationRuns";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  /** Optional trigger — bump this number to refetch (e.g. on realtime events from parent). */
  refreshToken?: number;
  /** Known job keys, e.g. from parent's jobs list, used to populate the filter. */
  jobKeys?: string[];
}

export function AutomationRunsTab({ refreshToken, jobKeys }: Props) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [jobKey, setJobKey] = useState<string>("__all__");
  const [status, setStatus] = useState<string>("__all__");

  const { rows, total, pageCount, isLoading, isFetching, refetch } = useAutomationRuns({
    page,
    pageSize,
    jobKey,
    status,
  });

  // Refetch when parent signals (realtime insert/update on runs)
  useEffect(() => {
    if (refreshToken !== undefined) refetch();
  }, [refreshToken, refetch]);

  // Local realtime → invalidate current page
  useEffect(() => {
    const ch = supabase
      .channel("automation-runs-tab")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_runs" }, () => {
        refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  const jobKeyOptions = Array.from(
    new Set([...(jobKeys ?? []), ...rows.map((r) => r.job_key)]),
  ).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListTree className="w-4 h-4" /> Istoric rulaje ({total})
            </CardTitle>
            <CardDescription>
              Toate execuțiile orchestratorului — succese, eșecuri, timeout-uri, retry-uri. Server-side paginat, se actualizează în timp real.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toate statusurile</SelectItem>
                <SelectItem value="success">success</SelectItem>
                <SelectItem value="failed">failed</SelectItem>
                <SelectItem value="timeout">timeout</SelectItem>
                <SelectItem value="skipped">skipped</SelectItem>
                <SelectItem value="running">running</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={jobKey}
              onValueChange={(v) => {
                setJobKey(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Filtru job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toate joburile</SelectItem>
                {jobKeyOptions.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nicio rulare pentru filtrele curente.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <RunRow key={r.id} run={r} />
            ))}
          </div>
        )}
        <div className="border-t border-border mt-3">
          <AdminPagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => {
              setPageSize(s);
              setPage(0);
            }}
            isFetching={isFetching}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function RunRow({ run: r }: { run: AutomationRunRow }) {
  const statusColor =
    r.status === "success" ? "bg-primary/5 border-primary/30" :
    r.status === "timeout" ? "bg-amber-500/10 border-amber-500/40" :
    r.status === "failed" ? "bg-destructive/5 border-destructive/30" :
    "bg-muted/30";
  const StatusIcon =
    r.status === "success" ? CheckCircle2 :
    r.status === "timeout" ? AlertTriangle :
    r.status === "failed" ? XCircle : Activity;
  const iconColor =
    r.status === "success" ? "text-primary" :
    r.status === "timeout" ? "text-amber-600" :
    r.status === "failed" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className={`p-2.5 border rounded-md ${statusColor}`}>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <StatusIcon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="font-mono font-medium">{r.job_key}</span>
        <Badge variant="outline" className="text-[10px] uppercase">{r.status}</Badge>
        {r.duration_ms != null && (
          <Badge variant="secondary" className="text-[10px]">{r.duration_ms}ms</Badge>
        )}
        {r.retry_count > 0 && (
          <Badge variant="outline" className="text-[10px]">↻ {r.retry_count} retry</Badge>
        )}
        {r.triggered_by && (
          <Badge variant="outline" className="text-[10px]">{r.triggered_by}</Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {new Date(r.started_at).toLocaleString("ro-RO")}
        </span>
      </div>
      {r.error && (
        <p className="text-[11px] text-destructive font-mono mt-1.5 break-all">⚠ {r.error}</p>
      )}
    </div>
  );
}

export default AutomationRunsTab;
