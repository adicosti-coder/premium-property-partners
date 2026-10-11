import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, ThumbsUp, Ban, Timer } from "lucide-react";

const YES = ["interesat", "programare", "acord", "scheduled"];
const STOP = ["neinteresat", "stop", "refuz", "dnc", "nu_doreste"];

/** Contor apeluri Andrei: total, DA, STOP, timp mediu până la răspuns. */
export default function AndreiCallsCounter() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery({
    queryKey: ["andrei-calls-counter", days],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const from = new Date(Date.now() - days * 86400_000).toISOString();
      const { data: rows } = await supabase
        .from("voice_call_sessions")
        .select("ai_outcome, created_at, started_at, ended_at, call_duration_seconds")
        .gte("created_at", from)
        .limit(5000);
      const list = (rows ?? []) as Array<{ ai_outcome: string | null; created_at: string; started_at: string | null; ended_at: string | null; call_duration_seconds: number | null }>;
      const out = (r: { ai_outcome: string | null }) => String(r.ai_outcome || "").toLowerCase();
      const waits = list
        .filter((r) => r.started_at && r.ended_at && r.call_duration_seconds)
        .map((r) => (new Date(r.ended_at!).getTime() - new Date(r.started_at!).getTime()) / 1000 - Number(r.call_duration_seconds))
        .filter((s) => s >= 0 && s < 600);
      return {
        total: list.length,
        yes: list.filter((r) => YES.includes(out(r))).length,
        stop: list.filter((r) => STOP.includes(out(r))).length,
        avg: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
      };
    },
  });

  const items = [
    { label: "Apeluri", value: data?.total ?? 0, icon: Phone },
    { label: "Răspuns DA", value: data?.yes ?? 0, icon: ThumbsUp },
    { label: "STOP / Nu dorește", value: data?.stop ?? 0, icon: Ban },
    { label: "Timp mediu răspuns", value: data?.avg == null ? "—" : `${data.avg} s`, icon: Timer },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Apelurile lui Andrei</CardTitle>
          <CardDescription>Timpul de răspuns = cât a sunat până a răspuns proprietarul.</CardDescription>
        </div>
        <div className="flex gap-1">
          {[7, 30].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              {d} zile
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <div key={it.label} className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <it.icon className="h-3.5 w-3.5" /> {it.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{isLoading ? "…" : it.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
