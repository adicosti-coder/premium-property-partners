import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2, Link2, ArrowRight, CheckCircle2, X, Download, Copy, Trash2,
  RefreshCcw, Filter, Sparkles, Eye, Zap,
} from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  title: string | null;
  suggested_meta?: string | null;
}

interface Props {
  history: AuditRow[];
}

type StatusFilter = "all" | "proposed" | "applied" | "rejected";
type SortKey = "recent" | "score" | "source";

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch { return "/"; }
};

const scoreColor = (n?: number | null) => {
  if (!n && n !== 0) return "text-muted-foreground";
  if (n >= 80) return "text-emerald-600 font-semibold";
  if (n >= 60) return "text-amber-600";
  return "text-red-600";
};

export const SEOAutoLinkingPanel = ({ history }: Props) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, fail: 0 });
  const [batchSize, setBatchSize] = useState<number>(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [minScore, setMinScore] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [autoApply, setAutoApply] = useState<boolean>(false);
  const [autoThreshold, setAutoThreshold] = useState<number>(85);
  const [maxAutoPerPage, setMaxAutoPerPage] = useState<number>(3);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [previewFor, setPreviewFor] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<{ html?: string; modifiedSentence?: string; loading: boolean; error?: string }>({ loading: false });
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; ok: number; fail: number; label: string } | null>(null);

  const sources = useMemo(() => {
    const m = new Map<string, AuditRow>();
    history.forEach((a) => { if (!m.has(a.url)) m.set(a.url, a); });
    return Array.from(m.values());
  }, [history]);

  const { data: suggestions = [], isFetching, refetch } = useQuery({
    queryKey: ["seo-internal-link-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_internal_link_suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Load persisted settings from DB
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seo_settings")
        .select("value")
        .eq("key", "auto_linking")
        .maybeSingle();
      const v = (data?.value as any) || {};
      if (typeof v.auto_apply === "boolean") setAutoApply(v.auto_apply);
      if (typeof v.threshold === "number") setAutoThreshold(v.threshold);
      if (typeof v.max_per_page === "number") setMaxAutoPerPage(v.max_per_page);
      setSettingsLoaded(true);
    })();
  }, []);

  const persistSettings = async (patch: { auto_apply?: boolean; threshold?: number; max_per_page?: number }) => {
    const next = { auto_apply: autoApply, threshold: autoThreshold, max_per_page: maxAutoPerPage, ...patch };
    await supabase
      .from("seo_settings")
      .upsert({ key: "auto_linking", value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
  };

  // Auto-applied links log (with revert)
  const { data: autoLogs = [] } = useQuery({
    queryKey: ["seo-auto-link-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_audit_log")
        .select("*")
        .eq("action", "internal_link_applied")
        .eq("source", "auto")
        .order("applied_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Auto-apply runs (grouped by run_id)
  const { data: autoRuns = [] } = useQuery({
    queryKey: ["seo-auto-link-runs"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-internal-links", {
        body: { action: "list_runs" },
      });
      if (error) return [];
      return (data as any)?.runs || [];
    },
  });

  const counts = useMemo(() => {
    const c = { all: suggestions.length, proposed: 0, applied: 0, rejected: 0 } as Record<string, number>;
    suggestions.forEach((s: any) => { c[s.status as string] = (c[s.status as string] || 0) + 1; });
    return c;
  }, [suggestions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = suggestions.filter((s: any) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (minScore > 0 && (s.relevance_score || 0) < minScore) return false;
      if (!q) return true;
      return [s.source_url_path, s.target_url_path, s.anchor_text, s.reason]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
    });
    if (sortKey === "score") list = [...list].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    if (sortKey === "source") list = [...list].sort((a, b) => (a.source_url_path || "").localeCompare(b.source_url_path || ""));
    return list;
  }, [suggestions, search, statusFilter, minScore, sortKey]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s: any) => selected.has(s.id));
  const toggleAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((s: any) => next.delete(s.id));
      else filtered.forEach((s: any) => next.add(s.id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.functions.invoke("seo-internal-links", {
        body: { action: "update_status", suggestion_id: id, status },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const bulkSetStatus = async (status: "applied" | "rejected" | "proposed") => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const label = status === "applied" ? "Aplic" : status === "rejected" ? "Resping" : "Resetez";
    setBulkProgress({ done: 0, total: ids.length, ok: 0, fail: 0, label });
    let ok = 0, fail = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await supabase.functions.invoke("seo-internal-links", {
          body: { action: "update_status", suggestion_id: ids[i], status, auto: false },
        });
        ok++;
      } catch { fail++; }
      setBulkProgress({ done: i + 1, total: ids.length, ok, fail, label });
    }
    setTimeout(() => setBulkProgress(null), 1500);
    toast.success(`${ok} actualizate${fail ? `, ${fail} eșuate` : ""}`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
    qc.invalidateQueries({ queryKey: ["seo-auto-link-logs"] });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Ștergi definitiv ${ids.length} sugestii?`)) return;
    const { error } = await supabase.from("seo_internal_link_suggestions").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} șterse`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
  };

  const copyMarkdown = () => {
    const rows = (selected.size ? filtered.filter((s: any) => selected.has(s.id)) : filtered);
    if (!rows.length) return toast.info("Nimic de copiat");
    const byPage = new Map<string, any[]>();
    rows.forEach((s: any) => {
      const k = s.source_url_path;
      if (!byPage.has(k)) byPage.set(k, []);
      byPage.get(k)!.push(s);
    });
    const md = Array.from(byPage.entries()).map(([page, items]) => {
      const lines = items.map(i => `- [${i.anchor_text}](${i.target_url_path})${i.reason ? ` — ${i.reason}` : ""}`).join("\n");
      return `### ${page}\n${lines}`;
    }).join("\n\n");
    navigator.clipboard.writeText(md);
    toast.success(`Markdown copiat (${rows.length} linkuri)`);
  };

  const exportCsv = () => {
    const rows = filtered;
    if (!rows.length) return toast.info("Nimic de exportat");
    const header = ["source", "target", "anchor", "score", "status", "reason", "created_at"];
    const csv = [header.join(",")].concat(
      rows.map((s: any) => [
        s.source_url_path, s.target_url_path, s.anchor_text, s.relevance_score ?? "",
        s.status, (s.reason || "").replace(/"/g, '""'), s.created_at,
      ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `internal-links-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const runBulk = async (onlyMissing = false) => {
    setRunning(true);
    let pool = sources;
    if (onlyMissing) {
      const have = new Set(suggestions.map((s: any) => s.source_url_path));
      pool = sources.filter(s => !have.has(urlToPath(s.url)));
    }
    const targets = pool.slice(0, batchSize);
    setProgress({ done: 0, total: targets.length, ok: 0, fail: 0 });
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        const a = targets[i];
        const { error } = await supabase.functions.invoke("seo-internal-links", {
          body: {
            action: "suggest",
            source_url_path: urlToPath(a.url),
            source_title: a.title || a.url,
            source_context: a.suggested_meta || "",
            auto_apply_threshold: autoApply ? autoThreshold : 0,
            max_auto_per_page: maxAutoPerPage,
            run_id: runId,
          },
        });
        if (error) throw error;
        ok++;
      } catch { fail++; }
      setProgress({ done: i + 1, total: targets.length, ok, fail });
    }
    setRunning(false);
    toast.success(`Auto-linking finalizat: ${ok} OK${fail ? `, ${fail} eșuate` : ""} (run ${runId.slice(-8)})`);
    qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
    qc.invalidateQueries({ queryKey: ["seo-auto-link-logs"] });
    qc.invalidateQueries({ queryKey: ["seo-auto-link-runs"] });
  };

  const exportAutoApplyCsv = () => {
    const rows = autoLogs;
    if (!rows.length) return toast.info("Nimic de exportat");
    const header = ["source_url", "target_url", "anchor_text", "score", "status", "applied_at", "run_id"];
    const csv = [header.join(",")].concat(
      rows.map((l: any) => [
        l.payload?.source_url_path,
        l.payload?.target_url_path,
        l.payload?.anchor_text,
        l.payload?.relevance_score ?? "",
        l.reverted ? "reverted" : "applied",
        l.applied_at,
        l.payload?.run_id || "",
      ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auto-applied-links-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const revertRun = async (runId: string, count: number) => {
    if (!confirm(`Anulezi întreaga rulare? ${count} link-uri vor fi marcate ca respinse.`)) return;
    const { data, error } = await supabase.functions.invoke("seo-internal-links", {
      body: { action: "revert_run", run_id: runId },
    });
    if (error) return toast.error(error.message);
    toast.success(`${(data as any)?.reverted ?? count} link-uri anulate`);
    qc.invalidateQueries({ queryKey: ["seo-auto-link-logs"] });
    qc.invalidateQueries({ queryKey: ["seo-auto-link-runs"] });
    qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
  };

  const bulkApplyHighScore = async (threshold = 85) => {
    const targets = suggestions.filter((s: any) => s.status === "proposed" && (s.relevance_score || 0) >= threshold);
    if (!targets.length) return toast.info(`Nicio sugestie ≥ ${threshold}`);
    if (!confirm(`Aplici automat ${targets.length} sugestii cu scor ≥ ${threshold}?`)) return;
    const t = toast.loading(`Aplic ${targets.length}...`);
    let ok = 0, fail = 0;
    for (const s of targets) {
      try {
        await supabase.functions.invoke("seo-internal-links", {
          body: { action: "update_status", suggestion_id: (s as any).id, status: "applied" },
        });
        ok++;
      } catch { fail++; }
    }
    toast.dismiss(t);
    toast.success(`${ok} aplicate${fail ? `, ${fail} eșuate` : ""}`);
    qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
  };

  const openPreview = async (s: any) => {
    setPreviewFor(s);
    setPreviewData({ loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("seo-internal-link-preview", {
        body: {
          source_url_path: s.source_url_path,
          target_url_path: s.target_url_path,
          anchor_text: s.anchor_text,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Preview indisponibil");
      const rawHtml = data.preview_html || data.paragraph || "—";
      const safe = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ["a", "strong", "em", "b", "i", "br", "span", "mark"],
        ALLOWED_ATTR: ["href", "title"],
        ALLOWED_URI_REGEXP: /^(?:\/|https?:\/\/)/i,
      });
      setPreviewData({ loading: false, html: safe, modifiedSentence: data.modified_sentence });
    } catch (e: any) {
      setPreviewData({ loading: false, error: e.message });
    }
  };

  const toggleAutoApply = (v: boolean) => {
    setAutoApply(v);
    persistSettings({ auto_apply: v });
  };
  const updateAutoThreshold = (v: number) => {
    setAutoThreshold(v);
    persistSettings({ threshold: v });
  };
  const updateMaxPerPage = (v: number) => {
    setMaxAutoPerPage(v);
    persistSettings({ max_per_page: v });
  };
  return (
    <Card className="border-cyan-200 dark:border-cyan-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Link2 className="w-5 h-5 text-cyan-600" />
          Auto-Internal-Linking AI
          <Badge variant="outline">{counts.all} total</Badge>
          <Badge variant="secondary">{counts.proposed || 0} propuse</Badge>
          <Badge className="bg-emerald-600">{counts.applied || 0} aplicate</Badge>
        </CardTitle>
        <CardDescription>
          AI propune anchor + țintă pentru linkuri interne contextuale. Filtrează, aplică în masă, exportă CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n} pagini</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => runBulk(false)} disabled={running} className="gap-2">
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress.done}/{progress.total}</>
              : <><Sparkles className="w-4 h-4" /> Generează ({Math.min(sources.length, batchSize)})</>}
          </Button>
          <Button onClick={() => runBulk(true)} disabled={running} variant="outline" className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Doar pagini noi
          </Button>
          <Button onClick={() => bulkApplyHighScore(85)} variant="outline" className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Aplică auto ≥85
          </Button>
          <Button onClick={exportCsv} variant="ghost" className="gap-2 ml-auto">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => refetch()} variant="ghost" size="icon" disabled={isFetching}>
            <RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {running && (
          <div className="space-y-1">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
            <p className="text-xs text-muted-foreground">
              {progress.ok} OK · {progress.fail} eșuate · {progress.done}/{progress.total}
            </p>
          </div>
        )}

        {/* Auto-apply rule bar */}
        <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-md border border-amber-300 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20">
          <Zap className="w-4 h-4 text-amber-600" />
          <div className="flex items-center gap-2">
            <Switch id="auto-apply" checked={autoApply} onCheckedChange={toggleAutoApply} disabled={!settingsLoaded} />
            <Label htmlFor="auto-apply" className="text-sm font-medium cursor-pointer">
              Auto-Apply ≥
            </Label>
          </div>
          <Select value={String(autoThreshold)} onValueChange={(v) => updateAutoThreshold(Number(v))}>
            <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[75, 80, 85, 90, 95].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Label className="text-sm font-medium">Max/pagină:</Label>
          <Select value={String(maxAutoPerPage)} onValueChange={(v) => updateMaxPerPage(Number(v))}>
            <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={exportAutoApplyCsv} variant="ghost" size="sm" className="gap-1 ml-auto">
            <Download className="w-3.5 h-3.5" /> Export Auto-Apply
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {autoApply
            ? `Activ — max ${maxAutoPerPage} link-uri auto/pagină pentru a păstra textul natural.`
            : "Dezactivat — toate sugestiile rămân „propuse”."}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută sursă, țintă, anchor..." className="pl-8 h-9" />
          </div>
          <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 50, 70, 80, 90].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? "Orice scor" : `≥ ${n}`}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recente</SelectItem>
              <SelectItem value="score">Scor</SelectItem>
              <SelectItem value="source">Sursă</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">Toate ({counts.all})</TabsTrigger>
            <TabsTrigger value="proposed">Propuse ({counts.proposed || 0})</TabsTrigger>
            <TabsTrigger value="applied">Aplicate ({counts.applied || 0})</TabsTrigger>
            <TabsTrigger value="rejected">Respinse ({counts.rejected || 0})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border bg-muted/40">
            <span className="text-sm font-medium px-1">{selected.size} selectate</span>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("applied")} className="gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Aplică
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("rejected")} className="gap-1">
              <X className="w-3.5 h-3.5" /> Respinge
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkSetStatus("proposed")}>Resetează</Button>
            <Button size="sm" variant="ghost" onClick={copyMarkdown} className="gap-1">
              <Copy className="w-3.5 h-3.5" /> Markdown
            </Button>
            <Button size="sm" variant="ghost" onClick={bulkDelete} className="gap-1 text-red-600 ml-auto">
              <Trash2 className="w-3.5 h-3.5" /> Șterge
            </Button>
          </div>
        )}

        {/* Bulk progress bar */}
        {bulkProgress && (
          <div className="space-y-1 p-2 rounded-md border bg-muted/30">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{bulkProgress.label} {bulkProgress.done}/{bulkProgress.total}</span>
              <span className="text-muted-foreground">
                ✓ {bulkProgress.ok} {bulkProgress.fail > 0 && <span className="text-red-600">· ✗ {bulkProgress.fail}</span>}
              </span>
            </div>
            <Progress value={(bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100} className="h-1.5" />
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/30 text-xs">
          <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} />
          <span className="text-muted-foreground">Selectează toate filtrate ({filtered.length})</span>
        </div>

        <ScrollArea className="h-[420px] rounded-md border">
          <ul className="divide-y text-sm">
            {filtered.map((s: any) => (
              <li key={s.id} className="px-3 py-2 flex items-start gap-2 hover:bg-muted/40">
                <Checkbox className="mt-1" checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    <Badge variant="outline" className="font-normal">{s.source_url_path}</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <Badge variant="outline" className="font-normal">{s.target_url_path}</Badge>
                    {s.relevance_score != null && (
                      <span className={scoreColor(s.relevance_score)}>· {s.relevance_score}</span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5 truncate font-medium">"{s.anchor_text}"</p>
                  {s.reason && <p className="text-xs text-muted-foreground line-clamp-2">{s.reason}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" title="Preview paragraf"
                    onClick={() => openPreview(s)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {s.status === "applied" ? (
                    <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="w-3 h-3" /> aplicat</Badge>
                  ) : s.status === "rejected" ? (
                    <Badge variant="secondary">respins</Badge>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" title="Aplică"
                        onClick={() => updateStatus.mutate({ id: s.id, status: "applied" })}>
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Respinge"
                        onClick={() => updateStatus.mutate({ id: s.id, status: "rejected" })}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-muted-foreground text-center text-sm">
                {suggestions.length === 0 ? "Nicio sugestie încă. Apasă „Generează”." : "Niciun rezultat pentru filtrele curente."}
              </li>
            )}
          </ul>
        </ScrollArea>

        {/* Auto-runs (bulk operations) with Revert All */}
        {autoRuns.filter((r: any) => !r.run_id.startsWith("single:")).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4 text-amber-600" />
              Rulări auto-linking (Revert All)
            </div>
            <ScrollArea className="h-32 rounded-md border">
              <ul className="divide-y text-xs">
                {autoRuns.filter((r: any) => !r.run_id.startsWith("single:")).map((r: any) => {
                  const active = r.count - r.reverted;
                  return (
                    <li key={r.run_id} className="px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{r.run_id.slice(-12)}</code>
                          <span className="text-muted-foreground">
                            {new Date(r.last_at).toLocaleString("ro-RO")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">
                          {r.count} link-uri · {r.pages_count} pagini
                          {r.reverted > 0 && <span className="ml-1">· {r.reverted} anulate</span>}
                        </p>
                      </div>
                      {active > 0 ? (
                        <Button size="sm" variant="outline" className="text-red-600"
                          onClick={() => revertRun(r.run_id, active)}>
                          Revert All ({active})
                        </Button>
                      ) : (
                        <Badge variant="secondary">complet anulat</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* Auto-applied log with revert */}
        {autoLogs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4 text-amber-600" />
              Auto-aplicate recent ({autoLogs.filter((l: any) => !l.reverted).length} active)
            </div>
            <ScrollArea className="h-40 rounded-md border">
              <ul className="divide-y text-xs">
                {autoLogs.map((l: any) => (
                  <li key={l.id} className="px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="font-normal">{l.payload?.source_url_path}</Badge>
                        <ArrowRight className="w-3 h-3" />
                        <Badge variant="outline" className="font-normal">{l.payload?.target_url_path}</Badge>
                      </div>
                      <p className="mt-0.5 truncate">"{l.payload?.anchor_text}" · scor {l.payload?.relevance_score}</p>
                    </div>
                    {l.reverted ? (
                      <Badge variant="secondary">anulat</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-red-600"
                        onClick={async () => {
                          const { error } = await supabase.functions.invoke("seo-internal-links", {
                            body: { action: "revert_log", log_id: l.id },
                          });
                          if (error) return toast.error(error.message);
                          toast.success("Link anulat");
                          qc.invalidateQueries({ queryKey: ["seo-auto-link-logs"] });
                          qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
                        }}>
                        Anulează
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>

      <Dialog open={!!previewFor} onOpenChange={(o) => !o && setPreviewFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Preview inserare link
            </DialogTitle>
            <DialogDescription className="text-xs">
              {previewFor?.source_url_path} → <strong>{previewFor?.target_url_path}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Anchor sugerat: <span className="font-medium text-foreground">"{previewFor?.anchor_text}"</span>
            </div>
            {previewData.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Caut paragraful potrivit...
              </div>
            ) : previewData.error ? (
              <p className="text-sm text-red-600">{previewData.error}</p>
            ) : (
              <div
                className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md border bg-muted/30 leading-relaxed [&_a]:text-cyan-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: previewData.html || "—" }}
              />
            )}
            {previewFor && previewFor.status === "proposed" && (
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { updateStatus.mutate({ id: previewFor.id, status: "rejected" }); setPreviewFor(null); }}>
                  <X className="w-4 h-4 mr-1" /> Respinge
                </Button>
                <Button onClick={() => { updateStatus.mutate({ id: previewFor.id, status: "applied" }); setPreviewFor(null); }}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aplică
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
