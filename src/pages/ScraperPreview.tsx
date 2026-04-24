import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ExternalLink, RefreshCw, ShieldCheck, ShieldAlert,
  Filter, CheckCircle2, AlertTriangle, Search, Eye, EyeOff,
} from "lucide-react";
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

export default function ScraperPreview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const keywordId = params.get("kw");

  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);

  async function runPreview() {
    if (!keywordId) {
      setError("Lipsește parametrul ?kw=<keyword_id>");
      return;
    }
    setLoading(true);
    setError(null);
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

  useEffect(() => { runPreview(); /* eslint-disable-next-line */ }, [keywordId]);

  const stats = data?.stats;

  const ownerPct = useMemo(() => {
    if (!stats || stats.filtered_total === 0) return 0;
    return Math.round((stats.owner_signals / stats.filtered_total) * 100);
  }, [stats]);

  return (
    <>
      <Header />
      <SEOHead title="Preview rezultate scraper | Admin" description="Verifică ce anunțuri rămân după filtrele de tip toggle pentru fiecare platformă." />
      <div className="min-h-screen bg-background pt-24 md:pt-28 pb-16">
        <div className="container max-w-6xl mx-auto px-4 space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/scraper-leads")}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Înapoi la Scraper
              </Button>
            </div>
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
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1.5 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{data.keyword.platform}</Badge>
                        <span className="font-mono text-sm truncate">{data.keyword.keyword}</span>
                        {!data.keyword.is_active && <Badge variant="secondary" className="text-[10px]">inactiv</Badge>}
                      </CardTitle>
                    </div>
                  </div>
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

              {/* Filtered results */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Anunțuri rămase după filtre ({data.filtered_results.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResultList items={data.filtered_results} emptyText="Niciun rezultat după aplicarea filtrelor." />
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
                    <ResultList items={data.removed_by_filters} emptyText="Nimic exclus — filtrele tale nu reduc lista." />
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
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

function ResultList({ items, emptyText }: { items: PreviewResult[]; emptyText: string }) {
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
              <div className="flex items-center gap-1.5 flex-wrap">
                {it.owner_signal.isOwner ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : it.owner_signal.reasons.some((r) => r.startsWith("⚠️")) ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{it.title}</span>
              </div>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-primary/80 hover:text-primary truncate block mt-0.5"
              >
                {it.url}
              </a>
              {it.description && (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{it.description}</p>
              )}
              {it.owner_signal.reasons.length > 0 && (
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
