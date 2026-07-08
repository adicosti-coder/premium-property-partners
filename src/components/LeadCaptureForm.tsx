import { useState, useRef, useEffect, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, CheckCircle, Link, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { z } from "zod";
import ConfettiEffect from "./ConfettiEffect";
//import { isValidInternationalPhone } from "@/utils/phoneCountryDetector";
import { isValidInternationalPhone } from "@/utils/phoneCountryDetector";
import PhoneInputWithCountry from "./PhoneInputWithCountry";
import { Turnstile } from "@marsidev/react-turnstile";
import { withProvenientaTracking } from "@/lib/investmentReferralTracking";
import { trackConversion } from "@/lib/conversionTracking";

const listingUrlSchema = z.string().trim().url().max(500).optional().or(z.literal(""));

interface LeadCaptureFormProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedNetProfit: number;
  calculatedYearlyProfit: number;
  simulationData: {
    adr: number;
    occupancy: number;
    cleaningCost: number;
    managementFee: number;
    platformFee: number;
    avgStayDuration: number;
  };
}

const propertyTypeKeys = ["apartament", "casa", "studio", "penthouse", "vila"] as const;

// Top Timișoara zones offered as picks in the ROI calculator lead form.
const TIMISOARA_ZONES = [
  "Cetate / Centru",
  "Iosefin",
  "Fabric",
  "Elisabetin",
  "Dumbrăvița",
  "Aradului",
  "Lipovei",
  "Circumvalațiunii",
  "Girocului",
  "Șagului",
  "Complex Studențesc",
  "Take Ionescu",
  "Torontalului",
  "ISHO",
  "City of Mara",
  "Altă zonă din Timișoara",
] as const;

const LeadCaptureForm = forwardRef<HTMLDivElement, LeadCaptureFormProps>(({
  isOpen,
  onClose,
  calculatedNetProfit,
  calculatedYearlyProfit,
  simulationData,
}, ref) => {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [propertyArea, setPropertyArea] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [zone, setZone] = useState("");
  const [zoneError, setZoneError] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [listingUrlError, setListingUrlError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Honeypot field for bot detection
  const [honeypot, setHoneypot] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Turnstile state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
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
    }
  }, [isOpen]);

  // Reset captcha when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCaptchaToken(null);
    }
  }, [isOpen]);

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const verifyCaptchaOnServer = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-turnstile', {
        body: { token, formType: 'lead_capture_form' }
      });
      if (error) throw error;
      return data.success === true;
    } catch (error) {
      console.error("Captcha verification error:", error);
      return false;
    }
  };

  const handlePhoneChange = (value: string) => {
    setWhatsappNumber(value);
    if (phoneError) setPhoneError("");
  };

  const handleListingUrlChange = (value: string) => {
    setListingUrl(value);
    if (listingUrlError) setListingUrlError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check — silently "succeed" if filled (bot trap)
    if (honeypot) {
      setIsSuccess(true);
      return;
    }

    setPhoneError("");
    setListingUrlError("");
    setZoneError("");
    setSubmitError("");

    if (!name.trim() || !whatsappNumber.trim() || !propertyArea || !propertyType) {
      toast({
        title: t.leadForm.fillAllFields,
        description: t.leadForm.fillAllFieldsMessage,
        variant: "destructive",
      });
      return;
    }

    // Strict RO phone validation (accepts +40 / 0040 / 0-prefix, mobile & landline, 9 digits after country code)
    const rawPhone = whatsappNumber.trim();
    const digits = rawPhone.replace(/[^\d]/g, "");
    const isRoMobile =
      /^(?:\+?40|0040|0)?7\d{8}$/.test(digits) || // mobile starts with 7
      /^(?:\+?40|0040|0)?[23]\d{8}$/.test(digits); // landline 2/3 prefix
    if (!isValidInternationalPhone(rawPhone) || !isRoMobile) {
      setPhoneError(
        language === 'ro'
          ? "Introdu un număr valid de România (ex: 0722 123 456)."
          : "Enter a valid Romanian number (e.g. +40 722 123 456)."
      );
      toast({
        title: language === 'ro' ? "Număr invalid" : "Invalid number",
        description: language === 'ro'
          ? "Verifică formatul: acceptăm doar numere din România."
          : "Please check the format — Romanian numbers only.",
        variant: "destructive",
      });
      return;
    }

    // Zone required — needed for dedup_key (phone:zone:area) in the pipeline
    if (!zone.trim()) {
      setZoneError(
        language === 'ro'
          ? "Selectează zona din Timișoara pentru o estimare corectă."
          : "Select the Timișoara zone for an accurate estimate."
      );
      toast({
        title: language === 'ro' ? "Zonă obligatorie" : "Zone required",
        description: language === 'ro'
          ? "Alege zona proprietății din Timișoara."
          : "Choose the Timișoara zone of the property.",
        variant: "destructive",
      });
      return;
    }

    // Validate listing URL if provided
    if (listingUrl.trim()) {
      const urlValidation = listingUrlSchema.safeParse(listingUrl.trim());
      if (!urlValidation.success) {
        setListingUrlError(t.leadForm.invalidUrl || "Link invalid");
        toast({
          title: t.leadForm.invalidUrl || "Link invalid",
          description: t.leadForm.invalidUrlMessage || "Te rugăm să introduci un URL valid.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate listing URL if provided
    if (listingUrl.trim()) {
      const urlValidation = listingUrlSchema.safeParse(listingUrl.trim());
      if (!urlValidation.success) {
        setListingUrlError(t.leadForm.invalidUrl || "Link invalid");
        toast({
          title: t.leadForm.invalidUrl || "Link invalid",
          description: t.leadForm.invalidUrlMessage || "Te rugăm să introduci un URL valid.",
          variant: "destructive",
        });
        return;
      }
    }

    // Verify hCaptcha
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
      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: name.trim(),
          email: email.trim() || null,
          whatsapp_number: whatsappNumber.trim(),
          property_area: parseInt(propertyArea),
          property_type: propertyType,
          calculated_net_profit: calculatedNetProfit,
          calculated_yearly_profit: calculatedYearlyProfit,
          source: "lead_capture_form",
          zone: zone || undefined,
          simulation_data: withProvenientaTracking({
            ...simulationData,
            zone: zone || undefined,
            listingUrl: listingUrl.trim() || undefined,
          }),
          captcha_token: captchaToken,
        },
      });

      if (error) throw error;

      // leadId returned by the edge function (used for end-to-end funnel mapping
      // Calculator ROI → Pipeline Unificat).
      const leadId: string | undefined =
        (data && typeof data === "object" && "leadId" in data
          ? (data as { leadId?: string }).leadId
          : undefined);

      trackConversion({
        event: "roi_calculator_lead",
        source: "lead_capture_form",
        value: calculatedYearlyProfit,
        currency: "EUR",
      });

      // Custom conversion event for landing-page analytics/pixels
      try {
        window.dispatchEvent(
          new CustomEvent("realtrust:lead-submitted", {
            detail: {
              leadId,
              source: "lead_capture_form",
              zone,
              propertyType,
              propertyArea: parseInt(propertyArea) || 0,
              calculatedNetProfit,
              calculatedYearlyProfit,
              at: new Date().toISOString(),
            },
          })
        );
      } catch (evtErr) {
        console.warn("realtrust:lead-submitted dispatch failed:", evtErr);
      }


      setIsSuccess(true);
      toast({
        title: language === 'ro' ? "Datele au fost trimise!" : "Details sent!",
        description: language === 'ro'
          ? "Andrei, agentul nostru AI, sau un consultant RealTrust te va contacta pentru validare."
          : "Andrei, our AI agent, or a RealTrust consultant will contact you for validation.",
      });

      setTimeout(() => {
        setName("");
        setEmail("");
        setWhatsappNumber("");
        setPropertyArea("");
        setPropertyType("");
        setZone("");
        setListingUrl("");
        setIsSuccess(false);
        setCaptchaToken(null);
        onClose();
      }, 3200);
    } catch (error) {
      // NOTE: intentionally do NOT reset name/phone/zone/propertyArea/propertyType
      // on failure — user must be able to fix a single field (RO phone, zone) and retry
      // without re-typing everything. Fields are only cleared inside the success setTimeout.
      console.error("Error submitting lead:", error);
      const rawMsg = (error as Error)?.message || "";
      const friendly = language === 'ro'
        ? "Nu am putut trimite datele acum. Verifică numărul de telefon și zona, apoi încearcă din nou — sau scrie-ne direct pe WhatsApp la 0799 069 256."
        : "We couldn't send your details. Check the phone number and zone, then try again — or message us directly on WhatsApp at +40 799 069 256.";
      setSubmitError(friendly);
      toast({
        title: language === 'ro' ? "Trimiterea a eșuat" : "Submission failed",
        description: rawMsg ? `${friendly}` : friendly,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <FileText className="w-5 h-5 text-primary" />
            {t.leadForm.title}
          </DialogTitle>
          <DialogDescription>
            {t.leadForm.description}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <>
            <ConfettiEffect isActive={isSuccess} duration={3000} particleCount={40} />
            <div
              className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-500"
              role="status"
              aria-live="polite"
            >
              <div className="relative mb-4">
                <span className="absolute inset-0 rounded-full bg-emerald-400/30 blur-2xl animate-pulse" aria-hidden="true" />
                <CheckCircle className="relative w-16 h-16 text-emerald-500 animate-success-bounce" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {language === 'ro' ? "Datele au fost trimise!" : "Details sent!"}
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {language === 'ro'
                  ? "Andrei, agentul nostru AI, sau un consultant RealTrust te va contacta în cel mai scurt timp pentru validare."
                  : "Andrei, our AI agent, or a RealTrust consultant will contact you shortly for validation."}
              </p>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot field — hidden from real users, traps bots */}
            <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
              <label htmlFor="lead_website">Website</label>
              <input
                id="lead_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t.leadForm.name}</Label>
              <Input
                id="name"
                placeholder={t.leadForm.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.leadForm.email || "Email"}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.leadForm.emailPlaceholder || "exemplu@email.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">{t.leadForm.whatsapp}</Label>
              <PhoneInputWithCountry
                id="whatsapp"
                value={whatsappNumber}
                onChange={handlePhoneChange}
                placeholder={t.leadForm.whatsappPlaceholder}
                error={phoneError}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">{t.leadForm.propertyArea}</Label>
              <Input
                id="area"
                type="number"
                placeholder={t.leadForm.propertyAreaPlaceholder}
                value={propertyArea}
                onChange={(e) => setPropertyArea(e.target.value)}
                required
                min={10}
                max={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t.leadForm.propertyType}</Label>
              <Select value={propertyType} onValueChange={setPropertyType} required>
                <SelectTrigger>
                  <SelectValue placeholder={t.leadForm.selectType} />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypeKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.leadForm.propertyTypes[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone">
                {language === 'ro' ? 'Zona din Timișoara' : 'Timișoara zone'}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select
                value={zone}
                onValueChange={(v) => {
                  setZone(v);
                  if (zoneError) setZoneError("");
                }}
              >
                <SelectTrigger id="zone" className={zoneError ? "border-destructive" : ""}>
                  <SelectValue placeholder={language === 'ro' ? 'Alege zona proprietății' : 'Choose the property zone'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIMISOARA_ZONES.map((z) => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {zoneError && <p className="text-sm text-destructive">{zoneError}</p>}
            </div>


            <div className="space-y-2">
              <Label htmlFor="listingUrl" className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                {t.leadForm.listingUrl}
              </Label>
              <Input
                id="listingUrl"
                type="url"
                placeholder={t.leadForm.listingUrlPlaceholder}
                value={listingUrl}
                onChange={(e) => handleListingUrlChange(e.target.value)}
                maxLength={500}
                className={listingUrlError ? "border-destructive" : ""}
              />
              {listingUrlError && (
                <p className="text-sm text-destructive">{listingUrlError}</p>
              )}
            </div>

            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {t.leadForm.estimatedProfit}{" "}
                <span className="text-primary font-semibold">
                  {calculatedNetProfit.toLocaleString()} €/lună
                </span>
              </p>
            </div>

            {/* Turnstile widget */}
            <div className="flex flex-col items-center gap-2">
              {turnstileSiteKey ? (
                <>
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    onError={handleCaptchaExpire}
                    options={{ theme: "auto" }}
                  />
                  {captchaToken && (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{language === "ro" ? "Verificat" : "Verified"}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-pulse text-muted-foreground text-sm">
                    {language === "ro" ? "Se încarcă verificarea..." : "Loading verification..."}
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p className="font-medium mb-1">
                  {language === 'ro' ? 'Trimiterea a eșuat' : 'Submission failed'}
                </p>
                <p className="text-destructive/90">{submitError}</p>
                <a
                  href="https://wa.me/40799069256"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-primary underline underline-offset-2 hover:no-underline"
                >
                  {language === 'ro' ? 'Deschide WhatsApp →' : 'Open WhatsApp →'}
                </a>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || !captchaToken || !turnstileSiteKey}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isVerifyingCaptcha 
                    ? (language === 'en' ? "Verifying..." : "Se verifică...")
                    : t.leadForm.sending}
                </>
              ) : (
                t.leadForm.submit
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
});

LeadCaptureForm.displayName = "LeadCaptureForm";

export default LeadCaptureForm;
