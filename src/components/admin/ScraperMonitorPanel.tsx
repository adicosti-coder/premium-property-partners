import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Activity, Download, RotateCcw, Search, TrendingUp, Users, Building2,
  CheckCircle2, XCircle, AlertTriangle, Zap, Pencil, Save, ExternalLink, Trophy,
} from "lucide-react";

type Keyword = {
  id: string;
  keyword: string;
  platform: string | null;
  is_active: boolean;
  success_count: number;
  fail_count: number;
  consecutive_zero: number;
  auto_disabled_reason: string | null;
  last_success_at: string | null;
  last_zero_at: string | null;
  updated_at: string;
  query_template: string | null;
  unique_leads_count: number;
  last_test_at: string | null;
};

type ScanJob = {
  id: string;
  status: string;
  total_queries: number | null;
  processed_queries: number | null;
  new_listings: number | null;
  archived_skipped: number | null;
  duplicate_skipped: number | null;
  blacklisted_skipped: number | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

type Vertical = "all" | "piata-roi" | "social-leads" | "complexes";

const VERTICAL_PATTERNS: Record<Exclude<Vertical, "all">, RegExp> = {
  "piata-roi": /(roi|invest|randament|piata|piață|yield|dezvoltator|comision|vanzare|vânzare)/i,
  "social-leads": /(facebook|whatsapp|telefon|07|olx|publi24|fara comision|fără comision|proprietar)/i,
  complexes: /(isho|paltim|openville|city of mara|west city|vox|ateneo|nord one|xcity|complex|rezidential|rezidențial|ansamblu)/i,
};

const PORTAL_OPTIONS = [
  "OLX", "Storia.ro", "imobiliare.ro", "Publi24",
  "BursaImobiliara.ro", "Facebook Marketplace", "Facebook Groups",
];

function classifyVertical(keyword: string): Exclude<Vertical, "all"> | "other" {
  if (VERTICAL_PATTERNS.complexes.test(keyword)) return "complexes";
  if (VERTICAL_PATTERNS["social-leads"].test(keyword)) return "social-leads";
  if (VERTICAL_PATTERNS["piata-roi"].test(keyword)) return "piata-roi";
  return "other";
}

// Performance score: success rate weighted by log(unique leads) — keeps
// new keywords from dominating purely on a 1/1 ratio.
function computeScore(k: Keyword): number {
  const total = (k.success_count || 0) + (k.fail_count || 0);
  const rate = total > 0 ? (k.success_count || 0) / total : 0;
  const leadsBoost = Math.log10((k.unique_leads_count || 0) + 1);
  return Math.round((rate * 100 + leadsBoost * 25) * 10) / 10;
}

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ScraperMonitorPanel() {
  const qc = useQueryClient();
  const [vertical, setVertical] = useState<Vertical>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [sortBy, setSortBy] = useState<"score" | "leads" | "fails" | "updated">("score");
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  // Inline edit for query_template
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Quick test dialog state
  const [testOpen, setTestOpen] = useState(false);
  const [testKw, setTestKw] = useState<Keyword | null>(null);
  const [testPortal, setTestPortal] = useState<string>("OLX");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const { data: keywords = [], isLoading: kwLoading } = useQuery({
    queryKey: ["scraper-keywords-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_search_keywords")
        .select("id, keyword, platform, is_active, success_count, fail_count, consecutive_zero, auto_disabled_reason, last_success_at, last_zero_at, updated_at, query_template, unique_leads_count, last_test_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Keyword[];
    },
    staleTime: 30_000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["scraper-jobs-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_scan_jobs")
        .select("id, status, total_queries, processed_queries, new_listings, archived_skipped, duplicate_skipped, blacklisted_skipped, started_at, finished_at, error_message")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ScanJob[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    let rows = keywords.filter((k) => {
      if (statusFilter === "active" && !k.is_active) return false;
      if (statusFilter === "disabled" && k.is_active) return false;
      if (vertical !== "all" && !VERTICAL_PATTERNS[vertical].test(k.keyword)) return false;
      if (search && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === "score") return computeScore(b) - computeScore(a);
      if (sortBy === "leads") return (b.unique_leads_count || 0) - (a.unique_leads_count || 0);
      if (sortBy === "fails") return (b.fail_count || 0) - (a.fail_count || 0);
      return (b.updated_at || "").localeCompare(a.updated_at || "");
    });
    return rows;
  }, [keywords, vertical, search, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = keywords.length;
    const active = keywords.filter((k) => k.is_active).length;
    const disabled = total - active;
    const totalSuccess = keywords.reduce((s, k) => s + (k.success_count || 0), 0);
    const totalFail = keywords.reduce((s, k) => s + (k.fail_count || 0), 0);
    const totalLeads = keywords.reduce((s, k) => s + (k.unique_leads_count || 0), 0);
    return { total, active, disabled, totalSuccess, totalFail, totalLeads };
  }, [keywords]);

  // Regression detection: per-vertical success rate vs prior. We compute the
  // current vertical health from the *cumulative* keyword counters, then flag
  // if disabled rate > 40% or recent fails dominate.
  const regressionAlerts = useMemo(() => {
    const verticals: Exclude<Vertical, "all">[] = ["piata-roi", "social-leads", "complexes"];
    return verticals.map((v) => {
      const list = keywords.filter((k) => VERTICAL_PATTERNS[v].test(k.keyword));
      if (list.length === 0) return { vertical: v, level: "ok" as const, msg: "Fără date" };
      const succ = list.reduce((s, k) => s + (k.success_count || 0), 0);
      const fail = list.reduce((s, k) => s + (k.fail_count || 0), 0);
      const total = succ + fail;
      const rate = total > 0 ? succ / total : 0;
      const disabled = list.filter((k) => !k.is_active).length;
      const disabledPct = disabled / list.length;
      let level: "ok" | "warn" | "danger" = "ok";
      const reasons: string[] = [];
      if (disabledPct >= 0.4) { level = "danger"; reasons.push(`${Math.round(disabledPct * 100)}% cuvinte auto-dezactivate`); }
      else if (disabledPct >= 0.2) { level = "warn"; reasons.push(`${Math.round(disabledPct * 100)}% cuvinte auto-dezactivate`); }
      if (total >= 20 && rate < 0.15) { level = "danger"; reasons.push(`Rată succes ${Math.round(rate * 100)}%`); }
      else if (total >= 10 && rate < 0.3 && level !== "danger") { level = "warn"; reasons.push(`Rată succes ${Math.round(rate * 100)}%`); }
      return {
        vertical: v,
        level,
        msg: reasons.length ? reasons.join(" · ") : `Rată succes ${Math.round(rate * 100)}% · ${list.length} cuvinte`,
        rate, disabled, total: list.length,
      };
    });
  }, [keywords]);

  const lastJob = jobs[0];
  const sessionSummary = useMemo(() => {
    if (!lastJob) return "Nu există rulări recente.";
    const newCount = lastJob.new_listings ?? 0;
    const dup = lastJob.duplicate_skipped ?? 0;
    const arc = lastJob.archived_skipped ?? 0;
    const proc = lastJob.processed_queries ?? 0;
    const tot = lastJob.total_queries ?? 0;
    return `Ultima rulare (${lastJob.status}): ${newCount} anunțuri noi, ${dup} duplicate, ${arc} arhivate — ${proc}/${tot} querii procesate.`;
  }, [lastJob]);

  const handleReactivate = async (id: string) => {
    setReactivatingId(id);
    const { error } = await supabase.rpc("reactivate_scraper_keyword" as never, { _id: id } as never);
    setReactivatingId(null);
    if (error) { toast({ title: "Reactivare eșuată", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cuvânt cheie reactivat", description: "Contoarele au fost resetate." });
    qc.invalidateQueries({ queryKey: ["scraper-keywords-monitor"] });
  };

  const startEdit = (k: Keyword) => {
    setEditingId(k.id);
    setEditValue(k.query_template ?? "");
  };
  const saveEdit = async (id: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({ query_template: editValue.trim() || null })
      .eq("id", id);
    setSavingId(null);
    if (error) { toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Query template salvat" });
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["scraper-keywords-monitor"] });
  };

  const openTest = (k: Keyword) => {
    setTestKw(k);
    setTestPortal(k.platform && PORTAL_OPTIONS.includes(k.platform) ? k.platform : "OLX");
    setTestResult(null);
    setTestOpen(true);
  };
  const runTest = async () => {
    if (!testKw) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-keyword-quicktest", {
        body: { keyword_id: testKw.id, portal: testPortal, limit: 10 },
      });
      if (error) throw error;
      setTestResult(data);
      const n = (data as any)?.result_count ?? 0;
      toast({ title: "Test rapid finalizat", description: `${n} rezultate în ${(data as any)?.elapsed_ms ?? 0} ms` });
    } catch (e: any) {
      toast({ title: "Test eșuat", description: e.message, variant: "destructive" });
    } finally {
      setTestRunning(false);
    }
  };

  const exportKeywords = () => {
    const header = ["keyword", "platform", "vertical", "status", "score", "success", "fail", "unique_leads", "consecutive_zero", "query_template", "last_success_at", "last_test_at"];
    const rows: (string | number | null)[][] = [header];
    filtered.forEach((k) => {
      rows.push([
        k.keyword, k.platform ?? "", classifyVertical(k.keyword),
        k.is_active ? "activ" : "auto-dezactivat",
        computeScore(k),
        k.success_count, k.fail_count, k.unique_leads_count ?? 0,
        k.consecutive_zero, k.query_template ?? "",
        k.last_success_at ?? "", k.last_test_at ?? "",
      ]);
    });
    downloadCSV(`scraper-keywords-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast({ title: "Export CSV", description: `${filtered.length} cuvinte cheie descărcate.` });
  };

  const exportLastSession = () => {
    const header = ["id", "status", "started_at", "finished_at", "total_queries", "processed_queries", "new_listings", "duplicate_skipped", "archived_skipped", "blacklisted_skipped", "error"];
    const rows: (string | number | null)[][] = [header];
    jobs.forEach((j) => {
      rows.push([
        j.id, j.status, j.started_at, j.finished_at,
        j.total_queries, j.processed_queries, j.new_listings,
        j.duplicate_skipped, j.archived_skipped, j.blacklisted_skipped,
        j.error_message ?? "",
      ]);
    });
    downloadCSV(`scraper-sessions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast({ title: "Export CSV", description: `${jobs.length} rulări descărcate.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Monitorizare Scraper
        </h2>
        <p className="text-sm text-muted-foreground">
          Status cuvinte cheie, scor performanță, query templates personalizate și teste rapide pe portal.
        </p>
      </div>

      {/* Regression alerts */}
      <div className="grid gap-2 md:grid-cols-3">
        {regressionAlerts.map((a) => {
          const tone = a.level === "danger"
            ? "border-rose-500/50 bg-rose-500/5 text-rose-700 dark:text-rose-300"
            : a.level === "warn"
              ? "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-300"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
          const labels: Record<string, string> = {
            "piata-roi": "Piață / ROI", "social-leads": "Social Leads", "complexes": "Complexuri Premium",
          };
          const Icon = a.level === "ok" ? CheckCircle2 : AlertTriangle;
          return (
            <div key={a.vertical} className={`rounded-lg border p-3 ${tone}`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon className="h-3.5 w-3.5" /> {labels[a.vertical]}
              </div>
              <div className="text-xs mt-1 opacity-90">{a.msg}</div>
            </div>
          );
        })}
      </div>

      {/* Session summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Rezumat sesiune
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{sessionSummary}</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Stat label="Total" value={stats.total} icon={Activity} />
            <Stat label="Active" value={stats.active} icon={CheckCircle2} tone="success" />
            <Stat label="Auto-Dezactivate" value={stats.disabled} icon={XCircle} tone="danger" />
            <Stat label="Σ Success" value={stats.totalSuccess} icon={CheckCircle2} tone="success" />
            <Stat label="Σ Fail" value={stats.totalFail} icon={AlertTriangle} tone="warning" />
            <Stat label="Σ Leads unice" value={stats.totalLeads} icon={Trophy} tone="success" />
          </div>
          {jobs.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border/40 divide-y divide-border/40">
              {jobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                  <span className="font-mono text-muted-foreground">{j.started_at?.slice(0, 16).replace("T", " ")}</span>
                  <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"} className="capitalize">{j.status}</Badge>
                  <span className="text-foreground"><b>{j.new_listings ?? 0}</b> noi</span>
                  <span className="text-muted-foreground">{j.processed_queries ?? 0}/{j.total_queries ?? 0} q</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters + table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Dashboard cuvinte cheie</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportKeywords}>
                <Download className="h-4 w-4 mr-1.5" /> CSV cuvinte
              </Button>
              <Button variant="outline" size="sm" onClick={exportLastSession}>
                <Download className="h-4 w-4 mr-1.5" /> CSV sesiuni
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={vertical} onValueChange={(v) => setVertical(v as Vertical)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Toate</TabsTrigger>
              <TabsTrigger value="piata-roi" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Piață / ROI</TabsTrigger>
              <TabsTrigger value="social-leads" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Social Leads</TabsTrigger>
              <TabsTrigger value="complexes" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Complexuri Premium</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută în cuvinte cheie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <TabsList>
                <TabsTrigger value="all">Toate</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="disabled">Auto-Dezactivate</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Sortare: Scor</SelectItem>
                <SelectItem value="leads">Sortare: Leads unice</SelectItem>
                <SelectItem value="fails">Sortare: Eșecuri</SelectItem>
                <SelectItem value="updated">Sortare: Actualizate</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} rezultate</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">Scor</TableHead>
                  <TableHead>Cuvânt cheie / Query template</TableHead>
                  <TableHead className="w-[110px]">Platformă</TableHead>
                  <TableHead className="w-[70px] text-center">✓</TableHead>
                  <TableHead className="w-[70px] text-center">✗</TableHead>
                  <TableHead className="w-[80px] text-center">Leads</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[180px] text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kwLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Se încarcă…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Niciun cuvânt cheie pentru filtrele curente.</TableCell></TableRow>
                ) : (
                  filtered.map((k) => {
                    const score = computeScore(k);
                    const scoreTone = score >= 60 ? "text-emerald-600 dark:text-emerald-400"
                      : score >= 25 ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400";
                    const isEditing = editingId === k.id;
                    return (
                      <TableRow key={k.id}>
                        <TableCell className={`text-center font-bold font-mono ${scoreTone}`}>{score}</TableCell>
                        <TableCell className="max-w-[420px]">
                          <div className="font-medium truncate" title={k.keyword}>{k.keyword}</div>
                          {isEditing ? (
                            <div className="flex gap-1 mt-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="ex: apartament {keyword} timisoara"
                                className="h-7 text-xs font-mono"
                              />
                              <Button size="sm" variant="default" className="h-7 px-2" disabled={savingId === k.id} onClick={() => saveEdit(k.id)}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>✕</Button>
                            </div>
                          ) : k.query_template ? (
                            <code className="text-[10px] text-muted-foreground block truncate mt-0.5" title={k.query_template}>↳ {k.query_template}</code>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">fără template — folosește cuvântul ca atare</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{k.platform || "—"}</TableCell>
                        <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-mono">{k.success_count}</TableCell>
                        <TableCell className="text-center text-rose-600 dark:text-rose-400 font-mono">{k.fail_count}</TableCell>
                        <TableCell className="text-center font-mono">{k.unique_leads_count ?? 0}</TableCell>
                        <TableCell>
                          {k.is_active ? (
                            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Activ</Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1" title={k.auto_disabled_reason ?? undefined}>
                              <XCircle className="h-3 w-3" /> Auto-Dezactivat
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" title="Editează query template" onClick={() => startEdit(k)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" title="Test rapid" onClick={() => openTest(k)}>
                              <Zap className="h-3.5 w-3.5 mr-1" /> Test
                            </Button>
                            {!k.is_active && (
                              <Button size="sm" variant="outline" className="h-7 px-2" disabled={reactivatingId === k.id} onClick={() => handleReactivate(k.id)}>
                                <RotateCcw className={`h-3.5 w-3.5 ${reactivatingId === k.id ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Test rapid keyword
            </DialogTitle>
            <DialogDescription className="truncate">{testKw?.keyword}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Portal</label>
                <Select value={testPortal} onValueChange={setTestPortal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORTAL_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runTest} disabled={testRunning}>
                {testRunning ? <RotateCcw className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
                Rulează test
              </Button>
            </div>
            {testResult && (
              <div className="space-y-2">
                <div className="text-xs bg-muted/40 rounded p-2 font-mono break-all">
                  <span className="text-muted-foreground">Query:</span> {testResult.final_query}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span><b className="text-foreground">{testResult.result_count}</b> rezultate</span>
                  <span>{testResult.elapsed_ms} ms</span>
                  <span>portal: {testResult.portal}</span>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 rounded border border-border/40">
                  {(testResult.results || []).length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">Niciun rezultat — ajustează query template-ul.</div>
                  ) : (testResult.results || []).map((r: any, i: number) => (
                    <div key={i} className="p-2 text-xs space-y-1">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                        {r.title || r.url} <ExternalLink className="h-3 w-3" />
                      </a>
                      {r.snippet && <div className="text-muted-foreground line-clamp-2">{r.snippet}</div>}
                      <div className="text-[10px] text-muted-foreground/70 font-mono truncate">{r.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label, value, icon: Icon, tone = "default",
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "success" | "danger" | "warning" }) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${colors}`} /> {label}
      </div>
      <div className={`text-xl font-bold mt-0.5 ${colors}`}>{value}</div>
    </div>
  );
}
