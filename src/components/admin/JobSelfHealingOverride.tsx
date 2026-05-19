import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Settings2, Trash2, Loader2 } from "lucide-react";

type OverrideValues = {
  failure_disable_threshold?: number;
  timeout_bump_ratio?: number;
  timeout_ceiling_ms?: number;
  success_rate_low?: number;
  success_rate_high?: number;
  stale_threshold_minutes?: number;
};

type RuntimeValues = {
  timeout_ms?: number;
  max_retries?: number;
};

type Props = {
  jobKey: string;
  jobLabel: string;
  config: Record<string, unknown> | null;
  onChanged?: () => void;
};

const FIELDS: Array<{ key: keyof OverrideValues; label: string; help: string; step?: string }> = [
  { key: "failure_disable_threshold", label: "Auto-disable după N eșuări", help: "Implicit global (5)" },
  { key: "timeout_bump_ratio", label: "Multiplicator timeout", help: "ex: 1.25 = +25%", step: "0.05" },
  { key: "timeout_ceiling_ms", label: "Plafon timeout (ms)", help: "Implicit 120000" },
  { key: "success_rate_low", label: "Prag rată succes JOS", help: "0.50 = sub 50% → retry off", step: "0.05" },
  { key: "success_rate_high", label: "Prag rată succes SUS", help: "0.90 = peste 90% → restore retry", step: "0.05" },
  { key: "stale_threshold_minutes", label: "Stale după N minute", help: "Implicit global (120)" },
];

const JobSelfHealingOverride = ({ jobKey, jobLabel, config, onChanged }: Props) => {
  const cfg = (config ?? {}) as Record<string, unknown>;
  const existingOverride = (cfg.self_healing_override ?? {}) as Record<string, unknown>;
  const hasOverride = Object.keys(existingOverride).length > 0;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals] = useState<OverrideValues>(() => ({
    failure_disable_threshold: numOrUndef(existingOverride.failure_disable_threshold),
    timeout_bump_ratio: numOrUndef(existingOverride.timeout_bump_ratio),
    timeout_ceiling_ms: numOrUndef(existingOverride.timeout_ceiling_ms),
    success_rate_low: numOrUndef(existingOverride.success_rate_low),
    success_rate_high: numOrUndef(existingOverride.success_rate_high),
    stale_threshold_minutes: numOrUndef(existingOverride.stale_threshold_minutes),
  }));
  const [runtime, setRuntime] = useState<RuntimeValues>({
    timeout_ms: numOrUndef(cfg.timeout_ms),
    max_retries: numOrUndef(cfg.max_retries),
  });

  const save = async () => {
    setSaving(true);
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(vals)) {
      if (v != null && Number(v) > 0) clean[k] = Number(v);
    }
    const nextConfig: Record<string, unknown> = { ...cfg };
    if (Object.keys(clean).length > 0) nextConfig.self_healing_override = clean;
    else delete nextConfig.self_healing_override;
    if (runtime.timeout_ms && runtime.timeout_ms > 0) nextConfig.timeout_ms = Number(runtime.timeout_ms);
    if (runtime.max_retries != null && runtime.max_retries >= 0) nextConfig.max_retries = Number(runtime.max_retries);

    const { error } = await supabase
      .from("automation_jobs")
      .update({ config: nextConfig as never })
      .eq("job_key", jobKey);
    setSaving(false);
    if (error) {
      toast({ title: "Eroare salvare", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: `Override salvat · ${jobLabel}`,
      description: Object.keys(clean).length > 0
        ? `${Object.keys(clean).length} reguli active + runtime config.`
        : "Override eliminat — folosește setările globale.",
    });
    onChanged?.();
    setOpen(false);
  };

  const clearOverride = async () => {
    setSaving(true);
    const nextConfig = { ...cfg };
    delete nextConfig.self_healing_override;
    const { error } = await supabase
      .from("automation_jobs")
      .update({ config: nextConfig as never })
      .eq("job_key", jobKey);
    setSaving(false);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    setVals({});
    toast({ title: "Override șters", description: "Jobul folosește setările globale." });
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={hasOverride ? "secondary" : "outline"}
          className="gap-1"
          title="Reguli self-healing personalizate pentru acest job"
          aria-label={`Override self-healing pentru ${jobLabel}`}
        >
          <Settings2 className="w-3 h-3" />
          <span className="hidden md:inline">Override</span>
          {hasOverride && (
            <Badge variant="default" className="text-[9px] px-1 py-0 h-4">
              {Object.keys(existingOverride).length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Override Self-Healing · {jobLabel}
          </DialogTitle>
          <DialogDescription>
            Reguli specifice pentru acest job. Au prioritate față de setările globale.
            Lasă gol pentru a moșteni valoarea globală. Câmpurile <strong>runtime</strong> (timeout/retry)
            sunt aplicate direct la execuție de orchestrator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Reguli self-healing (override global)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label htmlFor={`oh-${f.key}`} className="text-xs">{f.label}</Label>
                  <Input
                    id={`oh-${f.key}`}
                    type="number"
                    step={f.step ?? "1"}
                    value={vals[f.key] ?? ""}
                    onChange={(e) => setVals((v) => ({
                      ...v,
                      [f.key]: e.target.value === "" ? undefined : Number(e.target.value),
                    }))}
                    placeholder="(global)"
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.help}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Runtime config (direct la orchestrator)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="oh-timeout-ms" className="text-xs">Timeout per rulaj (ms)</Label>
                <Input
                  id="oh-timeout-ms"
                  type="number"
                  value={runtime.timeout_ms ?? ""}
                  onChange={(e) => setRuntime((r) => ({
                    ...r,
                    timeout_ms: e.target.value === "" ? undefined : Number(e.target.value),
                  }))}
                  placeholder="50000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="oh-max-retries" className="text-xs">Max retries</Label>
                <Input
                  id="oh-max-retries"
                  type="number"
                  min={0}
                  max={3}
                  value={runtime.max_retries ?? ""}
                  onChange={(e) => setRuntime((r) => ({
                    ...r,
                    max_retries: e.target.value === "" ? undefined : Number(e.target.value),
                  }))}
                  placeholder="1"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {hasOverride && (
            <Alert>
              <AlertDescription className="text-xs">
                Override activ: <code className="text-[10px]">{JSON.stringify(existingOverride)}</code>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {hasOverride && (
            <Button variant="outline" onClick={clearOverride} disabled={saving} className="gap-1">
              <Trash2 className="w-3 h-3" /> Șterge override
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default JobSelfHealingOverride;
