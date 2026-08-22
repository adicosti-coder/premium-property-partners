import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import type { User } from "@supabase/supabase-js";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { maskEmail, maskPhone } from "@/utils/security/maskPII";
import { openContractPdf } from "@/lib/contractPdf";
import ScheduledCallsPanel from "@/components/admin/ScheduledCallsPanel";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  FileSignature,
  FileText,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

/** Pipeline statuses stored in `leads.crm_status`. */
const STATUSES = [
  { value: "nou_necontactat", label: "Nou" },
  { value: "contactat", label: "Contactat" },
  { value: "ofertat", label: "Ofertat" },
  { value: "contractat", label: "Contractat" },
  { value: "pierdut", label: "Pierdut" },
] as const;

const STATUS_TONE: Record<string, string> = {
  nou_necontactat: "bg-primary/10 text-primary border-primary/20",
  contactat: "bg-secondary text-secondary-foreground border-border",
  ofertat: "bg-accent/15 text-accent-foreground border-accent/30",
  contractat: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  pierdut: "bg-destructive/10 text-destructive border-destructive/20",
};

const LEAD_COLUMNS =
  "id, name, whatsapp_number, email, source, property_type, property_area, lead_score, lead_grade, created_at, crm_status, crm_sync_status, crm_sync_attempts, crm_sync_error, crm_synced_at, report_pdf_path, report_delivered_at, anonymized_at, retention_expires_at, simulation_data";

interface DashboardLead {
  id: string;
  name: string;
  whatsapp_number: string;
  email: string | null;
  source: string | null;
  property_type: string | null;
  property_area: number | null;
  lead_score: number | null;
  lead_grade: string | null;
  created_at: string;
  crm_status: string | null;
  crm_sync_status: string | null;
  crm_sync_attempts: number | null;
  crm_sync_error: string | null;
  crm_synced_at: string | null;
  report_pdf_path: string | null;
  report_delivered_at: string | null;
  anonymized_at: string | null;
  retention_expires_at: string | null;
  simulation_data: Record<string, unknown> | null;
}

interface LeadContract {
  id: string;
  lead_id: string | null;
  status: string | null;
  signed_at: string | null;
  paid_at: string | null;
  contract_pdf_path: string | null;
  invoice_number: string | null;
}

const digits = (v: string | null | undefined) => (v || "").replace(/[^\d]/g, "");

const utmOf = (lead: DashboardLead) => {
  const sim = (lead.simulation_data ?? {}) as Record<string, unknown>;
  const attr = (sim.attribution ?? {}) as Record<string, unknown>;
  const pick = (k: string) =>
    typeof sim[k] === "string" && sim[k]
      ? (sim[k] as string)
      : typeof attr[k] === "string" && attr[k]
        ? (attr[k] as string)
        : null;
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    zone:
      (typeof sim.zone_label === "string" && sim.zone_label) ||
      (typeof sim.zona === "string" && sim.zona) ||
      null,
  };
};

const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—";

const AdminLeadDashboard = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { isAdmin, isLoading: adminLoading, error: adminError, recheck } = useAdminRole(user);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const leadsQuery = useQuery({
    queryKey: ["admin-lead-dashboard", status],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select(LEAD_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") q = q.eq("crm_status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DashboardLead[];
    },
  });

  /** Signed contracts keyed by lead, so the table can link the contract PDF. */
  const contractsQuery = useQuery({
    queryKey: ["admin-lead-dashboard-contracts"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_contracts")
        .select("id, lead_id, status, signed_at, paid_at, contract_pdf_path, invoice_number")
        .not("lead_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const byLead = new Map<string, LeadContract>();
      for (const row of (data ?? []) as unknown as LeadContract[]) {
        if (row.lead_id && !byLead.has(row.lead_id)) byLead.set(row.lead_id, row);
      }
      return byLead;
    },
  });

  const openContract = async (contractId: string, ownerLabel: string) => {
    try {
      await openContractPdf(contractId);
    } catch (e) {
      toast({
        title: `Nu am putut deschide contractul (${ownerLabel})`,
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = leadsQuery.data ?? [];
    if (!term) return all;
    return all.filter((l) =>
      [l.name, l.whatsapp_number, l.email, l.source].some((v) =>
        (v || "").toLowerCase().includes(term),
      ),
    );
  }, [leadsQuery.data, search]);

  const stats = useMemo(() => {
    const all = leadsQuery.data ?? [];
    return {
      total: all.length,
      failed: all.filter((l) => l.crm_sync_status === "failed").length,
      contracted: all.filter((l) => l.crm_status === "contractat").length,
      reports: all.filter((l) => !!l.report_pdf_path).length,
    };
  }, [leadsQuery.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-lead-dashboard"] });

  const statusMutation = useMutation({
    mutationFn: async (p: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ crm_status: p.status })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Status actualizat" });
    },
    onError: (e: Error) =>
      toast({ title: "Nu am putut salva statusul", description: e.message, variant: "destructive" }),
  });

  /** Re-queues a failed CRM/email delivery; the retry cron picks it up in ≤10 min. */
  const requeueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ crm_sync_attempts: 0, crm_next_retry_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: "Retrimitere programată",
        description: "Lead-ul va fi retrimis automat în CRM în maximum 10 minute.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Reprogramare eșuată", description: e.message, variant: "destructive" }),
  });

  const retentionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_run_lead_retention" as never);
      if (error) throw error;
      return data as { anonymized?: number; purged?: number };
    },
    onSuccess: (data) => {
      invalidate();
      toast({
        title: "Politica GDPR aplicată",
        description: `Anonimizate: ${data?.anonymized ?? 0} · Șterse definitiv: ${data?.purged ?? 0}`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Rulare eșuată", description: e.message, variant: "destructive" }),
  });

  const openReport = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-lead-report-url", {
        body: { leadId: id },
      });
      const url = (data as { url?: string } | null)?.url;
      if (error || !url) throw new Error("Raportul nu este disponibil");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({
        title: "Raport indisponibil",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  if (!authReady || (user && adminLoading)) {
    return (
      <div className="container mx-auto max-w-6xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="mb-2 text-2xl font-semibold">Acces restricționat</h1>
        <p className="mb-6 text-muted-foreground">
          {adminError ?? "Această pagină este disponibilă doar pentru administratori."}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={recheck} aria-label="Reverifică permisiunile">
            Reverifică
          </Button>
          <Button asChild>
            <Link to="/auth">Autentificare</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Helmet>
        <title>Dashboard Lead-uri | Admin RealTrust</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link to="/admin" aria-label="Înapoi la panoul de administrare">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Admin
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Lead-uri</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline, livrare CRM, date UTM și rapoarte PDF — ultimele 200 de lead-uri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => leadsQuery.refetch()}
            disabled={leadsQuery.isFetching}
            aria-label="Reîncarcă lista de lead-uri"
          >
            {leadsQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Reîncarcă
          </Button>
          <Button
            variant="secondary"
            onClick={() => retentionMutation.mutate()}
            disabled={retentionMutation.isPending}
            aria-label="Rulează acum anonimizarea GDPR"
          >
            {retentionMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Rulează GDPR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Lead-uri", value: stats.total },
          { label: "Livrări eșuate", value: stats.failed },
          { label: "Contractate", value: stats.contracted },
          { label: "Rapoarte PDF", value: stats.reports },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ScheduledCallsPanel />

      <EmailFailuresPanel />


      <Card>
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Lead-uri primite</CardTitle>
            <CardDescription>
              Datele personale sunt mascate implicit; dezvăluirea este acțiune conștientă.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută nume, telefon, email…"
              aria-label="Caută în lead-uri"
              className="sm:w-64"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrează după status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {leadsQuery.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leadsQuery.error ? (
            <div className="py-12 text-center">
              <AlertTriangle
                className="mx-auto mb-3 h-8 w-8 text-destructive"
                aria-hidden="true"
              />
              <p className="mb-4 text-sm text-muted-foreground">
                {(leadsQuery.error as Error).message}
              </p>
              <Button variant="outline" onClick={() => leadsQuery.refetch()}>
                Încearcă din nou
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Inbox className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
              <p>Niciun lead pentru filtrele selectate.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>UTM</TableHead>
                    <TableHead>Raport</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((lead) => {
                    const utm = utmOf(lead);
                    const contract = contractsQuery.data?.get(lead.id) ?? null;
                    const show = !!revealed[lead.id];
                    const phone = digits(lead.whatsapp_number);
                    const waLink = phone.length >= 9 ? `https://wa.me/${phone}` : null;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="align-top">
                          <p className="font-medium">{lead.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {dateFmt(lead.created_at)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.lead_score != null && (
                              <Badge variant="outline">Scor {lead.lead_score}</Badge>
                            )}
                            {lead.source && <Badge variant="secondary">{lead.source}</Badge>}
                            {lead.anonymized_at && (
                              <Badge variant="outline">Anonimizat</Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="align-top text-sm">
                          <p className="font-mono">
                            {show ? lead.whatsapp_number || "—" : maskPhone(lead.whatsapp_number)}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {show ? lead.email || "—" : maskEmail(lead.email)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-8 px-2"
                            onClick={() =>
                              setRevealed((p) => ({ ...p, [lead.id]: !p[lead.id] }))
                            }
                            aria-label={
                              show
                                ? `Ascunde datele de contact pentru ${lead.name}`
                                : `Afișează datele de contact pentru ${lead.name}`
                            }
                          >
                            {show ? (
                              <EyeOff className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {show ? "Ascunde" : "Afișează"}
                          </Button>
                        </TableCell>

                        <TableCell className="align-top">
                          <Select
                            value={lead.crm_status ?? "nou_necontactat"}
                            onValueChange={(v) => statusMutation.mutate({ id: lead.id, status: v })}
                          >
                            <SelectTrigger
                              className="w-[150px]"
                              aria-label={`Schimbă statusul pentru ${lead.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span
                            className={`mt-1 inline-block rounded border px-2 py-0.5 text-[11px] ${
                              STATUS_TONE[lead.crm_status ?? "nou_necontactat"] ?? ""
                            }`}
                          >
                            {STATUSES.find((s) => s.value === lead.crm_status)?.label ?? "Nou"}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          <Badge
                            variant={
                              lead.crm_sync_status === "failed"
                                ? "destructive"
                                : lead.crm_sync_status === "synced"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {lead.crm_sync_status ?? "—"}
                          </Badge>
                          <p className="mt-1 text-muted-foreground">
                            {lead.crm_sync_status === "failed"
                              ? `Încercări: ${lead.crm_sync_attempts ?? 0}/5`
                              : dateFmt(lead.crm_synced_at)}
                          </p>
                          {lead.crm_sync_error && (
                            <p className="mt-1 max-w-[180px] truncate text-destructive" title={lead.crm_sync_error}>
                              {lead.crm_sync_error}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          <p>{utm.source ?? "direct"} / {utm.medium ?? "—"}</p>
                          <p className="text-muted-foreground">{utm.campaign ?? "—"}</p>
                          {utm.zone && <p className="text-muted-foreground">Zonă: {utm.zone}</p>}
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          {lead.report_pdf_path ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReport(lead.id)}
                              aria-label={`Deschide raportul PDF pentru ${lead.name}`}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> PDF
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {lead.report_delivered_at && (
                            <p className="mt-1 text-muted-foreground">
                              {dateFmt(lead.report_delivered_at)}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          {contract?.signed_at ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void openContract(contract.id, lead.name || "lead")}
                                aria-label={`Deschide contractul semnat în PDF pentru ${lead.name}`}
                              >
                                <FileSignature className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Contract
                              </Button>
                              <p className="mt-1 text-muted-foreground">
                                {contract.paid_at ? `Plătit ${dateFmt(contract.paid_at)}` : "Semnat, neplătit"}
                              </p>
                              {contract.invoice_number && (
                                <p className="text-muted-foreground">{contract.invoice_number}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              {contract ? "Draft trimis" : "—"}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex flex-col items-end gap-1">
                            {waLink && (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Deschide chat WhatsApp cu ${lead.name}`}
                                >
                                  <MessageCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                  WhatsApp
                                </a>
                              </Button>
                            )}
                            {lead.crm_sync_status === "failed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => requeueMutation.mutate(lead.id)}
                                disabled={requeueMutation.isPending}
                                aria-label={`Reprogramează trimiterea în CRM pentru ${lead.name}`}
                              >
                                <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Retrimite
                              </Button>
                            )}
                            {lead.retention_expires_at && !lead.anonymized_at && (
                              <span className="text-[11px] text-muted-foreground">
                                GDPR:{" "}
                                {new Date(lead.retention_expires_at).toLocaleDateString("ro-RO")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeadDashboard;
