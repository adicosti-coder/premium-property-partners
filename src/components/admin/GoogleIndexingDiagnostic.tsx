import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Search } from "lucide-react";

const STALE = 5 * 60 * 1000;

const COLORS = {
  INDEXED: "hsl(142 71% 45%)",
  CRAWLED_NOT_INDEXED: "hsl(38 92% 50%)",
  URL_NOT_ON_GOOGLE: "hsl(0 72% 51%)",
  pending_check: "hsl(var(--muted-foreground))",
};

const LABELS: Record<string, string> = {
  INDEXED: "Indexate",
  CRAWLED_NOT_INDEXED: "Descoperite / Neindexate",
  URL_NOT_ON_GOOGLE: "Lipsă din index",
  pending_check: "Neverificate",
};

type Row = { indexing_status: string | null };

export function GoogleIndexingDiagnostic() {
  const q = useQuery({
    queryKey: ["indexing_diagnostic_v1"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("indexing_status")
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Realtime invalidate when Make.com updates the column
  useEffect(() => {
    const ch = supabase
      .channel("indexing_status_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "properties" },
        () => q.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (q.isLoading) return <Skeleton className="h-56 w-full" />;

  const rows = q.data ?? [];
  const total = rows.length;
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.indexing_status || "pending_check";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(LABELS).map(([key, name]) => ({
    key,
    name,
    value: counts[key] || 0,
  }));

  const indexed = counts["INDEXED"] || 0;
  const rate = total > 0 ? (indexed / total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="w-4 h-4" /> Diagnostic Indexare Google
        </CardTitle>
        <CardDescription className="text-xs">
          Rata de absorbție SEO: câte proprietăți publicate sunt efectiv în indexul Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Total publicate" value={total.toLocaleString("ro-RO")} />
            <Kpi label="În index Google" value={indexed.toLocaleString("ro-RO")} accent="emerald" />
            <Kpi
              label="Rată indexare"
              value={`${rate.toFixed(1)}%`}
              accent={rate >= 70 ? "emerald" : rate >= 40 ? "amber" : "rose"}
            />
            <Kpi
              label="Neverificate"
              value={(counts["pending_check"] || 0).toLocaleString("ro-RO")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber" | "rose";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
      ? "text-amber-600"
      : accent === "rose"
      ? "text-rose-600"
      : "text-foreground";
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default GoogleIndexingDiagnostic;
