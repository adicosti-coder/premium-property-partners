import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall, MessageSquare, Calendar, TrendingUp, AlertCircle, Loader2, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Period = "today" | "week" | "month";

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

async function loadMetrics(p: Period): Promise<Metrics> {
  const since = periodSinceISO(p);
  const { data, error } = await supabase
    .from("voice_call_sessions")
    .select("call_duration_seconds, ai_summary, ai_sentiment, followup_status, appointment_scheduled_at, is_voicemail")
    .gte("created_at", since);

  if (error || !data) return EMPTY;

  const m: Metrics = { ...EMPTY };
  let totalDur = 0;
  let durCount = 0;

  for (const r of data as any[]) {
    m.initiated++;
    const dur = Number(r.call_duration_seconds || 0);
    if (dur > 5) m.connected++;
    if (dur > 30 && !r.is_voicemail) m.realConversations++;
    if (r.is_voicemail) m.voicemails++;
    if (r.ai_summary) m.withSummary++;
    if (["positive", "very_positive"].includes(r.ai_sentiment)) m.positiveSentiment++;
    if (["auto_approved", "sent"].includes(r.followup_status)) m.followupSent++;
    if (r.appointment_scheduled_at) m.appointments++;
    if (dur > 0) {
      totalDur += dur;
      durCount++;
    }
  }
  m.avgDurationSec = durCount > 0 ? Math.round(totalDur / durCount) : 0;

  // Count invalid numbers detected in this window
  const { count: invalidCount } = await supabase
    .from("prospect_listings")
    .select("*", { count: "exact", head: true })
    .gte("marked_invalid_at", since);
  m.invalidNumbers = invalidCount || 0;

  return m;
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
    ]).then(([m, settings, safety, alert]) => {
      if (!mounted) return;
      setMetrics(m);
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
