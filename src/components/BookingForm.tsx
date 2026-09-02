import { useState, useRef, useEffect } from "react";
import { Calendar, Users, Phone, Mail, MessageSquare, Globe, Send, ShieldCheck, Tag, Check as CheckIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import { properties } from "@/data/properties";
import { buildPynbookingUrl, isPynbookingUrl } from "@/lib/pynbooking";

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
  /** Slug of the apartment page the request comes from. */
  propertySlug?: string;
  /** Numeric id from the static guest catalogue, when available. */
  propertyRefId?: number;
  /** Nightly rate used to estimate the stay total. */
  pricePerNight?: number;
}

const WHATSAPP_NUMBER = "40799069256";

const readUtm = () => {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 120);
  }
  if (document.referrer) utm.referrer = document.referrer.slice(0, 300);
  return Object.keys(utm).length ? utm : undefined;
};

const countriesRo = [
  "România", "Germania", "Franța", "Italia", "Spania", "Marea Britanie",
  "Olanda", "Belgia", "Austria", "Elveția", "Polonia", "Ungaria",
  "SUA", "Canada", "Australia", "Altă țară"
];

const countriesEn = [
  "Romania", "Germany", "France", "Italy", "Spain", "United Kingdom",
  "Netherlands", "Belgium", "Austria", "Switzerland", "Poland", "Hungary",
  "USA", "Canada", "Australia", "Other country"
];

const BookingForm = ({ isOpen, onClose, propertyName, propertySlug, propertyRefId, pricePerNight }: BookingFormProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { trackStep } = useFunnelTracking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Honeypot field for bot detection
  const [honeypot, setHoneypot] = useState("");
  // Discount code
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ valid: boolean; discount_type: string; discount_value: number; description: string } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    checkIn: "",
    checkOut: "",
    guests: "",
    country: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; emailSent: boolean } | null>(null);
  
  // Turnstile state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);

  // Fetch Turnstile site key
  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-turnstile-site-key');
        if (error) throw error;
        setTurnstileSiteKey(data.siteKey);
      } catch (error) {
        console.error("Failed to fetch Turnstile site key:", error);
      }
    };
    if (isOpen) {
      fetchSiteKey();
      trackStep("booking_form_open", { propertyName });
    }
  }, [isOpen]);

  // Reset captcha when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCaptchaToken(null);
      setSubmitted(null);
    }
  }, [isOpen]);

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const countries = language === 'en' ? countriesEn : countriesRo;

  const bookingSchema = z.object({
    name: z.string().min(2, language === 'en' ? "Name must have at least 2 characters" : "Numele trebuie să aibă minim 2 caractere").max(100),
    phone: z.string().min(10, language === 'en' ? "Invalid phone number" : "Număr de telefon invalid").max(20),
    email: z.string().email(language === 'en' ? "Invalid email" : "Email invalid").max(255),
    checkIn: z.string().min(1, language === 'en' ? "Select check-in date" : "Selectează data de check-in"),
    checkOut: z.string().min(1, language === 'en' ? "Select check-out date" : "Selectează data de check-out"),
    guests: z.string().min(1, language === 'en' ? "Select number of guests" : "Selectează numărul de oaspeți"),
    country: z.string().min(1, language === 'en' ? "Select country of origin" : "Selectează țara de proveniență"),
    message: z.string().max(500).optional(),
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) return;
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-discount-code', {
        body: { code: discountCode.trim().toUpperCase() }
      });
      if (error || !data?.valid) {
        setDiscountInfo(null);
        toast({
          title: language === 'en' ? "Invalid code" : "Cod invalid",
          description: language === 'en' ? "This discount code is not valid or has expired." : "Acest cod de discount nu este valid sau a expirat.",
          variant: "destructive",
        });
      } else {
        setDiscountInfo(data);
        toast({
          title: language === 'en' ? "Code applied!" : "Cod aplicat!",
          description: `${data.discount_value}${data.discount_type === 'percentage' ? '%' : '€'} ${language === 'en' ? 'discount' : 'reducere'}`,
        });
      }
    } catch {
      setDiscountInfo(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const validateForm = () => {
    try {
      bookingSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const nights = (() => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const diff = new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime();
    return diff > 0 ? Math.round(diff / 86400000) : 0;
  })();

  const estimatedTotal = (() => {
    if (!pricePerNight || nights <= 0) return undefined;
    const gross = pricePerNight * nights;
    if (!discountInfo?.valid) return gross;
    return discountInfo.discount_type === "percentage"
      ? Math.max(0, Math.round(gross * (1 - discountInfo.discount_value / 100)))
      : Math.max(0, Math.round(gross - discountInfo.discount_value));
  })();

  const propertyLabel = propertyName || (language === 'en' ? "Any available property" : "Orice proprietate disponibilă");

  const engineUrl = (reference: string) => {
    const property = properties.find((p) => p.slug === propertySlug);
    if (!property || !isPynbookingUrl(property.bookingUrl)) return null;
    return buildPynbookingUrl(property.bookingUrl, {
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: Number(formData.guests) || undefined,
      reference,
    });
  };

  const whatsappUrl = (reference: string) => {
    const lines = language === 'en'
      ? [`Booking request ${reference}`, `Property: ${propertyLabel}`, `${formData.checkIn} → ${formData.checkOut} (${nights} nights)`, `Guests: ${formData.guests}`, `Name: ${formData.name}`]
      : [`Cerere de rezervare ${reference}`, `Proprietate: ${propertyLabel}`, `${formData.checkIn} → ${formData.checkOut} (${nights} nopți)`, `Oaspeți: ${formData.guests}`, `Nume: ${formData.name}`];
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — silently "succeed" if filled (bot trap)
    if (honeypot) {
      toast({ title: t.booking.success, description: t.booking.successMessage });
      onClose();
      return;
    }

    if (!validateForm()) {
      toast({
        title: t.booking.error,
        description: t.booking.errorMessage,
        variant: "destructive",
      });
      return;
    }

    if (!consent) {
      toast({
        title: language === 'en' ? "Consent required" : "Consimțământ necesar",
        description: language === 'en'
          ? "Please accept the processing of your data so we can contact you."
          : "Acceptă prelucrarea datelor pentru a te putea contacta.",
        variant: "destructive",
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: language === 'en' ? "Verification required" : "Verificare necesară",
        description: language === 'en' ? "Please complete the captcha verification" : "Vă rugăm să completați verificarea captcha",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-booking-request', {
        headers: { 'x-idempotency-key': `booking-${formData.email}-${formData.checkIn}-${formData.checkOut}-${propertySlug || propertyLabel}` },
        body: {
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone,
          country: formData.country,
          guests: formData.guests,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          message: formData.message || undefined,
          propertyName: propertyLabel,
          propertySlug,
          propertyRefId,
          estimatedTotal,
          discountCode: discountInfo?.valid ? discountCode.trim().toUpperCase() : undefined,
          source: propertySlug ? 'property_detail' : 'booking_dialog',
          utm: readUtm(),
          captchaToken,
        },
      });

      if (error || !data?.success) {
        const details = error instanceof FunctionsHttpError
          ? ((await error.context.json().catch(() => null))?.error as string | undefined)
          : undefined;
        throw new Error(details || (data as { error?: string } | null)?.error || 'submit failed');
      }

      trackStep("booking_form_submit", { propertyName, discountCode: discountInfo ? discountCode : undefined });

      setSubmitted({ reference: data.reference as string, emailSent: data.emailSent === true });
      toast({
        title: t.booking.success,
        description: language === 'en'
          ? `Request ${data.reference} saved. We will confirm availability shortly.`
          : `Cererea ${data.reference} a fost înregistrată. Confirmăm disponibilitatea în cel mai scurt timp.`,
      });

      setFormData({ name: "", phone: "", email: "", checkIn: "", checkOut: "", guests: "", country: "", message: "" });
      setConsent(false);
      setDiscountCode("");
      setDiscountInfo(null);
    } catch (err) {
      console.error("Booking request failed:", err);
      toast({
        title: t.booking.error,
        description: err instanceof Error && err.message !== 'submit failed'
          ? err.message
          : (language === 'en' ? "We could not send your request. Please try again." : "Nu am putut trimite cererea. Te rugăm să încerci din nou."),
        variant: "destructive",
      });
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            {t.booking.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {propertyName ? (
              <>{t.booking.subtitleWithProperty} <span className="text-primary font-medium">{propertyName}</span></>
            ) : (
              t.booking.subtitle
            )}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="mt-4 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckIcon className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">
                {language === 'en' ? 'Request received' : 'Cerere înregistrată'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'en'
                  ? 'We saved your request and will confirm availability by email or phone.'
                  : 'Am salvat cererea și confirmăm disponibilitatea pe e-mail sau telefon.'}
              </p>
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">{language === 'en' ? 'Reference' : 'Referință'}: </span>
              <span className="font-mono font-semibold text-foreground">{submitted.reference}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {submitted.emailSent
                ? (language === 'en'
                    ? 'A confirmation email is on its way to you.'
                    : 'Ți-am trimis un e-mail de confirmare.')
                : (language === 'en'
                    ? 'The confirmation email is delayed, but our team already received your request.'
                    : 'E-mailul de confirmare întârzie, dar echipa a primit deja cererea.')}
            </p>
            {engineUrl(submitted.reference) && (
              <Button asChild className="w-full">
                <a href={engineUrl(submitted.reference)!} target="_blank" rel="noopener noreferrer">
                  {language === 'en' ? 'Confirm now in the booking system' : 'Confirmă acum în sistemul de rezervări'}
                </a>
              </Button>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="flex-1">
                <a href={whatsappUrl(submitted.reference)} target="_blank" rel="noopener noreferrer">
                  {language === 'en' ? 'Continue on WhatsApp' : 'Continuă pe WhatsApp'}
                </a>
              </Button>
              <Button className="flex-1" onClick={onClose}>
                {language === 'en' ? 'Close' : 'Închide'}
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Honeypot field — hidden from real users, traps bots */}
          <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
            <label htmlFor="booking_website">Website</label>
            <input
              id="booking_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {t.booking.name} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={language === 'en' ? "John Smith" : "Ion Popescu"}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {t.booking.phone} *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+40 7XX XXX XXX"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                {t.booking.email} *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          {/* Check-in & Check-out */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn" className="text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {t.booking.checkIn} *
              </Label>
              <Input
                id="checkIn"
                type="date"
                min={today}
                value={formData.checkIn}
                onChange={(e) => handleChange("checkIn", e.target.value)}
                className={errors.checkIn ? "border-destructive" : ""}
              />
              {errors.checkIn && <p className="text-xs text-destructive">{errors.checkIn}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut" className="text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {t.booking.checkOut} *
              </Label>
              <Input
                id="checkOut"
                type="date"
                min={formData.checkIn || today}
                value={formData.checkOut}
                onChange={(e) => handleChange("checkOut", e.target.value)}
                className={errors.checkOut ? "border-destructive" : ""}
              />
              {errors.checkOut && <p className="text-xs text-destructive">{errors.checkOut}</p>}
            </div>
          </div>

          {/* Guests & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {t.booking.guests} *
              </Label>
              <Select value={formData.guests} onValueChange={(value) => handleChange("guests", value)}>
                <SelectTrigger className={errors.guests ? "border-destructive" : ""}>
                  <SelectValue placeholder={t.booking.selectGuests} />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? t.booking.guest : t.booking.guestsLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.guests && <p className="text-xs text-destructive">{errors.guests}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                {t.booking.country} *
              </Label>
              <Select value={formData.country} onValueChange={(value) => handleChange("country", value)}>
                <SelectTrigger className={errors.country ? "border-destructive" : ""}>
                  <SelectValue placeholder={t.booking.selectCountry} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              {t.booking.message}
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder={t.booking.messagePlaceholder}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Discount Code */}
          <div className="space-y-2">
            <Label htmlFor="discountCode" className="text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              {language === 'en' ? 'Discount Code' : 'Cod de Reducere'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="discountCode"
                value={discountCode}
                onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountInfo(null); }}
                placeholder={language === 'en' ? "e.g. DIRECT5" : "ex. DIRECT5"}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={validateDiscountCode}
                disabled={!discountCode.trim() || isValidatingCode}
                className="shrink-0"
              >
                {isValidatingCode ? "..." : language === 'en' ? 'Apply' : 'Aplică'}
              </Button>
            </div>
            {discountInfo && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckIcon className="w-4 h-4" />
                <span>
                  {discountInfo.discount_value}{discountInfo.discount_type === 'percentage' ? '%' : '€'} {language === 'en' ? 'discount applied' : 'reducere aplicată'}
                </span>
                <button type="button" onClick={() => { setDiscountCode(""); setDiscountInfo(null); }} className="ml-auto">
                  <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* GDPR consent */}
          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <Checkbox
              id="booking-consent"
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              className="mt-0.5"
              aria-label={language === 'en' ? 'Accept data processing' : 'Accept prelucrarea datelor'}
            />
            <Label htmlFor="booking-consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
              {language === 'en' ? (
                <>I agree that RealTrust may store and use my contact details to confirm this booking request, as described in the{' '}
                  <Link to="/politica-confidentialitate" className="text-primary underline">privacy policy</Link>.</>
              ) : (
                <>Sunt de acord ca RealTrust să păstreze și să folosească datele mele de contact pentru confirmarea acestei cereri de rezervare, conform{' '}
                  <Link to="/politica-confidentialitate" className="text-primary underline">politicii de confidențialitate</Link>.</>
              )}
            </Label>
          </div>

          {/* Turnstile widget */}
          <div className="flex flex-col items-center gap-2 pt-2">
            {turnstileSiteKey ? (
              <>
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  options={{ theme: "dark" }}
                />
                {captchaToken && (
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === "ro" ? "Verificat" : "Verified"}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="animate-pulse text-muted-foreground text-sm">
                  {language === "ro" ? "Se încarcă verificarea..." : "Loading verification..."}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t.booking.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !captchaToken || !turnstileSiteKey}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                t.booking.sending
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t.booking.submit}
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;