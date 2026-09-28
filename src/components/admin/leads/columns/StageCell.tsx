import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRow } from "../hooks/useLeads";

const STAGES = [
  { value: "nou_necontactat", label: "🆕 Nou" },
  { value: "contactat", label: "📞 Contactat" },
  { value: "ofertat", label: "📄 Ofertat" },
  { value: "contractat", label: "✍️ Contractat" },
  { value: "pierdut", label: "✖ Pierdut" },
];

/** Mapăm și valorile setate din coloana Conversie pe etapa de pipeline. */
const toStage = (s?: string | null) => {
  if (!s) return "nou_necontactat";
  if (s === "vandut" || s === "inchiriat") return "contractat";
  if (s === "lost") return "pierdut";
  return STAGES.some((o) => o.value === s) ? s : "nou_necontactat";
};

export const StageCell = ({ lead }: { lead: LeadRow }) => {
  const qc = useQueryClient();
  const [value, setValue] = useState(toStage(lead.crm_status));

  const change = async (next: string) => {
    const prev = value;
    setValue(next);
    const { error } = await supabase.from("leads").update({ crm_status: next } as any).eq("id", lead.id);
    if (error) {
      setValue(prev);
      toast.error("Nu am putut salva etapa.");
      return;
    }
    toast.success("Etapă actualizată");
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
    qc.invalidateQueries({ queryKey: ["admin-leads-snapshot"] });
  };

  return (
    <select
      aria-label="Etapă lead"
      value={value}
      onChange={(e) => change(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
    >
      {STAGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
};
