import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  CheckCircle2,
  Phone,
  MessageCircle,
  ShieldCheck,
  Clock,
  Lock,
  ArrowRight,
  Sparkles,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { submitLead } from "@/lib/leadSubmission";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import { trackConversion, trackCriticalConversion, OWNER_FUNNEL_VALUE_EUR } from "@/lib/conversionTracking";
import { BRAND } from "@/lib/orgIdentity";

/** Versiunea textului de consimțământ GDPR salvată împreună cu lead-ul (audit). */
const GDPR_CONSENT_VERSION = "2026-08-v1";

import {
  OWNER_ROI_PREFILL_EVENT,
  type OwnerRoiPrefillPayload,
} from "@/lib/ownerRoiPrefill";

/**
 * OwnerContactLeadForm — formular scurt de captare lead (proprietari).
 * 5 câmpuri + bifă opțională pentru analiză de randament, micro-copy de încredere
 * sub buton și success state cu apel direct / WhatsApp. Evenimente GA4 + Meta pe submit.
 */

const ZONES = [
  { value: "isho", ro: "ISHO", en: "ISHO" },
  { value: "city-of-mara", ro: "City of Mara", en: "City of Mara" },
  { value: "circumvalatiunii", ro: "Circumvalațiunii", en: "Circumvalațiunii" },
  { value: "centru", ro: "Centru / Cetate", en: "City centre / Cetate" },
  { value: "iosefin", ro: "Iosefin", en: "Iosefin" },
  { value: "fabric", ro: "Fabric", en: "Fabric" },
  { value: "aradului", ro: "Aradului", en: "Aradului" },
  { value: "dumbravita", ro: "Dumbrăvița", en: "Dumbrăvița" },
  { value: "alta", ro: "Altă zonă din Timișoara", en: "Other area in Timișoara" },
] as const;

const PROPERTY_TYPES = [
  { value: "garsoniera", ro: "Garsonieră / Studio", en: "Studio" },
  { value: "2-camere", ro: "Apartament 2 camere", en: "2-room apartment" },
  { value: "3-camere", ro: "Apartament 3+ camere", en: "3+ room apartment" },
  { value: "casa", ro: "Casă / Vilă", en: "House / Villa" },
] as const;

const PHONE_E164 = BRAND.telephone.replace(/[^\d+]/g, "");
const PHONE_DISPLAY = "+40 799 069 256";
const WHATSAPP_NUMBER = PHONE_E164.replace(/^\+/, "");

const makeSchema = (isRo: boolean) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, isRo ? "Introdu numele tău (minim 2 caractere)" : "Enter your name (min. 2 characters)")
      .max(80, isRo ? "Numele este prea lung" : "Name is too long"),
    phone: z
      .string()
      .trim()
      .regex(
        /^(\+?4?0)?7\d{8}$/,
        isRo ? "Introdu un număr de telefon valid (ex: 0722 123 456)" : "Enter a valid phone number (e.g. 0722 123 456)",
      ),
    email: z
      .string()
      .trim()
      .email(isRo ? "Introdu o adresă de email validă" : "Enter a valid email address")
      .max(255),
    zone: z
      .string()
      .min(1, isRo ? "Selectează zona / proiectul" : "Select the area / project"),
    propertyType: z
      .string()
      .min(1, isRo ? "Selectează tipul proprietății" : "Select the property type"),
  });

type FormState = {
  name: string;
  phone: string;
  email: string;
  zone: string;
  propertyType: string;
};

interface OwnerContactLeadFormProps {
  /** Identifies the page/section the lead came from. */
  source?: string;
  className?: string;
}

const OwnerContactLeadForm = ({
  source = "owner_contact_form",
  className = "",
}: OwnerContactLeadFormProps) => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    zone: "",
    propertyType: "",
  });
  const [wantsYieldAnalysis, setWantsYieldAnalysis] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [roiPrefill, setRoiPrefill] = useState<OwnerRoiPrefillPayload | null>(null);

  /** GDPR: consimțământ explicit, obligatoriu. */
  const [gdprConsent, setGdprConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  /** Honeypot — completat doar de boți; ascuns pentru utilizatori și screen readers. */
  const honeypotRef = useRef("");

  /** Cloudflare Turnstile (invisible/managed) — verificare fail-closed pe server. */
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-turnstile-site-key");
        if (error) throw error;
        if (!cancelled && data?.siteKey) {
          setTurnstileSiteKey(data.siteKey);
          setTurnstileReady(true);
        }
      } catch {
        // cheia nu s-a putut încărca — protecția rămâne pe honeypot + rate limiting server
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Fail-closed: orice eroare/verificare eșuată blochează trimiterea. */
  const verifyCaptcha = useCallback(
    async (token: string): Promise<{ ok: boolean; rateLimited: boolean }> => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-turnstile", {
          body: { token, formType: "owner_contact_lead_form" },
        });
        if (error) {
          const status = (error as { context?: { status?: number } })?.context?.status;
          return { ok: false, rateLimited: status === 429 };
        }
        return { ok: data?.success === true, rateLimited: false };
      } catch {
        return { ok: false, rateLimited: false };
      }
    },
    [],
  );


  // Prefill din Calculatorul ROI (aceeași pagină)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OwnerRoiPrefillPayload>).detail;
      if (!detail) return;
      setRoiPrefill(detail);
      setSuccess(false);
      setForm((prev) => ({
        ...prev,
        zone: detail.zone || prev.zone,
        propertyType: detail.propertyType || prev.propertyType,
      }));
      setErrors({});
      setWantsYieldAnalysis(true);
    };
    window.addEventListener(OWNER_ROI_PREFILL_EVENT, handler);
    return () => window.removeEventListener(OWNER_ROI_PREFILL_EVENT, handler);
  }, []);

  const t = isRo
    ? {
        badge: "Contact rapid · 60 de secunde",
        title: "Discută cu un consultant din Timișoara",
        subtitle:
          "Cinci câmpuri, fără formulare lungi. Îți răspundem personal și îți spunem exact ce randament poate genera proprietatea ta.",
        name: "Nume și prenume",
        namePh: "Ex: Andrei Popescu",
        phone: "Telefon",
        phonePh: "07xx xxx xxx",
        email: "Email",
        emailPh: "nume@email.com",
        zone: "Locație / proiect în Timișoara",
        zonePh: "Selectează zona",
        type: "Tip proprietate",
        typePh: "Selectează tipul",
        checkbox: "Solicit analiză gratuită de randament",
        checkboxHint: "Primești estimarea de venit net pentru proprietatea ta, pe email.",
        submit: "Trimite cererea",
        submitting: "Se trimite...",
        micro: ["Răspundem personal în maxim 15 minute", "Fără obligații contractuale", "Date confidențiale"],
        successTitle: "Cererea a fost trimisă cu succes",
        successBody:
          "Un consultant RealTrust te contactează în maxim 15 minute în intervalul orar de lucru. Dacă vrei mai repede, sună sau scrie-ne direct:",
        call: "Sună acum",
        whatsapp: "Scrie pe WhatsApp",
        again: "Trimite o altă cerere",
        errorGeneric: "A apărut o problemă la trimitere. Te rugăm să încerci din nou sau să ne suni direct.",
        prefillNote: "Am preluat datele calculate pentru proprietatea ta.",
        prefillRent: "Chirie clasică estimată",
        prefillNet: "Venit net RealTrust (an)",
        gdprBefore: "Sunt de acord cu prelucrarea datelor cu caracter personal conform ",
        gdprLink: "Politicii de Confidențialitate",
        gdprAfter: ".",
        gdprRequired: "Trebuie să accepți prelucrarea datelor pentru a trimite cererea.",
        botError: "Verificarea de securitate a eșuat. Te rugăm să reîncerci.",
        rateLimited: "Prea multe încercări. Te rugăm să reîncerci în câteva minute.",

      }
    : {
        badge: "Quick contact · 60 seconds",
        title: "Talk to a consultant based in Timișoara",
        subtitle:
          "Five fields, no long forms. We reply personally and tell you exactly what yield your property can generate.",
        name: "Full name",
        namePh: "e.g. John Smith",
        phone: "Phone",
        phonePh: "07xx xxx xxx",
        email: "Email",
        emailPh: "name@email.com",
        zone: "Location / project in Timișoara",
        zonePh: "Select the area",
        type: "Property type",
        typePh: "Select the type",
        checkbox: "I request a free yield analysis",
        checkboxHint: "You receive the net income estimate for your property by email.",
        submit: "Send request",
        submitting: "Sending...",
        micro: ["We reply personally within 15 minutes", "No contractual obligations", "Your data stays confidential"],
        successTitle: "Your request was sent successfully",
        successBody:
          "A RealTrust consultant will contact you within 15 minutes during business hours. If you prefer, reach us directly:",
        call: "Call now",
        whatsapp: "Message on WhatsApp",
        again: "Send another request",
        errorGeneric: "Something went wrong while sending. Please try again or call us directly.",
        prefillNote: "We picked up the figures calculated for your property.",
        prefillRent: "Estimated long-term rent",
        prefillNet: "RealTrust net income (year)",
        gdprBefore: "I agree to the processing of my personal data according to the ",
        gdprLink: "Privacy Policy",
        gdprAfter: ".",
        gdprRequired: "You must accept data processing before sending the request.",
        botError: "Security check failed. Please try again.",
        rateLimited: "Too many attempts. Please try again in a few minutes.",

      };

  const zoneLabel = (value: string) => {
    const zone = ZONES.find((z) => z.value === value);
    return zone ? (isRo ? zone.ro : zone.en) : value;
  };
  const typeLabel = (value: string) => {
    const type = PROPERTY_TYPES.find((p) => p.value === value);
    return type ? (isRo ? type.ro : type.en) : value;
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    isRo
      ? "Salut! Am completat formularul pentru proprietari pe realtrust.ro și aș vrea detalii despre administrarea în regim hotelier."
      : "Hello! I submitted the owners form on realtrust.ro and would like details about short-stay management.",
  )}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    // Honeypot: doar boții completează câmpul ascuns → ieșim silențios.
    if (honeypotRef.current.trim() !== "") {
      setSuccess(true);
      return;
    }

    if (!gdprConsent) {
      setConsentError(t.gdprRequired);
      return;
    }
    setConsentError(null);

    const parsed = makeSchema(isRo).safeParse(form);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        phone: fieldErrors.phone?.[0],
        email: fieldErrors.email?.[0],
        zone: fieldErrors.zone?.[0],
        propertyType: fieldErrors.propertyType?.[0],
      });
      return;
    }

    setErrors({});
    setSubmitting(true);

    // Anti-spam fail-closed: token obligatoriu când widgetul e disponibil.
    const token = turnstileTokenRef.current;
    if (turnstileReady && !token) {
      setSubmitting(false);
      setConsentError(t.botError);
      return;
    }
    if (token) {
      const { ok, rateLimited } = await verifyCaptcha(token);
      if (!ok) {
        setSubmitting(false);
        setConsentError(rateLimited ? t.rateLimited : t.botError);
        turnstileTokenRef.current = null;
        return;
      }
    }


    const data = parsed.data;
    const result = await submitLead({
      name: data.name,
      whatsapp_number: data.phone,
      email: data.email,
      property_type: data.propertyType,
      property_area: 0,
      message: `[${source}] Zonă: ${zoneLabel(data.zone)} · Tip: ${typeLabel(data.propertyType)}${
        wantsYieldAnalysis ? " · Solicită analiză gratuită de randament" : ""
      }${
        roiPrefill
          ? ` · Calculator ROI: chirie clasică ${roiPrefill.monthlyRent} €/lună · venit net estimat ${roiPrefill.netAnnualIncome} €/an`
          : ""
      }`,
      source,
      simulation_data: withCampaignTracking({
        zone: data.zone,
        zone_label: zoneLabel(data.zone),
        property_type: data.propertyType,
        wants_yield_analysis: wantsYieldAnalysis,
        language,
        roi_calculator_prefill: !!roiPrefill,
        roi_monthly_rent: roiPrefill?.monthlyRent ?? null,
        roi_net_annual_income: roiPrefill?.netAnnualIncome ?? null,
        gdpr_consent: true,
        gdpr_consent_at: new Date().toISOString(),
        gdpr_consent_version: GDPR_CONSENT_VERSION,
        gdpr_consent_text: `${t.gdprBefore}${t.gdprLink}${t.gdprAfter}`,
        captcha_verified: !!turnstileTokenRef.current,

      }) as never,
    });

    setSubmitting(false);

    if (!result.ok) {
      setErrors({ name: t.errorGeneric });
      return;
    }

    // GA4 + Meta conversion events
    trackCriticalConversion("Lead_Submit", {
      source,
      value: wantsYieldAnalysis ? OWNER_FUNNEL_VALUE_EUR.managementRequest : OWNER_FUNNEL_VALUE_EUR.intent,
      currency: "EUR",
      email: data.email,
      phone: data.phone,
      name: data.name,
    });
    trackConversion({
      event: "generate_lead",
      source,
      value: OWNER_FUNNEL_VALUE_EUR.intent,
      currency: "EUR",
    });
    if (roiPrefill) {
      trackConversion({
        event: "generate_lead_roi_calculator",
        source: `${source}_roi_calculator`,
        value: OWNER_FUNNEL_VALUE_EUR.managementRequest,
        currency: "EUR",
      });
    }
    if (wantsYieldAnalysis) {
      trackConversion({
        event: "owner_valuation_submit",
        source: `${source}_yield_analysis`,
        value: OWNER_FUNNEL_VALUE_EUR.managementRequest,
        currency: "EUR",
      });
    }

    setSuccess(true);
  };

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <section id="contact-proprietari" className={`py-20 bg-background ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Badge
              variant="outline"
              className="mb-4 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5"
            >
              <Sparkles className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
              {t.badge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t.title}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t.subtitle}</p>
          </div>

          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-6 md:p-8">
              {success ? (
                <div className="text-center py-4" role="status" aria-live="polite">
                  <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-2xl font-bold text-foreground mb-2">{t.successTitle}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">{t.successBody}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="min-h-[48px]">
                      <a
                        href={`tel:${PHONE_E164}`}
                        aria-label={`${t.call} ${PHONE_DISPLAY}`}
                        onClick={() => trackConversion({ event: "phone_click", source: `${source}_success` })}
                      >
                        <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                        {t.call} · {PHONE_DISPLAY}
                      </a>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="min-h-[48px]">
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t.whatsapp}
                        onClick={() =>
                          trackCriticalConversion("WhatsApp_Click", { source: `${source}_success` })
                        }
                      >
                        <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                        {t.whatsapp}
                      </a>
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => {
                      setSuccess(false);
                      setForm({ name: "", phone: "", email: "", zone: "", propertyType: "" });
                      setGdprConsent(false);
                      setConsentError(null);
                      honeypotRef.current = "";
                      turnstileTokenRef.current = null;
                    }}
                  >
                    {t.again}
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {roiPrefill && (
                    <div
                      className="rounded-lg border border-primary/30 bg-primary/5 p-4"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="text-sm font-medium text-foreground flex items-start gap-2">
                        <Calculator className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                        <span>{t.prefillNote}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t.prefillRent}: <strong>{roiPrefill.monthlyRent} €</strong> ·{" "}
                        {t.prefillNet}: <strong>{roiPrefill.netAnnualIncome} €</strong>
                      </p>
                    </div>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="ocf-name">{t.name}</Label>
                      <Input
                        id="ocf-name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder={t.namePh}
                        autoComplete="name"
                        aria-invalid={!!errors.name}
                        className="mt-1.5 min-h-[48px]"
                      />
                      {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="ocf-phone">{t.phone}</Label>
                      <Input
                        id="ocf-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder={t.phonePh}
                        autoComplete="tel"
                        aria-invalid={!!errors.phone}
                        className="mt-1.5 min-h-[48px]"
                      />
                      {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <Label htmlFor="ocf-email">{t.email}</Label>
                      <Input
                        id="ocf-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder={t.emailPh}
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        className="mt-1.5 min-h-[48px]"
                      />
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="ocf-zone">{t.zone}</Label>
                      <Select value={form.zone} onValueChange={(v) => update("zone", v)}>
                        <SelectTrigger id="ocf-zone" className="mt-1.5 min-h-[48px]" aria-label={t.zone}>
                          <SelectValue placeholder={t.zonePh} />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONES.map((z) => (
                            <SelectItem key={z.value} value={z.value}>
                              {isRo ? z.ro : z.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.zone && <p className="text-xs text-destructive mt-1">{errors.zone}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="ocf-type">{t.type}</Label>
                      <Select value={form.propertyType} onValueChange={(v) => update("propertyType", v)}>
                        <SelectTrigger id="ocf-type" className="mt-1.5 min-h-[48px]" aria-label={t.type}>
                          <SelectValue placeholder={t.typePh} />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {isRo ? p.ro : p.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.propertyType && (
                        <p className="text-xs text-destructive mt-1">{errors.propertyType}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <Checkbox
                      id="ocf-yield"
                      checked={wantsYieldAnalysis}
                      onCheckedChange={(v) => setWantsYieldAnalysis(v === true)}
                      className="mt-0.5"
                    />
                    <div>
                      <Label htmlFor="ocf-yield" className="font-semibold cursor-pointer">
                        {t.checkbox}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{t.checkboxHint}</p>
                    </div>
                  </div>

                  {/* GDPR — consimțământ explicit obligatoriu */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="ocf-gdpr"
                      checked={gdprConsent}
                      onCheckedChange={(v) => {
                        setGdprConsent(v === true);
                        if (v === true) setConsentError(null);
                      }}
                      required
                      aria-invalid={!!consentError}
                      aria-describedby={consentError ? "ocf-gdpr-error" : undefined}
                      className="mt-0.5"
                    />
                    <div>
                      <Label htmlFor="ocf-gdpr" className="text-sm font-normal leading-snug cursor-pointer">
                        {t.gdprBefore}
                        <a
                          href="/politica-confidentialitate"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {t.gdprLink}
                        </a>
                        {t.gdprAfter}
                      </Label>
                      {consentError && (
                        <p id="ocf-gdpr-error" className="text-xs text-destructive mt-1" role="alert">
                          {consentError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Honeypot anti-bot — invizibil pentru utilizatori reali */}
                  <div className="absolute left-[-9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="ocf-company-website">Website</label>
                    <input
                      id="ocf-company-website"
                      name="company_website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      onChange={(e) => {
                        honeypotRef.current = e.target.value;
                      }}
                    />
                  </div>

                  {/* Cloudflare Turnstile — verificare invizibilă (fail-open) */}
                  {turnstileSiteKey && (
                    <div className="flex justify-center">
                      <Turnstile
                        siteKey={turnstileSiteKey}
                        onSuccess={(token) => {
                          turnstileTokenRef.current = token;
                        }}
                        onError={() => {
                          turnstileTokenRef.current = null;
                        }}
                        onExpire={() => {
                          turnstileTokenRef.current = null;
                        }}
                        options={{ theme: "auto", size: "flexible", appearance: "interaction-only" }}
                      />
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full min-h-[52px]" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        {t.submitting}
                      </>
                    ) : (
                      <>
                        {t.submit}
                        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                      </>
                    )}
                  </Button>

                  <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      {t.micro[0]}
                    </li>
                    <li aria-hidden="true">•</li>
                    <li className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      {t.micro[1]}
                    </li>
                    <li aria-hidden="true">•</li>
                    <li className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      {t.micro[2]}
                    </li>
                  </ul>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default OwnerContactLeadForm;
