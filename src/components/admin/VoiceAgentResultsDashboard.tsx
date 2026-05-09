import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall, MessageSquare, Calendar, TrendingUp, AlertCircle, Loader2, PieChart as PieChartIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

type Period = "today" | "week" | "month";
type HourWindow = "Dimineață" | "Prânz" | "Seară" | "Off-hours";

function hourWindow(d: Date): HourWindow {
  const h = d.getHours();
  if (h >= 8 && h < 12) return "Dimineață";
  if (h >= 12 && h < 17) return "Prânz";
  if (h >= 17 && h < 21) return "Seară";
  return "Off-hours";
}

interface HourBucket {
  window: HourWindow;
  initiated: number;
  real: number;
  voicemails: number;
  busy: number;
  noAnswer: number;
}

interface Metrics {
  initiated: number;
  connected: number;
  realConversations: number;
  withSummary: number;
  followupSent: number;
  positiveSentiment: number;
  appointments: number;
  avgDurationSec: number;
  voicemails: number;
  invalidNumbers: number;
  busy: number;
  noAnswer: number;
}

interface RoiAlert {
  triggered: boolean;
  realRatePct: number;
  sampleSize: number;
}

const EMPTY: Metrics = {
  initiated: 0, connected: 0, realConversations: 0, withSummary: 0,
  followupSent: 0, positiveSentiment: 0, appointments: 0, avgDurationSec: 0,
  voicemails: 0, invalidNumbers: 0, busy: 0, noAnswer: 0,
};

const PERIOD_LABEL: Record<Period, string> = {
  today: "Azi",
  week: "Ultimele 7 zile",
  month: "Ultimele 30 zile",
};

function periodSinceISO(p: Period): string {
  const d = new Date();
  if (p === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (p === "week") {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 30);
  }
  return d.toISOString();
}

async function loadMetrics(p: Period): Promise<{ metrics: Metrics; buckets: HourBucket[]; rawRows: any[] }> {
  const since = periodSinceISO(p);
  const { data, error } = await supabase
    .from("voice_call_sessions")
    .select("call_duration_seconds, ai_summary, ai_sentiment, followup_status, appointment_scheduled_at, is_voicemail, status, twilio_failure_reason, created_at")
    .gte("created_at", since);

  if (error || !data) return { metrics: EMPTY, buckets: [], rawRows: [] };

  const m: Metrics = { ...EMPTY };
  let totalDur = 0;
  let durCount = 0;
  const bucketMap = new Map<HourWindow, HourBucket>();
  const ensure = (w: HourWindow) => {
    let b = bucketMap.get(w);
    if (!b) { b = { window: w, initiated: 0, real: 0, voicemails: 0, busy: 0, noAnswer: 0 }; bucketMap.set(w, b); }
    return b;
  };

  for (const r of data as any[]) {
    m.initiated++;
    const dur = Number(r.call_duration_seconds || 0);
    if (dur > 5) m.connected++;
    if (dur > 30 && !r.is_voicemail) m.realConversations++;
    if (r.is_voicemail) m.voicemails++;
    if (r.status === "busy") m.busy++;
    if (r.status === "no-answer") m.noAnswer++;
    if (r.ai_summary) m.withSummary++;
    if (["positive", "very_positive"].includes(r.ai_sentiment)) m.positiveSentiment++;
    if (["auto_approved", "sent"].includes(r.followup_status)) m.followupSent++;
    if (r.appointment_scheduled_at) m.appointments++;
    if (dur > 0) { totalDur += dur; durCount++; }

    const w = hourWindow(new Date(r.created_at));
    const b = ensure(w);
    b.initiated++;
    if (dur > 30 && !r.is_voicemail) b.real++;
    if (r.is_voicemail) b.voicemails++;
    if (r.status === "busy") b.busy++;
    if (r.status === "no-answer") b.noAnswer++;
  }
  m.avgDurationSec = durCount > 0 ? Math.round(totalDur / durCount) : 0;

  const { count: invalidCount } = await supabase
    .from("prospect_listings")
    .select("*", { count: "exact", head: true })
    .gte("marked_invalid_at", since);
  m.invalidNumbers = invalidCount || 0;

  const order: HourWindow[] = ["Dimineață", "Prânz", "Seară", "Off-hours"];
  const buckets = order.map((w) => bucketMap.get(w) || { window: w, initiated: 0, real: 0, voicemails: 0, busy: 0, noAnswer: 0 });
  return { metrics: m, buckets, rawRows: data as any[] };
}

async function loadRoiAlert(): Promise<RoiAlert> {
  // Last 20 outbound calls — compute real-conversation rate
  const { data } = await supabase
    .from("voice_call_sessions")
    .select("call_duration_seconds, is_voicemail")
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (data || []) as any[];
  if (rows.length < 20) return { triggered: false, realRatePct: 0, sampleSize: rows.length };
  const real = rows.filter((r) => Number(r.call_duration_seconds || 0) > 30 && !r.is_voicemail).length;
  const ratePct = Math.round((real / rows.length) * 100);
  return { triggered: ratePct < 10, realRatePct: ratePct, sampleSize: rows.length };
}

function pct(n: number, d: number): string {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: "default" | "success" | "warning" | "danger";
}
const MetricCard = ({ icon, label, value, subtitle, tone = "default" }: MetricCardProps) => (
  <div
    className={cn(
      "rounded-lg border p-3 bg-card",
      tone === "success" && "border-green-500/30 bg-green-500/5",
      tone === "warning" && "border-amber-500/30 bg-amber-500/5",
      tone === "danger" && "border-red-500/30 bg-red-500/5"
    )}
  >
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
  </div>
);

const VoiceAgentResultsDashboard = () => {
  const [period, setPeriod] = useState<Period>("week");
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);
  const [buckets, setBuckets] = useState<HourBucket[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autopilotOn, setAutopilotOn] = useState<boolean | null>(null);
  const [pausedReason, setPausedReason] = useState<string | null>(null);
  const [roiAlert, setRoiAlert] = useState<RoiAlert>({ triggered: false, realRatePct: 0, sampleSize: 0 });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      loadMetrics(period),
      supabase.from("voice_agent_settings").select("autopilot_enabled").eq("id", 1).maybeSingle(),
      supabase.from("voice_agent_safety_state").select("calls_paused, paused_reason").eq("id", true).maybeSingle(),
      loadRoiAlert(),
    ]).then(([res, settings, safety, alert]) => {
      if (!mounted) return;
      setMetrics(res.metrics);
      setBuckets(res.buckets);
      setRawRows(res.rawRows);
      setAutopilotOn(settings.data?.autopilot_enabled ?? null);
      setPausedReason(
        safety.data?.calls_paused ? (safety.data?.paused_reason || "Pauză activă") : null
      );
      setRoiAlert(alert);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [period]);

  const conversionRate = pct(metrics.appointments, metrics.initiated);
  const connectRate = pct(metrics.connected, metrics.initiated);
  const realRate = pct(metrics.realConversations, metrics.initiated);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Rezultate Andrei
            </CardTitle>
            <CardDescription>
              Ce a livrat agentul vocal — date reale, fără teorie.
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CRITICAL ROI ALERT — last 20 calls below 10% real-conversation rate */}
        {roiAlert.triggered && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border-2 border-red-500/60 bg-red-500/10 p-3 text-sm animate-pulse"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-700 dark:text-red-400">
                🚨 ROI critic — doar {roiAlert.realRatePct}% conversații reale în ultimele {roiAlert.sampleSize} apeluri
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Pragul de siguranță este 10%. Verifică numărul Twilio (poate apare ca SPAM), calitatea numerelor scrapate sau pune autopilot-ul pe pauză până când rezolvi cauza.
              </div>
            </div>
          </div>
        )}

        {/* Status banner */}
        {pausedReason && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-700 dark:text-amber-400">
                Andrei e în pauză
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{pausedReason}</div>
            </div>
          </div>
        )}
        {!pausedReason && autopilotOn === false && (
          <div className="rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
            Autopilot oprit. Apelurile pot fi inițiate doar manual.
          </div>
        )}
        {autopilotOn === true && !pausedReason && (
          <Badge variant="default" className="bg-green-600">Autopilot activ</Badge>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculez bilanțul...
          </div>
        ) : (
          <>
            {/* Funnel: top of funnel → bottom */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Pâlnia apelurilor
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MetricCard
                  icon={<Phone className="w-3.5 h-3.5" />}
                  label="Apeluri inițiate"
                  value={metrics.initiated}
                />
                <MetricCard
                  icon={<PhoneCall className="w-3.5 h-3.5" />}
                  label="Conectate (>5s)"
                  value={metrics.connected}
                  subtitle={`${connectRate} din inițiate`}
                  tone={metrics.connected === 0 && metrics.initiated > 0 ? "danger" : "default"}
                />
                <MetricCard
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  label="Conversații reale (>30s)"
                  value={metrics.realConversations}
                  subtitle={`${realRate} din inițiate`}
                  tone={metrics.realConversations === 0 && metrics.initiated > 0 ? "danger" : "success"}
                />
                <MetricCard
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Programări obținute"
                  value={metrics.appointments}
                  subtitle={`${conversionRate} conversie totală`}
                  tone={metrics.appointments > 0 ? "success" : "default"}
                />
              </div>
            </div>

            {/* Output: ce a produs concret */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Output produs & curățare
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MetricCard
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  label="Rezumate AI"
                  value={metrics.withSummary}
                />
                <MetricCard
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Sentiment pozitiv"
                  value={metrics.positiveSentiment}
                  tone={metrics.positiveSentiment > 0 ? "success" : "default"}
                />
                <MetricCard
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  label="Follow-up trimise"
                  value={metrics.followupSent}
                  tone={metrics.followupSent > 0 ? "success" : "default"}
                />
                <MetricCard
                  icon={<PhoneCall className="w-3.5 h-3.5" />}
                  label="Durată medie"
                  value={`${metrics.avgDurationSec}s`}
                  tone={metrics.avgDurationSec < 15 && metrics.initiated > 0 ? "warning" : "default"}
                />
                <MetricCard
                  icon={<PhoneCall className="w-3.5 h-3.5" />}
                  label="Robot / mesagerie"
                  value={metrics.voicemails}
                  subtitle="Excluse din conv. reale"
                  tone={metrics.voicemails > 0 ? "warning" : "default"}
                />
                <MetricCard
                  icon={<AlertCircle className="w-3.5 h-3.5" />}
                  label="Numere invalide marcate"
                  value={metrics.invalidNumbers}
                  subtitle="Curățare automată"
                  tone={metrics.invalidNumbers > 0 ? "warning" : "default"}
                />
              </div>
            </div>

            {/* Heatmap Ferestre Orare — Rata de răspuns pe interval orar */}
            {(() => {
              const data = buckets.map((b) => ({
                window: b.window,
                rate: b.initiated > 0 ? Math.round((b.real / b.initiated) * 100) : 0,
                real: b.real,
                initiated: b.initiated,
              }));
              const hasData = buckets.some((b) => b.initiated > 0);
              if (!hasData) return null;
              return (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Heatmap răspuns pe ferestre orare (Timișoara)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    {buckets.map((b) => {
                      const rate = b.initiated > 0 ? Math.round((b.real / b.initiated) * 100) : 0;
                      const intensity = Math.min(rate / 50, 1); // 50% = full
                      return (
                        <div
                          key={b.window}
                          className="rounded-md border p-2.5 transition-colors"
                          style={{ backgroundColor: b.initiated > 0 ? `hsl(142 71% 45% / ${0.08 + intensity * 0.35})` : undefined }}
                        >
                          <div className="text-[11px] text-muted-foreground">{b.window}</div>
                          <div className="text-xl font-bold">{rate}%</div>
                          <div className="text-[10px] text-muted-foreground">{b.real}/{b.initiated} reale</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-[180px] rounded-md border bg-card p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="window" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                        <Tooltip formatter={(v: any, n: any, p: any) => [`${v}% (${p.payload.real}/${p.payload.initiated})`, "Rată răspuns"]} />
                        <Bar dataKey="rate" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
            {/* Pie Chart — Distribuția pierderilor */}
            {(() => {
              const lossData = [
                { name: "Mesagerie vocală", value: metrics.voicemails, color: "hsl(var(--primary))" },
                { name: "Număr invalid", value: metrics.invalidNumbers, color: "hsl(0 84% 60%)" },
                { name: "Ocupat", value: metrics.busy, color: "hsl(38 92% 50%)" },
                { name: "Nu răspunde", value: metrics.noAnswer, color: "hsl(217 91% 60%)" },
              ].filter((d) => d.value > 0);
              const totalLoss = lossData.reduce((s, d) => s + d.value, 0);
              if (totalLoss === 0) return null;
              return (
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <PieChartIcon className="w-3.5 h-3.5" />
                      Raport pierderi ({totalLoss} apeluri pierdute)
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        // Per-window × per-category breakdown
                        const windows: HourWindow[] = ["Dimineață", "Prânz", "Seară", "Off-hours"];
                        const cats: { key: keyof HourBucket; label: string }[] = [
                          { key: "voicemails", label: "Mesagerie vocală" },
                          { key: "busy", label: "Ocupat" },
                          { key: "noAnswer", label: "Nu răspunde" },
                        ];
                        const rows: string[][] = [
                          ["Categorie", "Fereastra Orară", "Apeluri", "Procent din pierderi", "Perioada"],
                        ];
                        for (const cat of cats) {
                          for (const w of windows) {
                            const b = buckets.find((x) => x.window === w);
                            const v = (b?.[cat.key] as number) || 0;
                            if (v > 0) rows.push([
                              cat.label, w, String(v),
                              `${Math.round((v / totalLoss) * 100)}%`,
                              PERIOD_LABEL[period],
                            ]);
                          }
                        }
                        // Plus "Număr invalid" (nu are timestamp pe sesiune — doar total)
                        if (metrics.invalidNumbers > 0) {
                          rows.push(["Număr invalid", "Total perioadă", String(metrics.invalidNumbers),
                            `${Math.round((metrics.invalidNumbers / totalLoss) * 100)}%`, PERIOD_LABEL[period]]);
                        }
                        rows.push(["TOTAL", "—", String(totalLoss), "100%", PERIOD_LABEL[period]]);
                        const csv = rows
                          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                          .join("\n");
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `pierderi-andrei-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-3 h-3 mr-1.5" />
                      Export CSV
                    </Button>
                  </div>
                  <div className="h-[240px] rounded-md border bg-card p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={lossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={(e: any) => `${e.name}: ${e.value}`}>
                          {lossData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: any, n: any) => [`${v} apeluri (${Math.round((Number(v)/totalLoss)*100)}%)`, n]} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* Verdict automat */}
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-semibold mb-1">Verdict — {PERIOD_LABEL[period]}</div>
              <div className="text-muted-foreground text-xs leading-relaxed">
                {metrics.initiated === 0 ? (
                  "Niciun apel inițiat în această perioadă."
                ) : metrics.realConversations === 0 ? (
                  <>
                    {metrics.initiated} apeluri inițiate, dar <strong>0 conversații reale</strong> (peste 30s).
                    Apelurile cad imediat — fie nu răspunde nimeni, fie închid în primele secunde.
                    Andrei nu a generat încă valoare — verifică numerele scrapate, numărul Twilio și webhook-ul de status.
                  </>
                ) : metrics.appointments === 0 ? (
                  <>
                    {metrics.realConversations} conversații reale, dar <strong>0 programări</strong>.
                    Andrei vorbește cu oamenii, dar scriptul nu îi convertește. Revizuiește închiderea conversației.
                  </>
                ) : (
                  <>
                    Andrei a generat <strong>{metrics.appointments} programări</strong> din {metrics.initiated} apeluri ({conversionRate} conversie).
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceAgentResultsDashboard;
