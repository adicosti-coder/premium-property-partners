import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { ArrowDownUp, MessageCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { waLeadLink } from "@/lib/waLeadLink";
import { toast } from "sonner";
import { canRetryNotification } from "../../../supabase/functions/_shared/calculatorNotificationPolicy";

type Row = {
  id: string;
  created_at: string;
  name: string | null;
  whatsapp_number: string | null;
  property_type: string | null;
  source: string | null;
  simulation_data: Record<string, unknown> | null;
  email_status: string; email_error: string | null;
  wa_admin_status: string; wa_admin_error: string | null;
  wa_client_status: string; wa_client_error: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  calculator_roi_widget: "Calculator randament",
  pentru_proprietari_precalc: "Pentru proprietari",
  pre_calc_owner: "Calcul venit",
  "rental-calculator": "Calculator chirie",
};

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date(d));

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function income(sd: Record<string, unknown> | null): string {
  if (!sd) return "—";
  const net = num(sd.realtrust_net);
  if (net != null) return `${Math.round(net)} €/lună`;
  const min = num(sd.estimated_monthly_min);
  const max = num(sd.estimated_monthly_max);
  if (min != null && max != null) return `${Math.round(min)}–${Math.round(max)} €/lună`;
  return "—";
}

const PhoneCell = ({ phone, name }: { phone: string | null; name: string | null }) => {
  const href = waLeadLink(phone);
  if (!href) {
    return (
      <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
        Fără telefon
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-primary"
      >
        {phone}
      </a>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Deschide WhatsApp cu ${name || phone}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground transition-transform hover:scale-110 hover:bg-whatsapp-hover"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
    </span>
  );
};

const CereriRandament = () => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);
  const [desc, setDesc] = useState(true);
  const [params] = useSearchParams();
  const selectedId = params.get("lead");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const q = useQuery({
    queryKey: ["admin_cereri_randament"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, created_at, name, whatsapp_number, property_type, source, simulation_data,email_status,email_error,wa_admin_status,wa_admin_error,wa_client_status,wa_client_error")
        .or("source.ilike.%calc%,source.eq.calculator_roi_widget")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 10000,
  });
  const retry = async (id: string, channel: "email" | "whatsapp") => {
    if (retrying) return;
    setRetrying(`${id}:${channel}`);
    try {
      const { error } = await supabase.functions.invoke("calculator-notifications", { body: { lead_id: id, action: "retry", channel } });
      if (error) throw error;
      await q.refetch();
      toast.success(channel === "email" ? "Retrimiterea e-mailului a fost procesată." : "Stările WhatsApp au fost actualizate.");
    } catch { toast.error("Nu am putut retrimite notificarea. Reîncarcă stările înainte de o nouă încercare."); }
    finally { setRetrying(null); }
  };
  const reload = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("calculator-email-reconcile", { body: {} });
      if (error) throw error;
      await q.refetch();
      toast.success("Stările de livrare au fost actualizate.");
    } catch { toast.error("Nu am putut verifica acum stările e-mailurilor."); }
    finally { setRefreshing(false); }
  };
  const labels: Record<string, string> = { pending: "În așteptare", sending: "În procesare", accepted: "Acceptat de serviciu", delivered: "Livrat", read: "Citit", failed: "Eșuat", unknown: "Livrare necunoscută" };
  const statusCell = (state: string, error: string | null) => <td className="py-2 pr-3 min-w-36"><Badge variant={state === "failed" ? "destructive" : "outline"}>{labels[state] ?? state}</Badge>{error && <p className="mt-1 max-w-56 break-words text-xs text-destructive">{error}</p>}</td>;

  const rows = useMemo(() => {
    const list = [...(q.data ?? [])];
    return desc ? list : list.reverse();
  }, [q.data, desc]);

  const selected = selectedId ? (q.data ?? []).find((r) => r.id === selectedId) : undefined;

  if (roleLoading) return <div className="container py-16"><Skeleton className="h-40 w-full" /></div>;
  if (!isAdmin) {
    return (
      <div className="container py-16 text-center">
        <p className="mb-4">Pagina este disponibilă doar pentru administratori.</p>
        <Button asChild><Link to="/auth">Autentificare</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-6xl">
      <Helmet><title>Cereri de randament | Admin RealTrust</title><meta name="robots" content="noindex" /></Helmet>
      {selectedId && !q.isLoading && (
        <Card className="mb-6 border-primary/40" id="cerere-selectata">
          <CardHeader>
            <CardTitle>Cererea trimisă din calculator</CardTitle>
            <CardDescription>{selected ? `${selected.name || "—"} · ${fmtDate(selected.created_at)}` : "Cererea nu a fost găsită."}</CardDescription>
          </CardHeader>
          {selected && (
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt className="text-muted-foreground">Telefon</dt><dd><PhoneCell phone={selected.whatsapp_number} name={selected.name} /></dd></div>
                <div><dt className="text-muted-foreground">Venit estimat</dt><dd className="font-medium">{income(selected.simulation_data)}</dd></div>
                {Object.entries(selected.simulation_data ?? {})
                  .filter(([k, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object" && k !== "generated_message")
                  .map(([k, v]) => (
                    <div key={k}><dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt><dd className="break-words">{String(v)}</dd></div>
                  ))}
              </dl>
              {typeof selected.simulation_data?.generated_message === "string" && (
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{selected.simulation_data.generated_message as string}</p>
              )}
            </CardContent>
          )}
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Cereri de randament</CardTitle>
            <CardDescription>Toate cererile trimise din calculatoarele de venit. {rows.length} cereri.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDesc((v) => !v)}>
              <ArrowDownUp className="h-4 w-4 mr-1" />{desc ? "Cele mai noi" : "Cele mai vechi"}
            </Button>
            <Button variant="outline" size="sm" onClick={reload} aria-label="Reîncarcă" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${q.isFetching || refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {q.isLoading ? <Skeleton className="h-40 w-full" /> : q.error ? (
            <p className="text-destructive">Nu am putut încărca cererile.</p>
          ) : rows.length === 0 ? <p className="text-muted-foreground">Nicio cerere încă.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Nume</th><th className="py-2 pr-3">Telefon</th>
                    <th className="py-2 pr-3">Zona</th><th className="py-2 pr-3">Tip apartament</th>
                    <th className="py-2 pr-3">Venit estimat</th><th className="py-2">Sursa</th>
                    <th className="py-2 pr-3">E-mail</th><th className="py-2 pr-3">WhatsApp Andrei</th><th className="py-2 pr-3">WhatsApp client</th><th className="py-2">Notificări</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const sd = r.simulation_data;
                    const zone = (sd?.zone as string) || "—";
                    const type = (sd?.apartment_type as string) || (sd?.property_type as string) || r.property_type || "—";
                    return (
                      <tr key={r.id} className={`border-b border-border/60 ${r.id === selectedId ? "bg-primary/10" : ""}`}>
                        <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="py-2 pr-3">{r.name || "—"}</td>
                        <td className="py-2 pr-3 whitespace-nowrap"><PhoneCell phone={r.whatsapp_number} name={r.name} /></td>
                        <td className="py-2 pr-3">{zone}</td>
                        <td className="py-2 pr-3">{type}</td>
                        <td className="py-2 pr-3 whitespace-nowrap font-medium">{income(sd)}</td>
                        <td className="py-2"><Badge variant="secondary">{SOURCE_LABEL[r.source ?? ""] ?? r.source}</Badge></td>
                        <td className="py-2 pr-3 min-w-36">
                          <Badge variant={r.email_status === "failed" ? "destructive" : "outline"}>{labels[r.email_status] ?? r.email_status}</Badge>
                          {r.email_error && <p className="mt-1 max-w-56 break-words text-xs text-destructive">{r.email_error}</p>}
                          {canRetryNotification(r.email_status) && <Button variant="outline" size="sm" className="mt-2 min-h-12" aria-label={`Retrimite e-mail pentru ${r.name ?? "cerere"}`} disabled={!!retrying} onClick={() => retry(r.id, "email")}><RefreshCw className={`h-4 w-4 ${retrying === `${r.id}:email` ? "animate-spin" : ""}`} />Retrimite e-mail</Button>}
                        </td>
                        {statusCell(r.wa_admin_status, r.wa_admin_error)}
                        {statusCell(r.wa_client_status, r.wa_client_error)}
                        <td className="py-2"><Button variant="outline" size="icon" className="min-h-12 min-w-12" aria-label={`Retrimite WhatsApp eșuat pentru ${r.name ?? "cerere"}`} title="Retrimite doar alertele WhatsApp eșuate" disabled={!!retrying || ![r.wa_admin_status,r.wa_client_status].some(canRetryNotification)} onClick={() => retry(r.id, "whatsapp")}><RefreshCw className={`h-4 w-4 ${retrying === `${r.id}:whatsapp` ? "animate-spin" : ""}`} /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CereriRandament;
