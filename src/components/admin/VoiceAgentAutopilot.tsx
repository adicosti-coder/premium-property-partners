import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Bot, Play, RefreshCw, ShieldCheck, AlertTriangle, Clock, History, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ro } from "date-fns/locale";

interface AutopilotSettings {
  autopilot_enabled: boolean;
  autopilot_mode: "full" | "safety_net" | "ingest_only";
  autopilot_max_per_tick: number;
  autopilot_retention_enabled: boolean;
  autopilot_followup_auto_approve: boolean;
  autopilot_followup_min_sentiment: string;
  autopilot_last_tick_at: string | null;
  min_lead_score: number;
  allowed_hours_start: number;
  allowed_hours_end: number;
  max_calls_per_day: number;
}

interface AutonomyRun {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  source: string | null;
  prospects_ingested: number;
  retention_ingested: number;
  calls_initiated: number;
  followups_auto_approved: number;
  followups_pending_review: number;
  error: string | null;
  details: any;
}

interface CommLog {
  id: string;
  created_at: string;
  source: string;
  to_number: string | null;
  status: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  voice_session_id: string | null;
}

function durationLabel(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function VoiceAgentAutopilot() {
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [runs, setRuns] = useState<AutonomyRun[]>([]);
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hourStart, setHourStart] = useState(9);
  const [hourEnd, setHourEnd] = useState(19);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: r }, { data: l }] = await Promise.all([
      supabase.from("voice_agent_settings").select("*").eq("id", 1).single(),
      supabase.from("voice_autonomy_runs").select("*").order("started_at", { ascending: false }).limit(20),
      supabase
        .from("communication_logs")
        .select("id, created_at, source, to_number, status, outcome, duration_seconds, voice_session_id")
        .eq("source", "autopilot")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const set = s as AutopilotSettings;
    setSettings(set);
    setRuns((r as AutonomyRun[]) || []);
    setLogs((l as CommLog[]) || []);
    if (set) {
      setHourStart(set.allowed_hours_start);
      setHourEnd(set.allowed_hours_end);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateSetting = async (patch: Partial<AutopilotSettings>) => {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("voice_agent_settings").update(patch).eq("id", 1);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Eroare salvare", description: error.message });
      load();
    } else {
      toast({ title: "✅ Salvat" });
    }
  };

  const saveSchedule = async () => {
    const start = Math.max(0, Math.min(23, hourStart));
    const end = Math.max(start + 1, Math.min(24, hourEnd));
    await updateSetting({ allowed_hours_start: start, allowed_hours_end: end });
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("voice-agent-autopilot", { body: { source: "manual" } });
    setRunning(false);
    if (error) {
      toast({ variant: "destructive", title: "Eroare", description: error.message });
      return;
    }
    const sum = (data as any)?.summary || {};
    toast({
      title: "🤖 Autopilot rulat manual",
      description: `${sum.prospects_ingested ?? 0} prospecte • ${sum.calls_initiated ?? 0} apeluri inițiate`,
    });
    load();
  };

  if (loading || !settings) {
    return (
      <Card><CardContent className="p-6 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Încarc autopilot…</CardContent></Card>
    );
  }

  const lastTick = settings.autopilot_last_tick_at
    ? formatDistanceToNow(new Date(settings.autopilot_last_tick_at), { addSuffix: true, locale: ro })
    : "niciodată";

  const isActive = settings.autopilot_enabled;

  return (
    <div className="space-y-4">
      <Card className={isActive ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-muted"}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Autopilot Andrei
                <Badge className={`text-[9px] ${isActive ? "bg-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {isActive ? "ACTIV" : "OPRIT"}
                </Badge>
                {settings.autopilot_mode === "safety_net" && (
                  <Badge variant="secondary" className="text-[9px]"><ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Safety Net</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Rulează automat orar ({settings.allowed_hours_start}:00–{settings.allowed_hours_end}:00).
                Ultima rulare: <strong>{lastTick}</strong>.
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={load} aria-label="Reîncarcă datele"><RefreshCw className="h-3 w-3" /></Button>
              <Button size="sm" onClick={runNow} disabled={running}>
                {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                Invocă Autopilot Acum
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schedule widget */}
          <div className="p-3 border rounded-md bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-xs font-semibold">Fereastră orară (Europe/Bucharest)</h4>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <Label className="text-[10px] text-muted-foreground">Start (oră)</Label>
                <Input type="number" min={0} max={23} value={hourStart}
                  onChange={(e) => setHourStart(parseInt(e.target.value) || 0)}
                  className="h-8 w-20 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">End (oră)</Label>
                <Input type="number" min={1} max={24} value={hourEnd}
                  onChange={(e) => setHourEnd(parseInt(e.target.value) || 0)}
                  className="h-8 w-20 text-xs" />
              </div>
              <Button size="sm" onClick={saveSchedule} disabled={saving}
                className="h-8 text-xs">Salvează</Button>
              <span className="text-[10px] text-muted-foreground ml-auto">
                Activ: {settings.allowed_hours_start}:00 → {settings.allowed_hours_end}:00
              </span>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid sm:grid-cols-2 gap-3 p-3 border rounded-md bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs cursor-pointer flex-1" htmlFor="ap-enabled">
                Autopilot activ
                <p className="text-[10px] text-muted-foreground font-normal">Master switch — oprește tot ciclul autonom.</p>
              </Label>
              <Switch id="ap-enabled" checked={settings.autopilot_enabled} disabled={saving}
                onCheckedChange={(v) => updateSetting({ autopilot_enabled: v })} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs cursor-pointer flex-1" htmlFor="ap-retention">
                Retention portofoliu
                <p className="text-[10px] text-muted-foreground font-normal">Sună și proprietarii din portofoliul RealTrust.</p>
              </Label>
              <Switch id="ap-retention" checked={settings.autopilot_retention_enabled} disabled={saving}
                onCheckedChange={(v) => updateSetting({ autopilot_retention_enabled: v })} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs cursor-pointer flex-1" htmlFor="ap-followup">
                Auto-approve follow-up
                <p className="text-[10px] text-muted-foreground font-normal">Trimite automat follow-up când sentiment ≥ neutral și fără risc.</p>
              </Label>
              <Switch id="ap-followup" checked={settings.autopilot_followup_auto_approve} disabled={saving}
                onCheckedChange={(v) => updateSetting({ autopilot_followup_auto_approve: v })} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs flex-1">
                Apeluri max / oră
                <p className="text-[10px] text-muted-foreground font-normal">Plafon per tick orar.</p>
              </Label>
              <Input type="number" min={1} max={50} value={settings.autopilot_max_per_tick} disabled={saving}
                onChange={(e) => updateSetting({ autopilot_max_per_tick: Math.max(1, Math.min(50, parseInt(e.target.value) || 5)) })}
                className="h-8 w-16 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autopilot History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Autopilot History — Ultimele {runs.length} rulări
          </CardTitle>
          <CardDescription className="text-xs">
            Jurnalul rulărilor cron (data, status, apeluri declanșate, durată).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nicio rulare încă.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 px-1">Data/Ora</th>
                    <th className="text-left px-1">Sursă</th>
                    <th className="text-left px-1">Status</th>
                    <th className="text-right px-1">Prospecte</th>
                    <th className="text-right px-1">Apeluri</th>
                    <th className="text-right px-1">Follow-up auto</th>
                    <th className="text-right px-1">Durată</th>
                    <th className="text-left px-1">Notă</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/40">
                      <td className="py-1 px-1 font-mono">
                        {format(new Date(r.started_at), "dd MMM HH:mm", { locale: ro })}
                      </td>
                      <td className="px-1 text-muted-foreground">{r.source || "cron"}</td>
                      <td className="px-1">
                        <Badge className={`text-[9px] ${
                          r.status === "completed" ? "bg-emerald-600" :
                          r.status === "error" ? "bg-destructive" :
                          r.status === "skipped" ? "bg-muted text-muted-foreground" :
                          "bg-amber-600"
                        }`}>{r.status}</Badge>
                      </td>
                      <td className="px-1 text-right font-mono">{r.prospects_ingested + (r.retention_ingested || 0)}</td>
                      <td className="px-1 text-right font-mono">
                        {r.calls_initiated > 0 ? <span className="text-emerald-600 font-semibold">{r.calls_initiated}</span> : 0}
                      </td>
                      <td className="px-1 text-right font-mono">{r.followups_auto_approved}</td>
                      <td className="px-1 text-right text-muted-foreground">{durationLabel(r.started_at, r.ended_at)}</td>
                      <td className="px-1 text-muted-foreground truncate max-w-[180px]" title={r.error || (r.details?.notes?.join("; ") || "")}>
                        {r.error || (r.details?.notes?.[0] || "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Logs (autopilot only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Jurnal apeluri Autopilot — communication_logs
          </CardTitle>
          <CardDescription className="text-xs">
            Fiecare apel declanșat de autopilot (filtrat după <code>source = "autopilot"</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Niciun apel autopilot logat încă.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 px-1">Data/Ora</th>
                    <th className="text-left px-1">Telefon</th>
                    <th className="text-left px-1">Status</th>
                    <th className="text-left px-1">Outcome</th>
                    <th className="text-right px-1">Durată</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/40">
                      <td className="py-1 px-1 font-mono">
                        {format(new Date(l.created_at), "dd MMM HH:mm:ss", { locale: ro })}
                      </td>
                      <td className="px-1 font-mono">{l.to_number || "—"}</td>
                      <td className="px-1">
                        <Badge variant="outline" className="text-[9px]">{l.status || "—"}</Badge>
                      </td>
                      <td className="px-1 text-muted-foreground truncate max-w-[200px]" title={l.outcome || ""}>{l.outcome || "—"}</td>
                      <td className="px-1 text-right font-mono">{l.duration_seconds ? `${l.duration_seconds}s` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground italic">
        🛡️ Safety Net activ: follow-up cu sentiment negativ sau cuvinte de risc rămân în <em>pending_review</em> pentru aprobare manuală.
      </p>
    </div>
  );
}
