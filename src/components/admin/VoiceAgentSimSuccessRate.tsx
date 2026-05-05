import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target } from "lucide-react";

const SUCCESS_OUTCOMES = ["scheduled", "viewing_scheduled", "booked", "appointment_set", "success"];

export default function VoiceAgentSimSuccessRate() {
  const { data, isLoading } = useQuery({
    queryKey: ["voice-sim-success-rate"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: rows } = await supabase
        .from("voice_agent_script_test_logs")
        .select("outcome, status, created_at")
        .gte("created_at", since)
        .limit(500);
      const all = rows || [];
      const total = all.length;
      const success = all.filter((r: any) =>
        SUCCESS_OUTCOMES.includes((r.outcome || "").toLowerCase())
      ).length;
      const rate = total > 0 ? Math.round((success / total) * 100) : 0;
      // simple sparkline: bucket by day, last 14
      const buckets: Record<string, { t: number; s: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        buckets[d] = { t: 0, s: 0 };
      }
      for (const r of all as any[]) {
        const d = (r.created_at || "").slice(0, 10);
        if (buckets[d]) {
          buckets[d].t += 1;
          if (SUCCESS_OUTCOMES.includes((r.outcome || "").toLowerCase())) buckets[d].s += 1;
        }
      }
      const series = Object.entries(buckets).map(([day, b]) => ({
        day,
        rate: b.t > 0 ? Math.round((b.s / b.t) * 100) : 0,
        total: b.t,
      }));
      return { total, success, rate, series };
    },
    staleTime: 60_000,
  });

  const max = Math.max(10, ...(data?.series.map((p) => p.rate) || [0]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          Rata de succes vizionări (Simulări)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-6 mb-4">
          <div>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? "…" : `${data?.rate ?? 0}%`}
            </div>
            <div className="text-xs text-muted-foreground">
              {data?.success ?? 0} / {data?.total ?? 0} apeluri (30z)
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            ultimele 14 zile
          </div>
        </div>
        <div className="flex items-end gap-1 h-16">
          {data?.series.map((p) => (
            <div
              key={p.day}
              className="flex-1 bg-primary/20 hover:bg-primary/40 transition rounded-t"
              style={{ height: `${(p.rate / max) * 100}%` }}
              title={`${p.day}: ${p.rate}% (${p.total} apeluri)`}
            />
          ))}
        </div>
        {(data?.total ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Niciun apel test în ultimele 30 zile. Rulează simulări pentru a popula graficul.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
