import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { CalendarCheck, MessageCircle, MapPin, Home, User, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { submitLead } from "@/lib/leadSubmission";
import { toast } from "sonner";

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

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Numele trebuie să aibă minim 2 caractere" })
    .max(80, { message: "Numele este prea lung" }),
  city: z
    .string()
    .trim()
    .min(2, { message: "Selectează un oraș" })
    .max(60),
  apartmentType: z.enum([
    "garsoniera",
    "2-camere",
    "3-camere",
    "4-camere",
    "casa",
  ]),
});

type FormState = {
  name: string;
  city: string;
  apartmentType: string;
};

interface PreCalcMiniFormProps {
  /** Identifies where the form was submitted from (homepage / owners page / etc.) */
  source?: string;
  /** Optional eyebrow / pre-title shown above the heading */
  eyebrow?: string;
  /** Compact = used inside a teaser; full = standalone section */
  variant?: "compact" | "full";
  className?: string;
}

const PreCalcMiniForm = ({
  source = "pre_calc_owner",
  eyebrow,
  variant = "full",
  className = "",
}: PreCalcMiniFormProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: "",
    city: "Timișoara",
    apartmentType: "2-camere",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const t = {
    eyebrow: eyebrow ?? (language === "ro" ? "Pre-calcul ROI · 30 secunde" : "ROI pre-calc · 30 seconds"),
    title:
      language === "ro"
        ? "Vezi cât poți câștiga lunar — fără calcule complicate"
        : "See how much you can earn monthly — no complicated math",
    subtitle:
      language === "ro"
        ? "Completează 3 câmpuri și primești pe WhatsApp o estimare realistă pentru apartamentul tău + un slot pentru consultanță gratuită."
        : "Fill in 3 fields and get a realistic estimate for your apartment on WhatsApp + a slot for a free consultation.",
    nameLabel: language === "ro" ? "Numele tău" : "Your name",
    namePlaceholder: language === "ro" ? "Ex: Andrei Popescu" : "e.g. John Smith",
    cityLabel: language === "ro" ? "Orașul / Localitatea" : "City / Locality",
    cityPlaceholder: language === "ro" ? "Selectează orașul" : "Select city",
    typeLabel: language === "ro" ? "Tip apartament" : "Apartment type",
    typePlaceholder: language === "ro" ? "Selectează tipul" : "Select type",
    submit: language === "ro" ? "Rezervă consultanță gratuită" : "Book free consultation",
    submitWhatsapp: language === "ro" ? "Trimite pe WhatsApp" : "Send on WhatsApp",
    submitting: language === "ro" ? "Se procesează..." : "Processing...",
    or: language === "ro" ? "sau" : "or",
    privacy:
      language === "ro"
        ? "Nu trimitem spam. Datele se folosesc doar pentru estimare și consultanță."
        : "No spam. Data is used only for estimation and consultancy.",
    successConsult:
      language === "ro"
        ? "Te redirecționăm către formularul de consultanță"
        : "Redirecting you to the consultation form",
    successWhatsapp:
      language === "ro"
        ? "Mesajul a fost generat — te redirecționăm către WhatsApp"
        : "Message generated — redirecting you to WhatsApp",
    errorGeneric:
      language === "ro"
        ? "A apărut o problemă. Te rugăm să încerci din nou."
        : "Something went wrong. Please try again.",
  };

  const buildPrecalcMessage = (data: FormState): string => {
    const range = MONTHLY_NET_RANGE[data.apartmentType] ?? [2000, 3000];
    const [min, max] = range;
    const yearlyMin = min * 12;
    const yearlyMax = max * 12;
    const typeLabel =
      APARTMENT_TYPES.find((a) => a.value === data.apartmentType)?.labelRo ?? data.apartmentType;

    if (language === "en") {
      const typeLabelEn =
        APARTMENT_TYPES.find((a) => a.value === data.apartmentType)?.labelEn ?? data.apartmentType;
      return [
        `Hello, I'm ${data.name} from ${data.city}.`,
        ``,
        `I'd like an ROI pre-calculation for my ${typeLabelEn.toLowerCase()}.`,
        ``,
        `📊 Estimated hotel-regime net income (Timișoara average):`,
        `• Monthly: €${min.toLocaleString("en-US")} – €${max.toLocaleString("en-US")}`,
        `• Yearly: €${yearlyMin.toLocaleString("en-US")} – €${yearlyMax.toLocaleString("en-US")}`,
        ``,
        `Please confirm a slot for a free consultation so we can refine the numbers for my exact apartment.`,
      ].join("\n");
    }

    return [
      `Salut, sunt ${data.name} din ${data.city}.`,
      ``,
      `Aș dori un pre-calcul ROI pentru ${typeLabel.toLowerCase()}.`,
      ``,
      `📊 Estimare venit net regim hotelier (medie Timișoara):`,
      `• Lunar: ${min.toLocaleString("ro-RO")} € – ${max.toLocaleString("ro-RO")} €`,
      `• Anual: ${yearlyMin.toLocaleString("ro-RO")} € – ${yearlyMax.toLocaleString("ro-RO")} €`,
      ``,
      `Vă rog să confirmați un slot pentru consultanță gratuită ca să rafinăm cifrele pentru apartamentul meu.`,
    ].join("\n");
  };

  /**
   * Validates the form, persists the lead and returns the parsed data
   * along with the generated WhatsApp message + revenue range.
   * Returns `null` if validation fails or the user is already submitting.
   */
  const validateAndPersist = async (): Promise<
    | { data: FormState; message: string; range: [number, number] }
    | null
  > => {
    if (submitting) return null;

    const parsed = formSchema.safeParse({
      name: form.name,
      city: form.city,
      apartmentType: form.apartmentType,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        city: fieldErrors.city?.[0],
        apartmentType: fieldErrors.apartmentType?.[0],
      });
      return null;
    }

    setErrors({});
    setSubmitting(true);

    const data = parsed.data as FormState;
    const message = buildPrecalcMessage(data);
    const range = (MONTHLY_NET_RANGE[data.apartmentType] ?? [2000, 3000]) as [number, number];

    try {
      const result = await submitLead({
        name: data.name,
        whatsapp_number: "PRECALC_NO_PHONE", // sentinel — real number captured downstream
        property_type: data.apartmentType,
        property_area: 0,
        message: `[${source}] Oraș: ${data.city} · Tip: ${data.apartmentType}`,
        source,
        allowSentinelPhone: true,
        simulation_data: withCampaignTracking({
          city: data.city,
          apartment_type: data.apartmentType,
          estimated_monthly_min: range[0],
          estimated_monthly_max: range[1],
          generated_message: message,
          language,
        }) as never,
      });

      if (!result.ok) {
        // reportError already fired inside the helper; keep UX moving
        console.warn("[PreCalcMiniForm] submitLead failed", result);
      }
    } catch (err) {
      console.error("[PreCalcMiniForm] unexpected error:", err);
    }

    return { data, message, range };
  };

  // Primary: redirect to /evaluare-gratuita with prefilled query params.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await validateAndPersist();
    if (!result) return;

    const params = new URLSearchParams({
      nume: result.data.name,
      oras: result.data.city,
      tip: result.data.apartmentType,
      source,
    });

    toast.success(t.successConsult);
    navigate(`/evaluare-gratuita?${params.toString()}`);
    setSubmitting(false);
  };

  // Secondary: open WhatsApp with the pre-formatted ROI message.
  const handleWhatsapp = async () => {
    const result = await validateAndPersist();
    if (!result) return;

    toast.success(t.successWhatsapp);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(result.message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSubmitting(false);
  };

  const isCompact = variant === "compact";

  return (
    <section
      className={`relative ${isCompact ? "py-12" : "py-16 md:py-20"} ${className}`}
      aria-labelledby="precalc-mini-form-title"
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-elegant p-6 sm:p-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t.eyebrow}
              </span>
            </div>

            <h2
              id="precalc-mini-form-title"
              className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3"
            >
              {t.title}
            </h2>
            <p className="text-muted-foreground mb-8">{t.subtitle}</p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Name */}
              <div>
                <Label htmlFor="precalc-name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary" />
                  {t.nameLabel}
                </Label>
                <Input
                  id="precalc-name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  required
                  placeholder={t.namePlaceholder}
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "precalc-name-error" : undefined}
                />
                {errors.name && (
                  <p id="precalc-name-error" className="mt-1 text-sm text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {/* City */}
                <div>
                  <Label htmlFor="precalc-city" className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t.cityLabel}
                  </Label>
                  <Select
                    value={form.city}
                    onValueChange={(v) => {
                      setForm((prev) => ({ ...prev, city: v }));
                      if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
                    }}
                  >
                    <SelectTrigger id="precalc-city" aria-invalid={!!errors.city}>
                      <SelectValue placeholder={t.cityPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMISOARA_CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && (
                    <p className="mt-1 text-sm text-destructive">{errors.city}</p>
                  )}
                </div>

                {/* Apartment type */}
                <div>
                  <Label htmlFor="precalc-type" className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-primary" />
                    {t.typeLabel}
                  </Label>
                  <Select
                    value={form.apartmentType}
                    onValueChange={(v) => {
                      setForm((prev) => ({ ...prev, apartmentType: v }));
                      if (errors.apartmentType)
                        setErrors((prev) => ({ ...prev, apartmentType: undefined }));
                    }}
                  >
                    <SelectTrigger id="precalc-type" aria-invalid={!!errors.apartmentType}>
                      <SelectValue placeholder={t.typePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {APARTMENT_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {language === "ro" ? a.labelRo : a.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.apartmentType && (
                    <p className="mt-1 text-sm text-destructive">{errors.apartmentType}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary group"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t.submitting}
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-5 h-5 mr-2" />
                      {t.submit}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{t.or}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={submitting}
                  onClick={handleWhatsapp}
                  className="w-full"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t.submitWhatsapp}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">{t.privacy}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreCalcMiniForm;
