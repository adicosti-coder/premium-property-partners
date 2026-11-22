import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type ClassifyStatus = {
  pending_with_phone: number;
  pending_total: number;
  needs_phone: number;
  eligible: number;
  eligible_sale: number;
  eligible_rent: number;
  eligible_missing_link: number;
  eligible_auto: number;
  last_run: { started_at: string; finished_at: string | null; status: string; error: string | null; summary: unknown; triggered_by: string | null } | null;
};

export const AGENCY_CLASSIFY_STATUS_KEY = ["owner-flow", "agency-classify-status"] as const;

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_LABEL: Record<string, string> = { success: "reușită", failed: "eșuată", running: "în curs", timeout: "expirată", skipped: "sărită" };

/** Starea clasificării automate (la 20 de minute) și câți proprietari pot primi primul mesaj. */
export default function AgencyClassifyStatusCard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const q = useQuery({
    queryKey: AGENCY_CLASSIFY_STATUS_KEY,
    staleTime: 30_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_agency_classify_status" as never);
      if (error) throw error;
      return data as unknown as ClassifyStatus;
    },
  });

  const runNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("automation-orchestrator", { body: { job_key: "lead.auto_classify_agency" } });
      if (error) throw error;
      toast.success("Clasificarea a rulat.");
      await qc.invalidateQueries({ queryKey: ["owner-flow"] });
    } catch (e) {
      toast.error(`Clasificarea nu a putut rula: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const s = q.data;
  const last = s?.last_run;
  const failed = last && last.status !== "success" && last.status !== "running";

  return (
    <section aria-label="Clasificare automată agenții" className="rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Clasificare automată agenții
          <span className="text-xs font-normal text-muted-foreground">la fiecare 20 de minute</span>
        </div>
        <Button size="sm" variant="outline" onClick={runNow} disabled={running} className="min-h-[48px] sm:min-h-9">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rulează acum
        </Button>
      </div>
      {q.error ? (
        <p className="mt-2 text-destructive">Starea nu s-a putut încărca.</p>
      ) : !s ? (
        <p className="mt-2 text-muted-foreground">Se încarcă…</p>
      ) : (
        <>
          <p className={`mt-1 text-xs ${failed ? "text-destructive" : "text-muted-foreground"}`}>
            Ultima rulare: {last ? `${fmt(last.started_at)} — ${STATUS_LABEL[last.status] ?? last.status}` : "încă nu a rulat"}
            {failed && last?.error ? ` (${last.error.slice(0, 140)})` : ""}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-muted/50 p-2">
              <dt className="text-xs text-muted-foreground">Eligibili (privat, scor &gt; 60, telefon valid)</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{s.eligible}</dd>
              <dd className="text-xs text-muted-foreground">{s.eligible_sale} vânzare · {s.eligible_rent} închiriere</dd>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <dt className="text-xs text-muted-foreground">Gata de primul mesaj (≤ 14 zile, necontactați)</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{s.eligible_auto}</dd>
              <dd className="text-xs text-muted-foreground">{s.eligible_missing_link ? `${s.eligible_missing_link} fără link scurt` : "toți au link /e/"}</dd>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <dt className="text-xs text-muted-foreground">De clasificat (noi, cu telefon)</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{s.pending_with_phone}</dd>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <dt className="text-xs text-muted-foreground">Necesită telefon pentru contactare</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{s.needs_phone}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
