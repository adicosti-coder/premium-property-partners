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
import { toast } from "@/hooks/use-toast";
import {
  Activity, Download, RotateCcw, Search, TrendingUp, Users, Building2, CheckCircle2, XCircle, AlertTriangle,
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
  complexes: /(isho|paltim|openville|city of mara|west city|complex|rezidential|rezidențial|ansamblu)/i,
};

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
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const { data: keywords = [], isLoading: kwLoading } = useQuery({
    queryKey: ["scraper-keywords-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_search_keywords")
        .select("id, keyword, platform, is_active, success_count, fail_count, consecutive_zero, auto_disabled_reason, last_success_at, last_zero_at, updated_at")
        .order("consecutive_zero", { ascending: false })
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
    return keywords.filter((k) => {
      if (statusFilter === "active" && !k.is_active) return false;
      if (statusFilter === "disabled" && k.is_active) return false;
      if (vertical !== "all" && !VERTICAL_PATTERNS[vertical].test(k.keyword)) return false;
      if (search && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [keywords, vertical, search, statusFilter]);

  const stats = useMemo(() => {
    const total = keywords.length;
    const active = keywords.filter((k) => k.is_active).length;
    const disabled = total - active;
    const totalSuccess = keywords.reduce((s, k) => s + (k.success_count || 0), 0);
    const totalFail = keywords.reduce((s, k) => s + (k.fail_count || 0), 0);
    return { total, active, disabled, totalSuccess, totalFail };
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
    if (error) {
      toast({ title: "Reactivare eșuată", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cuvânt cheie reactivat", description: "Contoarele au fost resetate." });
    qc.invalidateQueries({ queryKey: ["scraper-keywords-monitor"] });
  };

  const exportKeywords = () => {
    const header = ["keyword", "platform", "status", "success_count", "fail_count", "consecutive_zero", "auto_disabled_reason", "last_success_at", "last_zero_at"];
    const rows: (string | number | null)[][] = [header];
    filtered.forEach((k) => {
      rows.push([
        k.keyword,
        k.platform ?? "",
        k.is_active ? "activ" : "auto-dezactivat",
        k.success_count,
        k.fail_count,
        k.consecutive_zero,
        k.auto_disabled_reason ?? "",
        k.last_success_at ?? "",
        k.last_zero_at ?? "",
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
          Statusul cuvintelor cheie, rulările recente și controlul reactivării — alimentat de RPC <code>record_keyword_outcome</code>.
        </p>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label="Total" value={stats.total} icon={Activity} />
            <Stat label="Active" value={stats.active} icon={CheckCircle2} tone="success" />
            <Stat label="Auto-Dezactivate" value={stats.disabled} icon={XCircle} tone="danger" />
            <Stat label="Σ Success" value={stats.totalSuccess} icon={CheckCircle2} tone="success" />
            <Stat label="Σ Fail" value={stats.totalFail} icon={AlertTriangle} tone="warning" />
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
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} rezultate</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuvânt cheie</TableHead>
                  <TableHead className="w-[110px]">Platformă</TableHead>
                  <TableHead className="w-[90px] text-center">Success</TableHead>
                  <TableHead className="w-[90px] text-center">Fail</TableHead>
                  <TableHead className="w-[80px] text-center">0-row</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kwLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Se încarcă…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Niciun cuvânt cheie pentru filtrele curente.</TableCell></TableRow>
                ) : (
                  filtered.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium max-w-[420px] truncate" title={k.keyword}>{k.keyword}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{k.platform || "—"}</TableCell>
                      <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-mono">{k.success_count}</TableCell>
                      <TableCell className="text-center text-rose-600 dark:text-rose-400 font-mono">{k.fail_count}</TableCell>
                      <TableCell className="text-center font-mono">{k.consecutive_zero}</TableCell>
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
                        {!k.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reactivatingId === k.id}
                            onClick={() => handleReactivate(k.id)}
                          >
                            <RotateCcw className={`h-3.5 w-3.5 mr-1 ${reactivatingId === k.id ? "animate-spin" : ""}`} />
                            Reactivează
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
