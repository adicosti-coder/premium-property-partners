import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

type Row = {
  id: string;
  created_at: string;
  name: string | null;
  whatsapp_number: string | null;
  property_type: string | null;
  source: string | null;
  simulation_data: Record<string, unknown> | null;
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const q = useQuery({
    queryKey: ["admin_cereri_randament"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, created_at, name, whatsapp_number, property_type, source, simulation_data")
        .or("source.ilike.%calc%,source.eq.calculator_roi_widget")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const list = [...(q.data ?? [])];
    return desc ? list : list.reverse();
  }, [q.data, desc]);

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
            <Button variant="outline" size="sm" onClick={() => q.refetch()} aria-label="Reîncarcă">
              <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
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
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const sd = r.simulation_data;
                    const zone = (sd?.zone as string) || "—";
                    const type = (sd?.apartment_type as string) || (sd?.property_type as string) || r.property_type || "—";
                    return (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="py-2 pr-3">{r.name || "—"}</td>
                        <td className="py-2 pr-3 whitespace-nowrap"><PhoneCell phone={r.whatsapp_number} name={r.name} /></td>
                        <td className="py-2 pr-3">{zone}</td>
                        <td className="py-2 pr-3">{type}</td>
                        <td className="py-2 pr-3 whitespace-nowrap font-medium">{income(sd)}</td>
                        <td className="py-2"><Badge variant="secondary">{SOURCE_LABEL[r.source ?? ""] ?? r.source}</Badge></td>
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
