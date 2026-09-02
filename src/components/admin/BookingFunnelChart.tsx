import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, ExternalLink, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { properties } from "@/data/properties";
import { buildPynbookingUrl, isPynbookingUrl, sanitizeLiveRate } from "@/lib/pynbooking";

interface RequestRow {
  status: string | null;
  created_at: string;
  property_slug: string | null;
  estimated_total: number | null;
}

interface LiveRow {
  property_slug: string;
  price_per_night: number | null;
  last_price_update: string | null;
}

const MONTH_LABEL = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
};

const monthKey = (iso: string) => iso.slice(0, 7);

export default function BookingFunnelChart() {
  const requests = useQuery({
    queryKey: ["admin-booking-funnel"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const { data, error } = await supabase
        .from("booking_requests")
        .select("status, created_at, property_slug, estimated_total")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return (data || []) as RequestRow[];
    },
    staleTime: 60_000,
  });

  const live = useQuery({
    queryKey: ["admin-booking-live-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_live_data")
        .select("property_slug, price_per_night, last_price_update");
      if (error) throw error;
      return (data || []) as LiveRow[];
    },
    staleTime: 300_000,
  });

  const chartData = useMemo(() => {
    const rows = requests.data || [];
    const buckets = new Map<string, { month: string; cereri: number; confirmate: number; refuzate: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      buckets.set(key, { month: MONTH_LABEL(key), cereri: 0, confirmate: 0, refuzate: 0 });
    }
    for (const r of rows) {
      const bucket = buckets.get(monthKey(r.created_at));
      if (!bucket) continue;
      bucket.cereri += 1;
      if (r.status === "confirmed") bucket.confirmate += 1;
      if (r.status === "declined" || r.status === "cancelled") bucket.refuzate += 1;
    }
    return Array.from(buckets.values());
  }, [requests.data]);

  const stats = useMemo(() => {
    const rows = requests.data || [];
    const count = (s: string) => rows.filter((r) => (r.status || "pending") === s).length;
    const total = rows.length;
    const confirmed = count("confirmed");
    const contacted = count("contacted");
    const pending = count("pending");
    return {
      total,
      pending,
      contacted,
      confirmed,
      contactRate: total ? Math.round(((contacted + confirmed) / total) * 100) : 0,
      confirmRate: total ? Math.round((confirmed / total) * 100) : 0,
      revenue: rows
        .filter((r) => r.status === "confirmed")
        .reduce((sum, r) => sum + (Number(r.estimated_total) || 0), 0),
    };
  }, [requests.data]);

  const rates = useMemo(() => {
    const liveMap = new Map((live.data || []).map((r) => [r.property_slug, r]));
    const requestsBySlug = new Map<string, number>();
    for (const r of requests.data || []) {
      if (!r.property_slug) continue;
      requestsBySlug.set(r.property_slug, (requestsBySlug.get(r.property_slug) || 0) + 1);
    }
    return properties
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const row = liveMap.get(p.slug);
        const liveRate = row?.price_per_night ?? null;
        const rate = sanitizeLiveRate(liveRate, p.pricePerNight);
        return {
          slug: p.slug,
          name: p.name,
          rate,
          isLive: sanitizeLiveRate(liveRate, -1) === rate,
          updatedAt: row?.last_price_update || null,
          requests: requestsBySlug.get(p.slug) || 0,
          engineUrl: isPynbookingUrl(p.bookingUrl) ? buildPynbookingUrl(p.bookingUrl) : p.bookingUrl,
        };
      })
      .sort((a, b) => b.requests - a.requests);
  }, [live.data, requests.data]);

  return (
    <div className="space-y-4">
      <Card id="grafic-rezervari" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" aria-hidden="true" />
            Cereri de rezervare pe lună
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Se încarcă statisticile…
            </div>
          ) : requests.isError ? (
            <p className="py-16 text-center text-sm text-destructive">
              Nu am putut încărca statisticile de rezervări.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4 mb-6">
                {[
                  { label: "Cereri (12 luni)", value: stats.total },
                  { label: "În așteptare", value: stats.pending },
                  { label: "Rată contactare", value: `${stats.contactRate}%` },
                  { label: "Rată confirmare", value: `${stats.confirmRate}%` },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="text-xl font-bold text-foreground">{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="h-72" role="img" aria-label="Grafic cu cereri de rezervare lunare, confirmate și refuzate">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cereri" name="Cereri" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="confirmate" name="Confirmate" fill="hsl(var(--chart-2, var(--accent)))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="refuzate" name="Refuzate/Anulate" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {stats.revenue > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                  Valoare estimată a rezervărilor confirmate: €{stats.revenue.toLocaleString("ro-RO")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card id="tarife-live" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-lg">Tarife live din sistemul de rezervări</CardTitle>
        </CardHeader>
        <CardContent>
          {live.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Se încarcă tarifele…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Tarife live per apartament și numărul de cereri primite</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">Apartament</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Tarif/noapte</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Sursă</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Cereri</th>
                    <th scope="col" className="py-2 font-medium">Motor</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.slug} className="border-t">
                      <td className="py-2 pr-3 font-medium text-foreground">{r.name}</td>
                      <td className="py-2 pr-3">€{r.rate}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.isLive ? "default" : "secondary"}>
                          {r.isLive ? "live" : "tarif de bază"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{r.requests}</td>
                      <td className="py-2">
                        <Button asChild variant="ghost" size="sm">
                          <a href={r.engineUrl} target="_blank" rel="noopener noreferrer" aria-label={`Deschide motorul de rezervări pentru ${r.name}`}>
                            Deschide <ExternalLink className="ml-1 w-3 h-3" aria-hidden="true" />
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
