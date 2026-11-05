import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowDown, ArrowRight, Camera, Check, Info, Link2, Loader2, MessageCircle, PenLine, RotateCcw, Sparkles, TrendingUp, Upload, X } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { MANAGEMENT_POLICY } from "@/lib/managementPolicy";
import { applyScenario, monthlyProjection, MONTH_LABELS, NIGHTLY_SLIDER_MAX_FACTOR, NIGHTLY_SLIDER_MIN_FACTOR } from "@/lib/unifiedCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { submitLead } from "@/lib/leadSubmission";
import { roMobileField } from "@/lib/phoneField";
import { SocialFollow } from "@/components/social/SocialFollow";
import { supabase, supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import { trackCriticalConversion, formatPhoneInput } from "@/lib/conversionTracking";
import { PROPERTY_TYPES, type Finish, type PropertyTypeValue } from "@/lib/ownerIncomeEstimate";
import { UNIFIED_ZONES as ZONES, computeUnified, getLocationLeadIdentity, getPropertyLeadIdentity, isValidRegionalLocation, isValidPropertySurface, mapAnalysisToInput, type ListingAnalysisLike, type LocationMode, type UnifiedZoneValue } from "@/lib/unifiedCalculator";
import { useLanguage } from "@/i18n/LanguageContext";
import { RegionalLocationInput } from "@/components/RegionalLocationInput";
import { trackCalculatorEvent } from "@/lib/calculatorAnalytics";

const WHATSAPP_NUMBER = "40799069256";
const ANALYSIS_URL = `${supabaseConfig.url}/functions/v1/public-listing-analysis`;
const MAX_PHOTOS = 8;

type InputMode = "manual" | "link" | "foto";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Introdu numele (minim 2 caractere)").max(80),
  phone: roMobileField("Introdu un mobil valid (ex: 0722 123 456)"),
  email: z.union([z.literal(""), z.string().trim().email("Email invalid").max(255)]),
});

const fmt = (n: number) => n.toLocaleString("ro-RO");

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

const readFile = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const Choice = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <Button
    variant="outline"
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`h-auto min-h-12 whitespace-normal justify-start rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
      active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "border-border bg-background text-foreground hover:border-primary/40"
    }`}
  >
    {children}
  </Button>
);

const UnifiedCalculator = () => {
  const { language } = useLanguage();
  const [nightlyOverride, setNightlyOverride] = useState<number | null>(null);
  const [occOverride, setOccOverride] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);
  const inputsRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !inputsRef.current || !resultRef.current) return;
    const seen = { inputs: false, result: false };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.target === inputsRef.current) seen.inputs = e.isIntersecting; else seen.result = e.isIntersecting; });
      setShowBar(seen.inputs && !seen.result);
    }, { rootMargin: "0px 0px -120px 0px" });
    io.observe(inputsRef.current); io.observe(resultRef.current);
    return () => io.disconnect();
  }, []);
  const [mode, setMode] = useState<InputMode>("manual");
  const [locationMode, setLocationMode] = useState<LocationMode>("local");
  const [regionalLocation, setRegionalLocation] = useState("");
  const [customRates, setCustomRates] = useState(false);
  const national = locationMode === "regional";
  const [type, setType] = useState<PropertyTypeValue>("2-camere");
  const [zone, setZone] = useState<UnifiedZoneValue>("central");
  const [surface, setSurface] = useState("55");
  const [manualRent, setManualRent] = useState("");
  const [manualNightly, setManualNightly] = useState("");
  const [parking, setParking] = useState(false);
  const [finish, setFinish] = useState<Finish>("standard");
  const [url, setUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [source, setSource] = useState<{ mode: InputMode; note: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "surface" | "manual" | "location", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const surfaceNum = Number(surface);
  const manual = national && customRates ? { classicRent: manualRent ? Number(manualRent) : undefined, nightlyRate: manualNightly ? Number(manualNightly) : undefined } : null;
  const r = useMemo(
    () => computeUnified({ type, zone, surface: surfaceNum, parking, finish, manual, locationMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, zone, surfaceNum, parking, finish, locationMode, customRates, manualRent, manualNightly],
  );
  const surfaceValid = isValidPropertySurface(surfaceNum);
  // Glisoarele revin la estimare când se schimbă proprietatea.
  useEffect(() => { setNightlyOverride(null); setOccOverride(null); }, [type, zone, surfaceNum, parking, finish, locationMode, customRates, manualRent, manualNightly]);
  const s = useMemo(() => applyScenario(r, { nightlyRate: nightlyOverride ?? undefined, occupancy: occOverride ?? undefined }), [r, nightlyOverride, occOverride]);
  const months = useMemo(() => monthlyProjection(s), [s]);
  const scenarioChanged = nightlyOverride !== null || occOverride !== null;
  const nightlyMin = Math.max(15, Math.round(r.nightlyRate * NIGHTLY_SLIDER_MIN_FACTOR));
  const nightlyMax = Math.max(nightlyMin + 5, Math.round(r.nightlyRate * NIGHTLY_SLIDER_MAX_FACTOR));
  const propertyIdentity = getPropertyLeadIdentity(type);
  const typeLabel = propertyIdentity.property_type_label;
  const indicativeType = ["casa-vila", "vila-vacanta", "pensiune-boutique", "hotel-motel"].includes(type);
  const locationIdentity = getLocationLeadIdentity(locationMode, zone, regionalLocation);
  const zoneLabel = locationIdentity.location;
  const locationSummary = `${locationIdentity.service_tag} Locație: ${zoneLabel} | Tip: ${typeLabel}`;
  const finishLabel = finish === "premium" ? "Premium Lux" : "Standard";
  const maxBar = Math.max(s.classicRent, s.netMax, 1);
  const leadSource = `calculator_unificat_${source?.mode ?? "manual"}`;
  const analyticsContext = { location_mode: locationMode, property_type: type, location_name: zoneLabel, surface_sqm: surfaceNum };
  const selectLocationMode = (next: LocationMode) => {
    if (next !== locationMode) trackCalculatorEvent("calculator_location_mode_select", { location_mode: next });
    setLocationMode(next);
    setErrors({});
  };

  const validateInputs = () => {
    if (!isValidPropertySurface(surfaceNum)) {
      setErrors({ surface: language === "ro" ? "Introdu suprafața utilă (între 15 și 5.000 mp)" : "Enter the usable area (between 15 and 5,000 sqm)" });
      return false;
    }
    if (national && !isValidRegionalLocation(regionalLocation)) {
      setErrors({ location: language === "ro" ? "Introdu orașul / zona (2–120 caractere)." : "Enter the city / area (2–120 characters)." });
      return false;
    }
    if (national && customRates && ((manualRent && Number(manualRent) < 100) || (manualNightly && Number(manualNightly) < 15))) {
      setErrors({ manual: language === "ro" ? "Tarifele personalizate: minimum 100 €/lună și 15 €/noapte; câmpurile goale folosesc estimarea standard." : "Custom rates: at least €100/month and €15/night; empty fields use the standard estimate." });
      return false;
    }
    setErrors({});
    return true;
  };

  const openLead = () => { if (validateInputs()) setOpen(true); };

  // Un singur eveniment de vizualizare, după ce vizitatorul a completat o proprietate validă.
  const locationReady = !national || isValidRegionalLocation(regionalLocation);
  useEffect(() => {
    if (viewTracked.current || !surfaceValid || !locationReady) return;
    const t = window.setTimeout(() => {
      viewTracked.current = true;
      trackCalculatorEvent("calculator_result_view", analyticsContext);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceValid, locationReady, type, zone, surfaceNum, regionalLocation, locationMode]);

  const applyAnalysis = (a: ListingAnalysisLike, from: InputMode) => {
    const m = mapAnalysisToInput(a);
    if (m.type) setType(m.type);
    if (m.zone) setZone(m.zone);
    if (m.surface) setSurface(String(m.surface));
    else if (m.type) setSurface(String(PROPERTY_TYPES.find((t) => t.value === m.type)?.refSqm ?? 55));
    if (m.finish) setFinish(m.finish);
    const parts = [
      m.type && PROPERTY_TYPES.find((t) => t.value === m.type)?.label,
      m.zone && ZONES.find((z) => z.value === m.zone)?.label,
      m.surface && `${m.surface} mp`,
      m.finish && `finisaje ${m.finish === "premium" ? "Premium" : "Standard"}`,
    ].filter(Boolean);
    setSource({ mode: from, note: parts.length ? parts.join(" · ") : "nu am putut extrage date, completează manual" });
    setMode("manual");
    toast.success("Am completat datele extrase. Rezultatul s-a actualizat.");
  };

  const runAnalysis = async (from: "link" | "foto") => {
    if (analyzing) return;
    if (from === "link" && !/^https:\/\//i.test(url.trim())) {
      toast.error("Lipește un link https de pe Imobiliare.ro, Storia, OLX sau Airbnb.");
      return;
    }
    if (from === "foto" && photos.length === 0) {
      toast.error("Adaugă cel puțin o fotografie.");
      return;
    }
    setAnalyzing(true);
    try {
      const body: Record<string, unknown> =
        from === "link" ? { mode: "url", url: url.trim() } : { mode: "photos", images: await Promise.all(photos.map((p) => compressImage(p))) };
      const key = getSupabasePublishableKey();
      const res = await fetch(ANALYSIS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.analysis) {
        toast.error(data?.message || (res.status === 429 ? "Prea multe analize într-o oră. Încearcă mai târziu." : "Nu am putut analiza. Completează manual."));
        return;
      }
      applyAnalysis(data.analysis as ListingAnalysisLike, from);
    } catch {
      toast.error("Analiza a eșuat. Verifică conexiunea și încearcă din nou.");
    } finally {
      setAnalyzing(false);
    }
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= 15 * 1024 * 1024);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) { toast.error(`Maxim ${MAX_PHOTOS} fotografii.`); return; }
    const data = await Promise.all(list.slice(0, room).map(readFile));
    setPhotos((p) => [...p, ...data].slice(0, MAX_PHOTOS));
  };

  const buildMessage = (name: string) =>
    [
      `Salut, sunt ${name}. Am folosit calculatorul RealTrust:`,
      ``,
      locationSummary,
      `🏠 Suprafață: ${surfaceNum} mp`,
      `• Parcare: ${parking ? "Da" : "Nu"} · Finisaje: ${finishLabel}`,
      source ? `• Date din: ${source.mode === "link" ? "link anunț" : source.mode === "foto" ? "analiză foto" : "introducere manuală"}` : null,
      ``,
      `📊 Proiecție lunară:`,
      `• Chirie clasică: ~${fmt(s.classicRent)} €`,
      `• Venit net regim hotelier: ${fmt(s.netMin)} – ${fmt(s.netMax)} € (după administrare 15–20% din venitul net)`,
      `• Scenariu: ~${s.nightlyRate} €/noapte, ocupare ${Math.round(s.occupancy * 100)}%${scenarioChanged ? " (ajustat de mine)" : ""}`,
      ``,
      `Aș vrea o discuție scurtă ca să rafinăm cifrele.`,
    ].filter((l) => l !== null).join("\n");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const parsed = leadSchema.safeParse(lead);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ name: fe.name?.[0], phone: fe.phone?.[0], email: fe.email?.[0] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const d = parsed.data;
    const message = buildMessage(d.name);
    // Deschidem WhatsApp în gestul utilizatorului — după un await telefonul blochează fereastra.
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    const specs = {
      input_mode: source?.mode ?? "manual",
      national_manual: national && customRates,
      ...locationIdentity,
      custom_rates: national && customRates,
      source_url: source?.mode === "link" ? url.trim() : undefined,
      property_type: type,
      property_type_label: typeLabel,
      zone: zoneLabel,
      surface_sqm: surfaceNum,
      parking,
      finish,
      classic_rent: s.classicRent,
      nightly_rate: s.nightlyRate,
      occupancy: s.occupancy,
      scenario_adjusted: scenarioChanged,
      realtrust_net: s.netMid,
      realtrust_net_min: s.netMin,
      realtrust_net_max: s.netMax,
    };
    try {
      const result = await submitLead({
        name: d.name,
        whatsapp_number: formatPhoneInput(d.phone),
        email: d.email || undefined,
        property_type: type,
        property_area: surfaceNum,
        message: `[calculator_unificat] ${locationSummary} · ${surfaceNum} mp · Parcare: ${parking ? "Da" : "Nu"} · Finisaje: ${finishLabel}`,
        source: leadSource,
        simulation_data: withCampaignTracking({ ...specs, generated_message: message }) as never,
      });
      if (result.ok !== true) console.warn("[UnifiedCalculator] submitLead failed", result);

      // Pornește fluxul asistentului Andrei (WhatsApp).
      void supabase.functions
        .invoke("handle-lead-whatsapp", {
          body: {
            nume: d.name,
            telefon: d.phone,
            ...(d.email ? { email: d.email } : {}),
            zona: zoneLabel,
            location_mode: locationMode,
            ...propertyIdentity,
            suprafata_mp: surfaceNum,
            parcare: parking,
            finisaje: finish,
            chirie_clasica: s.classicRent,
            venit_net_realtrust: s.netMid,
            venit_estimat_min: s.netMin,
            venit_estimat_max: s.netMax,
            sursa: leadSource,
            ...(result.ok && result.leadId ? { lead_id: result.leadId } : {}),
          },
        })
        .then(({ error }) => { if (error) console.warn("[UnifiedCalculator] handle-lead-whatsapp failed", error); })
        .catch(() => {});

      if (result.ok) {
        trackCalculatorEvent("calculator_lead_submit", analyticsContext);
        trackCriticalConversion("Lead_Submit", { source: leadSource, value: 90, currency: "EUR" });
      }
      if (result.ok) {
        setLeadSent(true);
        toast.success("Cererea a fost trimisă. Andrei a primit-o și îți scrie pe WhatsApp.");
      } else {
        toast.error("Nu am putut salva cererea. Încearcă din nou sau scrie-ne pe WhatsApp.");
      }
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const ro = language === "ro";
  const rentNote = national && customRates && manualRent ? (ro ? "introdusă de tine" : "your custom rate") : national || indicativeType || ZONES.find((z) => z.value === zone)?.indicative ? (ro ? "referință orientativă" : "indicative benchmark") : (ro ? "mediană reală în zonă" : "local market median");
  const monthNames = MONTH_LABELS[ro ? "ro" : "en"];
  const chartData = months.map((m) => ({ ...m, label: monthNames[m.month] }));
  const bestMonth = chartData.reduce((a, b) => (b.hotel > a.hotel ? b : a), chartData[0]);
  const weakMonth = chartData.reduce((a, b) => (b.hotel < a.hotel ? b : a), chartData[0]);
  const costRows = [
    { label: ro ? "Venit brut din rezervări" : "Gross booking revenue", value: s.gross, strong: true },
    { label: ro ? "Comisioane platforme (15%)" : "Platform fees (15%)", value: -s.channelFees },
    { label: ro ? "Utilități estimate" : "Estimated utilities", value: -s.utilities },
    { label: ro ? "Administrare RealTrust (15–20% din net)" : "RealTrust management (15–20% of net)", range: `−${fmt(s.feeMin)} – ${fmt(s.feeMax)} €` },
  ];
  const sectionTitle = (n: number, text: string) => (
    <h3 className="mb-3 flex items-center gap-3 text-sm font-semibold text-foreground">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground" aria-hidden="true">{n}</span>
      {text}
    </h3>
  );

  return (
    <div data-calculator-ready="true" className="overflow-clip rounded-3xl border border-border bg-card shadow-elegant">
      <div className="border-b border-border px-5 py-6 md:px-10 md:py-8">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">{ro ? "Calculator venit · rezultat pe loc" : "Income calculator · instant result"}</span>
        </div>
        <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">{ro ? "Cât poate produce proprietatea ta?" : "How much can your property earn?"}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{ro ? "Completează datele, iar cifrele se actualizează imediat. Fără pași de continuare și fără date personale până nu ceri tu raportul." : "Fill in the details and the figures update instantly. No extra steps, no personal details until you ask for the report."}</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        {/* ── Date ── */}
        <div ref={inputsRef} className="space-y-8 px-5 py-6 md:px-10 md:py-8">
          <section>
            {sectionTitle(1, ro ? "Cum vrei să introduci datele proprietății?" : "How would you like to enter your property details?")}
            <Tabs value={mode} onValueChange={(v) => setMode(v as InputMode)}>
              <TabsList aria-label={ro ? "Mod de introducere a datelor" : "Data entry mode"} className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl bg-muted p-1">
                {([["manual", PenLine, ro ? "Manual" : "Manual"], ["link", Link2, ro ? "Din link" : "From link"], ["foto", Camera, ro ? "Din poze" : "From photos"]] as const).map(([v, Icon, label]) => (
                  <TabsTrigger key={v} value={v} className="min-h-12 gap-2 whitespace-normal rounded-lg px-2 text-sm data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="manual" className="mt-3">
                {source && source.mode !== "manual" ? (
                  <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    {ro ? "Date extrase din" : "Data extracted from"} {source.mode === "link" ? (ro ? "anunț" : "listing") : (ro ? "fotografii" : "photos")}: <strong>{source.note}</strong>. {ro ? "Verifică mai jos." : "Check below."}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{ro ? "Alege tipul, locația și suprafața de mai jos." : "Choose type, location and area below."}</p>
                )}
              </TabsContent>
              <TabsContent value="link" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">{ro ? "Lipește linkul de pe Imobiliare.ro, Storia, OLX sau Airbnb și completăm automat câmpurile de mai jos." : "Paste a link from Imobiliare.ro, Storia, OLX or Airbnb and we fill in the fields below."}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Label htmlFor="uc-url" className="sr-only">{ro ? "Link anunț" : "Listing link"}</Label>
                  <Input id="uc-url" type="url" inputMode="url" placeholder="https://www.imobiliare.ro/..." value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} className="min-h-12" />
                  <Button size="lg" className="min-h-12 shrink-0" onClick={() => runAnalysis("link")} disabled={analyzing}>
                    {analyzing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{ro ? "Se analizează…" : "Analyzing…"}</> : <>{ro ? "Extrage datele" : "Extract data"}<ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="foto" className="mt-3 space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={ro ? "Adaugă fotografii" : "Add photos"}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
                  className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">{ro ? "Trage pozele aici sau apasă pentru a alege" : "Drop photos here or tap to choose"}</span>
                  <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS} · {ro ? "evaluăm finisajele și dotările" : "we assess finishes and amenities"}</span>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                        <img src={p} alt={`${ro ? "Fotografia" : "Photo"} ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" aria-label={`${ro ? "Elimină fotografia" : "Remove photo"} ${i + 1}`} onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="lg" className="w-full sm:w-auto" onClick={() => runAnalysis("foto")} disabled={analyzing || photos.length === 0}>
                  {analyzing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{ro ? "Se analizează…" : "Analyzing…"}</> : <>{ro ? "Analizează fotografiile" : "Analyze photos"}<ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>
              </TabsContent>
            </Tabs>
          </section>

          <fieldset>
            <legend className="contents">{sectionTitle(2, ro ? "Tip proprietate" : "Property type")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROPERTY_TYPES.map((t) => (
                <Choice key={t.value} active={type === t.value} onClick={() => { setType(t.value); setSurface(String(t.refSqm)); }}>{t.label}</Choice>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="contents">{sectionTitle(3, ro ? "Locație" : "Location")}</legend>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Choice active={!national} onClick={() => selectLocationMode("local")}>{ro ? "Timișoara & Zona Metropolitană" : "Timișoara & Metropolitan Area"}</Choice>
              <Choice active={national} onClick={() => selectLocationMode("regional")}>{ro ? "Altă localitate / Regional" : "Other town / Regional"}</Choice>
            </div>
            {!national && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ZONES.map((z) => (
                <Choice key={z.value} active={zone === z.value} onClick={() => setZone(z.value)}>{language === "en" && z.value === "alta-zona" ? "Other area Timișoara / Giroc / Dumbrăvița" : z.label}</Choice>
              ))}
            </div>}
            {national && <div className="space-y-3">
              <div>
                <Label htmlFor="uc-location" className="mb-2 block font-semibold">{ro ? "Oraș / Zonă (ex: Brașov, Sinaia, Mamaia, Cluj, Murani etc.)" : "City / Area (e.g. Brașov, Sinaia, Mamaia, Cluj, Murani)"}</Label>
                <RegionalLocationInput value={regionalLocation} onChange={(value) => { setRegionalLocation(value); setErrors((p) => ({ ...p, location: undefined })); }} error={errors.location} language={language} />
                {errors.location && <p id="uc-location-error" className="mt-1 text-sm text-destructive">{errors.location}</p>}
              </div>
              <label className="flex min-h-12 items-center gap-3 text-sm font-medium text-foreground">
                <input type="checkbox" className="h-5 w-5 accent-primary" checked={customRates} onChange={(e) => setCustomRates(e.target.checked)} />
                {ro ? "Personalizează tarifele (opțional)" : "Customize rates (optional)"}
              </label>
              {customRates && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="uc-rent" className="mb-2 block font-semibold">{ro ? "Chirie clasică (€/lună, opțional)" : "Classic rent (€/month, optional)"}</Label>
                    <Input id="uc-rent" inputMode="numeric" maxLength={5} value={manualRent} onChange={(e) => setManualRent(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div>
                    <Label htmlFor="uc-nightly" className="mb-2 block font-semibold">{ro ? "Tarif pe noapte (€, opțional)" : "Nightly rate (€, optional)"}</Label>
                    <Input id="uc-nightly" inputMode="numeric" maxLength={4} value={manualNightly} onChange={(e) => setManualNightly(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  {errors.manual && <p className="text-sm text-destructive sm:col-span-2">{errors.manual}</p>}
                </div>
              )}
            </div>}
          </fieldset>

          <fieldset>
            <legend className="contents">{sectionTitle(4, ro ? "Suprafață și dotări" : "Area and features")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 sm:max-w-[200px]">
                <Label htmlFor="uc-surface" className="mb-2 block text-sm font-medium">Suprafață utilă (mp) *</Label>
                <Input id="uc-surface" inputMode="numeric" maxLength={4} value={surface} onChange={(e) => { setSurface(e.target.value.replace(/\D/g, "")); setErrors((p) => ({ ...p, surface: undefined })); }} aria-invalid={!!errors.surface || (surface !== "" && !surfaceValid)} aria-describedby="uc-surface-hint" className="min-h-12" />
                <p id="uc-surface-hint" className={`mt-1 text-xs ${errors.surface || (surface !== "" && !surfaceValid) ? "text-destructive" : "text-muted-foreground"}`}>{errors.surface ?? (ro ? "Între 15 și 5.000 mp" : "Between 15 and 5,000 sqm")}</p>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground" id="uc-parking-label">{ro ? "Loc de parcare" : "Parking"}</span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="uc-parking-label">
                  <Choice active={parking} onClick={() => setParking(true)}>{ro ? "Da" : "Yes"}</Choice>
                  <Choice active={!parking} onClick={() => setParking(false)}>{ro ? "Nu" : "No"}</Choice>
                </div>
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground" id="uc-finish-label">{ro ? "Finisaje" : "Finishes"}</span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="uc-finish-label">
                  <Choice active={finish === "standard"} onClick={() => setFinish("standard")}>Standard</Choice>
                  <Choice active={finish === "premium"} onClick={() => setFinish("premium")}>Premium</Choice>
                </div>
              </div>
            </div>
            {source?.mode === "foto" && <p className="mt-2 text-xs text-muted-foreground">{ro ? "Finisajele sunt preselectate din analiza foto; le poți schimba." : "Finishes preselected from the photo analysis; you can change them."}</p>}
          </fieldset>

          {/* Bară rezultat pe telefon */}
          <div className={`fixed left-3 right-[84px] bottom-[76px] z-40 transition-all duration-300 lg:hidden ${showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} aria-hidden={!showBar}>
            <button type="button" tabIndex={showBar ? 0 : -1} onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-background px-4 py-2 text-left shadow-elegant">
              <span>
                <span className="block text-xs text-muted-foreground">{ro ? "Venit net estimat" : "Estimated net income"}</span>
                <span className="block text-lg font-semibold text-foreground">{surfaceValid ? `${fmt(s.netMin)}–${fmt(s.netMax)} €/${ro ? "lună" : "mo"}` : "—"}</span>
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">{ro ? "Vezi detaliile" : "See details"}<ArrowDown className="h-4 w-4" aria-hidden="true" /></span>
            </button>
          </div>
        </div>

        {/* ── Rezultat live ── */}
        <aside ref={resultRef} aria-label={ro ? "Rezultatul calculului" : "Calculation result"} className="scroll-mt-24 border-t border-border bg-muted/30 lg:border-l lg:border-t-0">
          <div className="space-y-6 px-5 py-6 md:px-8 md:py-8 lg:sticky lg:top-20">
            <div aria-live="polite" aria-atomic="true">
              <p className="text-sm text-muted-foreground">{typeLabel} · {zoneLabel} · {surfaceValid ? surfaceNum : "—"} mp · {ro ? "Parcare" : "Parking"}: {parking ? (ro ? "Da" : "Yes") : (ro ? "Nu" : "No")} · {finishLabel}</p>
              {surfaceValid ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-primary">{ro ? "Regim hotelier · venit net lunar" : "Short-term rental · monthly net"}</p>
                  <p className="mt-1 font-serif text-4xl font-semibold text-foreground md:text-5xl">{fmt(s.netMin)}–{fmt(s.netMax)} €</p>
                  <p className="mt-1 text-sm text-muted-foreground">≈ {fmt(s.netMid * 12)} € / {ro ? "an" : "year"} · {ro ? "după toate costurile de mai jos" : "after all costs below"}</p>
                </>
              ) : (
                <p className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">{ro ? "Introdu o suprafață între 15 și 5.000 mp ca să vezi estimarea." : "Enter an area between 15 and 5,000 sqm to see the estimate."}</p>
              )}
            </div>

            {surfaceValid && (
              <>
                {/* Comparație */}
                <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">{ro ? "Chirie clasică" : "Traditional rent"} <span className="text-xs">({rentNote})</span></span><span className="font-semibold text-foreground">~{fmt(s.classicRent)} €</span></div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-muted-foreground transition-all duration-500" style={{ width: `${(s.classicRent / maxBar) * 100}%` }} /></div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-primary">{ro ? "Regim hotelier RealTrust" : "RealTrust short-term"}</span><span className="font-semibold text-foreground">~{fmt(s.netMid)} €</span></div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500" style={{ width: `${(s.netMid / maxBar) * 100}%` }} /></div>
                  </div>
                  {s.monthlyDelta > 0 ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground"><TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />+{fmt(s.monthlyDelta)} €/{ro ? "lună" : "mo"} · +{fmt(s.monthlyDelta * 12)} €/{ro ? "an față de chirie" : "yr vs rent"}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{ro ? "La acest scenariu, chiria clasică e comparabilă. Îți spunem sincer dacă nu merită." : "In this scenario classic rent is comparable. We'll tell you honestly if it isn't worth it."}</p>
                  )}
                </div>

                {/* Scenariu */}
                <div className="space-y-5 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{ro ? "Încearcă alt scenariu" : "Try another scenario"}</p>
                    {scenarioChanged && (
                      <button type="button" onClick={() => { setNightlyOverride(null); setOccOverride(null); }} className="flex min-h-12 items-center gap-1 px-2 text-xs font-medium text-primary">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{ro ? "Revino la estimare" : "Reset"}
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-3 flex justify-between text-sm"><span className="text-muted-foreground">{ro ? "Tarif mediu pe noapte" : "Average nightly rate"}</span><span className="font-semibold text-foreground">{s.nightlyRate} €</span></div>
                    <Slider aria-label={ro ? "Tarif mediu pe noapte" : "Average nightly rate"} min={nightlyMin} max={nightlyMax} step={1} value={[s.nightlyRate]} onValueChange={([v]) => setNightlyOverride(v)} />
                  </div>
                  <div>
                    <div className="mb-3 flex justify-between text-sm"><span className="text-muted-foreground">{ro ? "Grad de ocupare" : "Occupancy"}</span><span className="font-semibold text-foreground">{Math.round(s.occupancy * 100)}%</span></div>
                    <Slider aria-label={ro ? "Grad de ocupare" : "Occupancy"} min={MANAGEMENT_POLICY.occupancyMin * 100} max={MANAGEMENT_POLICY.occupancyMax * 100} step={1} value={[Math.round(s.occupancy * 100)]} onValueChange={([v]) => setOccOverride(v / 100)} />
                    <p className="mt-2 text-xs text-muted-foreground">{ro ? "Interval realist anual: 65–75%." : "Realistic annual range: 65–75%."}</p>
                  </div>
                </div>

                {/* 12 luni */}
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">{ro ? "Venit net pe 12 luni" : "Net income over 12 months"}</p>
                  <p className="text-xs text-muted-foreground">{ro ? `Cea mai bună lună: ${bestMonth.label} (~${fmt(bestMonth.hotel)} €) · cea mai slabă: ${weakMonth.label} (~${fmt(weakMonth.hotel)} €)` : `Best month: ${bestMonth.label} (~€${fmt(bestMonth.hotel)}) · weakest: ${weakMonth.label} (~€${fmt(weakMonth.hotel)})`}</p>
                  <div className="mt-3 h-36" role="img" aria-label={ro ? `Grafic venit lunar, între ${fmt(weakMonth.hotel)} și ${fmt(bestMonth.hotel)} euro` : `Monthly income chart, between ${fmt(weakMonth.hotel)} and ${fmt(bestMonth.hotel)} euro`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => [`${fmt(v)} €`, ro ? "Venit net" : "Net income"]} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="hotel" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ro ? "Sezonalitate ilustrativă Timișoara; totalul anual rămâne același." : "Illustrative Timișoara seasonality; the annual total stays the same."}</p>
                </div>

                {/* Costuri */}
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">{ro ? "Cum se ajunge la venitul net (lunar)" : "How we get to the net income (monthly)"}</p>
                  <dl className="divide-y divide-border text-sm">
                    {costRows.map((row) => (
                      <div key={row.label} className="flex justify-between gap-3 py-2">
                        <dt className={row.strong ? "font-medium text-foreground" : "text-muted-foreground"}>{row.label}</dt>
                        <dd className="shrink-0 font-medium text-foreground">{row.range ?? `${row.value! < 0 ? "−" : ""}${fmt(Math.abs(row.value!))} €`}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3 py-2">
                      <dt className="font-semibold text-foreground">{ro ? "Rămâne la tine" : "You keep"}</dt>
                      <dd className="shrink-0 font-semibold text-primary">{fmt(s.netMin)}–{fmt(s.netMax)} €</dd>
                    </div>
                  </dl>
                  <p className="mt-2 flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{ro ? `~${s.nightlyRate} €/noapte × ${Math.round(s.occupancy * 100)}% ocupare. Menajul e plătit separat de oaspete; impozitele și reparațiile nu sunt incluse. Randament estimat 6,5–9,4% net/an.` : `~€${s.nightlyRate}/night × ${Math.round(s.occupancy * 100)}% occupancy. Cleaning is paid separately by the guest; taxes and repairs not included. Estimated net yield 6.5–9.4%/yr.`}</p>
                  {indicativeType && <p className="mt-2 text-xs text-muted-foreground">{ro ? "Referințe orientative pentru întreaga proprietate, nu tarife pe cameră. Capacitatea, sezonalitatea și costurile reale necesită o evaluare individuală." : "Indicative whole-property benchmarks, not per-room rates. Capacity, seasonality and actual costs require an individual assessment."}</p>}
                </div>
              </>
            )}

            {leadSent ? (
              <div role="status" aria-live="polite" className="flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-foreground">{ro ? "Cererea ta a fost trimisă" : "Your request has been sent"}</p>
                  <p className="text-sm text-muted-foreground">{ro ? "Andrei a primit datele din calculator și îți scrie pe WhatsApp cu simularea detaliată." : "Andrei has received your calculator details and will message you on WhatsApp with the detailed simulation."}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button size="lg" className="min-h-14 w-full bg-gold text-gold-foreground hover:bg-gold-dark" onClick={openLead}>
                  <MessageCircle className="mr-2 h-5 w-5" />Trimite proiecția pe WhatsApp
                </Button>
                <p className="text-center text-xs text-muted-foreground">{ro ? "Primești calculul complet și o discuție scurtă cu Andrei. Fără obligații." : "Get the full calculation and a short chat with Andrei. No obligation."}</p>
              </div>
            )}
            <SocialFollow dismissible />
          </div>
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trimite proiecția pe WhatsApp</DialogTitle>
            <DialogDescription>Îți trimitem calculul și asistentul Andrei te contactează pentru cifrele exacte.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {(["name", "phone", "email"] as const).map((k) => (
              <div key={k}>
                <Label htmlFor={`uc-${k}`}>{k === "name" ? "Nume" : k === "phone" ? "Telefon" : "Email (opțional)"}</Label>
                <Input
                  id={`uc-${k}`}
                  type={k === "phone" ? "tel" : k === "email" ? "email" : "text"}
                  autoComplete={k === "phone" ? "tel" : k}
                  maxLength={k === "email" ? 255 : 80}
                  placeholder={k === "name" ? "Numele tău" : k === "phone" ? "07XX XXX XXX" : "email@exemplu.ro"}
                  value={lead[k]}
                  onChange={(e) => { setLead({ ...lead, [k]: e.target.value }); setErrors((p) => ({ ...p, [k]: undefined })); }}
                  aria-invalid={!!errors[k]}
                />
                {errors[k] && <p className="mt-1 text-sm text-destructive">{errors[k]}</p>}
              </div>
            ))}
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting ? "Se trimite..." : "Trimite proiecția pe WhatsApp"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedCalculator;
