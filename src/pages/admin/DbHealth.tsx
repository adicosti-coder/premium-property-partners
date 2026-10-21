import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Snapshot = {
  captured_at: string;
  db_size_bytes: number;
  stats_reset: string | null;
  blocks_read_disk: number;
  blocks_read_cache: number;
  cache_hit_pct: number | null;
  rows_read: number;
  rows_inserted: number;
  rows_updated: number;
  rows_deleted: number;
  temp_bytes: number;
  connections_active: number;
  connections_total: number;
  connections_max: number;
  shared_buffers: string;
  top_tables: Array<{ name: string; bytes: number; writes: number; reads: number }> | null;
};

const nf = new Intl.NumberFormat("ro-RO");
const fmtBytes = (b: number) => {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
};
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date(d));

function level(ok: boolean, warn: boolean) {
  if (ok) return { label: "În regulă", variant: "secondary" as const };
  if (warn) return { label: "De urmărit", variant: "outline" as const };
  return { label: "Sub presiune", variant: "destructive" as const };
}

const DbHealth = () => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const q = useQuery({
    queryKey: ["admin_db_health_snapshot"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_db_health_snapshot");
      if (error) throw error;
      return data as unknown as Snapshot;
    },
  });

  if (roleLoading) return <div className="container py-16"><Skeleton className="h-40 w-full" /></div>;
  if (!isAdmin) {
    return (
      <div className="container py-16 text-center">
        <p className="mb-4">Pagina este disponibilă doar pentru administratori.</p>
        <Button asChild><Link to="/auth">Autentificare</Link></Button>
      </div>
    );
  }

  const s = q.data;
  const writes = s ? s.rows_inserted + s.rows_updated + s.rows_deleted : 0;
  const connPct = s ? Math.round((100 * s.connections_total) / s.connections_max) : 0;
  const cache = s?.cache_hit_pct ?? 100;
  const sizeGb = s ? s.db_size_bytes / 1024 ** 3 : 0;

  return (
    <div className="container max-w-5xl py-24">
      <Helmet><title>Stare bază de date | Admin RealTrust</title><meta name="robots" content="noindex" /></Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-serif">Stare bază de date</h1>
          <p className="text-muted-foreground">
            {s ? `Actualizat ${fmtDate(s.captured_at)} · se reîmprospătează la fiecare minut` : "Se încarcă…"}
          </p>
        </div>
        <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching} className="min-h-12">
          <RefreshCw className={`w-4 h-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} /> Reîmprospătează
        </Button>
      </div>

      {q.error && <p className="text-destructive mb-4">Nu am putut citi starea bazei: {(q.error as Error).message}</p>}

      {!s ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center"><CardTitle className="text-lg">Spațiu folosit</CardTitle>
                  <Badge variant={level(sizeGb < 3, sizeGb < 6).variant}>{level(sizeGb < 3, sizeGb < 6).label}</Badge></div>
                <CardDescription>Cât ocupă toate datele salvate</CardDescription>
              </CardHeader>
              <CardContent><p className="text-3xl font-semibold">{fmtBytes(s.db_size_bytes)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center"><CardTitle className="text-lg">Memorie (citiri din memorie)</CardTitle>
                  <Badge variant={level(cache >= 99, cache >= 95).variant}>{level(cache >= 99, cache >= 95).label}</Badge></div>
                <CardDescription>Cât din citiri vin din memorie, fără să atingă discul. Peste 99% e ideal.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{s.cache_hit_pct ?? "—"}%</p>
                <p className="text-sm text-muted-foreground">Memorie rezervată: {s.shared_buffers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Citiri</CardTitle>
                <CardDescription>{s.stats_reset ? `Din ${fmtDate(s.stats_reset)}` : "Total"}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{nf.format(s.rows_read)} rânduri</p>
                <p className="text-sm text-muted-foreground">Citiri de pe disc: {nf.format(s.blocks_read_disk)} blocuri</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Scrieri</CardTitle>
                <CardDescription>Rânduri adăugate, modificate și șterse</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{nf.format(writes)}</p>
                <p className="text-sm text-muted-foreground">
                  +{nf.format(s.rows_inserted)} · ~{nf.format(s.rows_updated)} · −{nf.format(s.rows_deleted)}
                </p>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center"><CardTitle className="text-lg">Conexiuni</CardTitle>
                  <Badge variant={level(connPct < 60, connPct < 85).variant}>{level(connPct < 60, connPct < 85).label}</Badge></div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{s.connections_total} / {s.connections_max}</p>
                <p className="text-sm text-muted-foreground">{s.connections_active} active acum</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Cele mai mari tabele</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground">
                  <th className="py-2">Tabel</th><th>Spațiu</th><th>Citiri</th><th>Scrieri</th></tr></thead>
                <tbody>
                  {(s.top_tables ?? []).map((t) => (
                    <tr key={t.name} className="border-t border-border">
                      <td className="py-2">{t.name}</td><td>{fmtBytes(t.bytes)}</td>
                      <td>{nf.format(t.reads)}</td><td>{nf.format(t.writes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-4">
            Procentul exact de memorie al serverului și alertele de disc vin din monitorizarea Lovable Cloud; aici vedeți ce se poate citi direct din bază.
          </p>
        </>
      )}
    </div>
  );
};

export default DbHealth;
