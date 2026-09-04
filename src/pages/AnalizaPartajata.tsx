import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileDown,
  Lightbulb,
  Loader2,
  Share2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import type { ListingAnalysis } from "@/components/analiza/AiListingAnalyzer";
import AnalysisComparePanel from "@/components/analiza/AnalysisComparePanel";
import AnalysisExpiryCountdown from "@/components/analiza/AnalysisExpiryCountdown";
import { trackConversion } from "@/lib/conversionTracking";

interface SharedAnalysis {
  analysis: ListingAnalysis;
  sourceUrl: string | null;
  mode: string;
  photoCount: number;
  createdAt: string | null;
  expiresAt: string | null;
}

const fmt = (n: number | null | undefined, suffix = "") =>
  typeof n === "number" && Number.isFinite(n)
    ? `${Math.round(n).toLocaleString("ro-RO")}${suffix}`
    : "—";

const AnalizaPartajata = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedAnalysis | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const { data: rows, error } = await supabase.rpc("get_analysis_by_token", { _token: token });
      if (!active) return;
      const row = Array.isArray(rows) ? rows[0] : null;
      if (error || !row) {
        setData(null);
      } else {
        setData({
          analysis: (row.analysis as unknown as ListingAnalysis) || {},
          sourceUrl: row.source_url,
          mode: row.mode,
          photoCount: row.photo_count ?? 0,
          createdAt: row.created_at,
          expiresAt: row.expires_at ?? null,
        });
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const downloadPdf = async () => {
    if (!data) return;
    try {
      const { downloadAnalysisPdf } = await import("@/lib/analysisPdf");
      downloadAnalysisPdf({
        analysis: data.analysis,
        sourceUrl: data.sourceUrl,
        mode: data.mode === "photos" ? "photos" : "url",
        photoCount: data.photoCount,
        shareUrl: window.location.href,
        createdAt: data.createdAt,
      });
      trackConversion({ event: "download_yield_report", source: "analiza_partajata_pdf" });
      toast.success("Raportul PDF a fost descărcat.");
    } catch {
      toast.error("Nu am putut genera PDF-ul.");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiat.");
    } catch {
      toast.error("Copiază linkul manual din bara de adrese.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Se încarcă analiza</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <SEOHead
          title="Analiză indisponibilă | RealTrust"
          description="Linkul analizei nu mai este valabil."
          noIndex
        />
        <h1 className="text-2xl font-serif font-bold text-foreground">Analiza nu a fost găsită</h1>
        <p className="text-muted-foreground max-w-md">
          Linkul este invalid sau a expirat. Poți genera oricând o analiză nouă, gratuit.
        </p>
        <Button asChild>
          <Link to="/hostscan-ai">Generează o analiză nouă</Link>
        </Button>
      </div>
    );
  }

  const a = data.analysis;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Analiză potențial regim hotelier${a.zona ? ` – ${a.zona}` : ""} | RealTrust`}
        description="Raport AI RealTrust: scor de potențial, tarif estimat pe noapte, venit lunar net și recomandări de optimizare pentru regim hotelier în Timișoara."
        noIndex
      />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">
            Raport RealTrust
          </p>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            {a.titlu || "Analiză potențial regim hotelier"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[
              a.zona ? `Zonă: ${a.zona}` : null,
              a.tip_proprietate,
              a.camere ? `${a.camere} camere` : null,
              a.suprafata ? `${fmt(a.suprafata, " mp")}` : null,
              data.createdAt
                ? `Generat: ${new Date(data.createdAt).toLocaleDateString("ro-RO")}`
                : null,
              data.expiresAt
                ? `Link valabil până la: ${new Date(data.expiresAt).toLocaleDateString("ro-RO")}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>

        <AnalysisExpiryCountdown expiresAt={data.expiresAt} />

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadPdf} className="min-h-12">
            <FileDown className="w-4 h-4 mr-2" aria-hidden="true" /> Descarcă Raport PDF
          </Button>
          <Button variant="outline" onClick={copyLink} className="min-h-12" aria-label="Copiază linkul analizei">
            <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> Distribuie link analiză
          </Button>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Scor AI", value: `${fmt(a.scor)}/${a.max_scor || 100}` },
            { label: "Tarif/noapte", value: fmt(a.tarif_noapte, " RON") },
            { label: "ROI estimat", value: a.roi_estimat || "—" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" /> 1. Potențial randament
          </h2>
          {a.verdict && <p className="text-sm text-muted-foreground leading-relaxed">{a.verdict}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!!a.puncte_forte?.length && (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Puncte forte</p>
                <ul className="space-y-1">
                  {a.puncte_forte.slice(0, 6).map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!a.riscuri?.length && (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Riscuri / atenționări</p>
                <ul className="space-y-1">
                  {a.riscuri.slice(0, 6).map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {!!a.comparabile_zona?.length && (
          <section className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" /> 2. Comparabile în zonă
            </h2>
            <ul className="space-y-2">
              {a.comparabile_zona.slice(0, 6).map((c, i) => (
                <li key={i} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {c.denumire || "Proprietate similară"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fmt(c.tarif_noapte, " RON/noapte")}
                      {c.ocupare_estimata ? ` · ocupare ${c.ocupare_estimata}` : ""}
                    </p>
                  </div>
                  {c.observatie && <p className="mt-1 text-xs text-muted-foreground">{c.observatie}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!a.recomandari?.length && (
          <section className="space-y-2 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="w-4 h-4 text-primary" aria-hidden="true" /> 3. Recomandări de optimizare
            </h2>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {a.recomandari.slice(0, 8).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </section>
        )}

        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="w-4 h-4 text-primary" aria-hidden="true" /> 4. Estimare venit lunar
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Venit brut/lună", value: fmt(a.venit_lunar_brut, " RON") },
              { label: "Venit net/lună", value: fmt(a.venit_lunar_net, " RON") },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="text-base font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        </section>

        <AnalysisComparePanel analysis={a} shareUrl={window.location.href} />

        <p className="text-xs text-muted-foreground">
          Estimările folosesc 75% ocupare și 27% deducere management/taxe. Sunt orientative și nu
          reprezintă o ofertă contractuală.
        </p>

        <Button
          asChild
          className="w-full min-h-12"
          onClick={() =>
            trackConversion({ event: "schedule_call", source: "analiza_partajata_consultanta" })
          }
        >
          <Link to="/contact">Programează Consultanță</Link>
        </Button>

        <Button asChild variant="outline" className="w-full min-h-12">
          <Link to="/pentru-proprietari">Vreau administrare în regim hotelier</Link>
        </Button>
      </main>
    </div>
  );
};

export default AnalizaPartajata;
