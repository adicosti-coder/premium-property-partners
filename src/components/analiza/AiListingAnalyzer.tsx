import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Camera,
  Sparkles,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowDownToLine,
  Wallet,
  BarChart3,
  Lightbulb,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HostScanUploader from "@/components/hostscan/HostScanUploader";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

export interface ListingAnalysis {
  titlu?: string | null;
  zona?: string | null;
  tip_proprietate?: string | null;
  camere?: number | null;
  suprafata?: number | null;
  pret_listare?: number | null;
  moneda?: string | null;
  scor?: number | null;
  max_scor?: number | null;
  tarif_noapte?: number | null;
  venit_lunar_brut?: number | null;
  venit_lunar_net?: number | null;
  roi_estimat?: string | null;
  puncte_forte?: string[] | null;
  riscuri?: string[] | null;
  recomandari?: string[] | null;
  verdict?: string | null;
  comparabile_zona?: Array<{
    denumire?: string | null;
    tarif_noapte?: number | null;
    ocupare_estimata?: string | null;
    observatie?: string | null;
  }> | null;
}

export interface AnalyzerResult {
  analysis: ListingAnalysis;
  sourceUrl: string | null;
  mode: "url" | "photos";
  photoCount: number;
  cached?: boolean;
  shareToken?: string | null;
}


interface Props {
  onResult: (result: AnalyzerResult) => void;
  onPrefill: (data: { propertyType?: string; area?: string; details?: string }) => void;
}

const ANALYSIS_URL = `${supabaseConfig.url}/functions/v1/public-listing-analysis`;

const TYPE_MAP: Record<string, string> = {
  apartament: "apartament",
  casa: "casa",
  casă: "casa",
  studio: "studio",
  garsoniera: "studio",
  garsonieră: "studio",
  comercial: "comercial",
};

function compressImage(base64: string, maxWidth = 900, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(base64);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

const STEPS = [
  "Validăm sursa și verificăm cache-ul",
  "Extragem datele proprietății",
  "Estimăm tariful și ocuparea",
  "Construim raportul final",
];

const fmt = (n: number | null | undefined, suffix = "") =>
  typeof n === "number" && Number.isFinite(n) ? `${Math.round(n).toLocaleString("ro-RO")}${suffix}` : "—";

const AiListingAnalyzer = ({ onResult, onPrefill }: Props) => {
  const [tab, setTab] = useState<"url" | "photos">("url");
  const [url, setUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const timers = [
      window.setTimeout(() => setStep(1), 1200),
      window.setTimeout(() => setStep(2), 5000),
      window.setTimeout(() => setStep(3), 11000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [loading]);

  const run = async () => {
    if (loading) return;
    if (tab === "url" && !/^https:\/\/.+\..+/.test(url.trim())) {
      toast.error("Lipește un link complet (https://...) de pe OLX, Storia, Imobiliare.ro, Publi24, Booking sau Airbnb.");
      return;
    }
    if (tab === "photos" && images.length === 0) {
      toast.error("Adaugă cel puțin o fotografie a proprietății.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { mode: tab, context: context.trim() };
      if (tab === "url") {
        body.url = url.trim();
      } else {
        body.images = await Promise.all(images.slice(0, 8).map((img) => compressImage(img)));
      }

      const res = await fetch(ANALYSIS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: getSupabasePublishableKey(),
          Authorization: `Bearer ${getSupabasePublishableKey()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.analysis) {
        toast.error(
          data?.message ||
            (res.status === 429
              ? "Prea multe analize într-o oră. Încearcă mai târziu."
              : "Nu am putut analiza. Încearcă cu fotografii sau completează manual formularul."),
        );
        return;
      }

      const payload: AnalyzerResult = {
        analysis: data.analysis as ListingAnalysis,
        sourceUrl: data.source_url ?? null,
        mode: tab,
        photoCount: tab === "photos" ? images.length : 0,
        cached: Boolean(data.cached),
        shareToken: (data.share_token as string | null) ?? null,
      };

      setResult(payload);
      onResult(payload);
      toast.success(data.cached ? "Analiză recuperată instant din cache." : "Analiza AI este gata.");
    } catch {
      toast.error("Analiza a eșuat. Verifică conexiunea și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  const applyToForm = () => {
    if (!result) return;
    const a = result.analysis;
    const typeKey = (a.tip_proprietate || "").toLowerCase().trim();
    const details = [
      a.titlu ? `Anunț: ${a.titlu}` : null,
      a.zona ? `Zonă estimată: ${a.zona}` : null,
      a.camere ? `Camere: ${a.camere}` : null,
      a.pret_listare ? `Preț listare: ${a.pret_listare} ${a.moneda || "EUR"}` : null,
      typeof a.scor === "number" ? `Scor AI: ${a.scor}/${a.max_scor || 100}` : null,
      a.roi_estimat ? `ROI estimat AI: ${a.roi_estimat}` : null,
      result.sourceUrl ? `Link anunț: ${result.sourceUrl}` : null,
      result.mode === "photos" ? `Fotografii analizate: ${result.photoCount}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    onPrefill({
      propertyType: TYPE_MAP[typeKey],
      area: a.suprafata ? String(Math.round(a.suprafata)) : undefined,
      details,
    });
    toast.success("Datele au fost trecute în formular.");
    document.getElementById("formular-analiza")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shareUrl = result?.shareToken
    ? `${window.location.origin}/analiza/${result.shareToken}`
    : null;

  const downloadPdf = async () => {
    if (!result) return;
    try {
      const { downloadAnalysisPdf } = await import("@/lib/analysisPdf");
      downloadAnalysisPdf({
        analysis: result.analysis,
        sourceUrl: result.sourceUrl,
        mode: result.mode,
        photoCount: result.photoCount,
        shareUrl,
      });
      toast.success("Raportul PDF a fost descărcat.");
    } catch {
      toast.error("Nu am putut genera PDF-ul. Încearcă din nou.");
    }
  };

  const shareAnalysis = async () => {
    if (!shareUrl) {
      toast.error("Linkul de partajare nu este disponibil pentru această analiză.");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: "Analiză RealTrust", url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiat. Îl poți trimite oricui.");
    } catch {
      toast.error("Nu am putut copia linkul. Copiază-l manual din bara de adrese a raportului.");
    }
  };


  return (
    <section className="px-4 py-8">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
            Analiză AI instant: link anunț sau fotografii
          </h2>
          <p className="text-sm text-muted-foreground">
            Lipește linkul anunțului tău sau încarcă fotografii. AI-ul estimează tariful pe noapte, venitul lunar
            net în regim hotelier și îți dă recomandări concrete.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "url" | "photos")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="w-4 h-4" aria-hidden="true" /> Link anunț
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <Camera className="w-4 h-4" aria-hidden="true" /> Fotografii
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="pt-4 space-y-2">
            <Label htmlFor="ai-url">Link anunț (OLX, Storia, Imobiliare.ro, Publi24, Booking, Airbnb)</Label>
            <Input
              id="ai-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.olx.ro/d/oferta/..."
              aria-label="Link anunț pentru analiză AI"
            />
          </TabsContent>

          <TabsContent value="photos" className="pt-4">
            <HostScanUploader images={images} onImagesChange={setImages} maxImages={8} language="ro" />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="ai-context">Context opțional (etaj, dotări, disponibilitate)</Label>
          <Textarea
            id="ai-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            placeholder="Ex: etaj 3 din 4, mobilat complet, lift, parcare subterană, liber din 1 septembrie"
          />
        </div>

        <Button onClick={run} disabled={loading} className="w-full min-h-12">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Se analizează cu AI...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" aria-hidden="true" /> Analizează cu AI</>
          )}
        </Button>

        {loading && (
          <ol className="space-y-2" aria-live="polite" aria-label="Progresul analizei AI">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : active
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                  {active && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        )}


        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 border-t border-border pt-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
                  <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold text-foreground">
                    Scor AI: {fmt(result.analysis.scor)}/{result.analysis.max_scor || 100}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Zonă: <strong className="text-foreground">{result.analysis.zona || "Timișoara"}</strong>
                </span>
                {result.cached && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    <Zap className="w-3 h-3" aria-hidden="true" /> Rezultat instant (cache)
                  </span>
                )}
              </div>

              {/* 1. Potențial randament */}
              <section className="space-y-3 rounded-xl border border-border bg-background p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" /> 1. Potențial randament
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Tarif/noapte", value: fmt(result.analysis.tarif_noapte, " RON") },
                    { label: "ROI estimat", value: result.analysis.roi_estimat || "—" },
                    { label: "Preț listare", value: `${fmt(result.analysis.pret_listare)} ${result.analysis.moneda || ""}`.trim() },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                      <p className="text-base font-bold text-foreground">{m.value}</p>
                    </div>
                  ))}
                </div>
                {result.analysis.verdict && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.analysis.verdict}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!!result.analysis.puncte_forte?.length && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Puncte forte</p>
                      <ul className="space-y-1">
                        {result.analysis.puncte_forte.slice(0, 5).map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!result.analysis.riscuri?.length && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Riscuri / atenționări</p>
                      <ul className="space-y-1">
                        {result.analysis.riscuri.slice(0, 5).map((p, i) => (
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

              {/* 2. Comparabile zonă */}
              {!!result.analysis.comparabile_zona?.length && (
                <section className="space-y-3 rounded-xl border border-border bg-background p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" /> 2. Comparabile în zonă
                  </h3>
                  <ul className="space-y-2">
                    {result.analysis.comparabile_zona.slice(0, 5).map((c, i) => (
                      <li key={i} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{c.denumire || "Proprietate similară"}</p>
                          <p className="text-sm text-muted-foreground">
                            {fmt(c.tarif_noapte, " RON/noapte")}
                            {c.ocupare_estimata ? ` · ocupare ${c.ocupare_estimata}` : ""}
                          </p>
                        </div>
                        {c.observatie && (
                          <p className="mt-1 text-xs text-muted-foreground">{c.observatie}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 3. Recomandări optimizare */}
              {!!result.analysis.recomandari?.length && (
                <section className="space-y-2 rounded-xl border border-border bg-background p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lightbulb className="w-4 h-4 text-primary" aria-hidden="true" /> 3. Recomandări de optimizare
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {result.analysis.recomandari.slice(0, 6).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                </section>
              )}

              {/* 4. Estimare venit lunar */}
              <section className="space-y-3 rounded-xl border border-border bg-background p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Wallet className="w-4 h-4 text-primary" aria-hidden="true" /> 4. Estimare venit lunar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Venit brut/lună", value: fmt(result.analysis.venit_lunar_brut, " RON") },
                    { label: "Venit net/lună", value: fmt(result.analysis.venit_lunar_net, " RON") },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-border p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                      <p className="text-base font-bold text-foreground">{m.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" onClick={downloadPdf} className="min-h-12">
                  <FileDown className="w-4 h-4 mr-2" aria-hidden="true" />
                  Descarcă Raport PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={shareAnalysis}
                  className="min-h-12"
                  disabled={!shareUrl}
                  aria-label="Distribuie link analiză"
                >
                  <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Distribuie link analiză
                </Button>
              </div>

              <Button variant="secondary" onClick={applyToForm} className="w-full min-h-12">
                <ArrowDownToLine className="w-4 h-4 mr-2" aria-hidden="true" />
                Trimite analiza spre echipa RealTrust
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Estimările folosesc 75% ocupare și 27% deducere management/taxe. Analiza umană detaliată vine în 24h lucrătoare.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AiListingAnalyzer;
