import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Campaign = {
  enabled: boolean; delay_minutes: number; current_label: string | null;
  current_session_id: string | null; last_message: string | null; calls_started: number;
  last_call_ended_at: string | null;
};

const DELAYS = [1, 2, 3, 5, 10];

/** Caseta de control a campaniei Andrei — doar prospecte fără WhatsApp (131026). */
export default function AndreiBatchCampaignControl() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const q = useQuery({
    queryKey: ["voice-batch-campaign"],
    refetchInterval: 5_000,
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
    if (!c.enabled && !confirm("Andrei va suna automat, pe rând, proprietarii fără WhatsApp neapelați încă (Luni–Sâmbătă 09:00–19:00). Pornești?")) return;
    update({ enabled: !c.enabled });
    toast.success(c.enabled ? "Campanie pusă pe pauză" : "Campanie pornită — primul apel în cel mult un minut");
  };

  if (!c) return null;

  const inCall = !!c.current_session_id;
  const waitLeftMs = c.last_call_ended_at ? new Date(c.last_call_ended_at).getTime() + c.delay_minutes * 60_000 - now : 0;
  let status: React.ReactNode;
  if (inCall) {
    status = (
      <span className="flex items-center gap-2 font-medium">
        <span className="inline-block animate-bounce text-lg" aria-hidden>📞</span>
        În apel cu {c.current_label || "proprietar"}
      </span>
    );
  } else if (!c.enabled) {
    status = <span className="font-medium">⏸ Campanie în pauză</span>;
  } else if (waitLeftMs > 0) {
    const m = Math.floor(waitLeftMs / 60000), s = Math.floor((waitLeftMs % 60000) / 1000);
    status = <span className="font-medium">⏳ Așteptare pauză {m}:{String(s).padStart(2, "0")} min până la următorul apel</span>;
  } else {
    status = <span className="font-medium">🔎 {c.last_message || "Se caută următorul proprietar de sunat…"}</span>;
  }

  return (
    <section aria-label="Campanie Apelare Automată AI" className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Campanie Apelare Automată AI</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">🕘 Luni–Sâmbătă, 09:00–19:00</Badge>
          <Badge variant={c.enabled ? "default" : "secondary"}>{c.enabled ? "Activă" : "Oprită"}</Badge>
        </div>
      </div>

      <div className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        inCall ? "border-emerald-500/40 bg-emerald-500/10" : c.enabled ? "border-sky-500/30 bg-sky-500/5" : "border-border bg-muted/30",
      )} role="status" aria-live="polite">
        {status}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={toggle}
          className={cn("min-h-[48px] text-white",
            c.enabled ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700")}
        >
          {c.enabled ? "⏸ Pauză Campanie" : "▶ Pornește Apelarea Automată AI"}
        </Button>
        <div className="flex items-center gap-2 text-sm" role="radiogroup" aria-label="Pauză între apeluri">
          <span className="text-muted-foreground">Pauză între apeluri:</span>
          {DELAYS.map((m) => (
            <Button key={m} size="sm" variant={c.delay_minutes === m ? "default" : "outline"}
              role="radio" aria-checked={c.delay_minutes === m}
              className="min-h-[44px] min-w-[48px]" onClick={() => update({ delay_minutes: m })}>
              {m} min
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Apeluri pornite: {c.calls_started}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Se apelează doar proprietarii fără WhatsApp (Eroare Meta 131026), cu mobil RO, neapelați anterior și care nu se află în Lista de Excludere.
      </p>
    </section>
  );
}
