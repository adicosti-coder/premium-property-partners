import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Run } from "./types";

type Props = {
  runs: Run[];
  dismissedFailsBefore: number;
  setDismissedFailsBefore: (v: number) => void;
  onRetryTriggered: () => void;
};

export function Failure24hBanner({ runs, dismissedFailsBefore, setDismissedFailsBefore, onRetryTriggered }: Props) {
  const [retryingFails, setRetryingFails] = useState(false);

  const since = Date.now() - 24 * 3600_000;
  const fails = runs.filter(
    (r) => (r.status === "failed" || r.status === "timeout")
      && r.job_key !== "system.self_healing_dummy"
      && new Date(r.started_at).getTime() > since
      && new Date(r.started_at).getTime() > dismissedFailsBefore,
  );
  if (fails.length === 0) return null;

  const uniqueJobKeys = Array.from(new Set(fails.map((f) => f.job_key)));

  const clearAlert = () => {
    const now = Date.now();
    window.localStorage.setItem("autom_fails_dismissed_until", String(now));
    setDismissedFailsBefore(now);
    toast({ title: "Alertă ștearsă", description: "Se va reaprinde doar dacă apar eșuări noi." });
  };

  const retryFailed = async () => {
    setRetryingFails(true);
    try {
      await supabase.functions.invoke("automation-orchestrator", {
        body: { job_keys: uniqueJobKeys },
      });
      toast({ title: "Reîncercare declanșată", description: `${uniqueJobKeys.length} job(uri) repornite.` });
      setTimeout(onRetryTriggered, 3000);
    } catch (e) {
      toast({ title: "Eroare retry", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRetryingFails(false);
    }
  };

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between gap-2">
        <span>{fails.length} eșuări în ultimele 24h</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={retryFailed} disabled={retryingFails}>
            {retryingFails ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Reîncearcă acum
          </Button>
          <Button size="sm" variant="outline" onClick={clearAlert}>
            Clear alert
          </Button>
        </div>
      </AlertTitle>
      <AlertDescription className="space-y-1 text-xs">
        {fails.slice(0, 5).map((f) => (
          <div key={f.id} className="font-mono">
            <span className="font-semibold">{f.job_key}</span> · {f.status} · {(f.error || "—").slice(0, 140)}
          </div>
        ))}
        {fails.length > 5 && <div className="opacity-70">+{fails.length - 5} altele în tab-ul Istoric rulaje</div>}
      </AlertDescription>
    </Alert>
  );
}
