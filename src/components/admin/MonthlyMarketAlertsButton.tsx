import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Summary = {
  period_month: string;
  webhook_configured: boolean;
  subscribers_total: number;
  already_sent_this_month: number;
  ready_to_send: number;
  excluded_by_reason: Record<string, number>;
  sent?: number;
  failed?: number;
  skipped?: number;
  remaining?: number;
  errors?: Array<{ lead_id: string; error: string }>;
};

const REASON_LABEL: Record<string, string> = {
  dezabonat: "Dezabonați",
  arhivat: "Cereri arhivate / anonimizate",
  fara_contact: "Fără telefon sau e-mail",
  zona_fara_indice: "Zonă fără indice de piață",
  lista_dnc: "Pe lista „Nu contacta”",
  email_blocat: "E-mail blocat",
  duplicat_contact: "Cereri repetate ale aceluiași contact",
};

const monthLabel = (period: string) =>
  new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}T00:00:00Z`));

async function callAlerts(action: "preview" | "send"): Promise<Summary> {
  const { data, error } = await supabase.functions.invoke("process-monthly-alerts", { body: { action } });
  if (error) {
    // 412 = webhook neconfigurat: corpul conține totuși rezumatul.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try { const b = await ctx.json(); if (b?.period_month) return b as Summary; } catch { /* ignore */ }
    }
    throw error;
  }
  return data as Summary;
}

export function MonthlyMarketAlertsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [result, setResult] = useState<Summary | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setResult(null);
    try { setSummary(await callAlerts("preview")); }
    catch { toast.error("Nu am putut încărca abonații la alertă."); setSummary(null); }
    finally { setLoading(false); }
  };

  const openDialog = () => { setOpen(true); void loadPreview(); };

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const r = await callAlerts("send");
      setResult(r);
      if (!r.webhook_configured) toast.error("Adresa webhook-ului Make.com nu este configurată.");
      else if ((r.failed ?? 0) > 0) toast.error(`${r.sent ?? 0} trimise, ${r.failed} eșuate.`);
      else toast.success(`${r.sent ?? 0} alerte trimise către Make.com.`);
      const fresh = await callAlerts("preview").catch(() => null);
      if (fresh) setSummary(fresh);
    } catch { toast.error("Trimiterea alertelor a eșuat. Verifică istoricul înainte de o nouă încercare."); }
    finally { setSending(false); }
  };

  const excluded = Object.entries(summary?.excluded_by_reason ?? {});

  return (
    <>
      <Button variant="ghost" size="sm" onClick={openDialog} className="text-muted-foreground">
        <BellRing className="h-4 w-4 mr-1" />Declanșează Alertele Lunare (Make.com)
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!sending) setOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alerta lunară de piață</DialogTitle>
            <DialogDescription>
              Trimite către Make.com valorile curente pe cartier (€/mp vânzare, chirie clasică și venit net în regim hotelier) pentru proprietarii care au bifat alerta. Fiecare contact primește cel mult o alertă pe lună.
            </DialogDescription>
          </DialogHeader>
          {loading || !summary ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Se încarcă abonații…</> : "Nu am putut încărca datele."}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>Luna: <span className="font-medium capitalize">{monthLabel(summary.period_month)}</span></p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">Abonați</dt><dd className="text-lg font-semibold">{summary.subscribers_total}</dd></div>
                <div className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">Deja trimiși</dt><dd className="text-lg font-semibold">{summary.already_sent_this_month}</dd></div>
                <div className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">De trimis</dt><dd className="text-lg font-semibold">{summary.ready_to_send}</dd></div>
              </dl>
              {excluded.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Excluși:</p>
                  <ul className="space-y-0.5">
                    {excluded.map(([k, v]) => <li key={k} className="flex justify-between"><span>{REASON_LABEL[k] ?? k}</span><span>{v}</span></li>)}
                  </ul>
                </div>
              )}
              {!summary.webhook_configured && (
                <Badge variant="destructive" className="font-normal">Webhook Make.com neconfigurat — nu se poate trimite încă</Badge>
              )}
              {result && result.webhook_configured && (
                <p role="status" className="rounded-lg border border-border p-2">
                  Rezultat: {result.sent ?? 0} trimise · {result.failed ?? 0} eșuate{(result.remaining ?? 0) > 0 ? ` · încă ${result.remaining} în așteptare (apasă din nou)` : ""}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Închide</Button>
            <Button onClick={send} disabled={sending || loading || !summary?.webhook_configured || !summary?.ready_to_send}>
              {sending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Se trimite…</> : `Trimite ${summary?.ready_to_send ?? 0} alerte`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
