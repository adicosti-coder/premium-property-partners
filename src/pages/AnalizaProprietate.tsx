import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Send, ShieldCheck, Clock, LineChart, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import InvestmentYieldCalculator from "@/components/InvestmentYieldCalculator";
import FormTrustBadges from "@/components/forms/FormTrustBadges";
import AiListingAnalyzer, { type AnalyzerResult } from "@/components/analiza/AiListingAnalyzer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import { trackConversion, formatPhoneInput } from "@/lib/conversionTracking";
import { neighborhoods } from "@/data/neighborhoods";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));


const PROPERTY_TYPES = [
  { value: "apartament", label: "Apartament" },
  { value: "casa", label: "Casă" },
  { value: "studio", label: "Garsonieră / Studio" },
  { value: "comercial", label: "Spațiu comercial" },
];

const AnalizaProprietate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    propertyType: "apartament",
    zone: "",
    area: "",
    details: "",
  });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<AnalyzerResult | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePrefill = ({
    propertyType,
    area,
    details,
  }: { propertyType?: string; area?: string; details?: string }) =>
    setForm((prev) => ({
      ...prev,
      propertyType: propertyType || prev.propertyType,
      area: area || prev.area,
      details: details ? [details, prev.details.trim()].filter(Boolean).join(" | ") : prev.details,
    }));


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (honeypot) return;

    if (form.name.trim().length < 2) {
      toast.error("Introdu numele complet.");
      return;
    }
    if (form.phone.trim().length < 6) {
      toast.error("Introdu un număr de telefon valid.");
      return;
    }
    if (!consent) {
      toast.error("Este necesar consimțământul pentru prelucrarea datelor.");
      return;
    }

    setSubmitting(true);
    try {
      const zoneLabel =
        neighborhoods.find((n) => n.slug === form.zone)?.fullName ?? form.zone ?? "";

      const { data, error } = await supabase.rpc("submit_analysis_lead", {
        p_name: form.name.trim(),
        p_phone: formatPhoneInput(form.phone),
        p_email: form.email.trim(),
        p_property_type: form.propertyType,
        p_property_area: Number(form.area) || 0,
        p_message: `[analiza_proprietate] Zonă: ${zoneLabel || "-"} · ${form.details.trim() || "fără detalii suplimentare"}${
          aiResult
            ? ` · [AI ${aiResult.mode === "url" ? "link" : `${aiResult.photoCount} poze`}] scor ${aiResult.analysis.scor ?? "-"}/${aiResult.analysis.max_scor ?? 100}, tarif ${aiResult.analysis.tarif_noapte ?? "-"} RON/noapte, net ${aiResult.analysis.venit_lunar_net ?? "-"} RON/lună${aiResult.sourceUrl ? `, sursă: ${aiResult.sourceUrl}` : ""}`
            : ""
        }`,
        p_simulation: withCampaignTracking({
          zone: form.zone,
          zone_label: zoneLabel,
          property_type: form.propertyType,
          area: Number(form.area) || 0,
          ai_analysis: aiResult
            ? {
                mode: aiResult.mode,
                source_url: aiResult.sourceUrl,
                photo_count: aiResult.photoCount,
                ...aiResult.analysis,
              }
            : null,
        }) as never,

        p_source: "analiza_proprietate",
      });

      if (error || !data) throw error ?? new Error("no_token");

      trackConversion({
        event: "roi_calculator_lead",
        source: "analiza_proprietate",
        property_type: form.propertyType,
        zone: form.zone,
        name: form.name,
        phone: form.phone,
        email: form.email,
      });

      navigate(`/status-lead/${data}`);
    } catch {
      toast.error("Nu am putut trimite analiza. Te rugăm să încerci din nou.");
      setSubmitting(false);
    }
  };

  return (
    <Suspense fallback={null}>
      <SEOHead
        title="Analiză AI proprietate Timișoara | Link anunț sau poze | RealTrust"
        description="Încarcă linkul anunțului sau fotografiile proprietății și primești instant analiza AI: tarif pe noapte, venit net lunar în regim hotelier și recomandări. Gratuit, Timișoara."
        socialDescription="Analiză AI gratuită: tarif pe noapte, venit net lunar și potențial în regim hotelier, în Timișoara."
        url="https://realtrust.ro/hostscan-ai"
        breadcrumbItems={[
          { name: "Acasă", url: "https://realtrust.ro/" },
          { name: "Analiză proprietate", url: "https://realtrust.ro/hostscan-ai" },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Analiză AI potențial regim hotelier — RealTrust",
          url: "https://realtrust.ro/hostscan-ai",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "ro-RO",
          description:
            "Instrument gratuit care analizează linkul anunțului sau fotografiile proprietății și estimează tariful pe noapte, venitul net lunar și ROI-ul în regim hotelier în Timișoara.",
          offers: { "@type": "Offer", price: 0, priceCurrency: "RON" },
          areaServed: { "@type": "City", name: "Timișoara" },
        }}
      />
      <Header />
      <main className="min-h-[80vh]">
        <section className="px-4 pt-12 pb-4">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              Analiza potențialului proprietății tale
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Lipește linkul anunțului sau încarcă fotografii — AI-ul le analizează instant. Apoi cere
              analiza detaliată și urmărești în timp real fiecare etapă a cererii tale.
            </p>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
              <li className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" aria-hidden="true" /> Analiză AI din link sau poze</li>
              <li className="flex items-center gap-1.5"><LineChart className="w-4 h-4 text-primary" aria-hidden="true" /> Randament pe date reale</li>
              <li className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" aria-hidden="true" /> Răspuns în 24h lucrătoare</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" /> Fără obligații</li>
            </ul>
          </div>
        </section>

        <AiListingAnalyzer onResult={setAiResult} onPrefill={handlePrefill} />

        <InvestmentYieldCalculator />

        <section className="px-4 pb-16">
          <form
            id="formular-analiza"
            onSubmit={handleSubmit}
            className="w-full max-w-2xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5 shadow-lg scroll-mt-24"
          >

            <div className="space-y-1">
              <h2 className="text-2xl font-serif font-bold text-foreground">
                Formular de analiză a potențialului imobiliar
              </h2>
              <p className="text-sm text-muted-foreground">
                Completează datele proprietății și primești analiza personalizată de la echipa RealTrust.
              </p>
            </div>

            {/* Honeypot */}
            <input
              type="text"
              name="company_website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ap-name">Nume complet *</Label>
                <Input
                  id="ap-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ion Popescu"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-phone">Telefon / WhatsApp *</Label>
                <Input
                  id="ap-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="0722 123 456"
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-email">Email</Label>
                <Input
                  id="ap-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@exemplu.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-type">Tip proprietate</Label>
                <select
                  id="ap-type"
                  value={form.propertyType}
                  onChange={(e) => set("propertyType", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-zone">Zonă</Label>
                <select
                  id="ap-zone"
                  value={form.zone}
                  onChange={(e) => set("zone", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Alege zona</option>
                  {neighborhoods.map((n) => (
                    <option key={n.slug} value={n.slug}>{n.fullName}</option>
                  ))}
                  <option value="alta">Altă zonă</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-area">Suprafață utilă (m²)</Label>
                <Input
                  id="ap-area"
                  type="number"
                  min={0}
                  value={form.area}
                  onChange={(e) => set("area", e.target.value)}
                  placeholder="55"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ap-details">Detalii suplimentare</Label>
              <Textarea
                id="ap-details"
                value={form.details}
                onChange={(e) => set("details", e.target.value)}
                placeholder="Etaj, an construcție, finisaje, dotări, disponibilitate..."
                rows={4}
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="ap-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                aria-label="Consimțământ prelucrare date personale"
              />
              <Label htmlFor="ap-consent" className="text-sm font-normal text-muted-foreground leading-relaxed">
                Sunt de acord cu prelucrarea datelor pentru a primi analiza solicitată, conform{" "}
                <a
                  href="/politica-confidentialitate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Politicii de Confidențialitate
                </a>
                . *
              </Label>
            </div>

            <Button type="submit" disabled={submitting} className="w-full min-h-12">
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Se trimite...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Trimite cererea de analiză</>
              )}
            </Button>

            <FormTrustBadges />
          </form>
        </section>
      </main>
      <Footer />
    </Suspense>
  );
};

export default AnalizaProprietate;
