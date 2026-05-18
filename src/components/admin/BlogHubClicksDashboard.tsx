import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, MapPin, MousePointerClick, LayoutGrid } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface HubRow {
  id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface AggRow {
  location: string;
  inline: number;
  card: number;
  total: number;
}

const BlogHubClicksDashboard = () => {
  const [dateRange, setDateRange] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["blog-hub-clicks", dateRange],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      const endDate = endOfDay(new Date());
      const { data, error } = await supabase
        .from("cta_analytics")
        .select("id, created_at, metadata")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .eq("cta_type", "form_submit")
        .filter("metadata->>event", "eq", "blog_location_hub_click")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as HubRow[];
    },
  });

  const { rows, totals } = useMemo(() => {
    const map = new Map<string, AggRow>();
    let inlineTotal = 0;
    let cardTotal = 0;
    (data ?? []).forEach((r) => {
      const meta = r.metadata ?? {};
      const location = String((meta as any).location ?? "—");
      const source = String((meta as any).source ?? "inline");
      if (!map.has(location)) map.set(location, { location, inline: 0, card: 0, total: 0 });
      const row = map.get(location)!;
      if (source === "card") {
        row.card += 1;
        cardTotal += 1;
      } else {
        row.inline += 1;
        inlineTotal += 1;
      }
      row.total += 1;
    });
    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
    return { rows, totals: { inline: inlineTotal, card: cardTotal, total: inlineTotal + cardTotal, locations: rows.length } };
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Hub Clicks – Locații Blog
          </h2>
          <p className="text-sm text-muted-foreground">Click-uri pe linkurile către hub-urile de locație din articole.</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ultimele 7 zile</SelectItem>
            <SelectItem value="30">Ultimele 30 zile</SelectItem>
            <SelectItem value="90">Ultimele 90 zile</SelectItem>
            <SelectItem value="365">Ultimul an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<MousePointerClick className="w-4 h-4" />} label="Total click-uri" value={totals.total} />
        <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Link inline" value={totals.inline} />
        <StatCard icon={<LayoutGrid className="w-4 h-4" />} label="Card final" value={totals.card} />
        <StatCard icon={<MapPin className="w-4 h-4" />} label="Locații active" value={totals.locations} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Click-uri per locație</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Nu există click-uri în intervalul selectat.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="location" angle={-25} textAnchor="end" interval={0} height={60} className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inline" name="Inline" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="card" name="Card" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalii</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Locație</th>
                  <th className="text-right px-4 py-2">Inline</th>
                  <th className="text-right px-4 py-2">Card</th>
                  <th className="text-right px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.location} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium text-foreground">{r.location}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.inline}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.card}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">{r.total}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Niciun click înregistrat încă.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value.toLocaleString("ro-RO")}</div>
    </CardContent>
  </Card>
);

export default BlogHubClicksDashboard;
