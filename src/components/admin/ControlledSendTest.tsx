import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type Step = { step: string; ok: boolean; detail: string };

const STATUS_RO: Record<string, string> = {
  sent: "Trimis",
  skipped_duplicate_marked_sent: "Oprit: duplicat (marcat Trimis)",
  blocked_dnc: "Oprit: listă excludere",
  blocked_prior_interaction: "Oprit: interacțiune anterioară",
  blocked_stopped: "Oprit: STOP / închisă",
  deferred: "Amânat",
  retry: "Reîncercare programată",
  failed: "Eșuat",
};

export default function ControlledSendTest() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  const run = async () => {
    if (!confirm("Se procesează UN singur anunț din coadă. Dacă trece toate verificările, mesajul WhatsApp pleacă real către proprietar. Continui?")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wa-outbound-queue-worker", { body: { test_single: true } });
    setBusy(false);
    if (error) { toast.error("Testul nu a putut rula"); setRes({ error: error.message }); return; }
    setRes(data);
  };

  const trace: Step[] = res?.trace ?? [];
  const result = res?.results?.[0];
  const pauseReason = res?.paused ? "Trimiterea e pusă pe pauză de protecția numărului" :
    res?.rate_limited ? "Limita de mesaje / programul de trimitere nu permite acum" :
    res?.skipped === "already_running" ? "O altă rulare e în curs" : null;

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Test trimitere controlată</h3>
          <p className="text-sm text-muted-foreground">Procesează un singur anunț din coadă și arată fiecare verificare de duplicat.</p>
        </div>
        <Button onClick={run} disabled={busy}>{busy ? "Se procesează…" : "Test trimitere controlată"}</Button>
      </div>
      {res && (
        <div className="space-y-2 text-sm">
          {res.error && <p className="text-destructive">Eroare: {res.error}</p>}
          {pauseReason && <p className="text-muted-foreground">{pauseReason}.</p>}
          {trace.length > 0 && (
            <ol className="space-y-1">
              {trace.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  {s.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" /> : <XCircle className="h-4 w-4 mt-0.5 text-destructive" />}
                  <span><span className="font-medium">{s.step}:</span> <span className="text-muted-foreground">{s.detail}</span></span>
                </li>
              ))}
            </ol>
          )}
          {result && (
            <p>Rezultat: <Badge variant="secondary">{STATUS_RO[result.status] ?? result.status}</Badge>
              {result.error && <span className="text-destructive ml-2">{String(result.error).slice(0, 200)}</span>}</p>
          )}
          <details><summary className="cursor-pointer text-xs text-muted-foreground">Răspuns complet</summary>
            <pre className="text-xs overflow-auto max-h-64 bg-muted p-2 rounded">{JSON.stringify(res, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
