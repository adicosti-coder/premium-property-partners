import { useState } from "react";
import { z } from "zod";
import { CalendarCheck, MessageCircle, User, Sparkles, Loader2, ArrowRight, ArrowLeft, Phone, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { submitLead } from "@/lib/leadSubmission";
import { roMobileField } from "@/lib/phoneField";
import { withCampaignTracking, getCtaVariant } from "@/lib/campaignAttribution";
import FormTrustBadges from "@/components/forms/FormTrustBadges";
import { toast } from "sonner";
import { trackCriticalConversion } from "@/lib/conversionTracking";
import { supabase } from "@/integrations/supabase/client";

/**
 * PreCalcMiniForm — formularul „Calcul venit" în 3 pași:
 *   1. Apartament (nume + telefon obligatorii, restul opțional ca pills)
 *   2. Administrare & detalii
 *   3. Rezultat + previzualizare mesaj + WhatsApp / consultanță
 * Lead-ul se salvează în `leads`; datele complete pleacă spre Make prin
 * `handle-lead-whatsapp` (fire-and-forget), iar wa.me se deschide imediat
 * în gestul utilizatorului ca să nu fie blocat pe mobil.
 */

// Factor de zonă = chiria mediană reală pe zonă / mediana Timișoara (≈460 €, 2 camere).
// Sursa: anunțurile de închiriere colectate de RealTrust în ultimele 12 luni (25.10.2026).
// Ring Residence nu are încă destule anunțuri → 1,00 (media orașului).
export const ZONES = [
  { label: "ISHO", factor: 1.43 },               // 2 cam. mediană 660 € (14 anunțuri)
  { label: "City of Mara", factor: 1.3 },        // 600 € (12)
  { label: "NordOne", factor: 1.41 },            // 650 € (4)
  { label: "Ring Residence", factor: 1.0 },      // date insuficiente
  { label: "Fructus Plaza", factor: 1.04 },      // 3 cam. 600 € (3)
  { label: "Calea Torontalului", factor: 1.09 }, // 500 € (13)
  { label: "Complex Studențesc", factor: 0.76 }, // 350 € (5)
  { label: "Central / Iosefin / Elisabetin", factor: 0.93 }, // 430 € (42)
  { label: "Altă zonă", factor: 0.98 },          // 450 € (105)
] as const;

const APARTMENT_TYPES = [
  { value: "garsoniera", labelRo: "Garsonieră", labelEn: "Studio" },
  { value: "2-camere", labelRo: "2 camere", labelEn: "1-bedroom" },
  { value: "3-camere", labelRo: "3 camere", labelEn: "2-bedroom" },
  { value: "4-camere", labelRo: "4 camere", labelEn: "3-bedroom" },
  { value: "casa", labelRo: "Casă / Vilă", labelEn: "House / Villa" },
] as const;

// Venit NET lunar mediu regim hotelier Timișoara (după comision, curățenie, utilități, taxe).
const MONTHLY_NET_RANGE: Record<string, [number, number]> = {
  garsoniera: [1600, 2400],
  "2-camere": [2200, 3300],
  "3-camere": [3000, 4400],
  "4-camere": [3800, 5600],
  casa: [4500, 7500],
};

const WHATSAPP_NUMBER = "40799069256";

const OPT = {
  condition: [
    { v: "renovat_recent", ro: "Renovat recent", en: "Renovated" },
    { v: "stare_buna", ro: "Stare bună", en: "Good" },
    { v: "necesita_renovare", ro: "De renovat", en: "Needs work" },
  ],
  furnished: [
    { v: "complet", ro: "Mobilat", en: "Furnished" },
    { v: "partial", ro: "Parțial", en: "Partly" },
    { v: "nemobilat", ro: "Nemobilat", en: "Unfurnished" },
  ],
  service: [
    { v: "regim_hotelier", ro: "Regim Hotelier Complet (20% net)", en: "Full short-term management (20% net)" },
    { v: "inchiriere_clasica", ro: "Chirie pe termen lung", en: "Long-term rental" },
    { v: "consultanta", ro: "Consultanță / Evaluare", en: "Consulting / Valuation" },
  ],
  availability: [
    { v: "imediat", ro: "Imediat", en: "Immediately" },
    { v: "1-3_luni", ro: "În 1–3 luni", en: "In 1–3 months" },
    { v: "momentan_inchiriat", ro: "Momentan închiriat", en: "Currently rented" },
  ],
} as const;

const step1Schema = z.object({
  name: z.string().trim().min(2, { message: "Numele trebuie să aibă minim 2 caractere" }).max(80, { message: "Numele este prea lung" }),
  phone: roMobileField("Introdu un mobil valid (ex: 0722 123 456)"),
  area: z.string().refine((v) => v === "" || (+v >= 10 && +v <= 1000), { message: "Între 10 și 1000 mp" }),
});

type FormState = {
  name: string; phone: string; zone: string; apartmentType: string; area: string;
  condition: string; furnished: string; service: string; availability: string; notes: string;
};
type FieldKey = keyof FormState;

interface PreCalcMiniFormProps {
  source?: string;
  eyebrow?: string;
  variant?: "compact" | "full";
  className?: string;
}

const Pill = ({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full border transition-all duration-200 active:scale-[0.97] ${small ? "min-h-10 px-3.5 text-xs" : "min-h-12 px-4 text-sm"} font-medium ${
      active ? "border-gold bg-gold/15 text-foreground shadow-sm ring-1 ring-gold" : "border-border bg-background text-muted-foreground hover:border-gold/50 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const PreCalcMiniForm = ({ source = "pre_calc_owner", eyebrow, variant = "full", className = "" }: PreCalcMiniFormProps) => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const L = (r: string, e: string) => (ro ? r : e);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>({
    name: "", phone: "", zone: "Central / Iosefin / Elisabetin", apartmentType: "2-camere", area: "",
    condition: "", furnished: "", service: "regim_hotelier", availability: "", notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: FieldKey, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const toggle = (k: FieldKey, v: string) => set(k, form[k] === v ? "" : v);
  const optLabel = (g: keyof typeof OPT, v: string) => {
    const o = OPT[g].find((x) => x.v === v);
    return o ? (ro ? o.ro : o.en) : "";
  };

  const factor = ZONES.find((z) => z.label === form.zone)?.factor ?? 1;
  const base = MONTHLY_NET_RANGE[form.apartmentType] ?? [2000, 3000];
  const range: [number, number] = [Math.round((base[0] * factor) / 10) * 10, Math.round((base[1] * factor) / 10) * 10];
  const loc = ro ? "ro-RO" : "en-US";
  const typeLabel = (() => {
    const t = APARTMENT_TYPES.find((a) => a.value === form.apartmentType);
    return (ro ? t?.labelRo : t?.labelEn) ?? form.apartmentType;
  })();

  const buildMessage = (d: FormState): string => {
    const details = [
      d.area && `${L("Suprafață", "Area")}: ${d.area} mp`,
      d.condition && `${L("Stare", "Condition")}: ${optLabel("condition", d.condition)}`,
      d.furnished && `${L("Mobilare", "Furnishing")}: ${optLabel("furnished", d.furnished)}`,
      d.service && `${L("Administrare", "Management")}: ${optLabel("service", d.service)}`,
      d.availability && `${L("Disponibilitate", "Availability")}: ${optLabel("availability", d.availability)}`,
    ].filter(Boolean).map((x) => `• ${x}`);
    return [
      L(`Salut, sunt ${d.name || "…"}.`, `Hello, I'm ${d.name || "…"}.`),
      L(`Am un apartament ${typeLabel.toLowerCase()} în zona ${d.zone}.`, `I have a ${typeLabel.toLowerCase()} in ${d.zone}.`),
      ...(details.length ? [``, ...details] : []),
      ...(d.notes.trim() ? [``, `${L("Observații", "Notes")}: ${d.notes.trim()}`] : []),
      ``,
      `📊 ${L("Estimare venit net", "Estimated net income")}: ${range[0].toLocaleString(loc)} – ${range[1].toLocaleString(loc)} €/${L("lună", "month")}`,
      L("(6,5–9,4% net estimat)", "(6.5–9.4% estimated net)"),
      ``,
      L("Aș dori o discuție scurtă ca să rafinăm cifrele.", "I'd like a short call to refine the numbers."),
    ].join("\n");
  };

  const goStep2 = () => {
    const parsed = step1Schema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ name: fe.name?.[0], phone: fe.phone?.[0], area: fe.area?.[0] });
      return;
    }
    setErrors({});
    setStep(2);
  };

  /** Salvează lead-ul și trimite pachetul complet spre Make. Nu aruncă niciodată. */
  const persist = async (channel: "whatsapp" | "consult"): Promise<boolean> => {
    const d = { ...form, notes: form.notes.trim().slice(0, 500) };
    const area = d.area ? Number(d.area) : 0;
    const message = buildMessage(d);
    let ok = false;
    try {
      const result = await submitLead({
        name: d.name,
        whatsapp_number: d.phone,
        property_type: d.apartmentType,
        property_area: area,
        message: `[${source}/${channel}] Zonă: ${d.zone} · Tip: ${d.apartmentType}${area ? ` · ${area} mp` : ""} · Admin: ${d.service || "-"} · Disp: ${d.availability || "-"}${d.notes ? ` · Obs: ${d.notes}` : ""}`,
        source,
        simulation_data: withCampaignTracking({
          zone: d.zone, apartment_type: d.apartmentType, area_sqm: area || null,
          condition: d.condition || null, furnished: d.furnished || null,
          desired_service: d.service || null, availability: d.availability || null, notes: d.notes || null,
          estimated_monthly_min: range[0], estimated_monthly_max: range[1],
          channel, generated_message: message, language,
        }) as never,
      });
      ok = result.ok;
      if (!result.ok) console.warn("[PreCalcMiniForm] submitLead failed", result);

      void supabase.functions
        .invoke("handle-lead-whatsapp", {
          body: {
            nume: d.name, telefon: d.phone, zona: d.zone, numar_camere: d.apartmentType,
            venit_estimat_min: range[0], venit_estimat_max: range[1],
            ...(area ? { suprafata_mp: area } : {}),
            ...(d.condition ? { stare: d.condition } : {}),
            ...(d.furnished ? { mobilat: d.furnished } : {}),
            ...(d.service ? { tip_administrare: d.service } : {}),
            ...(d.availability ? { disponibilitate: d.availability } : {}),
            ...(d.notes ? { observatii: d.notes } : {}),
            sursa: `${source}_${channel}`,
          },
        })
        .then(({ error }) => { if (error) console.warn("[PreCalcMiniForm] handle-lead-whatsapp failed", error); })
        .catch(() => {});

      trackCriticalConversion("PreCalc_Completed", {
        source, value: range[1] * 12, currency: "EUR", apartment_type: d.apartmentType, city: d.zone, name: d.name, cta_variant: getCtaVariant(),
      });
      if (ok) trackCriticalConversion("Lead_Submit", { source, value: 90, currency: "EUR", name: d.name, cta_variant: getCtaVariant() });
    } catch (err) {
      console.error("[PreCalcMiniForm] unexpected error:", err);
    }
    return ok;
  };

  const handleWhatsapp = () => {
    if (submitting) return;
    // Deschidem wa.me sincron (gest utilizator) ca să nu fie blocat pe mobil;
    // salvarea + Make rulează în fundal și nu pot bloca butonul.
    const msg = buildMessage(form);
    trackCriticalConversion("WhatsApp_Click", { source: `${source}_whatsapp`, cta_variant: getCtaVariant() });
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    setSaved(true);
    toast.success(L("Mesajul e gata în WhatsApp — apasă Trimite acolo.", "Your message is ready in WhatsApp — tap Send there."));
    void persist("whatsapp");
  };

  const handleConsult = async () => {
    if (submitting) return;
    setSubmitting(true);
    await persist("consult");
    setSubmitting(false);
    setSaved(true);
    setConsultOpen(true);
  };

  const isCompact = variant === "compact";
  const steps = [L("Apartament", "Apartment"), L("Administrare", "Management"), L("Rezultat", "Result")];
  const progress = ((step - 1) / 2) * 100;
  const err = (k: FieldKey) => (errors[k] ? <p id={`precalc-${k}-error`} className="mt-1 text-sm text-destructive">{errors[k]}</p> : null);
  const pills = (k: FieldKey, g: keyof typeof OPT, small?: boolean) => (
    <div className="flex flex-wrap gap-2">
      {OPT[g].map((o) => <Pill key={o.v} small={small} active={form[k] === o.v} onClick={() => toggle(k, o.v)}>{ro ? o.ro : o.en}</Pill>)}
    </div>
  );

  return (
    <section className={`relative ${isCompact ? "py-12" : "py-16 md:py-20"} ${className}`} aria-labelledby="precalc-mini-form-title">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="overflow-hidden rounded-3xl border border-gold/30 bg-card shadow-elegant">
            {/* Antet întunecat cu progres auriu */}
            <div className="bg-foreground px-6 pt-6 pb-5 sm:px-10 sm:pt-8 text-background">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gold">{eyebrow ?? L("Calcul venit · 1 minut", "Income estimate · 1 minute")}</span>
              </div>
              <h2 id="precalc-mini-form-title" className="text-2xl md:text-3xl font-serif font-semibold mb-5">
                {L("Cât poate câștiga apartamentul tău lunar?", "How much can your apartment earn monthly?")}
              </h2>
              <div className="relative h-1.5 rounded-full bg-background/15" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={L("Progres formular", "Form progress")}>
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light shadow-[0_0_12px_hsl(var(--gold)/0.6)] transition-[width] duration-500 ease-out" style={{ width: `${Math.max(progress, 6)}%` }} />
              </div>
              <ol className="mt-3 grid grid-cols-3 text-xs font-medium">
                {steps.map((s, i) => (
                  <li key={s} aria-current={i + 1 === step ? "step" : undefined}
                    className={`${i === 1 ? "text-center" : i === 2 ? "text-right" : ""} transition-colors ${i + 1 <= step ? "text-gold" : "text-background/60"}`}>
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (step === 1) goStep2(); else if (step === 2) setStep(3); }} className="p-6 sm:p-10" noValidate>
              <div key={step} className="space-y-6 animate-fade-in">
                {step === 1 && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="precalc-name" className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-gold" />{L("Numele tău", "Your name")}</Label>
                        <Input id="precalc-name" autoComplete="name" maxLength={80} placeholder={L("Ex: Andrei Popescu", "e.g. John Smith")} className="h-12"
                          value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "precalc-name-error" : undefined} />
                        {err("name")}
                      </div>
                      <div>
                        <Label htmlFor="precalc-phone" className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-gold" />{L("Telefon", "Phone")}</Label>
                        <Input id="precalc-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="07xx xxx xxx" className="h-12"
                          value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "precalc-phone-error" : undefined} />
                        {err("phone")}
                      </div>
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">{L("Zonă / Complex", "Area / Complex")}</legend>
                      <div className="flex flex-wrap gap-2">
                        {ZONES.map((z) => <Pill key={z.label} active={form.zone === z.label} onClick={() => set("zone", z.label)}>{z.label}</Pill>)}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">{L("Tip apartament", "Apartment type")}</legend>
                      <div className="flex flex-wrap gap-2">
                        {APARTMENT_TYPES.map((a) => <Pill key={a.value} active={form.apartmentType === a.value} onClick={() => set("apartmentType", a.value)}>{ro ? a.labelRo : a.labelEn}</Pill>)}
                      </div>
                    </fieldset>
                    <div className="rounded-2xl border border-dashed border-border p-4 space-y-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{L("Opțional — pentru o estimare mai precisă", "Optional — for a sharper estimate")}</p>
                      <div className="flex items-center gap-2">
                        <Input id="precalc-area" aria-label={L("Suprafață în mp", "Area in sqm")} inputMode="numeric" maxLength={4} placeholder="mp" className="h-10 w-24 rounded-full text-center"
                          value={form.area} onChange={(e) => set("area", e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.area} aria-describedby={errors.area ? "precalc-area-error" : undefined} />
                        <span className="text-xs text-muted-foreground">{L("suprafață", "area")}</span>
                      </div>
                      {err("area")}
                      {pills("condition", "condition", true)}
                      {pills("furnished", "furnished", true)}
                    </div>
                    <Button type="submit" size="lg" className="w-full h-12 group">
                      {L("Continuă", "Continue")}<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">{L("Tip de administrare", "Management type")}</legend>
                      <div className="grid gap-2">
                        {OPT.service.map((o) => (
                          <button key={o.v} type="button" aria-pressed={form.service === o.v} onClick={() => set("service", o.v)}
                            className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-medium transition-all active:scale-[0.99] ${form.service === o.v ? "border-gold bg-gold/10 ring-1 ring-gold text-foreground" : "border-border text-muted-foreground hover:border-gold/50"}`}>
                            {ro ? o.ro : o.en}
                            {form.service === o.v && <CheckCircle2 className="w-5 h-5 text-gold" />}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">{L("Disponibilitate", "Availability")}</legend>
                      {pills("availability", "availability")}
                    </fieldset>
                    <div>
                      <Label htmlFor="precalc-notes" className="mb-2 block">{L("Observații / cerințe speciale (opțional)", "Notes / special requests (optional)")}</Label>
                      <Textarea id="precalc-notes" maxLength={500} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)}
                        placeholder={L("Ex: vreau să folosesc apartamentul câteva săptămâni pe an", "e.g. I'd like to use it a few weeks per year")} />
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" size="lg" className="h-12" onClick={() => setStep(1)}><ArrowLeft className="w-5 h-5 mr-2" />{L("Înapoi", "Back")}</Button>
                      <Button type="submit" size="lg" className="flex-1 h-12">{L("Vezi estimarea", "See estimate")}<ArrowRight className="w-5 h-5 ml-2" /></Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="rounded-2xl bg-foreground p-6 text-background">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><TrendingUp className="w-4 h-4" />{L("Venit net estimat", "Estimated net income")}</p>
                      <p className="mt-2 font-serif text-4xl sm:text-5xl font-semibold">
                        {range[0].toLocaleString(loc)}–{range[1].toLocaleString(loc)} €
                        <span className="ml-1 text-base font-sans font-normal text-background/70">/{L("lună", "month")}</span>
                      </p>
                      <p className="mt-2 text-sm text-background/80">{typeLabel} · {form.zone} · {L("6,5–9,4% net estimat", "6.5–9.4% estimated net")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">{L("Previzualizare mesaj", "Message preview")}</p>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground font-sans">{buildMessage(form)}</pre>
                    </div>
                    <Button type="button" size="lg" onClick={handleWhatsapp} className="w-full h-14 text-base bg-gold text-gold-foreground hover:bg-gold-dark">
                      <MessageCircle className="w-5 h-5 mr-2" />{L("Trimite pe WhatsApp", "Send on WhatsApp")}
                    </Button>
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                      <Button type="button" variant="outline" size="lg" className="h-12" onClick={() => setStep(2)}><ArrowLeft className="w-5 h-5 mr-2" />{L("Înapoi", "Back")}</Button>
                      <Button type="button" variant="outline" size="lg" onClick={handleConsult} disabled={submitting || saved} className="flex-1 h-12">
                        {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CalendarCheck className="w-5 h-5 mr-2" />}
                        {saved ? L("Cerere trimisă", "Request sent") : L("Rezervă consultanță gratuită", "Book free consultation")}
                      </Button>
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground">{L("Doar numele și telefonul sunt obligatorii. Nu trimitem spam.", "Only name and phone are required. No spam.")}</p>
                <FormTrustBadges className="mt-2" />
              </div>
            </form>
          </div>
        </div>
      </div>

      <Dialog open={consultOpen} onOpenChange={setConsultOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-gold" />
            <DialogTitle className="text-center">{L("Consultanța e rezervată", "Consultation booked")}</DialogTitle>
            <DialogDescription className="text-center">
              {L(`Mulțumim, ${form.name.split(" ")[0]}! Te sunăm în cel mult 24 de ore (L–V) ca să stabilim o oră potrivită.`,
                `Thanks, ${form.name.split(" ")[0]}! We'll call you within 24 hours (Mon–Fri) to set a time.`)}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setConsultOpen(false)} className="w-full h-12">OK</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PreCalcMiniForm;
