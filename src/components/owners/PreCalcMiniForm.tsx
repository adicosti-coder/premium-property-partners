import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { CalendarCheck, MessageCircle, MapPin, Home, User, Sparkles, Loader2, ArrowRight, ArrowLeft, Phone, Ruler, Settings2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { submitLead } from "@/lib/leadSubmission";
import { withCampaignTracking, getCtaVariant } from "@/lib/campaignAttribution";
import FormTrustBadges from "@/components/forms/FormTrustBadges";
import { toast } from "sonner";
import { trackCriticalConversion } from "@/lib/conversionTracking";
import { supabase } from "@/integrations/supabase/client";

/**
 * PreCalcMiniForm
 * ----------------
 * Mini owner-lead capture form (name + city + apartment type) that:
 *   1. Persists the lead in `leads` (source = "pre_calc_owner") so we never lose it.
 *   2. Generates a pre-formatted ROI pre-calculation message in Romanian/English.
 *   3. Opens a WhatsApp conversation directly with the consultancy team
 *      (+40 799 069 256), seeding the chat with the message and a request
 *      to schedule a consultation.
 *
 * NOTE: The `leads` table requires `whatsapp_number` (NOT NULL) and
 * `property_area` (NOT NULL number). Since this mini-form intentionally only
 * collects 3 lightweight fields, we store sentinel values (`PRECALC_NO_PHONE`,
 * `0`) and put the real qualifying info in `message` + `simulation_data`.
 */

// Extended list — Timișoara + key metropolitan & nearby high-demand areas.
// Order: city center first, then metropolitan ring, then secondary cities in Timiș county.
const TIMISOARA_CITIES = [
  "Timișoara",
  "Dumbrăvița",
  "Giroc",
  "Chișoda",
  "Moșnița Nouă",
  "Moșnița Veche",
  "Ghiroda",
  "Săcălaz",
  "Freidorf",
  "Sânandrei",
  "Șag",
  "Remetea Mare",
  "Sânmihaiu Român",
  "Becicherecu Mic",
  "Dudeștii Noi",
  "Recaș",
  "Lugoj",
  "Jimbolia",
  "Deta",
  "Altă localitate",
] as const;

const APARTMENT_TYPES = [
  { value: "garsoniera", labelRo: "Garsonieră", labelEn: "Studio" },
  { value: "2-camere", labelRo: "Apartament 2 camere", labelEn: "1-bedroom apartment" },
  { value: "3-camere", labelRo: "Apartament 3 camere", labelEn: "2-bedroom apartment" },
  { value: "4-camere", labelRo: "Apartament 4 camere", labelEn: "3-bedroom apartment" },
  { value: "casa", labelRo: "Casă / Vilă", labelEn: "House / Villa" },
] as const;

// Realistic monthly NET revenue (after platform commission, cleaning, utilities, management fee).
// Calibrated on hotel-regime portfolio averages — Timișoara central & metropolitan zones,
// 75–85% occupancy, mixed Booking/Airbnb channels, 2025–2026 tariffs.
// Sources: internal RealTrust performance data (verified ROI ≈ 9.4% net annual).
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
    { v: "renovat_recent", ro: "Renovat recent", en: "Recently renovated" },
    { v: "stare_buna", ro: "Stare bună", en: "Good condition" },
    { v: "necesita_renovare", ro: "Necesită renovare", en: "Needs renovation" },
  ],
  furnished: [
    { v: "complet", ro: "Mobilat complet", en: "Fully furnished" },
    { v: "partial", ro: "Parțial mobilat", en: "Partly furnished" },
    { v: "nemobilat", ro: "Nemobilat", en: "Unfurnished" },
  ],
  availability: [
    { v: "imediat", ro: "Imediat", en: "Immediately" },
    { v: "1-3_luni", ro: "În 1–3 luni", en: "In 1–3 months" },
    { v: "peste_3_luni", ro: "Peste 3 luni", en: "Later than 3 months" },
  ],
  current: [
    { v: "liber", ro: "Liber / nefolosit", en: "Empty" },
    { v: "inchiriat_clasic", ro: "Închiriat pe termen lung", en: "Long-term rented" },
    { v: "airbnb_singur", ro: "Îl administrez singur pe Airbnb/Booking", en: "Self-managed on Airbnb/Booking" },
    { v: "locuit", ro: "Locuit de mine", en: "Owner-occupied" },
  ],
  service: [
    { v: "regim_hotelier", ro: "Administrare completă regim hotelier", en: "Full short-term management" },
    { v: "inchiriere_clasica", ro: "Închiriere pe termen lung", en: "Long-term rental" },
    { v: "nu_stiu", ro: "Nu știu încă, vreau o recomandare", en: "Not sure, I want advice" },
  ],
} as const;

const step1Schema = z.object({
  name: z.string().trim().min(2, { message: "Numele trebuie să aibă minim 2 caractere" }).max(80, { message: "Numele este prea lung" }),
  phone: z.string().trim().regex(/^(\+?4?0)?7\d{8}$/, { message: "Introdu un număr de telefon valid (ex: 0722 123 456)" }),
  city: z.string().trim().min(2, { message: "Selectează un oraș" }).max(60),
  apartmentType: z.enum(["garsoniera", "2-camere", "3-camere", "4-camere", "casa"]),
  area: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{2,4}$/.test(v) && +v >= 10 && +v <= 1000), {
      message: "Suprafața trebuie să fie între 10 și 1000 mp",
    }),
});

type FormState = {
  name: string;
  phone: string;
  city: string;
  apartmentType: string;
  area: string;
  condition: string;
  furnished: string;
  availability: string;
  current: string;
  service: string;
  notes: string;
};
type FieldKey = keyof FormState;

interface PreCalcMiniFormProps {
  source?: string;
  eyebrow?: string;
  variant?: "compact" | "full";
  className?: string;
}

const PreCalcMiniForm = ({ source = "pre_calc_owner", eyebrow, variant = "full", className = "" }: PreCalcMiniFormProps) => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const L = (r: string, e: string) => (ro ? r : e);
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>({
    name: "", phone: "", city: "Timișoara", apartmentType: "2-camere", area: "",
    condition: "", furnished: "", availability: "", current: "", service: "", notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: FieldKey, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const optLabel = (group: keyof typeof OPT, v: string) => {
    const o = OPT[group].find((x) => x.v === v);
    return o ? (ro ? o.ro : o.en) : "";
  };

  const range = (MONTHLY_NET_RANGE[form.apartmentType] ?? [2000, 3000]) as [number, number];

  const buildMessage = (d: FormState): string => {
    const [min, max] = range;
    const type = APARTMENT_TYPES.find((a) => a.value === d.apartmentType);
    const typeLabel = (ro ? type?.labelRo : type?.labelEn) ?? d.apartmentType;
    const loc = ro ? "ro-RO" : "en-US";
    const details = [
      d.area && `${L("Suprafață", "Area")}: ${d.area} mp`,
      d.condition && `${L("Stare", "Condition")}: ${optLabel("condition", d.condition)}`,
      d.furnished && `${L("Mobilare", "Furnishing")}: ${optLabel("furnished", d.furnished)}`,
      d.current && `${L("Acum", "Currently")}: ${optLabel("current", d.current)}`,
      d.availability && `${L("Disponibil", "Available")}: ${optLabel("availability", d.availability)}`,
      d.service && `${L("Mă interesează", "Interested in")}: ${optLabel("service", d.service)}`,
    ].filter(Boolean).map((x) => `• ${x}`);
    return [
      L(`Salut, sunt ${d.name} din ${d.city}.`, `Hello, I'm ${d.name} from ${d.city}.`),
      ``,
      L(`Aș dori un calcul de venit pentru ${typeLabel.toLowerCase()}.`, `I'd like an income estimate for my ${typeLabel.toLowerCase()}.`),
      ...(details.length ? [``, L("🏠 Detalii:", "🏠 Details:"), ...details] : []),
      ...(d.notes.trim() ? [``, `${L("Observații", "Notes")}: ${d.notes.trim()}`] : []),
      ``,
      L("📊 Estimare venit net regim hotelier (medie Timișoara):", "📊 Estimated net short-term income (Timișoara average):"),
      `• ${L("Lunar", "Monthly")}: ${min.toLocaleString(loc)} € – ${max.toLocaleString(loc)} €`,
      L("• Randament: 6,5–9,4% net estimat", "• Yield: 6.5–9.4% estimated net"),
      ``,
      L("Vă rog să confirmați un slot pentru consultanță gratuită ca să rafinăm cifrele.", "Please confirm a slot for a free consultation to refine the numbers."),
    ].join("\n");
  };

  const goStep2 = () => {
    const parsed = step1Schema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ name: fe.name?.[0], phone: fe.phone?.[0], city: fe.city?.[0], apartmentType: fe.apartmentType?.[0], area: fe.area?.[0] });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const persist = async (): Promise<string | null> => {
    if (submitting) return null;
    if (!step1Schema.safeParse(form).success) { setStep(1); return null; }
    setSubmitting(true);
    const d = { ...form, notes: form.notes.trim().slice(0, 500) };
    const message = buildMessage(d);
    const area = d.area ? Number(d.area) : 0;
    try {
      const result = await submitLead({
        name: d.name,
        whatsapp_number: d.phone,
        property_type: d.apartmentType,
        property_area: area,
        message: `[${source}] Zonă: ${d.city} · Tip: ${d.apartmentType}${area ? ` · ${area} mp` : ""}${d.service ? ` · Serviciu: ${d.service}` : ""}${d.notes ? ` · Obs: ${d.notes}` : ""}`,
        source,
        simulation_data: withCampaignTracking({
          city: d.city,
          apartment_type: d.apartmentType,
          area_sqm: area || null,
          condition: d.condition || null,
          furnished: d.furnished || null,
          availability: d.availability || null,
          current_usage: d.current || null,
          desired_service: d.service || null,
          notes: d.notes || null,
          estimated_monthly_min: range[0],
          estimated_monthly_max: range[1],
          generated_message: message,
          language,
        }) as never,
      });
      if (!result.ok) console.warn("[PreCalcMiniForm] submitLead failed", result);

      void supabase.functions
        .invoke("handle-lead-whatsapp", {
          body: {
            nume: d.name,
            telefon: d.phone,
            zona: d.city,
            numar_camere: d.apartmentType,
            venit_estimat_min: range[0],
            venit_estimat_max: range[1],
            ...(area ? { suprafata_mp: area } : {}),
            ...(d.condition ? { stare: d.condition } : {}),
            ...(d.furnished ? { mobilat: d.furnished } : {}),
            ...(d.availability ? { disponibilitate: d.availability } : {}),
            ...(d.current ? { situatie_actuala: d.current } : {}),
            ...(d.service ? { tip_administrare: d.service } : {}),
            ...(d.notes ? { observatii: d.notes } : {}),
          },
        })
        .then(({ error }) => { if (error) console.warn("[PreCalcMiniForm] handle-lead-whatsapp failed", error); })
        .catch(() => {});

      trackCriticalConversion("PreCalc_Completed", {
        source, value: range[1] * 12, currency: "EUR", apartment_type: d.apartmentType, city: d.city, name: d.name, cta_variant: getCtaVariant(),
      });
      if (result.ok) {
        trackCriticalConversion("Lead_Submit", { source, value: 90, currency: "EUR", name: d.name, cta_variant: getCtaVariant() });
      }
    } catch (err) {
      console.error("[PreCalcMiniForm] unexpected error:", err);
    }
    return message;
  };

  const handleConsult = async () => {
    const msg = await persist();
    if (msg === null) return;
    const params = new URLSearchParams({ nume: form.name, telefon: form.phone, oras: form.city, tip: form.apartmentType, source });
    toast.success(L("Te redirecționăm către formularul de consultanță", "Redirecting you to the consultation form"));
    navigate(`/evaluare-gratuita?${params.toString()}`);
    setSubmitting(false);
  };

  const handleWhatsapp = async () => {
    const msg = await persist();
    if (msg === null) return;
    toast.success(L("Mesajul a fost generat — te redirecționăm către WhatsApp", "Message generated — redirecting you to WhatsApp"));
    trackCriticalConversion("WhatsApp_Click", { source: `${source}_whatsapp`, cta_variant: getCtaVariant() });
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    setSubmitting(false);
  };

  const isCompact = variant === "compact";
  const steps = [L("Apartament", "Apartment"), L("Administrare", "Management"), "WhatsApp"];

  const err = (k: FieldKey) =>
    errors[k] ? <p id={`precalc-${k}-error`} className="mt-1 text-sm text-destructive">{errors[k]}</p> : null;

  const choiceSelect = (k: FieldKey, group: keyof typeof OPT, label: string) => (
    <div>
      <Label htmlFor={`precalc-${k}`} className="mb-2 block">{label}</Label>
      <Select value={form[k]} onValueChange={(v) => set(k, v)}>
        <SelectTrigger id={`precalc-${k}`}><SelectValue placeholder={L("Alege (opțional)", "Choose (optional)")} /></SelectTrigger>
        <SelectContent>
          {OPT[group].map((o) => <SelectItem key={o.v} value={o.v}>{ro ? o.ro : o.en}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <section className={`relative ${isCompact ? "py-12" : "py-16 md:py-20"} ${className}`} aria-labelledby="precalc-mini-form-title">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-elegant p-6 sm:p-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {eyebrow ?? L("Calcul venit · 1 minut", "Income estimate · 1 minute")}
              </span>
            </div>
            <h2 id="precalc-mini-form-title" className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3">
              {L("Vezi cât poți câștiga lunar — fără calcule complicate", "See how much you can earn monthly — no complicated math")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {L("Trei pași scurți: apartamentul, cum vrei să fie administrat și mesajul gata de trimis pe WhatsApp.",
                "Three short steps: your apartment, how you want it managed and a ready-to-send WhatsApp message.")}
            </p>

            <ol className="flex items-center gap-2 mb-8" aria-label={L("Etapele formularului", "Form steps")}>
              {steps.map((s, i) => {
                const n = i + 1;
                const active = n === step;
                const done = n < step;
                return (
                  <li key={s} className="flex-1" aria-current={active ? "step" : undefined}>
                    <div className={`h-1.5 rounded-full ${done || active ? "bg-primary" : "bg-border"}`} />
                    <span className={`mt-2 block text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {n}. {s}
                    </span>
                  </li>
                );
              })}
            </ol>

            <form onSubmit={(e) => { e.preventDefault(); if (step === 1) goStep2(); else if (step === 2) setStep(3); }} className="space-y-5" noValidate>
              {step === 1 && (
                <>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="precalc-name" className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-primary" />{L("Numele tău", "Your name")}</Label>
                      <Input id="precalc-name" autoComplete="name" maxLength={80} placeholder={L("Ex: Andrei Popescu", "e.g. John Smith")}
                        value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "precalc-name-error" : undefined} />
                      {err("name")}
                    </div>
                    <div>
                      <Label htmlFor="precalc-phone" className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-primary" />{L("Telefon", "Phone")}</Label>
                      <Input id="precalc-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="07xx xxx xxx"
                        value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "precalc-phone-error" : undefined} />
                      {err("phone")}
                    </div>
                    <div>
                      <Label htmlFor="precalc-city" className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" />{L("Cartier / Localitate", "Neighborhood / Locality")}</Label>
                      <Select value={form.city} onValueChange={(v) => set("city", v)}>
                        <SelectTrigger id="precalc-city" aria-invalid={!!errors.city}><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMISOARA_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      {err("city")}
                    </div>
                    <div>
                      <Label htmlFor="precalc-type" className="flex items-center gap-2 mb-2"><Home className="w-4 h-4 text-primary" />{L("Tip apartament", "Apartment type")}</Label>
                      <Select value={form.apartmentType} onValueChange={(v) => set("apartmentType", v)}>
                        <SelectTrigger id="precalc-type"><SelectValue /></SelectTrigger>
                        <SelectContent>{APARTMENT_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{ro ? a.labelRo : a.labelEn}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="precalc-area" className="flex items-center gap-2 mb-2"><Ruler className="w-4 h-4 text-primary" />{L("Suprafață (mp, opțional)", "Area (sqm, optional)")}</Label>
                      <Input id="precalc-area" inputMode="numeric" maxLength={4} placeholder={L("Ex: 55", "e.g. 55")}
                        value={form.area} onChange={(e) => set("area", e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.area} aria-describedby={errors.area ? "precalc-area-error" : undefined} />
                      {err("area")}
                    </div>
                    {choiceSelect("condition", "condition", L("Starea apartamentului", "Apartment condition"))}
                    {choiceSelect("furnished", "furnished", L("Mobilare", "Furnishing"))}
                  </div>
                  <Button type="submit" size="lg" className="w-full group">
                    {L("Continuă", "Continue")}<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-center gap-2 text-foreground font-medium"><Settings2 className="w-4 h-4 text-primary" />{L("Preferințe de administrare", "Management preferences")}</div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    {choiceSelect("service", "service", L("Ce tip de administrare te interesează?", "Which management type interests you?"))}
                    {choiceSelect("current", "current", L("Ce se întâmplă acum cu apartamentul?", "What's the apartment used for now?"))}
                    {choiceSelect("availability", "availability", L("Când poate fi disponibil?", "When can it be available?"))}
                  </div>
                  <div>
                    <Label htmlFor="precalc-notes" className="mb-2 block">{L("Altceva important? (opțional)", "Anything else? (optional)")}</Label>
                    <Textarea id="precalc-notes" maxLength={500} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)}
                      placeholder={L("Ex: vreau să folosesc apartamentul câteva săptămâni pe an", "e.g. I'd like to use it a few weeks per year")} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}><ArrowLeft className="w-5 h-5 mr-2" />{L("Înapoi", "Back")}</Button>
                    <Button type="submit" size="lg" className="flex-1 group">{L("Vezi mesajul", "See message")}<ArrowRight className="w-5 h-5 ml-2" /></Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">{L("Mesajul tău pentru WhatsApp", "Your WhatsApp message")}</p>
                    <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground font-sans">{buildMessage(form)}</pre>
                  </div>
                  <Button type="button" size="lg" disabled={submitting} onClick={handleWhatsapp} className="w-full">
                    {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-2" />}
                    {submitting ? L("Se procesează...", "Processing...") : L("Trimite pe WhatsApp", "Send on WhatsApp")}
                  </Button>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" size="lg" onClick={() => setStep(2)} disabled={submitting}><ArrowLeft className="w-5 h-5 mr-2" />{L("Înapoi", "Back")}</Button>
                    <Button type="button" variant="outline" size="lg" onClick={handleConsult} disabled={submitting} className="flex-1">
                      <CalendarCheck className="w-5 h-5 mr-2" />{L("Rezervă consultanță gratuită", "Book free consultation")}
                    </Button>
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">{L("Nu trimitem spam. Datele se folosesc doar pentru estimare și consultanță.", "No spam. Data is used only for estimation and consultancy.")}</p>
              <FormTrustBadges className="mt-2" />
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreCalcMiniForm;
