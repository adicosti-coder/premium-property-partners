import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, RotateCcw, ExternalLink, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Jurnal Triere Automată — afișează prospecții marcați `rejected` din cauza
 * pattern-urilor de URL/titlu (pagini-agregator, index-uri Trovit, search-uri).
 * Sursa: `prospect_listings` filtrate după `last_failure_reason` și pattern-uri
 * de titlu/URL. Folosește React Query cu staleTime 60s pentru a nu reîncărca
 * la fiecare render al sub-tabului Triaj.
 */

interface RejectedRow {
  id: string;
  title: string | null;
  source_url: string | null;
  source_platform: string | null;
  last_failure_reason: string | null;
  rejection_reason: string | null;
  updated_at: string | null;
  created_at: string;
}

const AGGREGATOR_REASONS = ["aggregator_index_page", "aggregator", "index_page", "spam_pattern"];

function detectSourceLabel(url: string | null, platform: string | null): string {
  if (!url) return platform || "—";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("trovit")) return "Trovit (agregator)";
    if (/category|cauta|search|\/list(\?|$)/i.test(url)) return `${host} · index-page`;
    return host;
  } catch {
    return platform || "—";
  }
}

function detectReason(row: RejectedRow): string {
  if (row.last_failure_reason && AGGREGATOR_REASONS.includes(row.last_failure_reason)) {
    return `Match pattern: ${row.last_failure_reason}`;
  }
  if (row.rejection_reason) return row.rejection_reason;
  const t = row.title || "";
  if (/^\s*\d{1,3}([.,\s]\d{3})*\s+(apartamente|propriet[ăa][țt]i|case|garsoniere|vile|imobile|anun[țt]uri)\b/i.test(t)) {
    return "Match pattern: aggregator_title";
  }
  const u = row.source_url || "";
  if (/trovit\.|\/category\/|\/cauta|\/search|\/list($|\?)/i.test(u)) {
    return "Match pattern: aggregator_domain";
  }
  return "auto-filter";
}

export default function AggregatorRejectionLog() {
  const qc = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["aggregator-rejection-log"],
    queryFn: async (): Promise<RejectedRow[]> => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("id,title,source_url,source_platform,last_failure_reason,rejection_reason,updated_at,created_at")
        .eq("lifecycle_status", "rejected")
        .or(
          [
            `last_failure_reason.in.(${AGGREGATOR_REASONS.join(",")})`,
            "title.ilike.% apartamente %",
            "title.ilike.% proprietati %",
            "title.ilike.% proprietăți %",
            "source_url.ilike.%trovit.%",
            "source_url.ilike.%/category/%",
            "source_url.ilike.%/cauta%",
            "source_url.ilike.%/search%",
          ].join(",")
        )
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as RejectedRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const restore = async (row: RejectedRow) => {
    setRestoringId(row.id);
    try {
      // Enum-ul `lead_lifecycle_status` nu are 'pending_review' — folosim
      // 'scoring' + is_active=true, ceea ce face leadul vizibil în Carantina
      // de mai sus (ProspectTriageQueue prinde prospect_type ambiguu).
      const { error } = await supabase
        .from("prospect_listings")
        .update({
          lifecycle_status: "scoring",
          is_active: true,
          prospect_type: null,
          last_failure_reason: "manual_recovery_from_aggregator_filter",
        })
        .eq("id", row.id);
      if (error) throw error;
      toast({
        title: "Lead recuperat",
        description: "Trimis în Carantină pentru re-evaluare manuală.",
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["aggregator-rejection-log"] }),
        qc.invalidateQueries({ queryKey: ["prospect-triage"] }),
      ]);
    } catch (e: any) {
      toast({ title: "Eroare recuperare", description: e.message, variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Card className="border-2 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ClipboardList className="h-5 w-5 text-rose-600" />
            Jurnal Triere Automată — Spammeri & Agregatoare
            <Badge variant="outline" className="ml-1">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>
            Ultimele înregistrări marcate <code className="text-xs">rejected</code> de filtrele anti-spam (pagini-index Trovit, search-uri, agregatoare).
            Verifică periodic ca să prinzi eventuale lead-uri legitime filtrate din greșeală.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Reîncarcă jurnal"
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Se încarcă jurnalul…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            ✨ Niciun lead respins automat de filtre în ultimul timp.
          </div>
        ) : (
          <ScrollArea className="h-[420px] pr-3">
            {/* Desktop: tabel; Mobile: cards */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2 font-medium">Dată/Oră</th>
                    <th className="text-left py-2 pr-2 font-medium">Sursă detectată</th>
                    <th className="text-left py-2 pr-2 font-medium">Titlu blocat</th>
                    <th className="text-left py-2 pr-2 font-medium">Motiv</th>
                    <th className="text-right py-2 font-medium">Acțiune</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const when = row.updated_at || row.created_at;
                    const dt = when ? new Date(when) : null;
                    return (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-accent/30">
                        <td className="py-2 pr-2 text-xs text-muted-foreground whitespace-nowrap">
                          {dt ? dt.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {detectSourceLabel(row.source_url, row.source_platform)}
                            </Badge>
                            {row.source_url && (
                              <a
                                href={row.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                                aria-label="Deschide sursa într-un tab nou"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-2 max-w-[280px]">
                          <div className="truncate" title={row.title || ""}>{row.title || "(fără titlu)"}</div>
                        </td>
                        <td className="py-2 pr-2">
                          <Badge variant="destructive" className="text-[10px] font-mono">
                            {detectReason(row)}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restore(row)}
                            disabled={restoringId === row.id}
                            aria-label="Recuperează lead în carantină"
                          >
                            {restoringId === row.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <><RotateCcw className="h-3 w-3 mr-1" /> Recuperează</>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {rows.map((row) => {
                const when = row.updated_at || row.created_at;
                const dt = when ? new Date(when) : null;
                return (
                  <div key={row.id} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {dt ? dt.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {detectSourceLabel(row.source_url, row.source_platform)}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium line-clamp-2 mb-1">{row.title || "(fără titlu)"}</div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <Badge variant="destructive" className="text-[10px] font-mono">{detectReason(row)}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restore(row)}
                        disabled={restoringId === row.id}
                        className="min-h-[40px]"
                        aria-label="Recuperează lead în carantină"
                      >
                        {restoringId === row.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><RotateCcw className="h-3 w-3 mr-1" /> Recuperează</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
