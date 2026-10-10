import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, FileDown, MessageCircle, TrendingDown, Target, Hotel, Gauge } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { submitLead } from "@/lib/leadSubmission";
import type { ListingAnalysis } from "@/components/analiza/AiListingAnalyzer";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

interface Market {
  zone_label: string;
  scope: "zona" | "oras";
  comparables: number;
  median_ppm: number;
  asking_ppm: number;
  diff_pct: number;
  total_score: number;
  scores: Record<"lichiditate" | "cerere_inchiriere" | "calitate_zona" | "transport" | "pret_mp", number>;
  negotiation_eur: number;
  target_low: number;
  target_high: number;
  classic_rent_month: number;
  classic_yield_pct: number;
  hotel_net_month_min: number;
  hotel_net_month_max: number;
  hotel_yield_pct: number;
}

const CRITERIA: Array<[keyof Market["scores"], string]> = [
  ["lichiditate", "Lichiditate"],
  ["cerere_inchiriere", "Cerere de închiriere"],
  ["calitate_zona", "Calitatea zonei"],
  ["transport", "Transport"],
  ["pret_mp", "Raport preț/m²"],
];

const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;
const fnUrl = (name: string) => `${supabaseConfig.url}/functions/v1/${name}`;
const headers = () => ({
  "Content-Type": "application/json",
  apikey: getSupabasePublishableKey(),
  Authorization: `Bearer ${getSupabasePublishableKey()}`,
});

const AnalizaAnunt = () => {
  // Linkurile din alertele WhatsApp pentru investitori vin cu ?url=… precompletat.
  const [url, setUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("url")?.slice(0, 500) ?? "";
  });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ListingAnalysis | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^https:\/\/(www\.)?[^/]*(storia|olx|publi24|imobiliare)\.ro\//i.test(url.trim())) {
      toast.error("Lipește un link https de pe Storia, OLX, Publi24 sau Imobiliare.ro.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setMarket(null);
    try {
      let a: ListingAnalysis;
      let m: any = {};
      // Cache: același link analizat în ultimele 48h → afișăm direct rezultatul salvat.
      const cRes = await fetch(fnUrl("analyzed-listing"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "lookup", url: url.trim() }),
      }).catch(() => null);
      const c = cRes?.ok ? await cRes.json().catch(() => null) : null;
      if (c?.hit && c.analysis) {
        a = c.analysis as ListingAnalysis;
        m = c.market ?? {};
        setAnalysis(a);
        setSourceUrl(url.trim());
        if (m?.ok) setMarket(m as Market);
        toast.success("Rezultat salvat din ultimele 48 de ore.");
      } else {
        const res = await fetch(fnUrl("public-listing-analysis"), {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ mode: "url", url: url.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.analysis) {
          toast.error(data?.message || "Nu am putut citi anunțul. Încearcă din nou.");
          return;
        }
        a = data.analysis as ListingAnalysis;
        setAnalysis(a);
        setSourceUrl(data.source_url ?? url.trim());

        const mRes = await fetch(fnUrl("listing-market-score"), {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ zone: [a.zona, a.titlu].filter(Boolean).join(" "), rooms: a.camere, size: a.suprafata, price: a.pret_listare, source_url: url.trim(), title: a.titlu, phone: phone.trim() || null }),
        });
        m = await mRes.json().catch(() => ({}));
        if (!mRes.ok || !m?.ok) {
          toast.error(m?.message || "Nu am putut compara cu piața. Prețul sau suprafața lipsesc din anunț.");
        } else {
          setMarket(m as Market);
        }
        fetch(fnUrl("analyzed-listing"), {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ action: "save", url: url.trim(), phone: phone.trim() || null, analysis: a, market: m?.ok ? m : null }),
        }).catch(() => undefined);
      }


      if (phone.trim()) {
        submitLead({
          name: "Analiză anunț",
          whatsapp_number: phone.trim(),
          property_type: a.tip_proprietate || "apartament",
          property_area: Math.round(a.suprafata || 0),
          message: [
            `• Link: ${url.trim()}`,
            a.zona ? `• Zonă: ${a.zona}` : null,
            a.pret_listare ? `• Preț cerut: ${eur(a.pret_listare)}` : null,
            m?.ok ? `• Scor: ${m.total_score}/100 · Țintă ${eur(m.target_low)}–${eur(m.target_high)}` : null,
          ].filter(Boolean).join("\n"),
          source: "analiza_anunt",
          viaServer: true,
        }).catch(() => undefined);
      }
    } catch {
      toast.error("Eroare de conexiune. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!analysis) return;
    const { downloadAnalysisPdf } = await import("@/lib/analysisPdf");
    downloadAnalysisPdf({ analysis, sourceUrl, mode: "url", createdAt: new Date().toISOString(), market });
    fetch(fnUrl("analyzed-listing"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "pdf", url: url.trim() || sourceUrl }),
    }).catch(() => undefined);
  };

  const waText = encodeURIComponent(
    `Bună! Aș dori o evaluare detaliată pentru anunțul: ${sourceUrl || url}${market ? ` (scor ${market.total_score}/100)` : ""}`,
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Analizează un anunț imobiliar din Timișoara | RealTrust"
        description="Lipește linkul de pe Storia, OLX, Publi24 sau Imobiliare.ro și primești scorul proprietății, marja de negociere și prețul țintă."
        url="https://realtrust.ro/analiza-anunt"
      />
      <Suspense fallback={null}><Header /></Suspense>
      <main className="px-4 pt-28 pb-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Analizează orice anunț imobiliar din Timișoara
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Lipește linkul de pe Storia, OLX, Publi24 sau Imobiliare.ro și primești instant o evaluare obiectivă,
            scorul proprietății și marja de negociere.
          </p>
          <form onSubmit={analyze} className="mt-8 space-y-3 text-left">
            <Label htmlFor="listing-url" className="sr-only">Link anunț</Label>
            <Input
              id="listing-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.storia.ro/ro/oferta/..."
              className="h-14 text-base"
            />
            <Label htmlFor="listing-phone" className="text-sm text-muted-foreground">
              Număr WhatsApp / telefon (opțional — ca să îți trimitem evaluarea detaliată)
            </Label>
            <Input
              id="listing-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xx xxx xxx"
              className="h-12"
            />
            <Button type="submit" size="lg" disabled={loading} className="w-full h-14 text-base gap-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {loading ? "Analizăm anunțul (până la 1 minut)…" : "Analizează Anunțul"}
            </Button>
          </form>
        </section>

        {analysis && (
          <section className="mx-auto mt-12 max-w-5xl space-y-6" aria-live="polite">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">{analysis.titlu || "Rezultatul analizei"}</h2>
              <p className="text-muted-foreground">
                {[analysis.zona, analysis.camere ? `${analysis.camere} camere` : null, analysis.suprafata ? `${analysis.suprafata} m²` : null,
                  analysis.pret_listare ? eur(analysis.pret_listare) : null].filter(Boolean).join(" · ")}
              </p>
            </div>

            {market && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Scor general</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-5xl font-bold text-foreground">{market.total_score}<span className="text-xl text-muted-foreground">/100</span></p>
                    <div className="mt-5 space-y-3">
                      {CRITERIA.map(([k, label]) => (
                        <div key={k}>
                          <div className="flex justify-between text-sm"><span>{label}</span><span className="font-medium">{market.scores[k]}</span></div>
                          <Progress value={market.scores[k]} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Negociere & preț țintă</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Preț cerut</p>
                      <p className="text-2xl font-semibold">{eur(analysis.pret_listare || 0)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-primary" />
                      <p className="text-lg">Spațiu de negociere: <strong>~{eur(market.negotiation_eur)}</strong></p>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-sm text-muted-foreground">Preț țintă recomandat</p>
                      <p className="text-2xl font-bold text-foreground">{eur(market.target_low)} – {eur(market.target_high)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {eur(market.asking_ppm)}/m² față de mediana de {eur(market.median_ppm)}/m²{" "}
                      {market.scope === "zona" ? `în ${market.zone_label}` : "în Timișoara"} ({market.diff_pct > 0 ? "+" : ""}{market.diff_pct}%),
                      din {market.comparables} anunțuri comparabile din ultimele 6 luni.
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5 text-primary" /> Oportunitate în regim hotelier</CardTitle></CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Chirie clasică estimată</p>
                      <p className="text-2xl font-semibold">{eur(market.classic_rent_month)}/lună</p>
                      <p className="text-sm text-muted-foreground">Randament net ≈ {market.classic_yield_pct}%/an</p>
                    </div>
                    <div className="rounded-lg border border-primary p-4">
                      <p className="text-sm text-muted-foreground">Administrare RealTrust (regim hotelier)</p>
                      <p className="text-2xl font-semibold text-primary">≈ {eur(market.hotel_net_month_min)}–{eur(market.hotel_net_month_max)}/lună net</p>
                      <p className="text-sm text-muted-foreground">Randament țintă ~{market.hotel_yield_pct}%/an</p>
                    </div>
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                      Estimări orientative, calculate din prețul cerut și datele de piață colectate de RealTrust. Nu reprezintă o evaluare ANEVAR.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={downloadPdf} className="gap-2 min-h-12">
                <FileDown className="h-5 w-5" /> Descarcă Raportul Gratuit PDF
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2 min-h-12">
                <a href={`https://wa.me/40799069256?text=${waText}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" /> Cere o evaluare detaliată pe WhatsApp
                </a>
              </Button>
            </div>
          </section>
        )}
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default AnalizaAnunt;
