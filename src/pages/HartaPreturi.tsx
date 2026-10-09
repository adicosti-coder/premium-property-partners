import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

type Zone = { label: string; lat: number; lng: number; n: number; ppm: number | null };
const W = 640, H = 520, LAT = [45.715, 45.805], LNG = [21.19, 21.315];
const xy = (lat: number, lng: number) => ({ x: ((lng - LNG[0]) / (LNG[1] - LNG[0])) * W, y: H - ((lat - LAT[0]) / (LAT[1] - LAT[0])) * H });

const HartaPreturi = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [city, setCity] = useState(0);
  const [sample, setSample] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${supabaseConfig.url}/functions/v1/zone-price-map`, {
      headers: { apikey: getSupabasePublishableKey(), Authorization: `Bearer ${getSupabasePublishableKey()}` },
    }).then((r) => r.json()).then((d) => {
      if (d?.ok) { setZones(d.zones); setCity(d.city_ppm); setSample(d.sample); }
    }).catch(() => undefined);
  }, []);

  const range = useMemo(() => {
    const v = zones.map((z) => z.ppm).filter((p): p is number => !!p);
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
  }, [zones]);
  const op = (p: number) => 0.25 + 0.75 * ((p - range[0]) / Math.max(1, range[1] - range[0]));
  const sorted = [...zones].filter((z) => z.ppm).sort((a, b) => (b.ppm ?? 0) - (a.ppm ?? 0));
  const fmt = (n: number) => `${n.toLocaleString("ro-RO")} €/m²`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Harta prețurilor apartamentelor din Timișoara pe cartiere | RealTrust"
        description="Prețul mediu pe m² la vânzare în fiecare cartier din Timișoara, calculat din anunțurile reale din ultimele 6 luni."
        url="https://realtrust.ro/harta-preturi"
      />
      <Suspense fallback={null}><Header /></Suspense>
      <main className="px-4 pt-28 pb-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Harta prețurilor din Timișoara</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Prețul mediu pe m² la vânzare, pe cartiere, din {sample ? sample.toLocaleString("ro-RO") : "sute de"} anunțuri reale din ultimele 6 luni.
            {city ? ` Media orașului: ${fmt(city)}.` : ""}
          </p>
        </section>
        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
          <Card><CardContent className="p-3">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-muted/30" role="img" aria-label="Hartă prețuri medii pe cartiere în Timișoara">
              {zones.map((z, i) => {
                const { x, y } = xy(z.lat, z.lng);
                return (
                  <g key={z.label} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer" role="button" aria-label={`${z.label}: ${z.ppm ? fmt(z.ppm) : "date insuficiente"}`}>
                    <circle cx={x} cy={y} r={z.ppm ? 34 + Math.min(z.n, 200) / 10 : 26} className={z.ppm ? "fill-primary" : "fill-muted-foreground"}
                      fillOpacity={z.ppm ? op(z.ppm) : 0.2} stroke="hsl(var(--foreground))" strokeWidth={sel === i ? 3 : 0} />
                    <text x={x} y={y - 4} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">{z.label}</text>
                    <text x={x} y={y + 13} textAnchor="middle" className="fill-foreground text-[12px]">{z.ppm ? fmt(z.ppm) : "date puține"}</text>
                  </g>
                );
              })}
            </svg>
          </CardContent></Card>
          <div className="space-y-3">
            {sel !== null && zones[sel] && (
              <Card><CardContent className="p-4">
                <div className="font-semibold text-foreground">{zones[sel].label}</div>
                <p className="text-sm text-muted-foreground">
                  {zones[sel].ppm
                    ? `${fmt(zones[sel].ppm!)} · ${Math.round(((zones[sel].ppm! - city) / city) * 100)}% față de media orașului · ${zones[sel].n} anunțuri`
                    : "Prea puține anunțuri recente pentru o medie sigură."}
                </p>
              </CardContent></Card>
            )}
            <Card><CardContent className="p-4 space-y-2">
              <div className="font-semibold text-foreground">Clasament cartiere</div>
              {sorted.map((z) => (
                <div key={z.label} className="flex justify-between text-sm"><span>{z.label}</span><span className="font-medium">{fmt(z.ppm!)}</span></div>
              ))}
            </CardContent></Card>
            <Card><CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Ai găsit un anunț? Află dacă prețul e corect și cât poți negocia.</p>
              <Button asChild className="w-full min-h-12"><Link to="/analiza-anunt">Analizează un anunț</Link></Button>
            </CardContent></Card>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-xs text-muted-foreground">Pozițiile cartierelor sunt aproximative. Mediile se actualizează automat.</p>
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default HartaPreturi;
