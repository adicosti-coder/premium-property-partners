import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Shield, RotateCcw } from "lucide-react";

type Cfg = {
  failure_disable_threshold: number;
  timeout_bump_ratio: number;
  timeout_ceiling_ms: number;
  default_timeout_ms: number;
  success_rate_low: number;
  success_rate_high: number;
  recent_runs_window: number;
  stale_threshold_minutes: number;
  retention_days: number;
};

const DEFAULTS: Cfg = {
  failure_disable_threshold: 5,
  timeout_bump_ratio: 1.25,
  timeout_ceiling_ms: 120000,
  default_timeout_ms: 50000,
  success_rate_low: 0.5,
  success_rate_high: 0.9,
  recent_runs_window: 20,
  stale_threshold_minutes: 120,
  retention_days: 30,
};

const FIELDS: Array<{
  key: keyof Cfg;
  label: string;
  description: string;
  step?: number;
  min?: number;
  max?: number;
}> = [
  { key: "failure_disable_threshold", label: "Auto-disable după N eșuări consecutive", description: "Pragul la care un job este oprit automat după eșuări la rând.", min: 2, max: 20, step: 1 },
  { key: "timeout_bump_ratio", label: "Adaptive timeout — factor de creștere", description: "Multiplicator aplicat timeout-ului când avg duration > 80% sau ≥2 timeouts (ex: 1.25 = +25%).", min: 1.05, max: 3, step: 0.05 },
  { key: "timeout_ceiling_ms", label: "Timeout maxim (ms)", description: "Plafonul absolut peste care timeout-ul nu mai crește.", min: 10000, max: 300000, step: 5000 },
  { key: "default_timeout_ms", label: "Timeout implicit (ms)", description: "Timeout aplicat joburilor care nu au config.timeout_ms setat.", min: 5000, max: 120000, step: 1000 },
  { key: "success_rate_low", label: "Prag success-rate scăzut", description: "Sub această rată (ex 0.5 = 50%), retry-urile sunt dezactivate pentru a evita amplificarea eșecurilor.", min: 0.1, max: 0.9, step: 0.05 },
  { key: "success_rate_high", label: "Prag success-rate ridicat", description: "Peste această rată (ex 0.9 = 90%), retry-urile sunt restaurate la 1.", min: 0.5, max: 1, step: 0.05 },
  { key: "recent_runs_window", label: "Fereastra rulări recente", description: "Câte rulări recente sunt analizate per job pentru tuning.", min: 5, max: 100, step: 1 },
  { key: "stale_threshold_minutes", label: "Stale threshold (minute)", description: "După câte minute peste ultimul tick scheduled jobul este marcat stale.", min: 30, max: 720, step: 10 },
  { key: "retention_days", label: "Retenție automation_runs (zile)", description: "Rulările mai vechi de N zile sunt curățate automat.", min: 7, max: 180, step: 1 },
];

export const SelfHealingSettings = () => {
  const [cfg, setCfg] = useState<Cfg>(DEFAULTS);
  const [original, setOriginal] = useState<Cfg>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("automation_settings")
        .select("self_healing_config")
        .eq("id", true)
        .maybeSingle();
      const raw = (data as { self_healing_config?: Partial<Cfg> } | null)?.self_healing_config ?? {};
      const merged = { ...DEFAULTS, ...raw } as Cfg;
      setCfg(merged);
      setOriginal(merged);
      setLoading(false);
    })();
  }, []);

  const dirty = JSON.stringify(cfg) !== JSON.stringify(original);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("automation_settings")
      .update({ self_healing_config: cfg, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast({ title: "Eroare la salvare", description: error.message, variant: "destructive" });
      return;
    }
    setOriginal(cfg);
    toast({ title: "Setări salvate", description: "Orchestratorul și self-healing-ul vor folosi noile praguri la următoarea rulare." });
  };

  const resetDefaults = () => setCfg(DEFAULTS);

  return (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Parametri self-healing — editabili</AlertTitle>
        <AlertDescription>
          Aceste valori sunt citite dinamic de <code>automation-self-healing</code> și
          <code> automation-orchestrator</code> la fiecare tick. Nu necesită redeploy.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Praguri auto-îmbunătățire</CardTitle>
          <CardDescription>
            Salvate în <code>automation_settings.self_healing_config</code>. Modificările afectează toate joburile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă...
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="number"
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    value={cfg[f.key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v)) setCfg((c) => ({ ...c, [f.key]: v }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t">
            <Button onClick={save} disabled={!dirty || saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvează modificările
            </Button>
            <Button variant="outline" onClick={resetDefaults} disabled={saving} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Resetare valori implicite
            </Button>
            {dirty && <span className="text-xs text-amber-600">Modificări nesalvate</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfHealingSettings;
