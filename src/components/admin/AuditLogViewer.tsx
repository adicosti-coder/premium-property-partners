import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, History } from "lucide-react";
import { usePaginatedQuery, type PageSize } from "@/hooks/admin/usePaginatedQuery";
import { AdminPagination } from "./shared/AdminPagination";

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_label: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  severity: "info" | "warning" | "error" | string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  campaign_launch: "🚀 Lansare campanie",
  campaign_complete: "✅ Campanie finalizată",
  campaign_stop: "🛑 Oprire forțată",
  retry_auto: "🔁 Retry automat",
  lead_failed_invalid_phone: "☎️ Număr invalid",
  lead_failed_exhausted: "⛔ Retry epuizat",
};

const SEVERITY_STYLE: Record<string, string> = {
  info: "border-primary/40 text-primary",
  warning: "border-amber-400 text-amber-700 dark:text-amber-300",
  error: "border-destructive/60 text-destructive",
};

const AUDIT_COLUMNS =
  "id, actor_user_id, actor_label, action, entity_type, entity_id, details, severity, created_at";

interface Props {
  /** When set, filters log to a single entity (e.g., one prospect lead) */
  entityType?: string;
  entityId?: string;
  /** Custom trigger element. Defaults to a "Vezi Jurnal Activitate" button. */
  trigger?: React.ReactNode;
  title?: string;
}

export function AuditLogViewer({ entityType, entityId, trigger, title }: Props) {
  const [open, setOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  // Debounce search input (400ms).
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // Reset filters + page whenever the dialog reopens.
  useEffect(() => {
    if (!open) {
      setActionFilter("all");
      setSeverityFilter("all");
      setSearchInput("");
      setSearch("");
      setPage(0);
    }
  }, [open]);

  // Reset page whenever any filter changes.
  useEffect(() => {
    setPage(0);
  }, [actionFilter, severityFilter, search, pageSize, entityType, entityId]);

  const applyFilters = useCallback(
    (q: any) => {
      if (entityType) q = q.eq("entity_type", entityType);
      if (entityId) q = q.eq("entity_id", entityId);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      if (severityFilter !== "all") q = q.eq("severity", severityFilter);
      if (search.trim()) {
        const like = `%${search.trim().replace(/[%_]/g, "\\$&")}%`;
        q = q.or(
          `action.ilike.${like},actor_label.ilike.${like},entity_id.ilike.${like}`,
        );
      }
      return q;
    },
    [entityType, entityId, actionFilter, severityFilter, search],
  );

  const {
    rows,
    total,
    pageCount,
    isLoading,
    isFetching,
    refetch,
  } = usePaginatedQuery<AuditLogRow>({
    queryKey: [
      "admin-audit-log",
      entityType ?? "_all",
      entityId ?? "_all",
      actionFilter,
      severityFilter,
      search,
    ],
    table: "admin_audit_log",
    columns: AUDIT_COLUMNS,
    page,
    pageSize,
    order: { column: "created_at", ascending: false },
    applyFilters,
    enabled: open,
  });

  // Distinct action list for the filter dropdown — small lookup, cheap.
  const knownActions = useMemo(() => {
    const set = new Set<string>(Object.keys(ACTION_LABELS));
    rows.forEach((r) => set.add(r.action));
    return Array.from(set).sort();
  }, [rows]);

  const fmtDetails = (d: any) => {
    if (!d || typeof d !== "object") return null;
    const parts: string[] = [];
    if (d.attempt && d.max_attempts) parts.push(`încercare ${d.attempt}/${d.max_attempts}`);
    if (d.zone) parts.push(`zonă: ${d.zone}`);
    if (typeof d.total_targets === "number") parts.push(`${d.total_targets} lead-uri`);
    if (typeof d.dialed === "number") parts.push(`apelate: ${d.dialed}`);
    if (typeof d.reverted_count === "number") parts.push(`anulate: ${d.reverted_count}`);
    if (d.call_status) parts.push(`status apel: ${d.call_status}`);
    if (d.reason) parts.push(d.reason);
    if (d.phone) parts.push(`tel: ${d.phone}`);
    if (parts.length === 0) return JSON.stringify(d).slice(0, 120);
    return parts.join(" · ");
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" /> Vezi Jurnal Activitate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {title ?? (entityId ? "Istoric lead" : "Jurnal Activitate Admin")}
          </DialogTitle>
          <DialogDescription>
            {entityId
              ? "Traseul complet al acestui lead (apeluri, retry-uri, eșecuri)."
              : "Toate acțiunile critice efectuate de admini sau de sistemul automat."}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        {!entityId && (
          <div className="flex flex-wrap gap-2 items-center border-b pb-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Acțiune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate acțiunile</SelectItem>
                {knownActions.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Severitate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Caută acțiune, actor, entitate…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 max-w-[260px]"
            />
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {total} înregistrări
            </span>
          </div>
        )}

        {/* Table */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nicio înregistrare în jurnal.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left p-2 font-medium w-[140px]">Timp</th>
                    <th className="text-left p-2 font-medium w-[180px]">Acțiune</th>
                    <th className="text-left p-2 font-medium w-[140px]">Actor</th>
                    <th className="text-left p-2 font-medium">Detalii</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-2 text-muted-foreground whitespace-nowrap">{fmtTime(r.created_at)}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[11px] ${SEVERITY_STYLE[r.severity] || ""}`}>
                          {ACTION_LABELS[r.action] || r.action}
                        </Badge>
                      </td>
                      <td className="p-2 truncate max-w-[140px]" title={r.actor_label || r.actor_user_id || "system"}>
                        {r.actor_label || (r.actor_user_id ? r.actor_user_id.slice(0, 8) : "system")}
                      </td>
                      <td className="p-2 text-foreground/80">{fmtDetails(r.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        <div className="border-t">
          <AdminPagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
            isFetching={isFetching}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
