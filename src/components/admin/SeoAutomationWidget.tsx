import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { Loader2, TrendingUp, AlertTriangle, RefreshCw, Sparkles, ExternalLink, Target, FileSearch, Swords, History, CheckCircle2, X, PhoneCall, Phone, PhoneOff, PhoneForwarded, RotateCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const fmt = (n: number) => new Intl.NumberFormat("ro-RO").format(Math.round(n || 0));
const fmtCompact = (n: number) => {
  const v = Math.round(n || 0);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(v);
};

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  striking_distance: { label: "Striking distance", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  ctr_low: { label: "CTR scăzut", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  decay: { label: "Decay", color: "bg-red-500/10 text-red-700 border-red-500/30" },
  cannibalization: { label: "Canibalizare", color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
};

const SEVERITY_COLOR: Record<string, string> = {
  high: "bg-red-500/10 text-red-700 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const DEFAULT_RETRY_COOLDOWN_MIN = 30;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_SETTINGS_KEY = "seo_andrei_retry_settings_v1";
const FAIL_SESSION_STATUSES = new Set(["failed", "no-answer", "no_answer", "noanswer", "busy", "voicemail"]);

const loadRetrySettings = () => {
  try {
    const raw = localStorage.getItem(RETRY_SETTINGS_KEY);
    if (!raw) return { cooldown: DEFAULT_RETRY_COOLDOWN_MIN, max: DEFAULT_MAX_RETRIES };
    const p = JSON.parse(raw);
    return {
      cooldown: Math.max(5, Math.min(720, Number(p.cooldown) || DEFAULT_RETRY_COOLDOWN_MIN)),
      max: Math.max(1, Math.min(10, Number(p.max) || DEFAULT_MAX_RETRIES)),
    };
  } catch { return { cooldown: DEFAULT_RETRY_COOLDOWN_MIN, max: DEFAULT_MAX_RETRIES }; }
};

const SeoAutomationWidget = () => {
  const [running, setRunning] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retrySettings, setRetrySettings] = useState(() => loadRetrySettings());
  const RETRY_COOLDOWN_MIN = retrySettings.cooldown;
  const MAX_RETRIES = retrySettings.max;

  const saveRetrySettings = (cooldown: number, max: number) => {
    const safe = {
      cooldown: Math.max(5, Math.min(720, Math.round(cooldown) || DEFAULT_RETRY_COOLDOWN_MIN)),
      max: Math.max(1, Math.min(10, Math.round(max) || DEFAULT_MAX_RETRIES)),
    };
    setRetrySettings(safe);
    try { localStorage.setItem(RETRY_SETTINGS_KEY, JSON.stringify(safe)); } catch {}
    toast({ title: "⚙️ Setări retry salvate", description: `Cooldown: ${safe.cooldown}m · Max retry: ${safe.max}` });
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery<any>({
    queryKey: ["seo-automation-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-automation-data");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const triggerJob = async (name: string, fn: string, body: any = {}) => {
    setRunning(name);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅ Rulat cu succes", description: `${name}: ${JSON.stringify(data).slice(0, 200)}` });
      refetch();
    } catch (e: any) {
      toast({ title: "Eroare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally { setRunning(null); }
  };

  const generateAi = async (oppId: string) => {
    setAiLoading(oppId);
    try {
      const { data, error } = await supabase.functions.invoke("seo-ai-action-plan", { body: { opportunity_id: oppId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: data.cached ? "📦 Plan AI (cached)" : "✨ Plan AI generat" });
      refetch();
    } catch (e: any) {
      toast({ title: "Eroare AI", description: e?.message, variant: "destructive" });
    } finally { setAiLoading(null); }
  };

  const updateOppStatus = async (id: string, status: "applied" | "dismissed") => {
    await supabase.from("seo_opportunities").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: status === "applied" ? "✅ Marcat ca aplicat" : "Eliminat" });
    refetch();
  };

  const isRetryEligible = (b: any) => {
    if (b.status === "failed") return true;
    const ss = String(b.call_session?.status || "").toLowerCase();
    return FAIL_SESSION_STATUSES.has(ss);
  };

  const cooldownRemainingMin = (b: any): number => {
    const lastTs = new Date(b.last_retry_at || b.triggered_at).getTime();
    const elapsed = (Date.now() - lastTs) / 60000;
    return Math.max(0, Math.ceil(RETRY_COOLDOWN_MIN - elapsed));
  };

  const retryBridge = async (bridgeId: string) => {
    setRetrying(bridgeId);
    try {
      const { data, error } = await supabase.functions.invoke("seo-andrei-bridge", {
        body: { retry_bridge_id: bridgeId, cooldown_min: RETRY_COOLDOWN_MIN, max_retries: MAX_RETRIES },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "🔄 Retry declanșat", description: `Status: ${data.status} · retry ${data.retry_count}/${data.max_retries}` });
      refetch();
    } catch (e: any) {
      toast({ title: "Retry eșuat", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally { setRetrying(null); }
  };

  if (isLoading) return (
    <Card className="border-primary/20"><CardContent className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Se încarcă date automatizare SEO…</CardContent></Card>
  );

  if (error) return (
    <Card className="border-destructive/30"><CardContent className="py-6 flex items-center gap-2 text-destructive text-sm"><AlertTriangle className="w-4 h-4" />{(error as Error).message}</CardContent></Card>
  );

  const stats = data?.stats || {};
  const opps = data?.opportunities || [];
  const audits = data?.audits || [];
  const matrix = data?.competitor_matrix || {};
  const trend = data?.trend_90d || [];
  const bridges = data?.andrei_bridges || [];
  const bridgeStats = stats.bridge_stats || { total_30d: 0, called: 0, skipped: 0, failed: 0 };

  const competitorDomains = ["realtrust.ro", "storia.ro", "imobiliare.ro", "olx.ro", "anuntul.ro"];
  const matrixQueries = Object.keys(matrix);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Automatizare SEO (GSC + Scraping + AI)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.opp_total || 0} oportunități · ~{fmt(stats.opp_potential_clicks || 0)} clickuri potențiale · {stats.audit_total || 0} pagini auditate (scor mediu {stats.audit_avg_score || 0}/100) · {stats.comp_queries_tracked || 0} query-uri SERP tracked
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="opportunities">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="opportunities" className="text-xs"><Target className="w-3.5 h-3.5 mr-1.5" />Oportunități</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs"><FileSearch className="w-3.5 h-3.5 mr-1.5" />Audit on-page</TabsTrigger>
            <TabsTrigger value="competitors" className="text-xs"><Swords className="w-3.5 h-3.5 mr-1.5" />Competitori</TabsTrigger>
            <TabsTrigger value="andrei" className="text-xs"><PhoneCall className="w-3.5 h-3.5 mr-1.5" />Andrei × SEO</TabsTrigger>
            <TabsTrigger value="history" className="text-xs"><History className="w-3.5 h-3.5 mr-1.5" />Istoric 90z</TabsTrigger>
          </TabsList>

          {/* Opportunities */}
          <TabsContent value="opportunities" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(stats.opp_by_type || {}).map(([t, c]: any) => (
                  <Badge key={t} variant="outline" className={TYPE_LABEL[t]?.color}>{TYPE_LABEL[t]?.label || t}: {c}</Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => triggerJob("Detector oportunități", "seo-opportunity-detector")} disabled={running !== null}>
                {running === "Detector oportunități" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                Re-detectează
              </Button>
            </div>
            {opps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nicio oportunitate detectată încă. Rulează snapshot GSC și apoi detectorul.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {opps.map((o: any) => (
                  <div key={o.id} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={TYPE_LABEL[o.type]?.color}>{TYPE_LABEL[o.type]?.label || o.type}</Badge>
                          {o.potential_clicks > 0 && <Badge variant="secondary" className="text-[10px]">+{fmt(o.potential_clicks)} clk potențial</Badge>}
                          <Badge variant="outline" className="text-[10px]">scor {o.score}</Badge>
                        </div>
                        {o.query && <p className="text-sm font-medium text-foreground truncate">"{o.query}"</p>}
                        {o.page && <a href={o.page} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex items-center gap-1"><ExternalLink className="w-3 h-3" />{o.page.replace(/^https?:\/\/[^/]+/, "")}</a>}
                        <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          {o.current_position != null && <span>poz. <b className="text-foreground">{o.current_position}</b></span>}
                          {o.current_clicks != null && <span>clk: <b className="text-foreground">{fmt(o.current_clicks)}</b></span>}
                          {o.current_impressions != null && <span>imp: <b className="text-foreground">{fmt(o.current_impressions)}</b></span>}
                          {o.current_ctr != null && <span>CTR: <b className="text-foreground">{(Number(o.current_ctr) * 100).toFixed(2)}%</b></span>}
                        </div>
                        {o.details?.reason && <p className="text-[11px] text-muted-foreground mt-1 italic">{o.details.reason}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateAi(o.id)} disabled={aiLoading === o.id}>
                          {aiLoading === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          {o.ai_generated_at ? "Re-AI" : "AI"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600" onClick={() => updateOppStatus(o.id, "applied")}><CheckCircle2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => updateOppStatus(o.id, "dismissed")}><X className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    {o.ai_title && (
                      <div className="border-t border-border/60 pt-2 mt-2 space-y-1.5">
                        <div className="text-[11px] text-muted-foreground">Sugestie AI:</div>
                        <p className="text-xs"><b>Title:</b> {o.ai_title}</p>
                        {o.ai_meta && <p className="text-xs"><b>Meta:</b> {o.ai_meta}</p>}
                        {Array.isArray(o.ai_actions) && o.ai_actions.length > 0 && (
                          <ul className="text-xs space-y-0.5 list-disc pl-4">
                            {o.ai_actions.slice(0, 5).map((a: any, i: number) => (
                              <li key={i}><Badge variant="outline" className="text-[9px] mr-1">{a.priority || "med"}</Badge>{a.action}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit */}
          <TabsContent value="audit" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">{stats.audit_high_issues || 0} probleme critice · scor mediu {stats.audit_avg_score || 0}/100</p>
              <Button size="sm" variant="outline" onClick={() => triggerJob("Audit on-page", "seo-page-audit-cron", { limit: 25 })} disabled={running !== null}>
                {running === "Audit on-page" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5 mr-1.5" />}
                Re-scan top 25
              </Button>
            </div>
            {audits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Niciun audit încă. Rulează scan-ul.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {audits.map((a: any) => (
                  <div key={a.id} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <a href={a.page} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex items-center gap-1"><ExternalLink className="w-3 h-3" />{a.page.replace(/^https?:\/\/[^/]+/, "")}</a>
                        <p className="text-sm font-medium mt-1 truncate">{a.title || <span className="text-destructive">[fără title]</span>}</p>
                        <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>{a.word_count || 0} cuv.</span>
                          <span>H2: {a.h2_count || 0}</span>
                          <span>Schema: {(a.schema_types || []).length}</span>
                          <span>Linkuri int: {a.internal_links || 0}</span>
                          {a.images_missing_alt > 0 && <span className="text-amber-600">Alt lipsă: {a.images_missing_alt}/{a.images_total}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-sm font-bold ${a.health_score >= 80 ? "text-emerald-600 border-emerald-500/40" : a.health_score >= 60 ? "text-amber-600 border-amber-500/40" : "text-red-600 border-red-500/40"}`}>
                        {a.health_score}/100
                      </Badge>
                    </div>
                    {Array.isArray(a.issues) && a.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.issues.slice(0, 8).map((i: any, idx: number) => (
                          <Badge key={idx} variant="outline" className={`text-[10px] ${SEVERITY_COLOR[i.severity] || ""}`}>{i.message}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Competitors */}
          <TabsContent value="competitors" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">SERP poziție per query — actualizat săptămânal</p>
              <Button size="sm" variant="outline" onClick={() => triggerJob("Competitor SERP", "seo-competitor-rank-tracker", { limit: 20 })} disabled={running !== null}>
                {running === "Competitor SERP" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Swords className="w-3.5 h-3.5 mr-1.5" />}
                Re-tracking
              </Button>
            </div>
            {matrixQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Niciun ranking încă. Rulează tracking-ul.</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr>
                      <th className="text-left p-2 font-medium">Query</th>
                      {competitorDomains.map(d => (
                        <th key={d} className={`text-center p-2 font-medium ${d === "realtrust.ro" ? "text-primary" : "text-muted-foreground"}`}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixQueries.map(q => (
                      <tr key={q} className="border-b border-border hover:bg-muted/40">
                        <td className="p-2 font-medium truncate max-w-[200px]">{q}</td>
                        {competitorDomains.map(d => {
                          const cell = matrix[q]?.[d];
                          const pos = cell?.position;
                          return (
                            <td key={d} className="text-center p-2">
                              {pos == null ? (
                                <span className="text-muted-foreground/50">—</span>
                              ) : (
                                <Badge variant="outline" className={`text-[10px] ${pos <= 3 ? "border-emerald-500/40 text-emerald-600" : pos <= 5 ? "border-amber-500/40 text-amber-600" : "border-border text-muted-foreground"}`}>
                                  #{pos}
                                </Badge>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Andrei × SEO */}
          <TabsContent value="andrei" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">Total 30z: <b className="ml-1">{bridgeStats.total_30d}</b></Badge>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700"><Phone className="w-3 h-3 mr-1" />Apelate: {bridgeStats.called}</Badge>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700"><PhoneForwarded className="w-3 h-3 mr-1" />Skip: {bridgeStats.skipped}</Badge>
                <Badge variant="outline" className="border-red-500/40 text-red-700"><PhoneOff className="w-3 h-3 mr-1" />Failed: {bridgeStats.failed}</Badge>
              </div>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 px-2" title="Setări retry" aria-label="Setări retry">
                      <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-[11px]">Cooldown {RETRY_COOLDOWN_MIN}m · Max {MAX_RETRIES}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold">Setări retry apeluri</h4>
                      <p className="text-[11px] text-muted-foreground">Aplicate la următoarele retry-uri din UI. Salvare locală per browser.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="retry-cooldown" className="text-xs">Cooldown (minute)</Label>
                      <Input id="retry-cooldown" type="number" min={5} max={720} step={5} defaultValue={RETRY_COOLDOWN_MIN}
                        onBlur={(e) => saveRetrySettings(Number(e.target.value), MAX_RETRIES)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                      <p className="text-[10px] text-muted-foreground">Între 5 și 720 minute.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="retry-max" className="text-xs">Număr maxim încercări / lead</Label>
                      <Input id="retry-max" type="number" min={1} max={10} step={1} defaultValue={MAX_RETRIES}
                        onBlur={(e) => saveRetrySettings(RETRY_COOLDOWN_MIN, Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                      <p className="text-[10px] text-muted-foreground">Între 1 și 10 încercări.</p>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full h-7 text-[11px]"
                      onClick={() => saveRetrySettings(DEFAULT_RETRY_COOLDOWN_MIN, DEFAULT_MAX_RETRIES)}>
                      Resetează la implicit ({DEFAULT_RETRY_COOLDOWN_MIN}m · {DEFAULT_MAX_RETRIES})
                    </Button>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="ghost" onClick={() => triggerJob("Bridge dry-run", "seo-andrei-bridge", { dry_run: true, max_calls: 5 })} disabled={running !== null}>
                  {running === "Bridge dry-run" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  Simulare
                </Button>
                <Button size="sm" variant="outline" onClick={() => triggerJob("Bridge → Andrei", "seo-andrei-bridge", { max_calls: 3 })} disabled={running !== null}>
                  {running === "Bridge → Andrei" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5 mr-1.5" />}
                  Rulează acum
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Detectorul leagă query-urile SEO cu intenție comercială (regim hotelier, vânzare, închiriere, proprietar etc.) de prospectele active cu telefon și declanșează un apel Andrei. Rulare automată: zilnic 06:30.
            </p>
            {bridges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Niciun apel SEO→Andrei încă. Apasă "Rulează acum" pentru a procesa oportunitățile curente.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {bridges.map((b: any) => (
                  <div key={b.id} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={
                            b.status === "called" ? "border-emerald-500/40 text-emerald-700" :
                            b.status === "skipped" ? "border-amber-500/40 text-amber-700" :
                            b.status === "failed" ? "border-red-500/40 text-red-700" :
                            "border-border text-muted-foreground"
                          }>{b.status}</Badge>
                          {b.score_after > b.score_before && (
                            <Badge variant="secondary" className="text-[10px]">scor {b.score_before} → {b.score_after}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{new Date(b.triggered_at).toLocaleString("ro-RO")}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">"{b.query}"</p>
                        {b.prospect && (
                          <p className="text-xs text-muted-foreground truncate">
                            → {b.prospect.title || "Prospect"} · {b.prospect.location || "—"} · {b.prospect.phone_normalized}
                          </p>
                        )}
                        {b.matched_keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {b.matched_keywords.slice(0, 6).map((k: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px]">{k}</Badge>
                            ))}
                          </div>
                        )}
                        {b.call_session && (
                          <div className="mt-2 text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                            Sesiune: <b className="text-foreground">{b.call_session.status}</b>
                            {b.call_session.duration_seconds != null && <> · {b.call_session.duration_seconds}s</>}
                            {b.call_session.outcome_summary && <> · <span className="italic">"{String(b.call_session.outcome_summary).slice(0, 120)}"</span></>}
                          </div>
                        )}
                        {b.status === "failed" && b.auto_dial_response?.error && (
                          <p className="text-[11px] text-red-600 mt-1">{String(b.auto_dial_response.error).slice(0, 200)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {b.page && (
                          <a href={b.page} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline" aria-label="Deschide pagina">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {isRetryEligible(b) && !b.parent_bridge_id && (() => {
                          const cd = cooldownRemainingMin(b);
                          const used = b.retry_count || 0;
                          const maxed = used >= MAX_RETRIES;
                          const disabled = retrying !== null || cd > 0 || maxed;
                          const label = maxed ? `Max retry (${used}/${MAX_RETRIES})` : cd > 0 ? `Așteaptă ${cd}m` : `Retry apel (${used}/${MAX_RETRIES})`;
                          return (
                            <Button size="sm" variant="outline" onClick={() => retryBridge(b.id)} disabled={disabled} className="h-7 text-[11px] px-2" title={label}>
                              {retrying === b.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                              {label}
                            </Button>
                          );
                        })()}
                        {b.retry_count > 0 && !b.parent_bridge_id && (
                          <span className="text-[10px] text-muted-foreground">Retry: {b.retry_count}/{MAX_RETRIES}</span>
                        )}
                        {b.parent_bridge_id && (
                          <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-700">retry #{b.retry_count}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">Trend lung 90 zile (din snapshot zilnic GSC)</p>
              <Button size="sm" variant="outline" onClick={() => triggerJob("Backfill 28z GSC", "gsc-daily-snapshot", { days: 28 })} disabled={running !== null}>
                {running === "Backfill 28z GSC" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                Backfill 28z
              </Button>
            </div>
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Niciun snapshot încă. Apasă "Backfill 28z" pentru a începe.</p>
            ) : (
              <div className="h-[360px] font-sans">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} />
                    <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={fmtCompact} width={48} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={fmtCompact} width={48} tickLine={{ stroke: 'hsl(var(--border))' }} axisLine={{ stroke: 'hsl(var(--border))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Clickuri" />
                    <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Impresii" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SeoAutomationWidget;
