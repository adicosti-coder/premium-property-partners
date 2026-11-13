import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { waLeadLink } from "@/lib/waLeadLink";

export const CALCULATOR_LEADS_QUERY_KEY = ["owner_flow", "calculator_leads"] as const;

type Row = { id: string; created_at: string; name: string | null; whatsapp_number: string | null; simulation_data: Record<string, unknown> | null };

export async function fetchCalculatorLeads(): Promise<Row[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("id, created_at, name, whatsapp_number, simulation_data")
    .like("source", "calculator_unificat%")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

const fmtDate = (d: string) => new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date(d));
const eur = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? `${Math.round(v).toLocaleString("ro-RO")} €` : "—");

/** Proprietari veniți din calculator (ultimele 30 de zile). Doar citire: fără mesaje automate, fără Make. */
export default function CalculatorLeadsPanel() {
  const q = useQuery({ queryKey: CALCULATOR_LEADS_QUERY_KEY, queryFn: fetchCalculatorLeads, staleTime: 30_000 });
  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (q.error) return <p className="text-sm text-destructive">Nu am putut încărca cererile din calculator.</p>;
  const rows = q.data ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nicio cerere din calculator în ultimele 30 de zile.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const sd = r.simulation_data ?? {};
        const wa = waLeadLink(r.whatsapp_number);
        return (
          <li key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Calculator</Badge>
                <span className="font-medium text-foreground">{r.name || "—"}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                {sd.market_alert_opt_in === true && <Badge variant="outline">Alertă lunară</Badge>}
              </div>
              <div className="flex gap-2">
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Deschide WhatsApp cu ${r.name || "proprietarul"}`} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground"><MessageCircle className="h-5 w-5" /></a>}
                <Link to={`/admin/cereri-randament?lead=${r.id}#cerere-selectata`} className="inline-flex min-h-12 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">Detalii</Link>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {[sd.zone, sd.property_type_label, typeof sd.surface_sqm === "number" ? `${sd.surface_sqm} mp` : null, sd.intent_label].filter(Boolean).join(" · ")}
            </p>
            <p className="text-sm text-foreground">Vânzare: {eur(sd.sale_value_mid)} · Hotelier net: {eur(sd.realtrust_net)}/lună · Chirie: {eur(sd.classic_rent)}/lună{typeof sd.photo_score === "number" ? ` · Scor foto ${sd.photo_score}/100` : ""}</p>
          </li>
        );
      })}
    </ul>
  );
}
