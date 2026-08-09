import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Shield, RefreshCw, Loader2, PhoneOff, Copy as CopyIcon, AlertCircle,
  ChevronDown, ChevronRight, ExternalLink, FilterX, TrendingUp, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface RejectionRow {
  rejection_reason: string;
  count_24h: number;
  count_period: number;
}

interface DetailRow {
  id: string;
  source_platform: string | null;
  source_url: string | null;
  title: string | null;
  zone: string | null;
  rooms: number | null;
  size: number | null;
  price: number | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  dedup_key: string | null;
  scraped_at: string;
  rejection_reason: string;
}

interface PlatformRow {
  rejection_reason: string;
  source_platform: string;
  count_period: number;
}

const REASON_META: Record<string, { label: string; tone: string; icon: any; help: string }> = {
  duplicate:    { label: "Duplicate cross-platform", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: CopyIcon, help: "Anunț identic detectat (același telefon + cartier + camere + suprafață) — refuzat la inserare." },
  landline:     { label: "Fix (landline)",           tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",     icon: PhoneOff, help: "Twilio Lookup → fix. Marcat instant do_not_call pentru a proteja bugetul." },
  voip:         { label: "VoIP",                     tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",     icon: PhoneOff, help: "Twilio Lookup → VoIP. Marcat instant do_not_call." },
  unreachable:  { label: "Unreachable",              tone: "bg-muted text-muted-foreground border-border",                            icon: AlertCircle, help: "Număr inexistent / dezactivat la rețea." },
};

const PERIOD_DAYS = 7;

interface TrendRow {
  day_label: string;
  rejection_reason: string;
  count: number;
}

const REASON_COLORS: Record<string, string> = {
  duplicate: "hsl(38 92% 50%)",
  landline: "hsl(346 77% 50%)",
  voip: "hsl(346 77% 35%)",
  unreachable: "hsl(215 16% 47%)",
};

export default function ProspectInjectionRejectionStats() {
  const [rows, setRows] = useState<RejectionRow[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<PlatformRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, DetailRow[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [platformFilter, setPlatformFilter] = useState<Record<string, string | null>>({});
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditText, setAuditText] = useState<string | null>(null);
  const [auditAt, setAuditAt] = useState<string | null>(null);

  const runAutoAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-rejection-auto-audit", {
        body: { days: PERIOD_DAYS },
      });
      if (error) throw error;
      setAuditText((data as any)?.audit || "Fără răspuns.");
      setAuditAt(new Date().toISOString());
      toast({ title: "Auto-Audit gata", description: "Analiză AI generată pentru ultimele " + PERIOD_DAYS + " zile." });
    } catch (e: any) {
      toast({ title: "Eroare Auto-Audit", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setTrendLoading(true);
    const [summaryRes, platformRes, trendRes] = await Promise.all([
      supabase.rpc("get_prospect_injection_rejection_summary", { p_days: PERIOD_DAYS }),
      supabase.rpc("get_prospect_injection_rejection_by_platform", { p_days: PERIOD_DAYS }),
      supabase.rpc("get_prospect_injection_rejection_trend", { p_days: PERIOD_DAYS }),
    ]);
    if (summaryRes.error) {
      toast({ title: "Eroare la încărcare", description: summaryRes.error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((summaryRes.data as RejectionRow[]) || []);
    }
    if (!platformRes.error) {
      setPlatformBreakdown((platformRes.data as PlatformRow[]) || []);
    }
    if (!trendRes.error) {
      setTrend((trendRes.data as TrendRow[]) || []);
    }
    setLoading(false);
    setTrendLoading(false);
  }, []);

  const loadDetails = useCallback(async (reason: string, platform?: string | null) => {
    setDetailLoading((s) => ({ ...s, [reason]: true }));
    const { data, error } = await supabase.rpc("get_prospect_injection_rejection_details", {
      p_reason: reason,
      p_days: PERIOD_DAYS,
      p_limit: 25,
      p_platform: platform || null,
    });
    if (error) {
      toast({ title: "Eroare detalii", description: error.message, variant: "destructive" });
    } else {
      setDetails((s) => ({ ...s, [reason]: (data as DetailRow[]) || [] }));
      if (platform !== undefined) {
        setPlatformFilter((s) => ({ ...s, [reason]: platform }));
      }
    }
    setDetailLoading((s) => ({ ...s, [reason]: false }));
  }, []);

  const toggleExpand = useCallback((reason: string) => {
    setExpanded((s) => {
      const next = { ...s, [reason]: !s[reason] };
      if (next[reason] && !details[reason]) {
        loadDetails(reason, platformFilter[reason] || null);
      }
      return next;
    });
  }, [details, loadDetails, platformFilter]);

  const applyPlatformFilter = useCallback((reason: string, platform: string) => {
    loadDetails(reason, platform);
  }, [loadDetails]);

  const clearPlatformFilter = useCallback((reason: string) => {
    loadDetails(reason, null);
  }, [loadDetails]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t24 = rows.reduce((s, r) => s + Number(r.count_24h || 0), 0);
    const tp = rows.reduce((s, r) => s + Number(r.count_period || 0), 0);
    return { t24, tp };
  }, [rows]);

  const platformsByReason = useMemo(() => {
    const map: Record<string, PlatformRow[]> = {};
    for (const r of platformBreakdown) {
      (map[r.rejection_reason] ||= []).push(r);
    }
    return map;
  }, [platformBreakdown]);

  const trendChartData = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    const reasons = new Set<string>();
    for (const t of trend) {
      reasons.add(t.rejection_reason);
      const row = byDay.get(t.day_label) || { day: t.day_label };
      row[t.rejection_reason] = (row[t.rejection_reason] as number | undefined ?? 0) + Number(t.count || 0);
      byDay.set(t.day_label, row);
    }
    // ensure all reasons exist on every row
    const data = Array.from(byDay.values()).map((row) => {
      const filled: Record<string, number | string> = { ...row };
      for (const r of reasons) if (filled[r] == null) filled[r] = 0;
      return filled;
    });
    return { data, reasons: Array.from(reasons) };
  }, [trend]);

  const trendTotal = useMemo(
    () => trend.reduce((s, t) => s + Number(t.count || 0), 0),
    [trend]
  );

  return (
    <Card className="border-2 border-amber-500/20">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Numere respinse automat la injecție
          </CardTitle>
          <CardDescription>
            Filtrare cross-platform + Twilio Lookup. Click pe o categorie pentru drill-down per platformă & sursă.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Respinse ultimele 24h</div>
            <div className="text-2xl font-bold">{totals.t24}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Respinse ultimele {PERIOD_DAYS} zile</div>
            <div className="text-2xl font-bold">{totals.tp}</div>
          </div>
        </div>

        {/* Trend pe ultimele zile */}
        <div className="border rounded-lg p-3 bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Trend respingeri — ultimele {PERIOD_DAYS} zile
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              total: {trendTotal}
            </Badge>
          </div>
          <div className="h-[220px]">
            {trendLoading && trendChartData.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Se încarcă trend-ul...
              </div>
            ) : trendChartData.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Fără respingeri în perioada selectată. ✨
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    {trendChartData.reasons.map((reason) => (
                      <linearGradient key={reason} id={`grad-${reason}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={REASON_COLORS[reason] || "hsl(var(--primary))"} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={REASON_COLORS[reason] || "hsl(var(--primary))"} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-[10px] fill-muted-foreground" tickMargin={6} />
                  <YAxis className="text-[10px] fill-muted-foreground" allowDecimals={false} width={28} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [value, REASON_META[name]?.label || name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px" }}
                    formatter={(value) => REASON_META[value]?.label || value}
                  />
                  {trendChartData.reasons.map((reason) => (
                    <Area
                      key={reason}
                      type="monotone"
                      dataKey={reason}
                      stackId="1"
                      stroke={REASON_COLORS[reason] || "hsl(var(--primary))"}
                      strokeWidth={2}
                      fill={`url(#grad-${reason})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Auto-Audit AI */}
        <div className="border rounded-lg p-3 bg-gradient-to-br from-amber-500/5 to-primary/5">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Auto-Audit AI — pattern-uri & recomandări
            </div>
            <div className="flex items-center gap-2">
              {auditAt && (
                <span className="text-[10px] text-muted-foreground">
                  generat {new Date(auditAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <Button size="sm" variant="default" onClick={runAutoAudit} disabled={auditLoading}>
                {auditLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                {auditText ? "Re-rulează" : "Rulează Auto-Audit"}
              </Button>
            </div>
          </div>
          {auditLoading && !auditText && (
            <div className="text-xs text-muted-foreground py-3 text-center">
              <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
              AI analizează ultimele {PERIOD_DAYS} zile...
            </div>
          )}
          {auditText ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm
                            prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-foreground
                            prose-p:my-1 prose-li:my-0.5 prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{auditText}</ReactMarkdown>
            </div>
          ) : !auditLoading ? (
            <p className="text-xs text-muted-foreground">
              Cere AI-ului să identifice tipare („Sursa X produce Y% din landline") și să sugereze ajustări la scrapere.
            </p>
          ) : null}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold bg-muted/50">
            <div className="col-span-6">Motiv</div>
            <div className="col-span-3 text-right">Ultimele 24h</div>
            <div className="col-span-3 text-right">Ultimele {PERIOD_DAYS} zile</div>
          </div>
          <div className="divide-y">
            {loading && rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Se încarcă...
              </div>
            )}
            {!loading && rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Niciun număr respins în ultimele {PERIOD_DAYS} zile. ✨
              </div>
            )}
            {rows.map((r) => {
              const meta = REASON_META[r.rejection_reason] || { label: r.rejection_reason, tone: "", icon: AlertCircle, help: "" };
              const Icon = meta.icon;
              const isOpen = !!expanded[r.rejection_reason];
              const reasonDetails = details[r.rejection_reason] || [];
              const reasonPlatforms = platformsByReason[r.rejection_reason] || [];
              const isLoadingDetails = !!detailLoading[r.rejection_reason];
              const activeFilter = platformFilter[r.rejection_reason] || null;
              return (
                <div key={r.rejection_reason}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(r.rejection_reason)}
                    className="w-full grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center hover:bg-muted/30 transition-colors text-left"
                    aria-expanded={isOpen}
                    aria-label={`Detalii ${meta.label}`}
                  >
                    <div className="col-span-6 flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <Badge variant="outline" className={meta.tone}>
                        <Icon className="w-3 h-3 mr-1" /> {meta.label}
                      </Badge>
                    </div>
                    <div className="col-span-3 text-right font-mono font-medium">{r.count_24h}</div>
                    <div className="col-span-3 text-right font-mono font-medium">{r.count_period}</div>
                  </button>

                  {isOpen && (
                    <div className="px-3 py-3 bg-muted/20 border-t space-y-3">
                      <p className="text-xs text-muted-foreground">{meta.help}</p>

                      {reasonPlatforms.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                            <span>Per platformă (sursă scraper)</span>
                            {activeFilter && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-amber-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearPlatformFilter(r.rejection_reason);
                                }}
                              >
                                <FilterX className="w-3 h-3 mr-1" /> Reset filtru
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reasonPlatforms.map((p) => {
                              const isActive = activeFilter === p.source_platform;
                              return (
                                <Badge
                                  key={p.source_platform}
                                  variant={isActive ? "default" : "secondary"}
                                  className={`font-mono text-xs cursor-pointer transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary/80"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    applyPlatformFilter(r.rejection_reason, p.source_platform);
                                  }}
                                  title={`Filtrează după ${p.source_platform}`}
                                >
                                  {p.source_platform}: {p.count_period}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                          <span>
                            {activeFilter
                              ? `Ultimele respingeri — filtrat după „${activeFilter}"`
                              : `Ultimele ${Math.min(25, reasonDetails.length || 25)} respingeri`}
                          </span>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); loadDetails(r.rejection_reason, activeFilter); }} disabled={isLoadingDetails}>
                            <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingDetails ? "animate-spin" : ""}`} /> Refresh
                          </Button>
                        </div>

                        {isLoadingDetails && reasonDetails.length === 0 && (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 inline mr-1 animate-spin" /> Se încarcă detaliile...
                          </div>
                        )}
                        {!isLoadingDetails && reasonDetails.length === 0 && (
                          <div className="p-3 text-center text-xs text-muted-foreground">Fără detalii disponibile.</div>
                        )}
                        {reasonDetails.length > 0 && (
                          <div className="overflow-x-auto rounded border bg-background">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50">
                                <tr className="text-left">
                                  <th className="px-2 py-1.5 font-semibold">Platformă</th>
                                  <th className="px-2 py-1.5 font-semibold">Titlu</th>
                                  <th className="px-2 py-1.5 font-semibold">Zonă</th>
                                  <th className="px-2 py-1.5 font-semibold">Cam.</th>
                                  <th className="px-2 py-1.5 font-semibold">m²</th>
                                  <th className="px-2 py-1.5 font-semibold">Telefon</th>
                                  <th className="px-2 py-1.5 font-semibold">Când</th>
                                  <th className="px-2 py-1.5 font-semibold"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {reasonDetails.map((d) => (
                                  <tr key={d.id} className="hover:bg-muted/30">
                                    <td className="px-2 py-1.5 font-mono">{d.source_platform || "—"}</td>
                                    <td className="px-2 py-1.5 max-w-[220px] truncate" title={d.title || ""}>{d.title || "—"}</td>
                                    <td className="px-2 py-1.5">{d.zone || "—"}</td>
                                    <td className="px-2 py-1.5">{d.rooms ?? "—"}</td>
                                    <td className="px-2 py-1.5">{d.size ?? "—"}</td>
                                    <td className="px-2 py-1.5 font-mono">{d.phone_normalized || d.contact_phone || "—"}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                                      {new Date(d.scraped_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {d.source_url && (
                                        <a
                                          href={d.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                                          aria-label="Deschide anunțul sursă"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          🛡️ Trigger-ul rulează la fiecare inserare în <code className="text-xs">prospect_listings</code>. Drill-down: click pe o categorie pentru lista anunțurilor și breakdown per <code className="text-xs">source_platform</code> — util pentru a optimiza scraperele care produc cele mai multe respingeri.
        </p>
      </CardContent>
    </Card>
  );
}
