import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FlaskConical, Loader2 } from "lucide-react";

const PERSONAS = [
  { id: "sceptic", label: "Sceptic", desc: "Crede că e o agenție și cere dovezi." },
  { id: "grabit", label: "Grăbit", desc: "N-are timp, răspunde monosilabic." },
  { id: "negociator", label: "Negociator pe preț", desc: "Nu scade prețul, negociază dur." },
  { id: "garsoniera", label: "Proprietar garsonieră", desc: "Prima vânzare, cere explicații simple." },
];

type Analysis = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  objections: { objection: string; handled: boolean; comment?: string }[];
  prompt_fixes: string[];
};
type Line = { role: "andrei" | "proprietar"; text: string };

async function errText(error: unknown) {
  return error instanceof FunctionsHttpError
    ? await error.context.json().then((j: any) => j?.error || "Eroare").catch(() => "Eroare")
    : (error as Error)?.message || "Eroare";
}

export default function AndreiTrainingLab() {
  const [persona, setPersona] = useState("sceptic");
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState(false);

  const run = async () => {
    setRunning(true); setTranscript([]); setAnalysis(null); setApplied(false);
    const { data, error } = await supabase.functions.invoke("voice-agent-training-lab", { body: { persona } });
    setRunning(false);
    if (error) return toast.error(await errText(error));
    setTranscript(data?.transcript ?? []);
    setAnalysis(data?.analysis ?? null);
    setSelected(new Set((data?.analysis?.prompt_fixes ?? []).map((_: string, i: number) => i)));
    if (!data?.analysis) toast.error(data?.error || "Analiza lipsește");
  };

  const apply = async () => {
    if (!analysis) return;
    const lessons = analysis.prompt_fixes.filter((_, i) => selected.has(i));
    if (!lessons.length) return toast.info("Selectează cel puțin o sugestie");
    setApplying(true);
    const { data, error } = await supabase.functions.invoke("voice-agent-training-lab", { body: { action: "apply", lessons, persona } });
    setApplying(false);
    if (error) return toast.error(await errText(error));
    setApplied(true);
    toast.success(`${data?.applied ?? lessons.length} lecții salvate în contextul lui Andrei`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2"><FlaskConical className="h-6 w-6 text-primary" /> Training Lab Andrei</h2>
        <p className="text-sm text-muted-foreground">Conversație simulată în text între Andrei și un proprietar jucat de Gemini. Nu se sună pe nimeni.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Alege profilul proprietarului</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPersona(p.id)} aria-pressed={persona === p.id}
                className={`min-h-[48px] rounded-lg border p-3 text-left transition-colors ${persona === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </button>
            ))}
          </div>
          <Button className="min-h-[48px]" onClick={run} disabled={running}>
            {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simulare în curs (≈30 s)…</> : "Inițiază Apel de Antrenament (Andrei vs Gemini)"}
          </Button>
        </CardContent>
      </Card>

      {transcript.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">2. Transcript</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {transcript.map((t, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${t.role === "andrei" ? "bg-primary/10" : "bg-muted"}`}>
                <span className="font-semibold">{t.role === "andrei" ? "Andrei" : "Proprietar"}: </span>{t.text}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-3">3. Analiză post-apel <Badge variant={analysis.score >= 7 ? "default" : "destructive"}>Nota {analysis.score}/10</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div><h4 className="font-semibold mb-1">Puncte tari</h4><ul className="list-disc pl-5 space-y-1">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
              <div><h4 className="font-semibold mb-1">Puncte slabe</h4><ul className="list-disc pl-5 space-y-1">{analysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Obiecții întâlnite</h4>
              <ul className="space-y-1">{analysis.objections.map((o, i) => (
                <li key={i} className="flex gap-2"><Badge variant={o.handled ? "secondary" : "destructive"} className="shrink-0">{o.handled ? "Tratată" : "Netratată"}</Badge><span><b>{o.objection}</b>{o.comment ? ` — ${o.comment}` : ""}</span></li>
              ))}</ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Sugestii pentru prompt</h4>
              <div className="space-y-2">{analysis.prompt_fixes.map((f, i) => (
                <label key={i} className="flex items-start gap-3 min-h-[48px] cursor-pointer">
                  <Checkbox checked={selected.has(i)} disabled={applied} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(i) : n.delete(i); return n; })} className="mt-1" />
                  <span>{f}</span>
                </label>
              ))}</div>
              <Button className="mt-3 min-h-[48px]" variant="secondary" onClick={apply} disabled={applying || applied || !analysis.prompt_fixes.length}>
                {applied ? "Aplicate ✓" : applying ? "Se salvează…" : "Auto-Apply Fixes"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Sugestiile bifate devin lecții active; Andrei le folosește la următoarele apeluri reale.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
