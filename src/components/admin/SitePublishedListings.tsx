/**
 * „Anunțuri publicate pe realtrust.ro" — listă cu poza, prețul, data publicării,
 * link direct către pagina din site și comparație cu media anunțurilor găsite
 * (Anunțuri noi) din aceeași zonă și tip de imobil.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, Globe } from "lucide-react";
import { storageImage } from "@/utils/supabaseImage";

interface SiteListing {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  tag: string | null;
  rooms: number | null;
  size: number | null;
  capital_necesar: number | null;
  price_per_sqm: number | null;
  images: string[] | null;
  property_subtype: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const eur = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`;

const dateTimeRo = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function SitePublishedListings() {
  const [rows, setRows] = useState<SiteListing[]>([]);
  const [market, setMarket] = useState<Array<{ zone: string; type: string; avg: number; n: number }>>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [props, zones] = await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, name, slug, location, tag, rooms, size, capital_necesar, price_per_sqm, images, property_subtype, created_at, updated_at",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.rpc("get_zone_price_report_v2", { p_days: 90, p_type: null }),
    ]);
    setRows(((props.data || []) as unknown as SiteListing[]) || []);
    setMarket(
      ((zones.data || []) as any[]).map((z) => ({
        zone: norm(String(z.zone || "")),
        type: norm(String(z.property_type || "")),
        avg: Number(z.avg_price) || 0,
        n: Number(z.samples) || 0,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Actualizare în timp real când se publică un anunț nou pe site.
  useEffect(() => {
    const ch = supabase
      .channel("site-published-listings")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const term = norm(q);
    if (term.length < 2) return rows;
    return rows.filter((r) => norm(`${r.name} ${r.location || ""} ${r.tag || ""}`).includes(term));
  }, [rows, q]);

  const compare = (r: SiteListing) => {
    if (!r.capital_necesar || !r.location) return null;
    const loc = norm(r.location);
    const type = norm(r.property_subtype || "apartament");
    const m =
      market.find((x) => x.avg > 0 && x.type === type && (loc.includes(x.zone) || x.zone.includes(loc))) ||
      market.find((x) => x.avg > 0 && (loc.includes(x.zone) || x.zone.includes(loc)));
    if (!m) return null;
    return { ...m, diff: ((Number(r.capital_necesar) - m.avg) / m.avg) * 100 };
  };

  return (
    <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-emerald-600" /> Anunțuri publicate pe realtrust.ro
          </CardTitle>
          <CardDescription>
            Poza, prețul, data publicării și linkul direct al fiecărui anunț, comparat cu media anunțurilor găsite din
            aceeași zonă.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filtered.length} anunțuri</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Reîncarcă anunțurile publicate pe realtrust.ro"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută după titlu, zonă sau etichetă"
          className="max-w-[320px]"
          aria-label="Caută în anunțurile publicate pe realtrust.ro"
        />

        <div className="space-y-2">
          {filtered.map((r) => {
            const img = r.images?.[0] || null;
            const c = compare(r);
            const url = r.slug ? `https://realtrust.ro/proprietate/${r.slug}` : "https://realtrust.ro";
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-border/50 p-3"
              >
                {img ? (
                  <img
                    src={storageImage(img, { width: 120 })}
                    alt={`Anunț publicat: ${r.name}`}
                    className="h-20 w-20 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                    fără poză
                  </div>
                )}
                <div className="min-w-[200px] flex-1 space-y-1">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      r.location,
                      r.property_subtype,
                      r.rooms ? `${r.rooms} cam` : null,
                      r.size ? `${r.size} mp` : null,
                      r.tag,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Publicat: {dateTimeRo(r.created_at)}
                    {r.updated_at && r.updated_at !== r.created_at ? ` · actualizat ${dateTimeRo(r.updated_at)}` : ""}
                  </p>
                  {c && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Media anunțurilor găsite ({c.n}): <strong>{eur(c.avg)}</strong>
                      </span>
                      <Badge variant={c.diff > 0 ? "destructive" : "secondary"} className="gap-1">
                        {c.diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {c.diff > 0 ? "+" : ""}
                        {c.diff.toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge>{eur(r.capital_necesar)}</Badge>
                  {r.price_per_sqm ? (
                    <span className="text-xs text-muted-foreground">{eur(r.price_per_sqm)}/mp</span>
                  ) : null}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> deschide anunțul
                  </a>
                </div>
              </div>
            );
          })}
          {!filtered.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Se încarcă..." : "Niciun anunț publicat găsit."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
