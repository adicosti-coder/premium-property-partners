import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, Car, Check, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { submitLead } from "@/lib/leadSubmission";
import { roMobileField } from "@/lib/phoneField";
import { supabase } from "@/lib/supabaseClient";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import { trackConversion, trackCriticalConversion, formatPhoneInput } from "@/lib/conversionTracking";
import {
  PROPERTY_TYPES,
  ZONES,
  estimateOwnerIncome,
  type Finish,
  type PropertyTypeValue,
  type ZoneValue,
} from "@/lib/ownerIncomeEstimate";

const WHATSAPP_NUMBER = "40799069256";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Introdu numele (minim 2 caractere)").max(80),
  phone: roMobileField("Introdu un mobil valid (ex: 0722 123 456)"),
  email: z.union([z.literal(""), z.string().trim().email("Email invalid").max(255)]),
});

const fmt = (n: number) => n.toLocaleString("ro-RO");

const Choice = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`min-h-12 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
      active
        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
        : "border-border bg-background text-foreground hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

const ROICalculatorWidget = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<PropertyTypeValue>("2-camere");
  const [zone, setZone] = useState<ZoneValue>("central");
  const [surface, setSurface] = useState("");
  const [parking, setParking] = useState(false);
  const [finish, setFinish] = useState<Finish>("standard");
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "surface", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const surfaceNum = Number(surface);
  const r = useMemo(
    () => estimateOwnerIncome({ type, zone, surface: surfaceNum, parking, finish }),
    [type, zone, surfaceNum, parking, finish],
  );
  const typeLabel = PROPERTY_TYPES.find((t) => t.value === type)!.label;
  const zoneLabel = ZONES.find((z) => z.value === zone)!.label;
  const finishLabel = finish === "premium" ? "Premium Lux" : "Standard";
  const maxBar = Math.max(r.classicRent, r.netRealTrust, 1);

  const goStep2 = () => {
    // Pasul 1 cere obligatoriu tipul (numărul de camere) și suprafața utilă
    // înainte de orice; datele de contact se cer doar în pasul 3.
    if (!/^\d{2,4}$/.test(surface) || surfaceNum < 15 || surfaceNum > 400) {
      setErrors({ surface: "Introdu suprafața utilă (între 15 și 400 mp)" });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const buildMessage = (name: string) =>
    [
      `Salut, sunt ${name}. Am folosit calculatorul RealTrust:`,
      ``,
      `🏠 ${typeLabel} · ${zoneLabel} · ${surfaceNum} mp`,
      `• Parcare: ${parking ? "Da" : "Nu"} · Finisaje: ${finishLabel}`,
      ``,
      `📊 Proiecție lunară:`,
      `• Chirie clasică: ~${fmt(r.classicRent)} €`,
      `• Venit net RealTrust: ${fmt(r.netMin)} – ${fmt(r.netMax)} € (6,5–9,4% net estimat)`,
      ``,
      `Aș vrea o discuție scurtă ca să rafinăm cifrele.`,
    ].join("\n");

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
    // Deschidem WhatsApp imediat, în gestul utilizatorului — după un await
    // browserele de pe telefon blochează fereastra nouă.
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    const specs = {
      property_type: type,
      zone: zoneLabel,
      surface_sqm: surfaceNum,
      parking,
      finish,
      classic_rent: r.classicRent,
      nightly_rate: r.nightlyRate,
      occupancy: r.occupancy,
      realtrust_net: r.netRealTrust,
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
        message: `[calculator_roi] ${typeLabel} · ${zoneLabel} · ${surfaceNum} mp · Parcare: ${parking ? "Da" : "Nu"} · Finisaje: ${finishLabel}`,
        source: "calculator_roi_widget",
        simulation_data: withCampaignTracking({ ...specs, generated_message: message }) as never,
      });
      if (result.ok !== true) {
        console.warn("[ROICalculator] submitLead failed", result);
      }

      void supabase.functions
        .invoke("handle-lead-whatsapp", {
          body: {
            nume: d.name,
            telefon: d.phone,
            ...(d.email ? { email: d.email } : {}),
            zona: zoneLabel,
            numar_camere: type,
            suprafata_mp: surfaceNum,
            parcare: parking,
            finisaje: finish,
            chirie_clasica: r.classicRent,
            venit_net_realtrust: r.netRealTrust,
            venit_estimat_min: r.netMin,
            venit_estimat_max: r.netMax,
            sursa: "calculator_roi",
          },
        })
        .then(({ error }) => { if (error) console.warn("[ROICalculator] handle-lead-whatsapp failed", error); })
        .catch(() => {});

      if (result.ok) {
        trackConversion({ event: "roi_calculator_lead", source: "calculator_roi_widget", name: d.name, phone: d.phone, email: d.email || undefined });
        trackCriticalConversion("Lead_Submit", { source: "calculator_roi_widget", value: 90, currency: "EUR", name: d.name });
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
      <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-6">
        Cât produce apartamentul tău în Timișoara?
      </h2>

      <ol className="flex gap-2 mb-8" aria-label="Etapele calculatorului">
        {steps.map((s, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const reached = n <= step;
          return (
            <li key={s} className="flex-1" aria-current={n === step ? "step" : undefined}>
              <div className="h-1.5 rounded-full bg-border overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500 ease-out ${reached ? "w-full" : "w-0"}`} /></div>
              <span className={`mt-2 block text-xs font-medium ${n === step ? "text-primary" : "text-muted-foreground"}`}>
                {n}. {s}
              </span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-foreground">Tip proprietate</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROPERTY_TYPES.map((t) => (
                <Choice key={t.value} active={type === t.value} onClick={() => { setType(t.value); setSurface(String(t.refSqm)); }}>
                  {t.label}
                </Choice>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-foreground">Zonă / Complex</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ZONES.map((z) => (
                <Choice key={z.value} active={zone === z.value} onClick={() => setZone(z.value)}>
                  {z.label}
                </Choice>
              ))}
            </div>
          </fieldset>
          <div className="max-w-xs">
            <Label htmlFor="calc-surface" className="mb-2 block font-semibold">Suprafață utilă (mp) *</Label>
            <Input
              id="calc-surface"
              inputMode="numeric"
              maxLength={4}
              value={surface}
              onChange={(e) => setSurface(e.target.value.replace(/\D/g, ""))}
              aria-invalid={!!errors.surface}
              aria-describedby={errors.surface ? "calc-surface-error" : undefined}
            />
            {errors.surface && <p id="calc-surface-error" className="mt-1 text-sm text-destructive">{errors.surface}</p>}
          </div>
          <Button size="lg" className="w-full sm:w-auto" onClick={goStep2}>
            Continuă <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
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
          </fieldset>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}><ArrowLeft className="w-5 h-5 mr-2" />Înapoi</Button>
            <Button size="lg" onClick={() => setStep(3)}>Vezi rezultatul <ArrowRight className="w-5 h-5 ml-2" /></Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <p className="text-sm text-muted-foreground">
            {typeLabel} · {zoneLabel} · {surfaceNum} mp · Parcare: {parking ? "Da" : "Nu"} · Finisaje: {finishLabel}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-sm text-muted-foreground">Chirie clasică (mediană reală în zonă)</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">~{fmt(r.classicRent)} €<span className="text-base font-normal text-muted-foreground">/lună</span></p>
              <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-muted-foreground" style={{ width: `${(r.classicRent / maxBar) * 100}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
              <p className="text-sm text-primary font-medium">Venit net RealTrust</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{fmt(r.netMin)}–{fmt(r.netMax)} €<span className="text-base font-normal text-muted-foreground">/lună net</span></p>
              <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(r.netRealTrust / maxBar) * 100}%` }} />
              </div>
            </div>
          </div>
          {r.monthlyDelta > 0 && (
            <p className="flex items-center gap-2 text-foreground font-medium">
              <TrendingUp className="w-5 h-5 text-primary" />
              Aproximativ +{fmt(r.monthlyDelta)} €/lună, adică ~{fmt(r.monthlyDelta * 12)} €/an în plus față de chiria clasică
            </p>
          )}
          <ul className="grid gap-1 text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />Tarif mediu estimat: ~{r.nightlyRate} €/noapte, ocupare {Math.round(r.occupancy * 100)}% în zonă</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />Deja scăzute: administrare, curățenie, comisioane platforme și taxe (~27%)</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />Randament 6,5–9,4% net estimat; cifrele finale depind de apartament</li>
          </ul>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" size="lg" onClick={() => setStep(2)}><ArrowLeft className="w-5 h-5 mr-2" />Modifică</Button>
            <Button size="lg" className="flex-1 bg-gold text-gold-foreground hover:bg-gold-dark" onClick={() => setOpen(true)}>
              <MessageCircle className="w-5 h-5 mr-2" />Trimite proiecția pe WhatsApp
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trimite proiecția pe WhatsApp</DialogTitle>
            <DialogDescription>Îți trimitem calculul și te sună un consultant pentru cifrele exacte.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {(["name", "phone", "email"] as const).map((k) => (
              <div key={k}>
                <Label htmlFor={`roi-${k}`}>{k === "name" ? "Nume" : k === "phone" ? "Telefon" : "Email (opțional)"}</Label>
                <Input
                  id={`roi-${k}`}
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
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Se trimite..." : "Trimite proiecția pe WhatsApp"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ROICalculatorWidget;
