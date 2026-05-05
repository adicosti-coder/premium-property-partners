import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Bot, Play, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
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
}

interface AutonomyRun {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  prospects_ingested: number;
  retention_ingested: number;
  calls_initiated: number;
  followups_auto_approved: number;
  followups_pending_review: number;
  error: string | null;
}

export default function VoiceAgentAutopilot() {
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [runs, setRuns] = useState<AutonomyRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("voice_agent_settings").select("*").eq("id", 1).single(),
      supabase.from("voice_autonomy_runs").select("*").order("started_at", { ascending: false }).limit(10),
    ]);
    setSettings(s as AutopilotSettings);
    setRuns((r as AutonomyRun[]) || []);
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
      title: "🤖 Autopilot rulat",
      description: `${sum.prospects_ingested ?? 0} prospecte • ${sum.calls_initiated ?? 0} apeluri • ${sum.followups_auto_approved ?? 0} follow-up auto`,
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
              Ciclul autonom complet: ingestie → batch dial → auto-approve follow-up sigure → drill nightly → A/B promote winner.
              Rulează automat orar (10–18). Ultima rulare: <strong>{lastTick}</strong>.
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
            <Button size="sm" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
              Rulează acum
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <p className="text-[10px] text-muted-foreground font-normal">Plafon per tick orar (sigur: 3–5).</p>
            </Label>
            <Input type="number" min={1} max={10} value={settings.autopilot_max_per_tick} disabled={saving}
              onChange={(e) => updateSetting({ autopilot_max_per_tick: Math.max(1, Math.min(10, parseInt(e.target.value) || 5)) })}
              className="h-8 w-16 text-xs" />
          </div>
        </div>

        {/* Recent runs */}
        <div>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
            🔄 Ultimele rulări autonome
          </h4>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nicio rulare încă. Apasă „Rulează acum" pentru test.</p>
          ) : (
            <div className="space-y-1">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-[11px] border rounded px-2 py-1.5 bg-card">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[9px] ${
                      r.status === "completed" ? "bg-emerald-600" :
                      r.status === "error" ? "bg-destructive" :
                      r.status === "skipped" ? "bg-muted text-muted-foreground" :
                      "bg-amber-600"
                    }`}>{r.status}</Badge>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(r.started_at), { addSuffix: true, locale: ro })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span title="Prospecte ingerate">📥 {r.prospects_ingested + r.retention_ingested}</span>
                    <span title="Apeluri inițiate">📞 {r.calls_initiated}</span>
                    <span title="Follow-up auto" className="text-emerald-600">✓ {r.followups_auto_approved}</span>
                    {r.followups_pending_review > 0 && (
                      <span title="Follow-up pentru aprobare manuală" className="text-amber-600">
                        <AlertTriangle className="h-2.5 w-2.5 inline" /> {r.followups_pending_review}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground italic border-t pt-2">
          🛡️ <strong>Safety Net activ</strong>: follow-up cu sentiment negativ sau cuvinte de risc (avocat, GDPR, reclamație, „nu mai sunați") rămân în <em>pending_review</em> pentru aprobare manuală 1-click.
        </p>
      </CardContent>
    </Card>
  );
}
