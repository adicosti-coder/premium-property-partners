import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, GitBranch, ExternalLink, Wand2, Loader2, Trophy, ArrowRight, Sparkles, Target, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CANONICAL_HOST = "www.realtrust.ro";
const urlToPath = (full: string) => {
  try { const u = new URL(full); let p = u.pathname.replace(/\/{2,}/g, "/"); if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1); return p || "/"; } catch { return full; }
};
const toCanonical = (full: string) => `https://${CANONICAL_HOST}${urlToPath(full)}`;

interface AuditRow {
  id: string;
  url: string;
  title: string | null;
  suggested_title?: string | null;
  overall_score: number | null;
  keyword_gaps?: any;
  created_at: string;
}

interface Props {
  history: AuditRow[];
}

const STOPWORDS = new Set([
  "in","la","de","din","cu","si","și","pentru","pe","un","o","a","al","ale","cel","cea",
  "the","and","or","of","to","for","a","an","in","on","at","with","by","is","-","|","–","—",
  "timisoara","timișoara","realtrust","apart","hotel","aparthotel"
]);

function tokenize(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

export const SEOCannibalizationPanel = ({ history }: Props) => {
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const resolveMutation = useMutation({
    mutationFn: async ({ loserUrl, winnerUrl }: { loserUrl: string; winnerUrl: string }) => {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "apply_manual_canonical",
          url_path: urlToPath(loserUrl),
          canonical_url: toCanonical(winnerUrl),
          override_conflicts: false,
          notes: "Cannibalization resolver: 301-style canonical to higher-score page",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.applied === false) throw new Error((data as any)?.reason || "Conflict detectat");
      return data;
    },
    onSuccess: () => {
      toast.success("Canonical aplicat pe pagina pierzătoare");
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      setPending(null);
    },
    onError: (e: any) => { toast.error(e.message || "Eșec aplicare canonical"); setPending(null); },
  });

  const clusters = useMemo(() => {
    // Latest audit per URL
    const latest = new Map<string, AuditRow>();
    history.forEach((a) => {
      if (!latest.has(a.url)) latest.set(a.url, a);
    });

    // Build keyword → urls map
    const kwToUrls = new Map<string, Set<string>>();
    const urlTokens = new Map<string, Set<string>>();

    latest.forEach((a) => {
      const tokens = new Set([
        ...tokenize(a.title),
        ...tokenize(a.suggested_title),
      ]);
      urlTokens.set(a.url, tokens);
      tokens.forEach((t) => {
        if (!kwToUrls.has(t)) kwToUrls.set(t, new Set());
        kwToUrls.get(t)!.add(a.url);
      });
    });

    // Pair URLs that share ≥ 3 keywords
    const pairs = new Map<string, { urls: [string, string]; shared: string[]; scores: [number | null, number | null] }>();
    const urls = Array.from(latest.keys());
    for (let i = 0; i < urls.length; i++) {
      for (let j = i + 1; j < urls.length; j++) {
        const a = urls[i];
        const b = urls[j];
        const ta = urlTokens.get(a) || new Set();
        const tb = urlTokens.get(b) || new Set();
        const shared: string[] = [];
        ta.forEach((t) => { if (tb.has(t)) shared.push(t); });
        if (shared.length >= 3) {
          const key = [a, b].sort().join("|");
          pairs.set(key, {
            urls: [a, b],
            shared,
            scores: [latest.get(a)?.overall_score ?? null, latest.get(b)?.overall_score ?? null],
          });
        }
      }
    }

    return Array.from(pairs.values()).sort((x, y) => y.shared.length - x.shared.length);
  }, [history]);

  const totalShared = clusters.reduce((acc, c) => acc + c.shared.length, 0);
  const avgShared = clusters.length ? Math.round(totalShared / clusters.length) : 0;
  const criticalCount = clusters.filter((c) => c.shared.length >= 5).length;

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background via-background to-orange-50/30 dark:to-orange-950/20">
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-orange-400/20 via-amber-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-rose-400/10 via-orange-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl blur-md opacity-40" />
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                <GitBranch className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                Keyword Cannibalization
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed max-w-md">
                Pagini ce concurează pe aceleași keyword-uri. Consolidează prin canonical 301 către scorul mai mare.
              </CardDescription>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        {clusters.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-900/30">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Conflicte</div>
              <div className="text-2xl font-bold bg-gradient-to-br from-orange-600 to-amber-700 bg-clip-text text-transparent tabular-nums">
                {clusters.length}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Critice (≥5 kw)</div>
              <div className="text-2xl font-bold bg-gradient-to-br from-rose-600 to-orange-700 bg-clip-text text-transparent tabular-nums">
                {criticalCount}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Avg overlap</div>
              <div className="text-2xl font-bold bg-gradient-to-br from-amber-600 to-yellow-700 bg-clip-text text-transparent tabular-nums">
                {avgShared}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="relative">
        {clusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50">
              <Trophy className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Zero canibalizare</p>
              <p className="text-xs text-muted-foreground max-w-xs">Toate paginile auditate au focus distinct pe keyword-uri.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[420px] pr-3 -mr-3">
            <ul className="space-y-3">
              {clusters.slice(0, 50).map((c, i) => {
                const winnerIdx = (c.scores[0] ?? 0) >= (c.scores[1] ?? 0) ? 0 : 1;
                const severity = c.shared.length >= 5 ? "critical" : c.shared.length >= 4 ? "warning" : "info";
                const sevConfig = {
                  critical: { ring: "ring-rose-300/60 dark:ring-rose-800/60", glow: "from-rose-500/10 to-orange-500/5", label: "CRITIC", labelClass: "bg-rose-500 text-white" },
                  warning: { ring: "ring-orange-300/60 dark:ring-orange-800/60", glow: "from-orange-500/10 to-amber-500/5", label: "ATENȚIE", labelClass: "bg-orange-500 text-white" },
                  info: { ring: "ring-amber-200/60 dark:ring-amber-900/60", glow: "from-amber-400/10 to-yellow-400/5", label: "INFO", labelClass: "bg-amber-500 text-white" },
                }[severity];

                const loserUrl = c.urls[1 - winnerIdx];
                const winnerUrl = c.urls[winnerIdx];
                const key = `${loserUrl}->${winnerUrl}`;
                const isPending = pending === key && resolveMutation.isPending;

                return (
                  <li
                    key={i}
                    className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${sevConfig.glow} bg-card ring-1 ${sevConfig.ring} hover:ring-2 transition-all duration-300 hover:shadow-md`}
                  >
                    {/* Severity bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${severity === "critical" ? "bg-rose-500" : severity === "warning" ? "bg-orange-500" : "bg-amber-400"}`} />

                    <div className="p-4 pl-5 space-y-3">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider ${sevConfig.labelClass}`}>
                            {sevConfig.label}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {c.shared.length} keyword-uri comune
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Δ {Math.abs((c.scores[0] ?? 0) - (c.scores[1] ?? 0))}p
                        </div>
                      </div>

                      {/* Winner card */}
                      <div className="relative rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-50/30 dark:from-emerald-950/40 dark:to-emerald-950/10 border border-emerald-200/60 dark:border-emerald-800/40 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500 shadow-sm shrink-0">
                              <Trophy className="w-3.5 h-3.5 text-white" />
                            </div>
                            <a
                              href={winnerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium truncate hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                              title={winnerUrl}
                            >
                              {urlToPath(winnerUrl)}
                            </a>
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">Winner</span>
                            <div className="flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-md bg-emerald-500 text-white text-xs font-bold tabular-nums shadow-sm">
                              {c.scores[winnerIdx] ?? "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow connector */}
                      <div className="flex items-center justify-center -my-1">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
                          <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90" />
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">301 redirect</span>
                        </div>
                      </div>

                      {/* Loser card */}
                      <div className="relative rounded-lg bg-gradient-to-r from-rose-50/80 to-rose-50/20 dark:from-rose-950/30 dark:to-rose-950/5 border border-rose-200/50 dark:border-rose-900/40 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/90 shadow-sm shrink-0">
                              <TrendingDown className="w-3.5 h-3.5 text-white" />
                            </div>
                            <a
                              href={loserUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium truncate hover:text-rose-700 dark:hover:text-rose-400 transition-colors line-through decoration-rose-400/40"
                              title={loserUrl}
                            >
                              {urlToPath(loserUrl)}
                            </a>
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider">Loser</span>
                            <div className="flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-md bg-rose-500/90 text-white text-xs font-bold tabular-nums shadow-sm">
                              {c.scores[1 - winnerIdx] ?? "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Keywords cloud */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Keyword overlap</div>
                        <div className="flex flex-wrap gap-1">
                          {c.shared.slice(0, 12).map((kw) => (
                            <span
                              key={kw}
                              className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/60 dark:to-amber-950/60 text-orange-800 dark:text-orange-200 border border-orange-200/60 dark:border-orange-800/40"
                            >
                              {kw}
                            </span>
                          ))}
                          {c.shared.length > 12 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              +{c.shared.length - 12}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          disabled={isPending}
                          className="gap-1.5 bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all border-0"
                          onClick={() => {
                            if (!confirm(`Aplici canonical de la\n${urlToPath(loserUrl)}\n→ ${toCanonical(winnerUrl)}?`)) return;
                            setPending(key);
                            resolveMutation.mutate({ loserUrl, winnerUrl });
                          }}
                        >
                          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                          Aplică canonical 301
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
