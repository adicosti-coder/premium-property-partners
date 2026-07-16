import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, Pause, Play, Power, Shield, Loader2, FlaskConical, Zap,
} from "lucide-react";
import type { Settings, Job } from "./types";

type Props = {
  settings: Settings | null;
  jobs: Job[];
  onChanged: () => void;
};

export function AutomationKillSwitch({ settings, jobs, onChanged }: Props) {
  const [pending, setPending] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [testingHealing, setTestingHealing] = useState(false);
  const [healingTestMode, setHealingTestMode] = useState<"failures" | "timeouts" | "mixed">("mixed");

  const globalOn = settings?.enabled ?? false;

  const toggleGlobal = async (next: boolean) => {
    setPending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("automation_settings")
      .update({
        enabled: next,
        paused_reason: next ? null : "Oprit manual din Admin",
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setPending(false);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next ? "Automatizările au fost pornite" : "Toate automatizările sunt OPRITE",
      description: next
        ? "Joburile activate individual vor rula conform schedule-ului."
        : "Niciun job nu va mai rula până la repornire.",
    });
    onChanged();
  };

  const runAllNow = async () => {
    if (runningAll) return;
    const enabledCount = jobs.filter((j) => j.enabled && j.trigger_type === "cron").length;
    if (enabledCount === 0) {
      toast({ title: "Niciun job activ", description: "Activează cel puțin un job cron înainte.", variant: "destructive" });
      return;
    }
    const confirmed = window.confirm(
      `Vei porni FORȚAT toate cele ${enabledCount} joburi cron active, ignorând schedule-ul. Continui?`,
    );
    if (!confirmed) return;
    setRunningAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("automation-orchestrator", {
        body: { run_all: true },
      });
      if (error) throw error;
      const ran = (data as { ran?: number })?.ran ?? 0;
      const ok = (data as { ok?: number })?.ok ?? 0;
      const failed = (data as { failed?: number })?.failed ?? 0;
      toast({
        title: `Run All → ${ran} joburi pornite`,
        description: `${ok} OK · ${failed} eșuate. Verifică tab-ul Istoric rulaje.`,
        variant: failed > 0 ? "destructive" : "default",
      });
      setTimeout(onChanged, 3000);
    } catch (e: any) {
      toast({
        title: "Eroare Run All",
        description: e?.message || e?.error_description || JSON.stringify(e),
        variant: "destructive",
      });
    } finally {
      setRunningAll(false);
    }
  };

  const runHealingTest = async () => {
    if (testingHealing) return;
    const confirmed = window.confirm(
      `Vei lansa un job DUMMY care simulează ${healingTestMode === "failures" ? "eșuări consecutive" : healingTestMode === "timeouts" ? "timeout-uri repetate" : "eșuări + timeout-uri mixte"} și apoi va declanșa self-healing-ul. Reacția va apărea în tab-ul Live Logs. Continui?`,
    );
    if (!confirmed) return;
    setTestingHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke("automation-self-healing-test", {
        body: { mode: healingTestMode, consecutive_failures: 7 },
      });
      if (error) throw error;
      const ok = (data as { ok?: boolean })?.ok;
      const ms = (data as { ms?: number })?.ms ?? 0;
      toast({
        title: ok ? `🧪 Test self-healing → OK (${ms}ms)` : "🧪 Test self-healing → eșec",
        description: "Deschide tab-ul Live Logs pentru a vedea reacția în timp real.",
        variant: ok ? "default" : "destructive",
      });
      setTimeout(onChanged, 1500);
    } catch (e: any) {
      toast({
        title: "Eroare test self-healing",
        description: e?.message || JSON.stringify(e),
        variant: "destructive",
      });
    } finally {
      setTestingHealing(false);
    }
  };

  return (
    <Card className={globalOn ? "border-primary/40" : "border-destructive/40"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Automation Control Center
            </CardTitle>
            <CardDescription className="mt-1">
              Centralizator pentru toate procesele automate din Admin. Kill switch-ul global oprește instant tot,
              iar fiecare job poate fi controlat individual.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Status global</div>
              <div className="font-semibold flex items-center gap-2">
                {globalOn ? (
                  <><CheckCircle2 className="w-4 h-4 text-primary" /> Pornit</>
                ) : (
                  <><Pause className="w-4 h-4 text-destructive" /> Oprit</>
                )}
              </div>
            </div>
            <Switch
              checked={globalOn}
              disabled={pending}
              onCheckedChange={toggleGlobal}
              aria-label="Kill switch global automatizări"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 p-4 rounded-lg border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Pornește toate automatizările acum
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Forțează rularea imediată a tuturor joburilor cron active, ignorând schedule-ul.
              Self-healing-ul rămâne activ și ajustează automat timeout-uri/retry-uri pe baza performanței.
            </div>
          </div>
          <Button
            size="xl"
            variant="premium"
            onClick={runAllNow}
            disabled={runningAll || !globalOn}
            aria-label="Pornește toate automatizările"
            className="shrink-0"
          >
            {runningAll ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Se pornesc...</>
            ) : (
              <><Play className="w-5 h-5" /> Run All Automations</>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 p-4 rounded-lg border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-600" />
              Test Self-Healing Config
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Lansează un job DUMMY (<code>system.self_healing_dummy</code>) cu rulaje simulate, apoi declanșează
              self-healing-ul. Reacția (auto-disable, adaptive timeout, retry tuning) apare în tab-ul <strong>Live Logs</strong>.
            </div>
          </div>
          <Select value={healingTestMode} onValueChange={(v) => setHealingTestMode(v as "failures" | "timeouts" | "mixed")}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="failures">Doar eșuări</SelectItem>
              <SelectItem value="timeouts">Doar timeout-uri</SelectItem>
              <SelectItem value="mixed">Mixt (default)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="lg"
            variant="outline"
            onClick={runHealingTest}
            disabled={testingHealing}
            aria-label="Testează self-healing"
            className="shrink-0 border-amber-500/60 text-amber-700 hover:bg-amber-500/10"
          >
            {testingHealing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Se simulează...</>
            ) : (
              <><FlaskConical className="w-4 h-4" /> Test Self-Healing</>
            )}
          </Button>
        </div>
      </CardHeader>
      {!globalOn && (
        <CardContent>
          <Alert variant="destructive">
            <Power className="h-4 w-4" />
            <AlertTitle>Toate automatizările sunt oprite</AlertTitle>
            <AlertDescription>
              Niciun job nu va rula. Activează kill switch-ul ca să permiți job-urilor individuale activate
              să se execute conform schedule-ului.
              {settings?.paused_reason && (
                <span className="block mt-1 text-xs opacity-80">Motiv: {settings.paused_reason}</span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
