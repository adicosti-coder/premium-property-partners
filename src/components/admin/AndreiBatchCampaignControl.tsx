import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Campaign = {
  enabled: boolean; delay_minutes: number; current_label: string | null;
  current_session_id: string | null; last_message: string | null; calls_started: number;
};

/** Buton master pentru campania Andrei — doar prospecte fără WhatsApp (131026). */
export default function AndreiBatchCampaignControl() {
  const q = useQuery({
    queryKey: ["voice-batch-campaign"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data } = await (supabase.from("voice_batch_campaign") as any).select("*").eq("id", 1).maybeSingle();
      return data as Campaign | null;
    },
  });
  const c = q.data;

  const update = async (patch: Partial<Campaign>) => {
    const { error } = await (supabase.from("voice_batch_campaign") as any).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error("Nu s-a putut salva");
    q.refetch();
  };

  const toggle = () => {
    if (!c) return;
    if (!c.enabled && !confirm("Andrei va suna automat, pe rând, proprietarii fără WhatsApp care nu au fost apelați încă (L–S 09:00–19:00). Pornești?")) return;
    update({ enabled: !c.enabled });
    toast.success(c.enabled ? "Campanie pusă pe pauză" : "Campanie pornită — primul apel în cel mult un minut");
  };

  if (!c) return null;
  return (
    <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
      <div className="flex flex-wrap items-center gap-2">
        <Button className="min-h-[44px]" variant={c.enabled ? "outline" : "default"} onClick={toggle}>
          {c.enabled ? "⏸ Pauză Campanie" : "▶ Pornește Apelarea Automată AI"}
        </Button>
        <label className="text-sm flex items-center gap-2">
          Pauză între apeluri
          <select className="border rounded px-2 py-1 bg-background min-h-[44px]" value={c.delay_minutes}
            onChange={(e) => update({ delay_minutes: Number(e.target.value) })}>
            {[1, 2, 3, 5, 10].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <Badge variant={c.enabled ? "default" : "secondary"}>{c.enabled ? "Activă" : "Pe pauză"}</Badge>
        <span className="text-xs text-muted-foreground">Apeluri pornite: {c.calls_started}</span>
      </div>
      {c.current_session_id && c.current_label && (
        <p className="text-sm font-medium">📞 În apel cu {c.current_label}</p>
      )}
      {!c.current_session_id && c.enabled && c.last_message && (
        <p className="text-xs text-muted-foreground">{c.last_message}</p>
      )}
      <p className="text-[11px] text-muted-foreground">Doar prospectele fără WhatsApp, neapelate de Andrei. Orar: Luni–Sâmbătă 09:00–19:00.</p>
    </div>
  );
}
