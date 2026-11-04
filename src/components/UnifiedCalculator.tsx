import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, Camera, Car, Check, Link2, Loader2, MessageCircle, PenLine, Sparkles, TrendingUp, Upload, X } from "lucide-react";
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
import { UNIFIED_ZONES as ZONES, computeUnified, getPropertyLeadIdentity, isValidPropertySurface, mapAnalysisToInput, type ListingAnalysisLike, type UnifiedZoneValue } from "@/lib/unifiedCalculator";
import { useLanguage } from "@/i18n/LanguageContext";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<InputMode>("manual");
  const [national, setNational] = useState(false);
  const [type, setType] = useState<PropertyTypeValue>("2-camere");
  const [zone, setZone] = useState<UnifiedZoneValue>("central");
  const [surface, setSurface] = useState("");
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
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "surface" | "manual", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const surfaceNum = Number(surface);
  const manual = national ? { classicRent: Number(manualRent), nightlyRate: Number(manualNightly) } : null;
  const r = useMemo(
    () => computeUnified({ type, zone, surface: surfaceNum, parking, finish, manual }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, zone, surfaceNum, parking, finish, national, manualRent, manualNightly],
  );
  const propertyIdentity = getPropertyLeadIdentity(type);
  const typeLabel = propertyIdentity.property_type_label;
  const indicativeType = ["casa-vila", "vila-vacanta", "pensiune-boutique", "hotel-motel"].includes(type);
  const zoneLabel = national ? "Național / introdus manual" : ZONES.find((z) => z.value === zone)?.label ?? "Altă zonă";
  const finishLabel = finish === "premium" ? "Premium Lux" : "Standard";
  const maxBar = Math.max(r.classicRent, r.netMax, 1);
  const leadSource = `calculator_unificat_${source?.mode ?? "manual"}`;

  const goStep2 = () => {
    if (!isValidPropertySurface(surfaceNum)) {
      setErrors({ surface: language === "ro" ? "Introdu suprafața utilă (între 15 și 5.000 mp)" : "Enter the usable area (between 15 and 5,000 sqm)" });
      return;
    }
    if (national && (!(Number(manualRent) >= 100) || !(Number(manualNightly) >= 15))) {
      setErrors({ manual: "Introdu chiria lunară (min. 100 €) și tariful pe noapte (min. 15 €)" });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const applyAnalysis = (a: ListingAnalysisLike, from: InputMode) => {
    const m = mapAnalysisToInput(a);
    if (m.type) setType(m.type);
    if (m.zone) setZone(m.zone);
    if (m.surface) setSurface(String(m.surface));
    else if (m.type) setSurface(String(PROPERTY_TYPES.find((t) => t.value === m.type)?.refSqm ?? 55));
    if (m.finish) setFinish(m.finish);
    setNational(false);
    const parts = [
      m.type && PROPERTY_TYPES.find((t) => t.value === m.type)?.label,
      m.zone && ZONES.find((z) => z.value === m.zone)?.label,
      m.surface && `${m.surface} mp`,
      m.finish && `finisaje ${m.finish === "premium" ? "Premium" : "Standard"}`,
    ].filter(Boolean);
    setSource({ mode: from, note: parts.length ? parts.join(" · ") : "nu am putut extrage date, completează manual" });
    setMode("manual");
    toast.success("Am completat datele extrase. Verifică-le și continuă.");
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
      `🏠 ${typeLabel} · ${zoneLabel} · ${surfaceNum} mp`,
      `• Parcare: ${parking ? "Da" : "Nu"} · Finisaje: ${finishLabel}`,
      source ? `• Date din: ${source.mode === "link" ? "link anunț" : source.mode === "foto" ? "analiză foto" : "introducere manuală"}` : null,
      ``,
      `📊 Proiecție lunară:`,
      `• Chirie clasică: ~${fmt(r.classicRent)} €`,
      `• Venit net regim hotelier: ${fmt(r.netMin)} – ${fmt(r.netMax)} € (după administrare 15–20% din venitul net)`,
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
      national_manual: national,
      source_url: source?.mode === "link" ? url.trim() : undefined,
      property_type: type,
      property_type_label: typeLabel,
      zone: zoneLabel,
      surface_sqm: surfaceNum,
      parking,
      finish,
      classic_rent: r.classicRent,
      nightly_rate: r.nightlyRate,
      occupancy: r.occupancy,
      realtrust_net: r.netMid,
      realtrust_net_min: r.netMin,
      realtrust_net_max: r.netMax,
    };
    try {
      const result = await submitLead({
        name: d.name,
        whatsapp_number: formatPhoneInput(d.phone),
        email: d.email || undefined,
        property_type: type,
        property_area: surfaceNum,
        message: `[calculator_unificat] ${typeLabel} · ${zoneLabel} · ${surfaceNum} mp · Parcare: ${parking ? "Da" : "Nu"} · Finisaje: ${finishLabel}`,
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
            ...propertyIdentity,
            suprafata_mp: surfaceNum,
            parcare: parking,
            finisaje: finish,
            chirie_clasica: r.classicRent,
            venit_net_realtrust: r.netMid,
            venit_estimat_min: r.netMin,
            venit_estimat_max: r.netMax,
            sursa: leadSource,
          },
        })
        .then(({ error }) => { if (error) console.warn("[UnifiedCalculator] handle-lead-whatsapp failed", error); })
        .catch(() => {});

      if (result.ok) {
        trackCriticalConversion("Lead_Submit", { source: leadSource, value: 90, currency: "EUR", name: d.name });
      }
      toast.success("Proiecția e salvată. Apasă Trimite în WhatsApp.");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ["Proprietate", "Dotări", "Rezultat"];

  return (
    <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-elegant">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Calculator venit · 3 pași</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-6">{language === "ro" ? "Cât produce proprietatea ta în Timișoara?" : "How much can your property earn in Timișoara?"}</h2>

      <ol className="flex gap-2 mb-8" aria-label="Etapele calculatorului">
        {steps.map((s, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <li key={s} className="flex-1" aria-current={n === step ? "step" : undefined}>
              <div className="h-1.5 rounded-full bg-border overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500 ease-out ${n <= step ? "w-full" : "w-0"}`} /></div>
              <span className={`mt-2 block text-xs font-medium ${n === step ? "text-primary" : "text-muted-foreground"}`}>{n}. {s}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as InputMode)} className="animate-fade-in">
          <h3 id="uc-input-question" className="mb-4 text-base font-semibold text-foreground">
            {language === "ro" ? "Cum vrei să introduci datele proprietății?" : "How would you like to enter your property details?"}
          </h3>
          <TabsList aria-labelledby="uc-input-question" className="mb-8 grid h-auto w-full grid-cols-1 gap-3 rounded-none bg-transparent p-0 sm:grid-cols-3">
            <TabsTrigger value="manual" className="min-h-14 min-w-0 justify-start gap-3 whitespace-normal rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:border-primary/50 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"><PenLine className="h-5 w-5 shrink-0" aria-hidden="true" />{language === "ro" ? "Manual / Ansamblu" : "Manual / Complex"}</TabsTrigger>
            <TabsTrigger value="link" className="min-h-14 min-w-0 justify-start gap-3 whitespace-normal rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:border-primary/50 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"><Link2 className="h-5 w-5 shrink-0" aria-hidden="true" />{language === "ro" ? "Import link" : "Import link"}</TabsTrigger>
            <TabsTrigger value="foto" className="min-h-14 min-w-0 justify-start gap-3 whitespace-normal rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:border-primary/50 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"><Camera className="h-5 w-5 shrink-0" aria-hidden="true" />{language === "ro" ? "Analiză foto" : "Photo analysis"}</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6 mt-0">
            {source && source.mode !== "manual" && (
              <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                Date extrase din {source.mode === "link" ? "anunț" : "fotografii"}: <strong>{source.note}</strong>. Verifică și corectează dacă e cazul.
              </p>
            )}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-foreground">{language === "ro" ? "Tip proprietate *" : "Property type *"}</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROPERTY_TYPES.map((t) => (
                  <Choice key={t.value} active={type === t.value} onClick={() => { setType(t.value); setSurface(String(t.refSqm)); }}>{t.label}</Choice>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-foreground">Zonă / Complex</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ZONES.map((z) => (
                  <Choice key={z.value} active={!national && zone === z.value} onClick={() => { setZone(z.value); setNational(false); }}>{z.label}</Choice>
                ))}
                <Choice active={national} onClick={() => setNational(true)}>Național / Manual</Choice>
              </div>
            </fieldset>
            {national && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="uc-rent" className="mb-2 block font-semibold">Chirie clasică actuală (€/lună) *</Label>
                  <Input id="uc-rent" inputMode="numeric" maxLength={5} value={manualRent} onChange={(e) => setManualRent(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <Label htmlFor="uc-nightly" className="mb-2 block font-semibold">Tarif estimat pe noapte (€) *</Label>
                  <Input id="uc-nightly" inputMode="numeric" maxLength={4} value={manualNightly} onChange={(e) => setManualNightly(e.target.value.replace(/\D/g, ""))} />
                </div>
                {errors.manual && <p className="sm:col-span-2 text-sm text-destructive">{errors.manual}</p>}
              </div>
            )}
            <div className="max-w-xs">
              <Label htmlFor="uc-surface" className="mb-2 block font-semibold">Suprafață utilă (mp) *</Label>
              <Input id="uc-surface" inputMode="numeric" maxLength={4} value={surface} onChange={(e) => setSurface(e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.surface} aria-describedby={errors.surface ? "uc-surface-error" : undefined} />
              {errors.surface && <p id="uc-surface-error" className="mt-1 text-sm text-destructive">{errors.surface}</p>}
            </div>
            <Button size="lg" className="w-full sm:w-auto" onClick={goStep2}>Continuă <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-0">
            <p className="text-sm text-muted-foreground">Lipește linkul anunțului de pe Imobiliare.ro, Storia, OLX sau Airbnb. Extragem automat camerele, suprafața, zona și finisajele.</p>
            <Label htmlFor="uc-url" className="sr-only">Link anunț</Label>
            <Input id="uc-url" type="url" inputMode="url" placeholder="https://www.imobiliare.ro/..." value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} />
            <Button size="lg" className="w-full sm:w-auto" onClick={() => runAnalysis("link")} disabled={analyzing}>
              {analyzing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Se analizează…</> : <>Extrage datele <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </TabsContent>

          <TabsContent value="foto" className="space-y-4 mt-0">
            <p className="text-sm text-muted-foreground">Încarcă până la {MAX_PHOTOS} fotografii. Analiza vizuală HostScan evaluează gradul de finisare și dotările.</p>
            <div
              role="button"
              tabIndex={0}
              aria-label="Adaugă fotografii"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Trage pozele aici sau apasă pentru a alege</span>
              <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS} fotografii</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={p} alt={`Fotografia ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" aria-label={`Elimină fotografia ${i + 1}`} onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button size="lg" className="w-full sm:w-auto" onClick={() => runAnalysis("foto")} disabled={analyzing || photos.length === 0}>
              {analyzing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Se analizează…</> : <>Analizează fotografiile <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </TabsContent>
        </Tabs>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Car className="w-4 h-4 text-primary" />Loc de parcare</legend>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              <Choice active={parking} onClick={() => setParking(true)}>Da</Choice>
              <Choice active={!parking} onClick={() => setParking(false)}>Nu</Choice>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="w-4 h-4 text-primary" />Nivel finisaje</legend>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              <Choice active={finish === "standard"} onClick={() => setFinish("standard")}>Standard</Choice>
              <Choice active={finish === "premium"} onClick={() => setFinish("premium")}>Premium Lux</Choice>
            </div>
            {source?.mode === "foto" && <p className="mt-2 text-xs text-muted-foreground">Preselectat din analiza foto; poți schimba.</p>}
          </fieldset>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}><ArrowLeft className="w-5 h-5 mr-2" />Înapoi</Button>
            <Button size="lg" onClick={() => setStep(3)}>Vezi rezultatul <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <p className="text-sm text-muted-foreground">{typeLabel} · {zoneLabel} · {surfaceNum} mp · Parcare: {parking ? "Da" : "Nu"} · Finisaje: {finishLabel}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-sm text-muted-foreground">Chirie clasică{national ? " (introdusă de tine)" : indicativeType ? " (referință orientativă)" : " (mediană reală în zonă)"}</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">~{fmt(r.classicRent)} €<span className="text-base font-normal text-muted-foreground">/lună</span></p>
              <div className="mt-4 h-2 rounded-full bg-border overflow-hidden"><div className="h-full bg-muted-foreground" style={{ width: `${(r.classicRent / maxBar) * 100}%` }} /></div>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
              <p className="text-sm text-primary font-medium">Regim hotelier · venit net RealTrust</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{fmt(r.netMin)}–{fmt(r.netMax)} €<span className="text-base font-normal text-muted-foreground">/lună net</span></p>
              <div className="mt-4 h-2 rounded-full bg-border overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(r.netMid / maxBar) * 100}%` }} /></div>
            </div>
          </div>
          {r.monthlyDelta > 0 && (
            <p className="flex items-center gap-2 text-foreground font-medium">
              <TrendingUp className="w-5 h-5 text-primary" />
              Aproximativ +{fmt(r.monthlyDelta)} €/lună, adică ~{fmt(r.monthlyDelta * 12)} €/an în plus față de chiria clasică
            </p>
          )}
          <ul className="grid gap-1 text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />Tarif mediu estimat: ~{r.nightlyRate} €/noapte, ocupare {Math.round(r.occupancy * 100)}%; venit brut ~{fmt(r.grossHotel)} €/lună</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />Ipoteze: canale 15%, utilități estimate 120 €/lună, administrare 15–20% din venitul net (brut minus canale și utilități). Menaj separat suportat de oaspete; impozitele și reparațiile nu sunt incluse.</li>
            {indicativeType && <li>{language === "ro" ? "Referințe orientative pentru întreaga proprietate, nu tarife pe cameră. Capacitatea, sezonalitatea și costurile reale necesită o evaluare individuală." : "Indicative whole-property benchmarks, not per-room rates. Capacity, seasonality and actual costs require an individual assessment."}</li>}
            <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{language === "ro" ? "Randament 6,5–9,4% net estimat; cifrele finale depind de proprietate" : "Estimated net yield of 6.5–9.4%; final figures depend on the property"}</li>
          </ul>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" size="lg" onClick={() => setStep(2)}><ArrowLeft className="w-5 h-5 mr-2" />Modifică</Button>
            <Button size="lg" className="flex-1 bg-gold text-gold-foreground hover:bg-gold-dark" onClick={() => setOpen(true)}>
              <MessageCircle className="w-5 h-5 mr-2" />Trimite proiecția pe WhatsApp
            </Button>
          </div>
          <SocialFollow dismissible />
        </div>
      )}

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
