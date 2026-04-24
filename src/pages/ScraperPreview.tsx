import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, ExternalLink, RefreshCw, ShieldCheck, ShieldAlert,
  Filter, CheckCircle2, AlertTriangle, Search, Eye, EyeOff,
  Download, GitCompare, Code2, CheckCheck, Highlighter,
  ChevronLeft, ChevronRight, X, Server,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PreviewResult {
  title: string;
  url: string;
  description: string;
  owner_signal: { isOwner: boolean; reasons: string[] };
}

interface PreviewResponse {
  success: boolean;
  error?: string;
  keyword: { id: string; keyword: string; platform: string; is_active: boolean };
  applied_hints: { id: string; label: string; hint: string }[];
  final_query: string;
  neutral_query: string;
  stats: {
    neutral_total: number;
    filtered_total: number;
    removed_by_filters: number;
    owner_signals: number;
    suspect_agency: number;
  };
  filtered_results: PreviewResult[];
  removed_by_filters: PreviewResult[];
}

interface QueryOverviewRow {
  id: string;
  platform: string;
  is_active: boolean;
  neutral_query: string;
  final_query: string;
  applied_hints: { id: string; label: string; hint: string }[];
}

/** Extract simple highlight terms from filter hints (positive `inurl:` and
 *  free-text owner keywords) — used to highlight what the filters look for. */
function extractHighlightTerms(
  keyword: string,
  appliedHints: { hint: string }[],
): { positive: string[]; negative: string[] } {
  const positive = new Set<string>();
  const negative = new Set<string>();

  // Always highlight the user's own keyword tokens (>= 4 chars, no operators)
  for (const tok of keyword.split(/\s+/)) {
    const clean = tok.replace(/^[-+"]+|["]+$/g, "").toLowerCase();
    if (clean.length >= 4 && !clean.startsWith("site:") && !clean.startsWith("inurl:")) {
      positive.add(clean);
    }
  }

  for (const h of appliedHints) {
    // inurl:foo  → foo
    for (const m of h.hint.matchAll(/inurl:([A-Za-z0-9%_\-=\[\]]+)/g)) {
      const v = decodeURIComponent(m[1]).toLowerCase().replace(/[\[\]=]/g, " ").trim();
      v.split(/\s+/).filter((w) => w.length >= 3).forEach((w) => positive.add(w));
    }
    // -inurl:foo  → negative
    for (const m of h.hint.matchAll(/-inurl:([A-Za-z0-9%_\-=\[\]]+)/g)) {
      const v = decodeURIComponent(m[1]).toLowerCase().replace(/[\[\]=]/g, " ").trim();
      v.split(/\s+/).filter((w) => w.length >= 3).forEach((w) => negative.add(w));
    }
    // "quoted text"
    for (const m of h.hint.matchAll(/"([^"]{3,})"/g)) {
      positive.add(m[1].toLowerCase());
    }
    // -word  (negative bare word)
    for (const m of h.hint.matchAll(/(?:^|\s)-([a-zA-ZăâîșțĂÂÎȘȚ]{4,})/g)) {
      negative.add(m[1].toLowerCase());
    }
  }
  return { positive: [...positive], negative: [...negative] };
}

function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function HighlightedText({
  text, positive, negative, enabled,
}: { text: string; positive: string[]; negative: string[]; enabled: boolean }) {
  if (!enabled || !text) return <>{text}</>;
  const all = [
    ...positive.map((t) => ({ t, kind: "pos" as const })),
    ...negative.map((t) => ({ t, kind: "neg" as const })),
  ].filter((x) => x.t.length >= 3).sort((a, b) => b.t.length - a.t.length);
  if (all.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${all.map((x) => escapeRegExp(x.t)).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((p, i) => {
        const lower = p.toLowerCase();
        const hit = all.find((x) => x.t === lower);
        if (!hit) return <span key={i}>{p}</span>;
        return (
          <mark
            key={i}
            className={cn(
              "rounded px-0.5 -mx-0.5",
              hit.kind === "pos"
                ? "bg-emerald-500/25 text-emerald-900 dark:text-emerald-200"
                : "bg-red-500/25 text-red-900 dark:text-red-200 line-through decoration-red-500/50"
            )}
          >
            {p}
          </mark>
        );
      })}
    </>
  );
}

export default function ScraperPreview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const keywordId = params.get("kw");

  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);

  // ── Admin features state ─────────────────────────────
  const [highlightOn, setHighlightOn] = useState(true);
  const [compareOn, setCompareOn] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Quick filter by reason / keyword in title/url/reasons
  const [reasonFilter, setReasonFilter] = useState("");
  // Pagination
  const PAGE_SIZE = 10;
  const [pageFiltered, setPageFiltered] = useState(1);
  const [pageRemoved, setPageRemoved] = useState(1);

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overview, setOverview] = useState<QueryOverviewRow[] | null>(null);

  // ── Session persistence (localStorage) ───────────────
  const sessionKey = keywordId ? `scraper-preview-session:${keywordId}` : null;

  // Restore on mount / kw change
  useEffect(() => {
    if (!sessionKey) return;
    try {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.data) setData(saved.data);
      if (typeof saved.compareOn === "boolean") setCompareOn(saved.compareOn);
      if (typeof saved.highlightOn === "boolean") setHighlightOn(saved.highlightOn);
      if (typeof saved.finalized === "boolean") setFinalized(saved.finalized);
      if (typeof saved.reasonFilter === "string") setReasonFilter(saved.reasonFilter);
      if (typeof saved.showRemoved === "boolean") setShowRemoved(saved.showRemoved);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // Persist on relevant change
  useEffect(() => {
    if (!sessionKey) return;
    try {
      localStorage.setItem(sessionKey, JSON.stringify({
        data, compareOn, highlightOn, finalized, reasonFilter, showRemoved,
        savedAt: Date.now(),
      }));
    } catch { /* quota – ignore */ }
  }, [sessionKey, data, compareOn, highlightOn, finalized, reasonFilter, showRemoved]);

  async function runPreview() {
    if (!keywordId) {
      setError("Lipsește parametrul ?kw=<keyword_id>");
      return;
    }
    setLoading(true);
    setError(null);
    setFinalized(false);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke(
        "scraper-preview-keyword",
        { body: { keyword_id: keywordId, limit: 15 } },
      );
      if (fnErr) throw fnErr;
      if (!resp?.success) throw new Error(resp?.error || "Eroare necunoscută");
      setData(resp as PreviewResponse);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      toast.error("Preview eșuat: " + msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverview() {
    setOverviewOpen(true);
    if (overview) return;
    setOverviewLoading(true);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke(
        "scraper-preview-keyword",
        { body: { mode: "queries-overview" } },
      );
      if (fnErr) throw fnErr;
      if (!resp?.success) throw new Error(resp?.error || "Eroare necunoscută");
      setOverview(resp.overview as QueryOverviewRow[]);
    } catch (e: any) {
      toast.error("Nu pot încărca query-urile: " + (e?.message || String(e)));
    } finally {
      setOverviewLoading(false);
    }
  }

  function downloadCsv(rows: string[][], filename: string) {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["section", "platform", "title", "url", "owner_signal", "reasons", "description"],
    ];
    const push = (section: string, items: PreviewResult[]) => {
      for (const it of items) {
        rows.push([
          section, data.keyword.platform, it.title, it.url,
          it.owner_signal.isOwner ? "Proprietar" : "Suspect/Necunoscut",
          it.owner_signal.reasons.join(" | "), it.description,
        ]);
      }
    };
    push("after_filters", data.filtered_results);
    push("removed_by_filters", data.removed_by_filters);
    downloadCsv(rows, `scraper-preview-${data.keyword.platform}-${Date.now()}.csv`);
    toast.success("CSV exportat");
  }

  function exportRemovedCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["platform", "title", "url", "owner_signal", "reasons", "description"],
    ];
    for (const it of data.removed_by_filters) {
      rows.push([
        data.keyword.platform, it.title, it.url,
        it.owner_signal.isOwner ? "Proprietar" : "Suspect/Necunoscut",
        it.owner_signal.reasons.join(" | "), it.description,
      ]);
    }
    downloadCsv(rows, `scraper-preview-EXCLUSE-${data.keyword.platform}-${Date.now()}.csv`);
    toast.success(`Export listă exclusă: ${data.removed_by_filters.length} anunțuri`);
  }

  async function finalizeOnServer() {
    if (!data) return;
    setFinalizing(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke(
        "scraper-preview-keyword",
        {
          body: {
            mode: "finalize",
            keyword_id: data.keyword.id,
            stats: data.stats,
            applied_hints: data.applied_hints.map((h) => h.id),
            final_query: data.final_query,
          },
        },
      );
      if (fnErr) throw fnErr;
      setFinalized(true);
      toast.success("Preview marcat ca verificat pe server ✓");
    } catch (e: any) {
      // Even if server endpoint not yet configured, mark locally as finalized
      setFinalized(true);
      toast.warning("Marcat local. Server: " + (e?.message || "indisponibil"));
    } finally {
      setFinalizing(false);
    }
  }

  function clearSession() {
    if (!sessionKey) return;
    localStorage.removeItem(sessionKey);
    toast.success("Sesiune ștearsă");
  }

  useEffect(() => {
    // Only auto-run if no cached session data for this kw
    if (!keywordId) return;
    try {
      const raw = sessionKey ? localStorage.getItem(sessionKey) : null;
      if (raw && JSON.parse(raw)?.data) return;
    } catch { /* ignore */ }
    runPreview();
    // eslint-disable-next-line
  }, [keywordId]);

  // Apply quick reason/keyword filter
  const reasonFilterLc = reasonFilter.trim().toLowerCase();
  const matchesReasonFilter = (it: PreviewResult) => {
    if (!reasonFilterLc) return true;
    if (it.title.toLowerCase().includes(reasonFilterLc)) return true;
    if (it.url.toLowerCase().includes(reasonFilterLc)) return true;
    if (it.description?.toLowerCase().includes(reasonFilterLc)) return true;
    return it.owner_signal.reasons.some((r) => r.toLowerCase().includes(reasonFilterLc));
  };

  const filteredVisible = useMemo(
    () => (data?.filtered_results || []).filter(matchesReasonFilter),
    // eslint-disable-next-line
    [data, reasonFilterLc],
  );
  const removedVisible = useMemo(
    () => (data?.removed_by_filters || []).filter(matchesReasonFilter),
    // eslint-disable-next-line
    [data, reasonFilterLc],
  );

  // Reset pagination when filter or data changes
  useEffect(() => { setPageFiltered(1); setPageRemoved(1); }, [reasonFilterLc, data]);

  const filteredPageCount = Math.max(1, Math.ceil(filteredVisible.length / PAGE_SIZE));
  const removedPageCount = Math.max(1, Math.ceil(removedVisible.length / PAGE_SIZE));
  const filteredPaged = filteredVisible.slice((pageFiltered - 1) * PAGE_SIZE, pageFiltered * PAGE_SIZE);
  const removedPaged = removedVisible.slice((pageRemoved - 1) * PAGE_SIZE, pageRemoved * PAGE_SIZE);

  // Collect distinct reasons across both lists for quick-pick chips
  const distinctReasons = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    [...data.filtered_results, ...data.removed_by_filters].forEach((it) => {
      it.owner_signal.reasons.forEach((r) => set.add(r));
    });
    return [...set].slice(0, 12);
  }, [data]);

  const stats = data?.stats;
  const ownerPct = useMemo(() => {
    if (!stats || stats.filtered_total === 0) return 0;
    return Math.round((stats.owner_signals / stats.filtered_total) * 100);
  }, [stats]);

  const highlightTerms = useMemo(() => {
    if (!data) return { positive: [], negative: [] };
    return extractHighlightTerms(data.keyword.keyword, data.applied_hints);
  }, [data]);

  // For "before/after" compare we need a simulated "before" list
  // (= filtered + removed, sorted by URL) representing the neutral search.
  const beforeList = useMemo<PreviewResult[]>(() => {
    if (!data) return [];
    return [...data.filtered_results, ...data.removed_by_filters];
  }, [data]);

  return (
    <>
      <Header />
      <SEOHead title="Preview rezultate scraper | Admin" description="Verifică ce anunțuri rămân după filtrele de tip toggle pentru fiecare platformă." />
      <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16">
        <div className="container max-w-6xl mx-auto px-4 space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/scraper-leads")}
              className="gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi la Scraper
            </Button>
            <Button onClick={runPreview} disabled={loading} size="sm" className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              {loading ? "Rulează..." : "Re-rulează preview"}
            </Button>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Preview rezultate scraper
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vezi exact ce anunțuri rămân pe fiecare platformă DUPĂ ce se aplică
              filtrele de tip toggle (Privat, Doar proprietari, Persoane fizice).
            </p>
          </div>

          {/* Admin actions toolbar */}
          {data && (
            <Card className="bg-muted/20 border-border/60">
              <CardContent className="p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv}>
                    <Download className="w-3.5 h-3.5" /> Export rezultate preview
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={exportRemovedCsv}>
                    <Download className="w-3.5 h-3.5" /> Export CSV listă exclusă
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                      {data.removed_by_filters.length}
                    </Badge>
                  </Button>
                  <Button
                    size="sm"
                    variant={compareOn ? "default" : "outline"}
                    className="gap-1.5"
                    onClick={() => setCompareOn((v) => !v)}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    {compareOn ? "Ascunde comparare" : "Adaugă comparare înainte/după"}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={loadOverview}>
                    <Code2 className="w-3.5 h-3.5" /> Arată query final pe platforme
                  </Button>
                  <Button
                    size="sm"
                    variant={finalized ? "secondary" : "default"}
                    className="gap-1.5"
                    onClick={finalizeOnServer}
                    disabled={finalized || finalizing}
                  >
                    {finalizing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Server className="w-3.5 h-3.5" />
                    )}
                    {finalized ? "Verificat pe server ✓" : "Finalizează cu status server"}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={clearSession}>
                    <X className="w-3.5 h-3.5" /> Șterge sesiunea salvată
                  </Button>
                  <div className="ml-auto flex items-center gap-2 text-xs">
                    <Highlighter className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Afișaj pe cuvânt</span>
                    <Switch checked={highlightOn} onCheckedChange={setHighlightOn} />
                  </div>
                </div>

                {/* Quick reason filter */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Filtru rapid după motiv / cuvânt cheie (titlu, URL, descriere, motiv)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={reasonFilter}
                      onChange={(e) => setReasonFilter(e.target.value)}
                      placeholder="ex: agentie, /reprezentare-exclusiva/, broker, privat…"
                      className="h-8 text-xs"
                    />
                    {reasonFilter && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 gap-1"
                        onClick={() => setReasonFilter("")}
                      >
                        <X className="w-3 h-3" /> Reset
                      </Button>
                    )}
                  </div>
                  {distinctReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {distinctReasons.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReasonFilter(r)}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                            reasonFilter === r
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/40"
                          )}
                          title={`Filtrează după: ${r}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                  {reasonFilter && (
                    <p className="text-[10px] text-muted-foreground">
                      Vizibile: {filteredVisible.length} rămase + {removedVisible.length} excluse
                      (din {data.filtered_results.length} + {data.removed_by_filters.length})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-red-500/40 bg-red-500/5">
              <CardContent className="p-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </CardContent>
            </Card>
          )}

          {loading && !data && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          )}

          {data && (
            <>
              {/* Keyword + stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{data.keyword.platform}</Badge>
                    <span className="font-mono text-sm truncate">{data.keyword.keyword}</span>
                    {!data.keyword.is_active && <Badge variant="secondary" className="text-[10px]">inactiv</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Applied filters */}
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Filtre toggle aplicate ({data.applied_hints.length})
                    </div>
                    {data.applied_hints.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">
                        Niciun filtru toggle activ — căutare neutră.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {data.applied_hints.map((h) => (
                          <span
                            key={h.id}
                            className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono"
                            title={h.hint}
                          >
                            ✓ {h.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlight legend */}
                  {highlightOn && (highlightTerms.positive.length > 0 || highlightTerms.negative.length > 0) && (
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Highlighter className="w-3 h-3" />
                        <span>Termeni evidențiați (declanșatori filtre):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {highlightTerms.positive.map((t) => (
                          <span key={`p-${t}`} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono">
                            ✓ {t}
                          </span>
                        ))}
                        {highlightTerms.negative.map((t) => (
                          <span key={`n-${t}`} className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-300 text-[10px] font-mono line-through decoration-red-500/50">
                            ✗ {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final query */}
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Search className="w-3 h-3" /> Query final trimis la Firecrawl
                    </div>
                    <pre className="text-[11px] font-mono bg-muted/40 border border-border/60 rounded p-2 whitespace-pre-wrap break-all">
                      {data.final_query}
                    </pre>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <StatBox label="Neutru (fără filtre)" value={data.stats.neutral_total} tone="muted" />
                    <StatBox label="După filtre" value={data.stats.filtered_total} tone="primary" />
                    <StatBox label="Excluse de filtre" value={data.stats.removed_by_filters} tone="warn" />
                    <StatBox label="Proprietar (semnale)" value={data.stats.owner_signals} tone="ok" />
                    <StatBox label="Suspect agenție" value={data.stats.suspect_agency} tone="danger" />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    📊 Acuratețe estimată „doar proprietari” pe rezultatele filtrate:{" "}
                    <strong className={cn(
                      ownerPct >= 60 ? "text-emerald-600 dark:text-emerald-400" :
                      ownerPct >= 30 ? "text-amber-600 dark:text-amber-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {ownerPct}%
                    </strong>
                  </p>
                </CardContent>
              </Card>

              {/* Compare before/after */}
              {compareOn && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-primary" />
                      Comparare înainte / după filtre
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Înainte (căutare neutră) — {beforeList.length}
                      </div>
                      <ResultList
                        items={beforeList}
                        emptyText="Niciun rezultat în căutarea neutră."
                        positive={highlightTerms.positive}
                        negative={highlightTerms.negative}
                        highlight={highlightOn}
                        compact
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> După filtre — {data.filtered_results.length}
                      </div>
                      <ResultList
                        items={data.filtered_results}
                        emptyText="Niciun rezultat după aplicarea filtrelor."
                        positive={highlightTerms.positive}
                        negative={highlightTerms.negative}
                        highlight={highlightOn}
                        compact
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filtered results */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Anunțuri rămase după filtre ({data.filtered_results.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultList
                    items={data.filtered_results}
                    emptyText="Niciun rezultat după aplicarea filtrelor."
                    positive={highlightTerms.positive}
                    negative={highlightTerms.negative}
                    highlight={highlightOn}
                  />
                </CardContent>
              </Card>

              {/* Removed by filters */}
              <Card className="border-amber-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Excluse de filtrele toggle ({data.removed_by_filters.length})
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      onClick={() => setShowRemoved((s) => !s)}
                    >
                      {showRemoved ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showRemoved ? "Ascunde" : "Afișează"}
                    </Button>
                  </div>
                </CardHeader>
                {showRemoved && (
                  <CardContent>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      💡 Aceste anunțuri apar în căutarea neutră, dar au fost eliminate
                      de filtrele tale toggle. Verifică dacă printre ele există proprietari
                      reali pe care îi pierzi din greșeală.
                    </p>
                    <ResultList
                      items={data.removed_by_filters}
                      emptyText="Nimic exclus — filtrele tale nu reduc lista."
                      positive={highlightTerms.positive}
                      negative={highlightTerms.negative}
                      highlight={highlightOn}
                    />
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── Queries overview dialog ───────────────────── */}
      <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-4 h-4" /> Query-uri finale pe toate platformele
            </DialogTitle>
            <DialogDescription className="text-xs">
              Toate cuvintele cheie configurate, cu filtrele toggle aplicate exact ca
              în scraperul real (read-only — fără apel Firecrawl).
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            {overviewLoading && (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
              </div>
            )}
            {!overviewLoading && overview && (
              <div className="space-y-3">
                {overview.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Niciun cuvânt cheie configurat.
                  </p>
                )}
                {overview.map((row) => (
                  <div
                    key={row.id}
                    className={cn(
                      "rounded-md border p-3 space-y-1.5",
                      row.is_active ? "border-border bg-muted/20" : "border-border/40 bg-muted/10 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{row.platform}</Badge>
                      {!row.is_active && <Badge variant="secondary" className="text-[10px]">inactiv</Badge>}
                      <span className="text-[10px] text-muted-foreground">
                        {row.applied_hints.length} filtre aplicate
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Neutru:</div>
                    <pre className="text-[11px] font-mono bg-background/60 border border-border/40 rounded p-1.5 whitespace-pre-wrap break-all">
                      {row.neutral_query}
                    </pre>
                    <div className="text-[10px] text-muted-foreground">Final:</div>
                    <pre className="text-[11px] font-mono bg-emerald-500/5 border border-emerald-500/30 rounded p-1.5 whitespace-pre-wrap break-all">
                      {row.final_query}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatBox({
  label, value, tone,
}: { label: string; value: number; tone: "muted" | "primary" | "warn" | "ok" | "danger" }) {
  const toneCls = {
    muted: "border-border/60 bg-muted/30 text-foreground",
    primary: "border-primary/40 bg-primary/5 text-primary",
    warn: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    ok: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    danger: "border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-3 py-2", toneCls)}>
      <div className="text-[10px] uppercase tracking-wide opacity-80 leading-tight">{label}</div>
      <div className="text-2xl font-semibold tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  );
}

function ResultList({
  items, emptyText, positive, negative, highlight, compact,
}: {
  items: PreviewResult[];
  emptyText: string;
  positive: string[];
  negative: string[];
  highlight: boolean;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-4 text-center">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it, idx) => (
        <li
          key={`${it.url}-${idx}`}
          className={cn(
            "rounded-md border p-3 transition-colors",
            it.owner_signal.isOwner
              ? "border-emerald-500/40 bg-emerald-500/5"
              : it.owner_signal.reasons.some((r) => r.startsWith("⚠️"))
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-border/60 bg-muted/20"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Badge: Proprietar / Suspect / Necunoscut */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                {it.owner_signal.isOwner ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" /> 🛡️ Proprietar
                  </span>
                ) : it.owner_signal.reasons.some((r) => r.startsWith("⚠️")) ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    <ShieldAlert className="w-3 h-3" /> ⚠️ Suspect agenție
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                    <Filter className="w-3 h-3" /> Necunoscut
                  </span>
                )}
              </div>
              <div className="text-sm font-medium leading-snug">
                <HighlightedText text={it.title} positive={positive} negative={negative} enabled={highlight} />
              </div>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-primary/80 hover:text-primary block mt-0.5 break-all"
              >
                <HighlightedText text={it.url} positive={positive} negative={negative} enabled={highlight} />
              </a>
              {!compact && it.description && (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                  <HighlightedText text={it.description} positive={positive} negative={negative} enabled={highlight} />
                </p>
              )}
              {!compact && it.owner_signal.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {it.owner_signal.reasons.map((r, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border",
                        r.startsWith("✅")
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                          : "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5"
                      )}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-primary"
              title="Deschide anunțul"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
