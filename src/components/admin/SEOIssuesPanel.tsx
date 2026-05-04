import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Wand2, Copy, Sparkles, ShieldAlert, Loader2,
  CheckCircle2, Circle, PlayCircle, Filter, ChevronDown, ChevronUp,
  Undo2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Severity = "critical" | "high" | "medium" | "low" | "info" | string;
type Status = "open" | "doing" | "done";
type FixType = "title" | "meta" | "schema" | "alt_text" | "canonical" | "all";

interface Issue {
  issue: string;
  fix?: string;
  severity: Severity;
  category?: string;
}

interface Props {
  auditId: string;
  url?: string;
  issues: Issue[];
  /** Offset to avoid collision with LocalSEORecommendations rec_index (0..N) */
  indexOffset?: number;
}

interface StatusRow {
  id: string;
  audit_id: string;
  rec_index: number;
  rec_hash: string | null;
  status: Status;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-destructive/60 bg-destructive/5",
  high: "border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20",
  medium: "border-yellow-400/40 bg-yellow-50/30 dark:bg-yellow-950/10",
  low: "border-muted bg-muted/20",
  info: "border-muted bg-muted/10",
};

const STATUS_META: Record<Status, { label: string; icon: any; cls: string }> = {
  open: { label: "Deschisă", icon: Circle, cls: "text-muted-foreground" },
  doing: { label: "În lucru", icon: PlayCircle, cls: "text-amber-600" },
  done: { label: "Rezolvată", icon: CheckCircle2, cls: "text-green-600" },
};

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function detectFixType(issueText: string): FixType {
  const t = (issueText || "").toLowerCase();
  if (t.includes("canonical")) return "canonical";
  if (t.includes("schema") || t.includes("json-ld") || t.includes("structured")) return "schema";
  if (t.includes("alt") || t.includes("imagine")) return "alt_text";
  if (t.includes("title") || t.includes("titlu")) return "title";
  if (t.includes("meta") || t.includes("descri")) return "meta";
  return "all";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `acum ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h}h`;
  return `acum ${Math.floor(h / 24)}z`;
}

export function SEOIssuesPanel({ auditId, url, issues, indexOffset = 100000 }: Props) {
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [autoFixingIdx, setAutoFixingIdx] = useState<number | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const enriched = useMemo(() => {
    return (issues || []).map((iss, i) => ({
      ...iss,
      i,
      recIndex: indexOffset + i,
      hash: simpleHash(`${iss.severity}|${iss.issue}`),
      fixType: detectFixType(iss.issue),
    }));
  }, [issues, indexOffset]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<string, number>;
    enriched.forEach((e) => { c[e.severity] = (c[e.severity] || 0) + 1; });
    return c;
  }, [enriched]);

  // Persisted statuses (reuse seo_local_rec_status table)
  const { data: statusRows = [] } = useQuery({
    queryKey: ["seo-issue-status", auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_local_rec_status")
        .select("*")
        .eq("audit_id", auditId)
        .gte("rec_index", indexOffset)
        .lt("rec_index", indexOffset + 10000);
      if (error) throw error;
      return (data || []) as StatusRow[];
    },
  });

  const statusByIndex = useMemo(() => {
    const m = new Map<number, StatusRow>();
    statusRows.forEach((r) => m.set(r.rec_index, r));
    return m;
  }, [statusRows]);

  const upsertStatus = useMutation({
    mutationFn: async (vars: { recIndex: number; hash: string; status: Status; note?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        audit_id: auditId,
        rec_index: vars.recIndex,
        rec_hash: vars.hash,
        status: vars.status,
        updated_by: u.user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      if (vars.note !== undefined) payload.note = vars.note;
      const { error } = await supabase
        .from("seo_local_rec_status")
        .upsert(payload, { onConflict: "audit_id,rec_index" });
      if (error) throw error;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["seo-issue-status", auditId] });
      const prev = qc.getQueryData<StatusRow[]>(["seo-issue-status", auditId]) || [];
      const next = [...prev];
      const i = next.findIndex((r) => r.rec_index === vars.recIndex);
      const opt: StatusRow = {
        id: i >= 0 ? next[i].id : `tmp-${vars.recIndex}`,
        audit_id: auditId,
        rec_index: vars.recIndex,
        rec_hash: vars.hash,
        status: vars.status,
        note: vars.note !== undefined ? vars.note : (i >= 0 ? next[i].note : null),
        updated_by: i >= 0 ? next[i].updated_by : null,
        updated_at: new Date().toISOString(),
      };
      if (i >= 0) next[i] = opt; else next.push(opt);
      qc.setQueryData(["seo-issue-status", auditId], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["seo-issue-status", auditId], ctx.prev);
      toast.error("Nu s-a putut salva statusul");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["seo-issue-status", auditId] }),
  });

  const filtered = useMemo(() => {
    return enriched
      .filter((e) => severityFilter === "all" || e.severity === severityFilter)
      .filter((e) => {
        if (statusFilter === "all") return true;
        const s = statusByIndex.get(e.recIndex)?.status || "open";
        return s === statusFilter;
      })
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  }, [enriched, severityFilter, statusFilter, statusByIndex]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selected.has(e.recIndex));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((e) => next.delete(e.recIndex));
      else filtered.forEach((e) => next.add(e.recIndex));
      return next;
    });
  };

  const toggleOne = (recIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(recIndex)) next.delete(recIndex);
      else next.add(recIndex);
      return next;
    });
  };

  const buildPrompt = (iss: Issue) => {
    return [
      `Acționează ca expert SEO. Pagina: ${url || "(URL audit)"}`,
      `Problemă (${iss.severity}): ${iss.issue}`,
      iss.fix ? `Fix sugerat: ${iss.fix}` : "",
      "",
      "Returnează un plan concret de remediere în 3-5 pași, cu exemple HTML/markup unde e cazul. Răspunde în română.",
    ].filter(Boolean).join("\n");
  };

  const copyPrompt = (iss: Issue) => {
    navigator.clipboard.writeText(buildPrompt(iss));
    toast.success("Prompt AI copiat");
  };

  const copyCombinedPrompt = () => {
    const sel = enriched.filter((e) => selected.has(e.recIndex));
    if (sel.length === 0) return;
    const text = [
      `Acționează ca expert SEO pentru pagina ${url || ""}.`,
      `Rezolvă următoarele ${sel.length} probleme prioritar (în ordine):`,
      "",
      ...sel.map((s, idx) => `${idx + 1}. [${s.severity}] ${s.issue}${s.fix ? ` → ${s.fix}` : ""}`),
      "",
      "Pentru fiecare problemă: explică cauza, dă pașii exacți de remediere (cu mostre HTML/JSON-LD/markup), și criteriul de validare. Răspunde în română.",
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Prompt combinat copiat (${sel.length} probleme)`);
  };

  // Auto-Fix: invokes seo-auto-fix edge function (same one used elsewhere)
  const runAutoFix = async (recIndex: number, fix_type: FixType) => {
    setAutoFixingIdx(recIndex);
    try {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "generate_fix", audit_id: auditId, fix_type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Propunere AI generată (${fix_type})`, {
        description: "Deschide tab-ul Auto-Fix pentru a o aplica.",
      });
      // Mark as 'doing' so admin sees it's actively being addressed
      const e = enriched.find((x) => x.recIndex === recIndex);
      if (e) upsertStatus.mutate({ recIndex, hash: e.hash, status: "doing" });
    } catch (e: any) {
      toast.error(e.message || "Eroare Auto-Fix");
    } finally {
      setAutoFixingIdx(null);
    }
  };

  const bulkAutoFixCritical = async () => {
    const targets = enriched.filter(
      (e) => (e.severity === "critical" || e.severity === "high") && selected.has(e.recIndex)
    );
    const list = targets.length > 0
      ? targets
      : enriched.filter((e) => e.severity === "critical");
    if (list.length === 0) {
      toast.message("Nicio problemă critică selectată/disponibilă.");
      return;
    }
    setBulkRunning(true);
    let ok = 0;
    for (const item of list) {
      try {
        const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
          body: { action: "generate_fix", audit_id: auditId, fix_type: item.fixType },
        });
        if (error || data?.error) throw new Error(error?.message || data?.error);
        ok++;
        upsertStatus.mutate({ recIndex: item.recIndex, hash: item.hash, status: "doing" });
      } catch (e) { /* continue */ }
    }
    setBulkRunning(false);
    toast.success(`Auto-Fix bulk: ${ok}/${list.length} propuneri generate`);
  };

  const bulkSetStatus = (status: Status) => {
    const sel = enriched.filter((e) => selected.has(e.recIndex));
    if (sel.length === 0) return;
    sel.forEach((e) => upsertStatus.mutate({ recIndex: e.recIndex, hash: e.hash, status }));
    toast.success(`Status setat (${STATUS_META[status].label}) pentru ${sel.length} probleme`);
    setSelected(new Set());
  };

  if (!issues || issues.length === 0) return null;

  const total = issues.length;
  const doneCount = statusRows.filter((r) => r.status === "done").length;

  return (
    <div className="space-y-3">
      {/* Header summary */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">{total} probleme</span>
        {counts.critical > 0 && <Badge variant="destructive" className="text-[10px]">{counts.critical} critice</Badge>}
        {counts.high > 0 && <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500/90">{counts.high} high</Badge>}
        {counts.medium > 0 && <Badge variant="outline" className="text-[10px]">{counts.medium} medium</Badge>}
        {counts.low > 0 && <Badge variant="secondary" className="text-[10px]">{counts.low} low</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">
          Rezolvate: <strong className="text-green-600">{doneCount}</strong>/{total}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <>
          {/* Filters + bulk auto-fix critical */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Severitate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate severitățile</SelectItem>
                <SelectItem value="critical">Doar critice</SelectItem>
                <SelectItem value="high">Doar high</SelectItem>
                <SelectItem value="medium">Doar medium</SelectItem>
                <SelectItem value="low">Doar low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Orice status</SelectItem>
                <SelectItem value="open">Doar deschise</SelectItem>
                <SelectItem value="doing">Doar în lucru</SelectItem>
                <SelectItem value="done">Doar rezolvate</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="default"
              className="ml-auto gap-1.5"
              onClick={bulkAutoFixCritical}
              disabled={bulkRunning}
            >
              {bulkRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              Auto-Fix toate criticele
            </Button>
          </div>

          {/* Bulk action bar — visible when items selected */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2">
              <span className="text-xs font-medium">{selected.size} selectate:</span>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => bulkSetStatus("done")}>
                <CheckCircle2 className="h-3 w-3" /> Marchează rezolvate
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => bulkSetStatus("doing")}>
                <PlayCircle className="h-3 w-3" /> În lucru
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => bulkSetStatus("open")}>
                <Circle className="h-3 w-3" /> Redeschide
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={copyCombinedPrompt}>
                <Sparkles className="h-3 w-3" /> Copy prompt combinat
              </Button>
              <Button size="sm" variant="ghost" className="h-7 ml-auto" onClick={() => setSelected(new Set())}>
                Deselectează
              </Button>
            </div>
          )}

          {/* Select-all-filtered */}
          <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} />
            Selectează toate filtrate ({filtered.length})
          </label>

          {/* Issue list */}
          <div className="space-y-2">
            {filtered.map((e) => {
              const st = statusByIndex.get(e.recIndex)?.status || "open";
              const StatusIcon = STATUS_META[st].icon;
              const updatedAt = statusByIndex.get(e.recIndex)?.updated_at;
              return (
                <div
                  key={e.recIndex}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    SEVERITY_STYLE[e.severity] || "border-muted",
                    st === "done" && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(e.recIndex)}
                      onCheckedChange={() => toggleOne(e.recIndex)}
                    />
                    <Badge
                      variant={e.severity === "critical" ? "destructive" : "outline"}
                      className="text-[10px] uppercase"
                    >
                      {e.severity}
                    </Badge>
                    <div className="flex-1 min-w-0 text-sm">
                      <div className={cn("font-medium", st === "done" && "line-through")}>{e.issue}</div>
                      {e.fix && <div className="text-muted-foreground text-xs mt-1">→ {e.fix}</div>}
                      {updatedAt && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Actualizat {relativeTime(updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-7">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1 text-xs"
                      onClick={() => runAutoFix(e.recIndex, e.fixType)}
                      disabled={autoFixingIdx !== null}
                    >
                      {autoFixingIdx === e.recIndex ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Auto-Fix ({e.fixType})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => copyPrompt(e)}
                    >
                      <Copy className="h-3 w-3" /> Prompt AI
                    </Button>

                    {/* Status pill cycle */}
                    <div className="ml-auto flex items-center gap-1">
                      {(["open", "doing", "done"] as Status[]).map((s) => {
                        const Active = STATUS_META[s].icon;
                        const isActive = st === s;
                        return (
                          <Button
                            key={s}
                            size="sm"
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn("h-7 px-2 gap-1 text-[11px]", isActive && STATUS_META[s].cls)}
                            onClick={() => upsertStatus.mutate({ recIndex: e.recIndex, hash: e.hash, status: s })}
                          >
                            <Active className="h-3 w-3" />
                            {STATUS_META[s].label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6">
                Nicio problemă pentru filtrele active.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
