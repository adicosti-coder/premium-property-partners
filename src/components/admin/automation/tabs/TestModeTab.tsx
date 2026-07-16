import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, FlaskConical, Copy, Loader2, Shield,
} from "lucide-react";

const TESTABLE_FUNCTIONS: Array<{
  key: string;
  fn: string;
  label: string;
  category: "lead" | "seo" | "system";
  description: string;
}> = [
  { key: "__orchestrator__", fn: "automation-orchestrator", label: "Orchestrator (full pass)", category: "system", description: "Rulează un ciclu complet — invocă toate joburile cron care ar fi due, în dry-run." },
  { key: "lead.auto_classify_agency", fn: "lead-auto-classify-agency", label: "Lead • Auto-clasificare agenții", category: "lead", description: "Citește pana la 25 prospecte neevaluate, rulează Gemini, NU scrie scoruri și NU creează aprobări." },
  { key: "lead.auto_dedup", fn: "lead-auto-dedup", label: "Lead • Auto-dedup", category: "lead", description: "Calculează dedup_key și grupuri duplicate; NU updatează rândurile." },
  { key: "seo.auto_fill_meta", fn: "seo-auto-fill-meta", label: "SEO • Auto-fill meta (drafturi)", category: "seo", description: "Generează drafturi title+meta cu Gemini; NU scrie în seo_overrides." },
  { key: "seo.anomaly_detector", fn: "seo-anomaly-detector", label: "SEO • Detector anomalii", category: "seo", description: "Calculează scăderi >15% săptămână peste săptămână; NU loghează alertele." },
  { key: "system.daily_digest", fn: "automation-daily-digest", label: "System • Digest zilnic", category: "system", description: "Agregează KPIs ultimele 24h; NU trimite email și NU notifică WhatsApp." },
];

type TestResult = {
  function_name: string;
  job_key: string;
  ok: boolean;
  status: number | null;
  duration_ms: number;
  output: unknown;
  error: string | null;
  ran_at: string;
};

export function TestModeTab() {
  const [testTarget, setTestTarget] = useState<string>(TESTABLE_FUNCTIONS[0].key);
  const [testing, setTesting] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  const runTest = async () => {
    const target = TESTABLE_FUNCTIONS.find((t) => t.key === testTarget);
    if (!target) return;
    setTesting(true);
    const startedAt = Date.now();
    try {
      const isOrchestrator = target.key === "__orchestrator__";
      const body: Record<string, unknown> = { dry_run: true, triggered_by: "manual_test" };
      if (!isOrchestrator) body.job_key = target.key;

      const { data, error } = await supabase.functions.invoke("automation-orchestrator", { body });
      const duration = Date.now() - startedAt;
      const ok = !error;
      const result: TestResult = {
        function_name: target.fn,
        job_key: target.key,
        ok,
        status: ok ? 200 : null,
        duration_ms: duration,
        output: data ?? null,
        error: error ? (error.message || String(error)) : null,
        ran_at: new Date().toISOString(),
      };
      setTestHistory((h) => [result, ...h].slice(0, 10));
      toast({
        title: ok ? `${target.label} → dry-run OK` : `${target.label} → eroare`,
        description: ok
          ? `Output disponibil mai jos. ${duration}ms.`
          : (error?.message || String(error)).slice(0, 200),
        variant: ok ? "default" : "destructive",
      });
    } catch (e) {
      const duration = Date.now() - startedAt;
      const msg = e instanceof Error ? e.message : String(e);
      setTestHistory((h) => [{
        function_name: target.fn,
        job_key: target.key,
        ok: false,
        status: null,
        duration_ms: duration,
        output: null,
        error: msg,
        ran_at: new Date().toISOString(),
      }, ...h].slice(0, 10));
      toast({ title: "Eroare execuție test", description: msg.slice(0, 200), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const copyOutput = async (r: TestResult) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(r.output, null, 2));
      toast({ title: "Copiat", description: "Output JSON în clipboard." });
    } catch {
      /* noop */
    }
  };

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="w-4 h-4 text-amber-500" />
          Mod de test manual (dry-run)
        </CardTitle>
        <CardDescription>
          Selectează una dintre cele {TESTABLE_FUNCTIONS.length} edge functions și rulează-o în <strong>dry-run</strong>.
          Nu se scrie în baza de date, nu se trimit emailuri sau WhatsApp, nu se actualizează metricele jobului.
          Poți testa indiferent dacă <em>Kill Switch</em>-ul global este pornit sau oprit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-[1fr,auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="test-target">Funcție de testat</Label>
            <Select value={testTarget} onValueChange={setTestTarget}>
              <SelectTrigger id="test-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TESTABLE_FUNCTIONS.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">{t.category}</Badge>
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {TESTABLE_FUNCTIONS.find((t) => t.key === testTarget)?.description}
            </p>
          </div>
          <Button onClick={runTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Rulează dry-run
          </Button>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle className="text-xs">Sigur de rulat</AlertTitle>
          <AlertDescription className="text-xs">
            Funcțiile primesc <code>{`{ dry_run: true }`}</code>. Citirile + apelurile Gemini rulează normal,
            dar toate <code>insert</code>/<code>update</code>/<code>upsert</code>, emailurile și webhook-urile
            WhatsApp sunt sărite. Output-ul include contoare <code>would_*</code> care arată câte modificări <em>ar fi</em> aplicat.
          </AlertDescription>
        </Alert>

        {testHistory.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
            <FlaskConical className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Niciun test rulat încă în această sesiune.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground">
              Ultimele {testHistory.length} rulări (sesiune curentă)
            </div>
            {testHistory.map((r, idx) => (
              <div key={`${r.ran_at}-${idx}`} className="border rounded-lg overflow-hidden">
                <div className={`flex items-center gap-2 p-2.5 flex-wrap ${
                  r.ok ? "bg-primary/5" : "bg-destructive/10"
                }`}>
                  {r.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="font-medium text-sm">{r.function_name}</span>
                  <Badge variant="outline" className="text-[10px]">{r.duration_ms}ms</Badge>
                  <Badge variant="secondary" className="text-[10px]">DRY-RUN</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(r.ran_at).toLocaleTimeString("ro-RO")}
                  </span>
                  {r.output != null && (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyOutput(r)} aria-label="Copiază output JSON">
                      <Copy className="w-3 h-3 mr-1" /> Copiază JSON
                    </Button>
                  )}
                </div>
                {r.error && (
                  <div className="px-3 py-2 border-t bg-destructive/5 text-xs text-destructive font-mono break-all">
                    ⚠ {r.error}
                  </div>
                )}
                {r.output != null && (
                  <pre className="text-[11px] bg-muted/40 p-3 overflow-x-auto max-h-96 font-mono">
                    {JSON.stringify(r.output, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
