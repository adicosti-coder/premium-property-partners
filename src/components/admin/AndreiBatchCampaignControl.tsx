import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Campaign = {
  enabled: boolean; delay_minutes: number; current_label: string | null;
  current_session_id: string | null; last_message: string | null; calls_started: number;
  last_call_ended_at: string | null;
};

const DELAYS = [1, 2, 3, 5, 10];
const YES = ["interesat", "programare", "acord", "scheduled"];

export default function AndreiBatchCampaignControl() {
  const [now, setNow] = useState(Date.now());
  const [updating, setUpdating] = useState(false);
  
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

  const stats = useQuery({
    queryKey: ["voice-batch-campaign-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [wa, calls] = await Promise.all([
        (supabase.from("wa_outbound_queue") as any).select("prospect_listing_id").eq("status", "failed")
          .ilike("last_error", "%131026%").not("prospect_listing_id", "is", null).limit(1000),
        (supabase.from("voice_call_sessions") as any).select("ai_outcome, call_duration_seconds")
          .gte("created_at", start.toISOString()).limit(2000),
      ]);
      const ids = [...new Set((wa.data ?? []).map((r: any) => r.prospect_listing_id))] as string[];
      let queue = 0;
      if (ids.length) {
        const { data } = await (supabase.from("prospect_listings") as any).select("id, tags, phone_normalized, contact_phone")
          .in("id", ids).eq("is_active", true).is("published_at", null).eq("do_not_call", false);
        queue = (data ?? []).filter((r: any) => {
          const d = String(r.phone_normalized || r.contact_phone || "").replace(/\D/g, "");
          return !((r.tags as string[]) || []).includes("apelat-andrei") && /^(40|0)7\d{8}$/.test(d.replace(/^0040/, "40"));
        }).length;
      }
      const list = (calls.data ?? []) as any[];
      const connected = list.filter((r) => Number(r.call_duration_seconds || 0) > 0);
      const durs = connected.map((r) => Number(r.call_duration_seconds)).filter((s) => s < 3600);
      return {
        queue,
        total: list.length,
        connectRate: list.length ? Math.round((connected.length / list.length) * 100) : null,
        yes: list.filter((r) => YES.includes(String(r.ai_outcome || "").toLowerCase())).length,
        avg: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null,
      };
    },
  });
  const s = stats.data;

  const update = async (patch: Partial<Campaign>) => {
    if (updating) return;
    setUpdating(true);
    const { error } = await (supabase.from("voice_batch_campaign") as any).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) {
      toast.error("Nu s-a putut salva");
    } else {
      await q.refetch();
    }
    setUpdating(false);
  };

  const toggle = () => {
    if (!c || updating) return;
    if (!c.enabled && !confirm("Andrei va suna automat, pe rând, proprietarii fără WhatsApp neapelați încă. Pornești?")) return;
    update({ enabled: !c.enabled });
    toast.success(c.enabled ? "Campanie pusă pe pauză" : "Campanie pornită");
  };

  if (!c) return null;

  const inCall = !!c.current_session_id;
  const waitLeftMs = c.last_call_ended_at ? new Date(c.last_call_ended_at).getTime() + c.delay_minutes * 60_000 - now : 0;
  let status: React.ReactNode;
  if (inCall) {
    status = (
      <span className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
        <Loader2 className="h-4 w-4 animate-spin" /> În apel cu {c.current_label || "proprietar"}
      </span>
    );
  } else if (!c.enabled) {
    status = <span className="font-medium text-muted-foreground">⏸ Campanie în pauză</span>;
  } else if (waitLeftMs > 0) {
    const m = Math.floor(waitLeftMs / 60000), sec = Math.floor((waitLeftMs % 60000) / 1000);
    status = <span className="font-medium text-sky-700 dark:text-sky-400">⏳ Așteptare {m}:{String(sec).padStart(2, "0")} min până la următorul apel</span>;
  } else {
    status = <span className="font-medium animate-pulse">{c.last_message || "🔎 Se caută următorul proprietar…"}</span>;
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { l: "În coadă", v: s?.queue ?? "…" },
          { l: "Răspuns azi", v: s ? (s.connectRate == null ? "—" : `${s.connectRate}% (${s.total})`) : "…" },
          { l: "Conversii azi", v: s?.yes ?? "…" },
          { l: "Durată medie", v: s ? (s.avg == null ? "—" : `${Math.floor(s.avg / 60)}:${String(s.avg % 60).padStart(2, "0")} min`) : "…" },
        ].map((it) => (
          <div key={it.l} className="rounded-lg border border-border bg-muted/20 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.l}</div>
            <div className="text-lg font-semibold tabular-nums">{it.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={toggle}
          disabled={updating}
          className={cn("min-h-[48px] text-white",
            c.enabled ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700")}
        >
          {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {c.enabled ? "⏸ Pauză Campanie" : "▶ Pornește Apelarea"}
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pauză:</span>
          {DELAYS.map((m) => (
            <Button key={m} size="sm" variant={c.delay_minutes === m ? "default" : "outline"}
              disabled={updating}
              className="min-h-[44px] min-w-[48px]" onClick={() => update({ delay_minutes: m })}>
              {m}m
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
