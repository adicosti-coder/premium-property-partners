import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, GitBranch, ExternalLink } from "lucide-react";

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

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-orange-600" />
          Keyword Cannibalization Detector
          <Badge variant="outline" className="ml-2">{clusters.length} conflicte</Badge>
        </CardTitle>
        <CardDescription>
          Pagini auditate care concurează pe aceleași keyword-uri (≥3 cuvinte cheie comune între title-uri). Recomand consolidare sau redirect 301 către pagina cu scor mai mare.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clusters.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nu există canibalizare detectată în auditurile curente.</p>
        ) : (
          <ScrollArea className="h-72 rounded-md border">
            <ul className="divide-y text-sm">
              {clusters.slice(0, 50).map((c, i) => {
                const winnerIdx = (c.scores[0] ?? 0) >= (c.scores[1] ?? 0) ? 0 : 1;
                return (
                  <li key={i} className="px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                      <span>{c.shared.length} keyword-uri comune</span>
                    </div>
                    {[0, 1].map((idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <a
                          href={c.urls[idx]}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 truncate hover:underline"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.urls[idx]}</span>
                        </a>
                        <div className="flex gap-1.5 shrink-0">
                          <Badge variant={idx === winnerIdx ? "default" : "secondary"}>
                            {c.scores[idx] ?? "—"}
                          </Badge>
                          {idx === winnerIdx && <Badge variant="outline" className="text-emerald-700 border-emerald-300">Păstrează</Badge>}
                          {idx !== winnerIdx && <Badge variant="outline" className="text-orange-700 border-orange-300">301 →</Badge>}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-1">
                      {c.shared.slice(0, 10).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[10px] font-normal">{kw}</Badge>
                      ))}
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
