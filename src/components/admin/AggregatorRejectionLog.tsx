import { useState, forwardRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  ExternalLink,
  ClipboardList,
  PhoneForwarded,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/**
 * Anti-Spam Rescue Log — listează lead-urile blocate de filtrele de sanitizer
 * și agregatoare și permite:
 *   - Recuperare în Carantină (re-evaluare manuală)
 *   - Aprobare manuală forțată (status=to_call → Andrei sună direct)
 *   - Toggle global „Mod Permisiv” (lead suspect → `to_review` în loc de blocat)
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
  if (row.last_failure_reason) return row.last_failure_reason;
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

type PermissiveSetting = { id: string; spam_shield_permissive_mode: boolean };

const AggregatorRejectionLog = forwardRef<HTMLDivElement>(function AggregatorRejectionLog(_props, ref) {
  const qc = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const { data: permissive } = useQuery({
    queryKey: ["spam-shield-permissive-mode"],
    queryFn: async (): Promise<PermissiveSetting | null> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id, spam_shield_permissive_mode")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PermissiveSetting | null) ?? null;
    },
    staleTime: 30_000,
  });

  const togglePermissive = async (next: boolean) => {
    if (!permissive?.id) return;
    setToggling(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ spam_shield_permissive_mode: next })
        .eq("id", permissive.id);
      if (error) throw error;
      toast({
        title: next ? "Mod Permisiv ACTIV" : "Mod Permisiv dezactivat",
        description: next
          ? "Lead-urile suspecte vor fi marcate cu tag `suspect_spam` și trecute în review, NU blocate."
          : "Filtrul anti-spam revine la blocare automată strictă.",
      });
      await qc.invalidateQueries({ queryKey: ["spam-shield-permissive-mode"] });
    } catch (e: any) {
      toast({ title: "Eroare toggle", description: e.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["aggregator-rejection-log"],
    queryFn: async (): Promise<RejectedRow[]> => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("id,title,source_url,source_platform,last_failure_reason,rejection_reason,updated_at,created_at")
        .eq("lifecycle_status", "rejected")
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

  const forceApprove = async (row: RejectedRow) => {
    setApprovingId(row.id);
    try {
      const blob = `${row.title || ""}`.toLowerCase();
      const guessedType = /chiri|rent|\/lun/.test(blob)
        ? "rent"
        : /vanz|vânz|sale/.test(blob)
        ? "vanzare"
        : "proprietar";

      const { error } = await supabase
        .from("prospect_listings")
        .update({
          lifecycle_status: "new",
          status: "to_call",
          is_active: true,
          prospect_type: guessedType,
          last_failure_reason: "manual_force_route_from_shield",
          rejection_reason: null,
        })
        .eq("id", row.id);
      if (error) throw error;
      toast({
        title: "✅ Lead aprobat manual",
        description: `Trimis direct la Andrei pentru apelare (tip: ${guessedType}).`,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["aggregator-rejection-log"] }),
        qc.invalidateQueries({ queryKey: ["prospect-triage"] }),
        qc.invalidateQueries({ queryKey: ["voice-agent-queue"] }),
      ]);
    } catch (e: any) {
      toast({ title: "Eroare aprobare", description: e.message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const isPermissive = !!permissive?.spam_shield_permissive_mode;

  return (
    <Card
      ref={ref}
      id="anti-spam-rescue-log"
      className="border-2 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent scroll-mt-24"
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ClipboardList className="h-5 w-5 text-rose-600" />
            Recuperare Lead-uri Blocate (Anti-Spam Rescue)
            <Badge variant="outline" className="ml-1">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>
            Lead-uri marcate <code className="text-xs">rejected</code> de sanitizer / filtrele anti-agregator.
            Vezi exact regula care a declanșat blocarea și aprobă manual cele legitime.
          </CardDescription>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <div
            className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
              isPermissive ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-muted/40"
            }`}
          >
            {isPermissive ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="permissive-mode-toggle" className="text-xs font-medium cursor-pointer select-none">
              Scut Anti-Spam — Mod Permisiv
            </Label>
            <Switch
              id="permissive-mode-toggle"
              checked={isPermissive}
              disabled={toggling || !permissive?.id}
              onCheckedChange={togglePermissive}
              aria-label="Toggle mod permisiv pentru filtrul anti-spam"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Reîncarcă jurnal"
            className="self-end"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isPermissive && (
          <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            ⚠️ Mod permisiv activ: noile lead-uri suspecte vor fi marcate cu tag <code>suspect_spam</code> și trecute în <code>to_review</code> în loc să fie blocate.
          </div>
        )}
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Se încarcă jurnalul…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            ✨ Niciun lead respins automat de filtre în ultimul timp.
          </div>
        ) : (
          <ScrollArea className="h-[460px] pr-3">
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2 font-medium">Dată/Oră</th>
                    <th className="text-left py-2 pr-2 font-medium">Sursă</th>
                    <th className="text-left py-2 pr-2 font-medium">Titlu blocat</th>
                    <th className="text-left py-2 pr-2 font-medium">Motiv (regex / keyword)</th>
                    <th className="text-right py-2 font-medium">Acțiuni</th>
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
                        <td className="py-2 pr-2 max-w-[240px]">
                          <div className="truncate" title={row.title || ""}>{row.title || "(fără titlu)"}</div>
                        </td>
                        <td className="py-2 pr-2">
                          <Badge variant="destructive" className="text-[10px] font-mono whitespace-nowrap">
                            {detectReason(row)}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restore(row)}
                              disabled={restoringId === row.id || approvingId === row.id}
                              aria-label="Recuperează lead în carantină"
                              title="Trimite în Carantină pentru re-clasificare"
                            >
                              {restoringId === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><RotateCcw className="h-3 w-3 mr-1" /> Carantină</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => forceApprove(row)}
                              disabled={approvingId === row.id || restoringId === row.id}
                              aria-label="Aprobă manual și trimite la Andrei"
                              title="Forțează rutarea direct la Andrei pentru apelare"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {approvingId === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><PhoneForwarded className="h-3 w-3 mr-1" /> Aprobă</>
                              )}
                            </Button>
                          </div>
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
                    <div className="mt-2">
                      <Badge variant="destructive" className="text-[10px] font-mono">{detectReason(row)}</Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restore(row)}
                        disabled={restoringId === row.id || approvingId === row.id}
                        className="min-h-[40px]"
                        aria-label="Recuperează lead în carantină"
                      >
                        {restoringId === row.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><RotateCcw className="h-3 w-3 mr-1" /> Carantină</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => forceApprove(row)}
                        disabled={approvingId === row.id || restoringId === row.id}
                        className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        aria-label="Aprobă manual și trimite la Andrei"
                      >
                        {approvingId === row.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><PhoneForwarded className="h-3 w-3 mr-1" /> Aprobă</>
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
});

export default AggregatorRejectionLog;
