import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

const ZONES = ["Centru / Cetate", "Iosefin", "Fabric", "Dumbrăvița", "Aradului", "Altă zonă din Timișoara"];
const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;

type Report = {
  zone_label: string; comparables: number; median_ppm: number; asking_ppm: number; diff_pct: number;
  total_score: number; target_low: number; target_high: number; negotiation_eur: number;
  classic_rent_month: number; classic_yield_pct: number; hotel_net_month_min: number; hotel_net_month_max: number;
};

export default function AnalizaGratuita() {
  const [form, setForm] = useState({ zone: ZONES[1], rooms: "2", size: "", price: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const size = Number(form.size), price = Number(form.price), rooms = Number(form.rooms);
    if (!(size >= 12 && size <= 500)) return toast.error("Introdu suprafața utilă, între 12 și 500 m².");
    if (!(price >= 10000 && price <= 5000000)) return toast.error("Introdu prețul cerut în euro.");
    setLoading(true);
    try {
      const res = await fetch(`${supabaseConfig.url}/functions/v1/listing-market-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: getSupabasePublishableKey(), Authorization: `Bearer ${getSupabasePublishableKey()}` },
        body: JSON.stringify({ zone: form.zone.startsWith("Altă") ? "Timișoara" : form.zone, rooms, size, price, title: `Analiză gratuită · ${rooms} camere · ${form.zone}`, phone: form.phone.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) return toast.error(data?.message || "Nu am putut genera raportul. Încearcă din nou.");
      setReport(data);
    } finally { setLoading(false); }
  };

  return (
    <>
      <SEOHead title="Analiză gratuită de preț pentru apartamente din Timișoara | RealTrust"
        description="Completează datele apartamentului și primești gratuit un raport de preț: preț țintă, comparații din zonă și randament estimat."
        url="https://realtrust.ro/analiza-gratuita" />
      <Suspense fallback={null}><Header /></Suspense>
      <main className="px-4 pt-28 pb-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Analiză gratuită de preț în Timișoara</h1>
          <p className="mt-4 text-muted-foreground">Completezi datele apartamentului și primești imediat prețul țintă, comparat cu anunțuri reale din ultimele 180 de zile.</p>
        </section>
        <Card className="mx-auto mt-8 max-w-2xl">
          <CardContent className="pt-6">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="zone">Zona</Label>
                <select id="zone" value={form.zone} onChange={set("zone")} className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3">
                  {ZONES.map((z) => <option key={z}>{z}</option>)}
                </select></div>
              <div><Label htmlFor="rooms">Camere</Label>
                <select id="rooms" value={form.rooms} onChange={set("rooms")} className="mt-1 h-12 w-full rounded-md border border-input bg-background px-3">
                  <option value="1">Garsonieră / 1 cameră</option><option value="2">2 camere</option><option value="3">3 camere</option><option value="4">4+ camere</option>
                </select></div>
              <div><Label htmlFor="size">Suprafață utilă (m²)</Label><Input id="size" inputMode="numeric" className="mt-1 h-12" value={form.size} onChange={set("size")} placeholder="ex. 52" /></div>
              <div><Label htmlFor="price">Preț cerut (€)</Label><Input id="price" inputMode="numeric" className="mt-1 h-12" value={form.price} onChange={set("price")} placeholder="ex. 95000" /></div>
              <div><Label htmlFor="phone">Telefon (opțional)</Label><Input id="phone" type="tel" className="mt-1 h-12" value={form.phone} onChange={set("phone")} placeholder="07xx xxx xxx" /></div>
              <Button type="submit" className="sm:col-span-2 min-h-[48px]" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se calculează…</> : "Primește raportul de preț"}
              </Button>
            </form>
          </CardContent>
        </Card>
        {report && (
          <Card className="mx-auto mt-6 max-w-2xl" aria-live="polite">
            <CardHeader><CardTitle>Raport de preț · {report.zone_label}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <div><div className="text-muted-foreground">Preț țintă estimat</div><div className="text-2xl font-semibold">{eur(report.target_low)} – {eur(report.target_high)}</div></div>
              <div><div className="text-muted-foreground">Scor proprietate</div><div className="text-2xl font-semibold">{report.total_score}/100</div></div>
              <div><div className="text-muted-foreground">Prețul tău / median zonă</div><div className="font-medium">{report.asking_ppm} €/m² vs {report.median_ppm} €/m² ({report.diff_pct > 0 ? "+" : ""}{report.diff_pct}%)</div></div>
              <div><div className="text-muted-foreground">Anunțuri comparate</div><div className="font-medium">{report.comparables}</div></div>
              <div><div className="text-muted-foreground">Chirie clasică estimată</div><div className="font-medium">{eur(report.classic_rent_month)}/lună · {report.classic_yield_pct}% brut</div></div>
              <div><div className="text-muted-foreground">Regim hotelier (estimare)</div><div className="font-medium">{eur(report.hotel_net_month_min)}–{eur(report.hotel_net_month_max)}/lună net · 6,5–9,4%/an</div></div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">Estimare calculată automat din anunțuri publice similare; nu este o evaluare autorizată. Pentru un anunț publicat, folosește <Link to="/analiza-anunt" className="underline">analiza după link</Link>.</p>
            </CardContent>
          </Card>
        )}
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </>
  );
}
