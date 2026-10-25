import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type Proposal = { id: string; current_prompt: string; proposed_prompt: string; reasoning: string; evidence: any; created_at: string };

const RUN_MSG: Record<string, string> = {
  created: "Propunere nouă generată.",
  already_pending: "Există deja o propunere în așteptare.",
  not_enough_data: "Prea puține apeluri cu notă mică pentru o propunere.",
  no_change: "AI-ul nu a găsit nimic de îmbunătățit.",
};

export default function PromptOptimizationWidget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "run" | "approve" | "reject">(null);
  const { data: p, isLoading } = useQuery({
    queryKey: ["agent-prompt-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_prompts_history")
        .select("id, current_prompt, proposed_prompt, reasoning, evidence, created_at")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as Proposal | null;
    },
  });
  const { data: lowCount } = useQuery({
    queryKey: ["agent-prompt-low-count"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { count } = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).lte("score", 6).gte("created_at", since);
      return count ?? 0;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["agent-prompt-pending"] });

  const run = async () => {
    setBusy("run");
    toast({ title: "Re-antrenare pornită", description: `Analizăm ${lowCount ?? "…"} conversații cu notă ≤ 6. Poate dura până la un minut.` });
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setBusy(null); return toast({ title: "Sesiune expirată", description: "Autentificați-vă din nou ca administrator.", variant: "destructive" }); }
    const { data, error } = await supabase.functions.invoke("optimize-agent-prompt", { body: {} });
    setBusy(null);
    if (error || data?.error) {
      const status = (error as any)?.context?.status;
      const description = status === 401 ? "Sesiunea nu e validă. Ieșiți din cont și intrați din nou."
        : status === 403 ? "Contul curent nu are rol de administrator."
        : status === 402 ? "Creditele AI s-au epuizat." : status === 429 ? "Prea multe cereri AI. Reîncercați peste un minut."
        : data?.error || error?.message;
      return toast({ title: "Re-antrenarea a eșuat", description, variant: "destructive" });
    }
    toast({ title: RUN_MSG[data?.status] ?? "Gata", description: data?.status === "created" ? "Propunerea e gata de verificat mai jos." : undefined });
    refresh();
  };
  const review = async (approve: boolean) => {
    if (!p) return;
    setBusy(approve ? "approve" : "reject");
    const { error } = await supabase.rpc("review_agent_prompt", { _id: p.id, _approve: approve });
    setBusy(null);
    if (error) return toast({ title: "Nu s-a putut salva", description: error.message, variant: "destructive" });
    toast({ title: approve ? "Aplicat în producție" : "Propunerea a fost respinsă", description: approve ? "Promptul nou e activ la apeluri; versiunea veche e salvată în istoric." : undefined });
    qc.invalidateQueries({ queryKey: ["agent-prompt-low-count"] });
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            Optimizare prompt Andrei
            {p && <Badge className="gap-1"><Sparkles className="h-3 w-3" />Auto-Optimization Ready</Badge>}
          </CardTitle>
          <CardDescription>Propuneri din apelurile reale și simulările din Laborator cu notă mică.</CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={run}
          disabled={!!busy}
          aria-busy={busy === "run"}
          className="min-h-12 w-full shrink-0 whitespace-normal text-center sm:w-auto"
        >
          {busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy === "run" ? `Analizăm ${lowCount ?? "…"} de conversații...` : "Rulează Re-antrenare Acum"}
        </Button>
      </CardHeader>
      <CardContent>
        {busy === "run" ? (
          <div role="status" className="flex items-center gap-2 rounded-md border p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analizăm cele {lowCount ?? "…"} de conversații cu notă ≤ 6…
          </div>
        ) : isLoading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : !p ? (
          <p className="text-sm text-muted-foreground">Nicio propunere în așteptare.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-1 text-sm font-medium">Motivele optimizării</p>
              <p className="whitespace-pre-line text-sm">{p.reasoning}</p>
              {p.evidence?.failed_calls != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Bazat pe {p.evidence.failed_calls} conversații ({p.evidence.real_calls} apeluri reale, {p.evidence.lab_calls} din Laborator) · {new Date(p.created_at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}
                </p>
              )}
            </div>
            <Tabs defaultValue="proposed">
              <TabsList>
                <TabsTrigger value="current">Prompt Curent</TabsTrigger>
                <TabsTrigger value="proposed">Prompt Optimizat Propus</TabsTrigger>
              </TabsList>
              {(["current", "proposed"] as const).map((k) => (
                <TabsContent key={k} value={k}>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border p-3 text-xs">
                    {k === "current" ? p.current_prompt : p.proposed_prompt}
                  </pre>
                </TabsContent>
              ))}
            </Tabs>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => review(true)} disabled={!!busy} className="min-h-12 w-full whitespace-normal sm:w-auto">
                {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprobă & Aplică în Producție
              </Button>
              <Button variant="outline" onClick={() => review(false)} disabled={!!busy} className="min-h-12 w-full sm:w-auto">
                <X className="h-4 w-4" />Respinge
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
