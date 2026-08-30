import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Clock, FileCode2, Database } from "lucide-react";

interface SitemapStatusRow {
  cache_key: string;
  generated_at: string;
  url_count: number;
  bytes: number;
}

const CACHE_TTL_MIN = 30;

const LABELS: Record<string, string> = {
  index: "Sitemap index",
  static: "Rute statice",
  dynamic: "Rute dinamice + POI",
};

/** Status live al sitemap-ului: ultima reconstruire, URL-uri indexabile, stare cache. */
export const SitemapStatusBadge = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["sitemap-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sitemap_status");
      if (error) throw error;
      return (data ?? []) as SitemapStatusRow[];
    },
    refetchInterval: 60_000,
  });

  const rows = data ?? [];
  const totalUrls = rows.reduce((s, r) => s + (r.url_count ?? 0), 0);
  const newest = rows.reduce<string | null>(
    (acc, r) => (!acc || new Date(r.generated_at) > new Date(acc) ? r.generated_at : acc),
    null,
  );
  const ageMin = newest ? Math.round((Date.now() - new Date(newest).getTime()) / 60000) : null;
  const cacheFresh = ageMin !== null && ageMin < CACHE_TTL_MIN;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          Status sitemap
          {isLoading ? null : rows.length === 0 ? (
            <Badge variant="outline">Cache gol</Badge>
          ) : (
            <Badge variant={cacheFresh ? "default" : "secondary"}>
              {cacheFresh ? "Cache activ" : "Cache expirat"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Cache pe două niveluri (memorie + bază de date), TTL {CACHE_TTL_MIN} minute. Reconstruire automată
          zilnică la 04:20 UTC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Niciun document în cache. Apasă „Purge Sitemap Cache” pentru a regenera sitemap-urile.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Ultima reconstruire
                </p>
                <p className="text-sm font-medium mt-1">
                  {newest ? new Date(newest).toLocaleString("ro-RO") : "—"}
                </p>
                {ageMin !== null && (
                  <p className="text-xs text-muted-foreground">acum {ageMin} min</p>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileCode2 className="w-3.5 h-3.5" /> URL-uri indexabile
                </p>
                <p className="text-2xl font-semibold mt-1">{totalUrls}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" /> Documente în cache
                </p>
                <p className="text-2xl font-semibold mt-1">{rows.length}</p>
              </div>
            </div>

            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.cache_key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">{LABELS[r.cache_key] ?? r.cache_key}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.url_count} URL · {(r.bytes / 1024).toFixed(1)} KB ·{" "}
                    {new Date(r.generated_at).toLocaleString("ro-RO")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SitemapStatusBadge;
