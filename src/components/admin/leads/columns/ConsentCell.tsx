import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRow } from "../hooks/useLeads";

const LABEL: Record<string, string> = {
  requested: "Cerut – așteptăm DA PUBLIC",
  granted: "DA PUBLIC primit",
  published: "Publicat",
  revoked: "Retras (RETRAG)",
};

/** Starea acordului „DA PUBLIC” și data publicării, după numărul de WhatsApp. */
export const ConsentCell = ({ lead }: { lead: LeadRow }) => {
  const digits = String((lead as any).whatsapp_number ?? "").replace(/\D/g, "");
  const tail = digits.slice(-9);
  const { data, isLoading } = useQuery({
    queryKey: ["lead-consent", tail],
    enabled: tail.length === 9,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_publish_consents")
        .select("status, requested_at, consented_at, published_at")
        .ilike("phone_normalized", `%${tail}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (tail.length !== 9) return <span className="text-xs text-muted-foreground">—</span>;
  if (isLoading) return <span className="text-xs text-muted-foreground">…</span>;
  if (!data) return <span className="text-xs text-muted-foreground">Necerut</span>;

  const status = data.published_at ? "published" : String(data.status);
  const fmt = (d?: string | null) => (d ? format(new Date(d), "d MMM yyyy, HH:mm", { locale: ro }) : null);
  return (
    <div className="space-y-1 min-w-[150px]">
      <Badge variant={status === "published" || status === "granted" ? "default" : status === "revoked" ? "destructive" : "secondary"}>
        {LABEL[status] ?? status}
      </Badge>
      <p className="text-[11px] text-muted-foreground">
        {data.published_at
          ? `Publicat: ${fmt(data.published_at)}`
          : data.consented_at
            ? `Acord: ${fmt(data.consented_at)} · nepublicat încă`
            : `Cerut: ${fmt(data.requested_at) ?? "—"}`}
      </p>
    </div>
  );
};
