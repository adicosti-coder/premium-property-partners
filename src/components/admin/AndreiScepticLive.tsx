import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Radio } from "lucide-react";
import { toast } from "sonner";

type Run = { id: string; outcome: string; score: number; weaknesses: string[]; transcript: string; created_at: string };

/** Antrenament Sceptic live: rulează simulările una câte una și afișează nota și replicile imediat după fiecare. */
export default function AndreiScepticLive({ onRunSaved }: { onRunSaved?: () => void }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [step, setStep] = useState<number | null>(null);
  const TOTAL = 3;

  const start = async () => {
    setRuns([]);
    for (let i = 0; i < TOTAL; i++) {
      setStep(i + 1);
      const { data, error } = await supabase.functions.invoke("voice-agent-training-lab", { body: { action: "sceptic_step", step: i } });
      if (error || !data?.last) { toast.error(`Simularea ${i + 1} nu s-a terminat`); continue; }
      setRuns((r) => [...r, data.last]);
      onRunSaved?.();
    }
    setStep(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /> Antrenament Sceptic live</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="min-h-[48px] h-auto w-full whitespace-normal px-3 py-2 text-sm sm:w-auto sm:text-base" onClick={start} disabled={step !== null}>
          {step !== null ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simularea {step} din {TOTAL}…</> : "Pornește antrenamentul Sceptic live"}
        </Button>
        <p className="text-xs text-muted-foreground">Fiecare conversație apare aici imediat ce Gemini o evaluează și se salvează în istoric. Nu se sună pe nimeni.</p>
        {runs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
            <span className="font-medium">Evoluția notei:</span>
            {runs.map((r, i) => <Badge key={r.id} variant={r.score >= 7 ? "default" : "destructive"}>#{i + 1}: {r.score}/10</Badge>)}
          </div>
        )}
        {runs.map((r, i) => (
          <details key={r.id} className="rounded-lg border p-3 text-sm" open={i === runs.length - 1}>
            <summary className="cursor-pointer font-medium min-h-[32px]">
              Simularea {i + 1} · {r.outcome} · nota {r.score}/10
              {/ZONĂ INVENTATĂ/.test(r.outcome) && <Badge variant="destructive" className="ml-2">Zonă inventată</Badge>}
            </summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed">{r.transcript}</pre>
            {r.weaknesses?.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">{r.weaknesses.map((w, k) => <li key={k} className={/ZONĂ INVENTATĂ/.test(w) ? "font-semibold text-destructive" : ""}>{w}</li>)}</ul>}
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
