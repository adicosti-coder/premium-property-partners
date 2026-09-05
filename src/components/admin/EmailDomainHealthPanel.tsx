import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, MailWarning, RefreshCw, Send, ShieldCheck,
} from "lucide-react";
import EmailFailuresPanel from "@/components/admin/EmailFailuresPanel";

type Verdict = "ok" | "missing" | "drifted" | "indeterminate";

interface RecordCheck {
  type: string;
  host: string;
  expected: string;
  observed: string[];
  verdict: Verdict;
  note?: string;
}

interface HistoryRow {
  id: string;
  checked_at: string;
  dns_healthy: boolean;
  delegation_serving: boolean;
  delegation_note: string | null;
  pending_emails: number;
  auto_retried: number;
  source: string;
}

interface StatusPayload {
  domain: string;
  dns_healthy: boolean;
  delegation_serving: boolean;
  delegation_note: string | null;
  records: RecordCheck[];
  pending_emails: number;
  failed_30d: number;
  resent_30d: number;
  auto_retry: { attempted: number; sent: number; failed: number } | null;
  history: HistoryRow[];
}

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

const VERDICT_LABEL: Record<Verdict, string> = {
  ok: "Corect",
  missing: "Lipsește",
  drifted: "Diferit",
  indeterminate: "Nedeterminat",
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "ok") {
    return (
      <Badge className="bg-emerald-600 text-emerald-50 hover:bg-emerald-600">
        {VERDICT_LABEL.ok}
      </Badge>
    );
  }
  if (verdict === "indeterminate") {
    return <Badge variant="secondary">{VERDICT_LABEL.indeterminate}</Badge>;
  }
  return <Badge variant="destructive">{VERDICT_LABEL[verdict]}</Badge>;
}

export default function EmailDomainHealthPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["admin", "email-domain-health"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("email-domain-health", {
        body: { action: "status" },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as StatusPayload;
    },
    staleTime: 60_000,
  });

  const retry = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("email-domain-health", {
        body: { action: "retry-pending" },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { attempted: number; sent: number; failed: number };
    },
    onSuccess: (d) => {
      toast({
        title: "Reîncercare finalizată",
        description: `${d.sent} trimise, ${d.failed} încă blocate (din ${d.attempted}).`,
      });
      void qc.invalidateQueries({ queryKey: ["admin", "email-domain-health"] });
      void qc.invalidateQueries({ queryKey: ["admin", "email-failures"] });
    },
    onError: (e: Error) =>
      toast({ title: "Reîncercarea a eșuat", description: e.message, variant: "destructive" }),
  });

  const d = status.data;

  return (
    <div className="space-y-6">
      {/* ── Stare domeniu expeditor ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Stare domeniu expeditor {d?.domain ? `— ${d.domain}` : ""}
            </CardTitle>
            <CardDescription>
              Verificare live a înregistrărilor DNS publice și a livrării notificărilor.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void status.refetch()}
              disabled={status.isFetching}
              aria-label="Reverifică starea domeniului de e-mail"
            >
              {status.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Reverifică acum
            </Button>
            <Button
              size="sm"
              onClick={() => retry.mutate()}
              disabled={retry.isPending || (d?.pending_emails ?? 0) === 0}
              aria-label="Reîncearcă trimiterea notificărilor în așteptare"
            >
              {retry.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Retry trimitere ({d?.pending_emails ?? 0})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : status.isError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Nu am putut verifica starea domeniului: {(status.error as Error).message}
            </p>
          ) : !d ? (
            <p className="text-sm text-muted-foreground">Nicio informație disponibilă.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Verificare DNS</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                    {d.dns_healthy ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        Completă
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        Incompletă
                      </>
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Zonă delegată activă</p>
                  <p className="mt-1 text-sm font-medium">
                    {d.delegation_serving ? "Da" : "Nu — provizionarea nu s-a încheiat"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Notificări în așteptare</p>
                  <p className="mt-1 text-sm font-medium">{d.pending_emails}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Ultimele 30 zile</p>
                  <p className="mt-1 text-sm font-medium">
                    {d.failed_30d} blocate · {d.resent_30d} retrimise
                  </p>
                </div>
              </div>

              {d.delegation_note === "lame_delegation" && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>
                    Înregistrările tale DNS sunt la locul lor, dar zona delegată nu răspunde încă. Este
                    nevoie de o reluare a configurării de e-mail (vezi ghidul de mai jos) — nu trebuie să
                    ștergi și să readaugi domeniul.
                  </span>
                </p>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip</TableHead>
                      <TableHead>Gazdă</TableHead>
                      <TableHead>Așteptat</TableHead>
                      <TableHead>Observat public</TableHead>
                      <TableHead>Verdict</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.records.map((r) => (
                      <TableRow key={`${r.type}-${r.host}`}>
                        <TableCell className="font-medium">{r.type}</TableCell>
                        <TableCell className="break-all text-xs">{r.host}</TableCell>
                        <TableCell className="break-all text-xs">{r.expected}</TableCell>
                        <TableCell className="break-all text-xs">
                          {r.observed.length ? r.observed.join(", ") : "—"}
                          {r.note && (
                            <span className="mt-1 block text-muted-foreground">{r.note}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <VerdictBadge verdict={r.verdict} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Istoric verificări automate */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Verificări automate recente
                </h3>
                {d.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Încă nu există verificări înregistrate.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {d.history.map((h) => (
                      <li key={h.id} className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">{dt(h.checked_at)}</span>
                        <Badge variant={h.dns_healthy ? "secondary" : "destructive"}>
                          {h.dns_healthy ? "DNS ok" : "DNS incomplet"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {h.pending_emails} în așteptare · {h.auto_retried} retrimise automat ·{" "}
                          {h.source === "cron" ? "automat" : "manual"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Ghid pași ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailWarning className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Ghid: reluarea configurării de e-mail
          </CardTitle>
          <CardDescription>
            Pașii exacți pentru a relua verificarea domeniului, fără a-l reface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="steps">
            <AccordionItem value="steps">
              <AccordionTrigger>Pașii de urmat (2 minute)</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  <li>Deschide panoul de backend al proiectului (butonul „Cloud” din editor).</li>
                  <li>Intră în secțiunea <strong>Emails</strong>.</li>
                  <li>
                    Apasă <strong>Retry setup</strong> pe domeniul <code>notify.realtrust.ro</code>.
                    Dacă vezi doar <strong>Manage domains</strong>, deschide domeniul și folosește{" "}
                    <strong>Verify domain</strong>.
                  </li>
                  <li>
                    Revino în acest ecran și apasă <strong>Reverifică acum</strong>. Când toate cele trei
                    rânduri arată „Corect”, e-mailurile pornesc singure.
                  </li>
                  <li>
                    Apasă <strong>Retry trimitere</strong> pentru notificările rămase în așteptare (se
                    reîncearcă și automat, zilnic).
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fail">
              <AccordionTrigger>Dacă butonul de reluare eșuează</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  <li>
                    Verifică în Cloudflare, în zona <code>realtrust.ro</code>: un singur TXT
                    <code> _lovable-email</code> cu tokenul complet și două NS pentru{" "}
                    <code>notify</code> către <code>ns3.lovable.cloud</code> și{" "}
                    <code>ns4.lovable.cloud</code>, fără proxy.
                  </li>
                  <li>Așteaptă 30–60 de minute (propagare) și apasă din nou „Reverifică acum”.</li>
                  <li>
                    Dacă tabelul arată în continuare „Nedeterminat” pe NS, problema este pe partea
                    furnizorului de e-mail: scrie echipei de suport Lovable, menționând domeniul{" "}
                    <code>notify.realtrust.ro</code> și mesajul „lame delegation”.
                  </li>
                  <li>
                    Între timp nu pierzi nimic: fiecare notificare nelivrată este salvată mai jos și
                    poate fi retrimisă cu un clic.
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ── Notificări nelivrate ────────────────────────────────────────── */}
      <EmailFailuresPanel />
    </div>
  );
}
