/**
 * Voice Agent Command Center
 * ──────────────────────────
 * Single-pane "Today View" for Andrei: KPIs, root-cause diagnosis, top 5 hot
 * prospects, callbacks due, and pre-call quality filters. Built because the
 * old Manager tab had 15+ sub-sections but no clear daily action focus, which
 * led to many calls but ~0 closed leads.
 */
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  PhoneCall, TrendingDown, TrendingUp, AlertTriangle, Target, Clock, Loader2,
  CheckCircle2, XCircle, Voicemail, ChevronDown, Settings2, Zap, ShieldAlert, Users, RefreshCw,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MarkAsAgencyButton from "./MarkAsAgencyButton";

const VoiceAgentManager = lazy(() => import("./VoiceAgentManager"));

// ── Types ───────────────────────────────────────────────────────────────────
interface CallStats {
  total: number;
  reached: number;      // ai_outcome in interesat/callback/refuz/discutat
  interested: number;
  callback: number;
  voicemail: number;
  no_connection: number;
  avg_duration: number;
  total_cost: number;
  unique_numbers: number;
  contact_rate: number; // reached / total
  win_rate: number;     // interested / reached
}

interface HotProspect {
  id: string;
  title: string | null;
  zone: string | null;
  price: number | null;
  lead_score: number | null;
  phone_normalized: string | null;
  predictive_score: number | null;
  conversion_probability: number | null;
  last_call_at: string | null;
  call_attempts: number;
}

interface CallbackDue {
  id: string;
  title: string | null;
  phone_normalized: string | null;
  next_callback_at: string;
  callback_attempts: number | null;
  last_failure_reason: string | null;
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sublabel, trend, tone = "neutral", icon: Icon, children,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: "up" | "down" | "flat";
  tone?: "good" | "bad" | "warn" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  const toneCls = {
    good: "border-green-500/30 bg-green-500/5",
    bad: "border-red-500/30 bg-red-500/5",
    warn: "border-amber-500/30 bg-amber-500/5",
    neutral: "border-border bg-card",
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {sublabel && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          <span>{sublabel}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Source health badge ─────────────────────────────────────────────────────
type SourceHealth = {
  source_platform: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  auto_disabled_until: string | null;
  notes: string | null;
};

function SourceBadge({ s }: { s: SourceHealth }) {
  const now = Date.now();
  const disabled = s.auto_disabled_until && new Date(s.auto_disabled_until).getTime() > now;
  const failing = s.consecutive_failures >= 2 || disabled;
  const warn = s.consecutive_failures === 1 || (!s.last_success_at && !s.last_failure_at);
  const tone = failing ? "bg-red-500" : warn ? "bg-amber-500" : "bg-green-500";
  const tip = disabled
    ? `Dezactivat până ${new Date(s.auto_disabled_until!).toLocaleString("ro-RO")}${s.notes ? ` — ${s.notes}` : ""}`
    : failing
    ? `${s.consecutive_failures} eșecuri consecutive${s.last_failure_at ? ` — ultim: ${new Date(s.last_failure_at).toLocaleString("ro-RO")}` : ""}`
    : warn
    ? "Atenție — fără succes recent"
    : `OK — ultim succes ${s.last_success_at ? new Date(s.last_success_at).toLocaleString("ro-RO") : "—"}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60 hover:bg-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
          <span className="truncate max-w-[70px]">{s.source_platform}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function VoiceAgentCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [statsAll, setStatsAll] = useState<CallStats | null>(null);
  const [hotProspects, setHotProspects] = useState<HotProspect[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackDue[]>([]);
  const [callingId, setCallingId] = useState<string | null>(null);

  // Quality filters (saved to localStorage)
  const [skipPreviouslyCalled, setSkipPreviouslyCalled] = useState(
    typeof window !== "undefined" && localStorage.getItem("va_skip_called_3x") !== "false",
  );
  const [requireScoreThreshold, setRequireScoreThreshold] = useState(
    typeof window !== "undefined" && localStorage.getItem("va_min_score_70") !== "false",
  );
  useEffect(() => { localStorage.setItem("va_skip_called_3x", String(skipPreviouslyCalled)); }, [skipPreviouslyCalled]);
  useEffect(() => { localStorage.setItem("va_min_score_70", String(requireScoreThreshold)); }, [requireScoreThreshold]);

  // ── Load data ────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
      const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();

      // Call sessions (7d + 30d)
      const [{ data: c7 }, { data: c30 }] = await Promise.all([
        supabase.from("voice_call_sessions")
          .select("id, to_number, status, ai_outcome, call_duration_seconds, cost_estimate_usd, is_voicemail, answered_by, created_at")
          .gte("created_at", since7d).limit(1000),
        supabase.from("voice_call_sessions")
          .select("id, to_number, status, ai_outcome, call_duration_seconds, cost_estimate_usd, is_voicemail, answered_by, created_at")
          .gte("created_at", since30d).limit(2000),
      ]);

      const computeStats = (rows: any[]): CallStats => {
        const total = rows.length;
        const reached = rows.filter(r => ["interesat","callback","refuz","discutat","not_interested","interested"].includes(r.ai_outcome || "")).length;
        const interested = rows.filter(r => ["interesat", "interested"].includes(r.ai_outcome || "")).length;
        const callback = rows.filter(r => r.ai_outcome === "callback").length;
        const voicemail = rows.filter(r => r.is_voicemail || r.ai_outcome === "robot" || (r.answered_by || "").startsWith("machine_")).length;
        const no_connection = rows.filter(r => r.ai_outcome === "nicio_legatura" || (!r.ai_outcome && ["no-answer","busy","failed"].includes(r.status))).length;
        const durations = rows.map(r => r.call_duration_seconds).filter((x): x is number => typeof x === "number");
        const avg_duration = durations.length ? durations.reduce((a,b)=>a+b,0) / durations.length : 0;
        const total_cost = rows.reduce((s,r) => s + (r.cost_estimate_usd || 0), 0);
        const unique_numbers = new Set(rows.map(r => r.to_number).filter(Boolean)).size;
        return {
          total, reached, interested, callback, voicemail, no_connection,
          avg_duration, total_cost, unique_numbers,
          contact_rate: total ? reached / total : 0,
          win_rate: reached ? interested / reached : 0,
        };
      };

      setStats(computeStats(c7 || []));
      setStatsAll(computeStats(c30 || []));

      // Hot prospects: active, has phone, not agency, not DNC, status open
      let q = supabase.from("prospect_listings")
        .select("id, title, zone, price, lead_score, phone_normalized, predictive_score, conversion_probability, last_retry_at, retry_count")
        .eq("is_active", true)
        .not("phone_normalized", "is", null)
        .neq("prospect_type", "agentie")
        .neq("do_not_call", true)
        .in("lifecycle_status", ["new", "callback", "interested", "scoring"]);

      if (requireScoreThreshold) q = q.gte("lead_score", 70);
      if (skipPreviouslyCalled) q = q.or("retry_count.is.null,retry_count.lt.3");

      const { data: hot } = await q.order("predictive_score", { ascending: false, nullsFirst: false })
        .order("lead_score", { ascending: false }).limit(5);

      setHotProspects((hot || []).map((p: any) => ({
        id: p.id, title: p.title, zone: p.zone, price: p.price,
        lead_score: p.lead_score, phone_normalized: p.phone_normalized,
        predictive_score: p.predictive_score,
        conversion_probability: p.conversion_probability,
        last_call_at: p.last_retry_at, call_attempts: p.retry_count || 0,
      })));

      // Callbacks due today
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { data: cb } = await supabase.from("prospect_listings")
        .select("id, title, phone_normalized, next_callback_at, callback_attempts, last_failure_reason")
        .not("next_callback_at", "is", null)
        .lte("next_callback_at", endOfDay.toISOString())
        .eq("is_active", true)
        .neq("prospect_type", "agentie")
        .order("next_callback_at", { ascending: true }).limit(10);

      setCallbacks((cb || []) as CallbackDue[]);
    } catch (e) {
      console.error("[CommandCenter] load failed", e);
      toast({ title: "Eroare", description: "Nu am putut încărca datele.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [skipPreviouslyCalled, requireScoreThreshold]);

  // ── Quick call ────────────────────────────────────────────────────────────
  const callNow = async (prospectId: string, source = "command_center") => {
    setCallingId(prospectId);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-auto-dial", {
        body: { prospect_id: prospectId, manual: true, source },
      });
      if (error) throw error;
      if (data?.skipped) {
        toast({ title: "Apel sărit", description: data.skipped, variant: "destructive" });
      } else {
        toast({ title: "Apel pornit", description: "Andrei sună acum.", });
        setHotProspects(prev => prev.filter(p => p.id !== prospectId));
      }
    } catch (e: any) {
      toast({ title: "Eroare apel", description: e.message, variant: "destructive" });
    } finally {
      setCallingId(null);
    }
  };

  // ── Root-cause diagnosis ──────────────────────────────────────────────────
  const diagnosis = useMemo(() => {
    if (!stats || stats.total === 0) {
      return { tone: "warn" as const, title: "Niciun apel în ultimele 7 zile", advice: "Verifică automatizările (Autopilot, Batch Calling) sau pornește o sesiune manuală din lista de mai jos." };
    }
    if (stats.contact_rate < 0.25) {
      return { tone: "bad" as const, title: `Rată de contact slabă: ${(stats.contact_rate * 100).toFixed(0)}%`, advice: `${stats.no_connection} apeluri fără răspuns + ${stats.voicemail} voicemail. Activează filtrul "Skip numere cu 3+ încercări" și verifică ora apelurilor (10-18 e optim).` };
    }
    if (stats.reached > 0 && stats.win_rate < 0.15) {
      return { tone: "bad" as const, title: `Win rate sub 15%: ${(stats.win_rate * 100).toFixed(0)}%`, advice: "Apelurile ajung la oameni dar Andrei nu închide. Verifică opening-ul + obiecțiile recent picate în Training Lab." };
    }
    if (stats.unique_numbers < 30) {
      return { tone: "warn" as const, title: `Pool prea mic: doar ${stats.unique_numbers} numere unice apelate`, advice: "Crește descoperirea de prospecți: rulează Keyword Radar + verifică surse scraper inactive." };
    }
    if (stats.interested === 0) {
      return { tone: "warn" as const, title: "0 lead-uri interesate săptămâna asta", advice: "Calitate slabă pipeline. Crește lead_score threshold la 75+ și activează filtrul agencies." };
    }
    return { tone: "good" as const, title: `${stats.interested} lead-uri calde + ${stats.callback} callback-uri`, advice: "Pipeline sănătos. Concentrează-te pe follow-up rapid (sub 1h)." };
  }, [stats]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" /> Command Center — Andrei
          </h2>
          <p className="text-sm text-muted-foreground">
            Focus pe acțiune: ce trebuie făcut acum ca să închizi lead-uri. Operațional avansat în josul paginii.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} Refresh
        </Button>
      </div>

      {/* KPI Strip 7d */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Apeluri 7z" value={stats?.total ?? 0} sublabel={`${statsAll?.total ?? 0} ultimele 30z`} icon={PhoneCall} tone="neutral" />
        <KpiCard
          label="Contact rate"
          value={`${((stats?.contact_rate ?? 0) * 100).toFixed(0)}%`}
          sublabel={`${stats?.reached ?? 0} cu răspuns`}
          icon={Target}
          tone={(stats?.contact_rate ?? 0) >= 0.4 ? "good" : (stats?.contact_rate ?? 0) >= 0.25 ? "warn" : "bad"}
        />
        <KpiCard
          label="Win rate"
          value={`${((stats?.win_rate ?? 0) * 100).toFixed(0)}%`}
          sublabel={`${stats?.interested ?? 0} interesați`}
          icon={CheckCircle2}
          tone={(stats?.win_rate ?? 0) >= 0.2 ? "good" : (stats?.win_rate ?? 0) >= 0.1 ? "warn" : "bad"}
        />
        <KpiCard label="Callbacks" value={stats?.callback ?? 0} sublabel="programate" icon={Clock} tone="neutral" />
        <KpiCard label="Voicemail" value={stats?.voicemail ?? 0} sublabel={`${((stats?.voicemail ?? 0) / Math.max(1, stats?.total ?? 1) * 100).toFixed(0)}% din apeluri`} icon={Voicemail} tone="warn" />
        <KpiCard label="Pool unic" value={stats?.unique_numbers ?? 0} sublabel={`avg ${(stats?.avg_duration ?? 0).toFixed(0)}s/apel`} icon={Users} tone={(stats?.unique_numbers ?? 0) < 30 ? "warn" : "neutral"} />
      </div>

      {/* Diagnosis banner */}
      <div className={`rounded-lg border p-4 flex items-start gap-3 ${
        diagnosis.tone === "bad" ? "border-red-500/40 bg-red-500/10" :
        diagnosis.tone === "warn" ? "border-amber-500/40 bg-amber-500/10" :
        "border-green-500/40 bg-green-500/10"
      }`}>
        {diagnosis.tone === "bad" ? <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> :
         diagnosis.tone === "warn" ? <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" /> :
         <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
        <div>
          <div className="font-semibold text-foreground">{diagnosis.title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{diagnosis.advice}</div>
        </div>
      </div>

      {/* Two-col: Hot Prospects + Callbacks Due */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot Prospects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" /> Top 5 prospecți — sună acum
            </CardTitle>
            <CardDescription>
              Sortați după probabilitate de conversie + lead score, filtrați după calitate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotProspects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                Niciun prospect calificat. Relaxează filtrele de mai jos sau rulează Keyword Radar.
              </p>
            ) : hotProspects.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 font-bold text-sm flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{p.title || "(fără titlu)"}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    {p.zone && <Badge variant="outline" className="text-[10px] h-4 px-1">{p.zone}</Badge>}
                    {p.price ? <span>€{p.price.toLocaleString("ro-RO")}</span> : null}
                    <span>score {p.lead_score ?? "—"}</span>
                    {p.predictive_score != null && <span className="text-amber-600">AI {p.predictive_score}</span>}
                    {p.call_attempts > 0 && <span className="text-red-500">{p.call_attempts}× încercări</span>}
                  </div>
                </div>
                <Button size="sm" onClick={() => callNow(p.id)} disabled={callingId === p.id} className="flex-shrink-0">
                  {callingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PhoneCall className="h-3 w-3" />}
                  <span className="ml-1.5 hidden sm:inline">Sună</span>
                </Button>
                <MarkAsAgencyButton
                  id={p.id}
                  phone={p.phone_normalized}
                  variant="icon"
                  onMarked={() => setHotProspects(prev => prev.filter(x => x.id !== p.id))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Callbacks due */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" /> Callback-uri pentru azi
            </CardTitle>
            <CardDescription>
              Persoane care au cerut explicit să fie sunate înapoi — prioritate maximă.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {callbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                Niciun callback programat pentru azi.
              </p>
            ) : callbacks.map(cb => {
              const dueDate = new Date(cb.next_callback_at);
              const overdue = dueDate.getTime() < Date.now();
              return (
                <div key={cb.id} className={`flex items-center gap-3 p-3 rounded-md border ${overdue ? "border-red-500/40 bg-red-500/5" : "border-border bg-muted/30"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{cb.title || "(fără titlu)"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className={overdue ? "text-red-500 font-medium" : ""}>
                        {overdue ? "În întârziere" : "La"} {dueDate.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {cb.callback_attempts != null && cb.callback_attempts > 0 && <span>{cb.callback_attempts}× încercări</span>}
                    </div>
                  </div>
                  <Button size="sm" variant={overdue ? "destructive" : "default"} onClick={() => callNow(cb.id, "callback_due")} disabled={callingId === cb.id}>
                    {callingId === cb.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PhoneCall className="h-3 w-3" />}
                    <span className="ml-1.5 hidden sm:inline">Sună</span>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quality filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" /> Filtre calitate pre-call
          </CardTitle>
          <CardDescription>
            Reduc apelurile irelevante către lead-uri slabe sau imposibile. Aplicate live pe lista de hot prospects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-border">
            <div>
              <Label className="font-medium">Sări peste numere cu 3+ încercări fără răspuns</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Evită să mai pierzi timp pe numere care nu răspund.</p>
            </div>
            <Switch checked={skipPreviouslyCalled} onCheckedChange={setSkipPreviouslyCalled} />
          </div>
          <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-border">
            <div>
              <Label className="font-medium">Doar lead-uri cu score ≥ 70</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Concentrează Andrei pe prospecți cu potențial real de conversie.</p>
            </div>
            <Switch checked={requireScoreThreshold} onCheckedChange={setRequireScoreThreshold} />
          </div>
          <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <Label className="font-medium">Blochează automat agențiile detectate</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Activ permanent. Configurabil în "Operațional &gt; Filtre Agenții".</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-500/30">Activ</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Advanced (collapsed) */}
      <Collapsible className="rounded-lg border border-border bg-muted/30">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/60 transition-colors rounded-lg">
            <div>
              <div className="font-semibold text-foreground">Operațional avansat</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Monitoring live, scripts, training lab, A/B tests, batch calling, autopilot, knowledge base, caller profiles, follow-up queue, ghosting queue, simulator, smart clusters, triage și keyword radar.
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-2 border-t border-border">
            <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
              <VoiceAgentManager />
            </Suspense>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
