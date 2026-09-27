import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { LeadRow } from "../hooks/useLeads";

const OPTIONS = [
  { value: "", label: "În proces" },
  { value: "vandut", label: "✅ Vândut" },
  { value: "inchiriat", label: "🏠 Închiriat" },
  { value: "lost", label: "Pierdut" },
];

export const ConversionCell = ({ lead }: { lead: LeadRow }) => {
  const qc = useQueryClient();
  const [value, setValue] = useState(lead.crm_status ?? "");
  const known = OPTIONS.some((o) => o.value === value);

  const change = async (next: string) => {
    const prev = value;
    setValue(next);
    const { error } = await supabase.from("leads").update({ crm_status: next || null } as any).eq("id", lead.id);
    if (error) {
      setValue(prev);
      toast.error("Nu am putut salva conversia.");
      return;
    }
    toast.success("Conversie actualizată");
    qc.invalidateQueries({ queryKey: ["admin-leads"] });
    qc.invalidateQueries({ queryKey: ["admin-leads-snapshot"] });
  };

  return (
    <select
      aria-label="Conversie lead"
      value={known ? value : ""}
      onChange={(e) => change(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
    >
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
};
