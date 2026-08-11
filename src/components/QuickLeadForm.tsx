import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, CheckCircle, Home, User, Link, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { z } from "zod";
import ConfettiEffect from "./ConfettiEffect";
import { isValidInternationalPhone } from "@/utils/phoneCountryDetector";
import PhoneInputWithCountry from "./PhoneInputWithCountry";
import { Turnstile } from "@marsidev/react-turnstile";
import { withProvenientaTracking } from "@/lib/investmentReferralTracking";
import { withCampaignTracking, campaignSourceSuffix, getCtaVariant } from "@/lib/campaignAttribution";
import { trackConversion } from "@/lib/conversionTracking";
import { clearIdempotencyKey, idempotencyHeaders } from "@/lib/idempotency";

/** Scope used for the per-attempt idempotency key (sessionStorage + request header). */
const IDEMPOTENCY_SCOPE = "quick_lead_form";
/** Ignore repeated submit events fired within this window (rapid double-click). */
const SUBMIT_DEBOUNCE_MS = 1200;


const propertyTypeKeys = ["apartament", "casa", "studio", "penthouse", "vila"] as const;
const listingUrlSchema = z.string().trim().url("Link invalid").max(500).optional().or(z.literal(""));

const QuickLeadForm = () => {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [listingUrlError, setListingUrlError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const [typeError, setTypeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Turnstile state - invisible mode
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [securityReady, setSecurityReady] = useState(false);
  const pendingSubmitRef = useRef(false);
  const failOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Synchronous lock: state updates are async, so a double-click can slip past `isSubmitting`. */
  const inFlightRef = useRef(false);
  const lastSubmitAtRef = useRef(0);


  // Store form data for submission after captcha
  const formDataRef = useRef<{
    name: string;
    phone: string;
    propertyType: string;
    listingUrl: string;
  } | null>(null);

  const activateSecurity = useCallback(() => {
    setSecurityReady(true);
  }, []);

  // Clear the fail-open timer if the user leaves mid-submission
  useEffect(() => () => {
    if (failOpenTimerRef.current) clearTimeout(failOpenTimerRef.current);
  }, []);

  useEffect(() => {
    if (!securityReady || turnstileSiteKey) return;

    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-turnstile-site-key');
        if (error) throw error;
        setTurnstileSiteKey(data.siteKey);
      } catch (error) {
        console.error("Failed to fetch Turnstile site key:", error);
      }
    };

    fetchSiteKey();
  }, [securityReady, turnstileSiteKey]);

  const verifyCaptchaOnServer = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-turnstile', {
        body: { token, formType: 'quick_lead_form' }
      });
      if (error) throw error;
      return data.success === true;
    } catch (error) {
      console.error("Captcha verification error:", error);
      return false;
    }
  };

  // Submit the form after captcha verification
  const submitForm = useCallback(async (token: string) => {
    const formData = formDataRef.current;

    if (!formData) {
      setIsSubmitting(false);
      return;
    }
    // Second layer of protection: only one network call per attempt.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const { error } = await supabase.functions.invoke("submit-lead", {
        headers: idempotencyHeaders(IDEMPOTENCY_SCOPE),
        body: {
          name: formData.name,
          whatsapp_number: formData.phone,
          property_area: 50,
          property_type: formData.propertyType,
          source: ["quick_form", campaignSourceSuffix()].filter(Boolean).join(":"),
          simulation_data: withCampaignTracking(
            withProvenientaTracking(
              formData.listingUrl ? { listingUrl: formData.listingUrl } : null,
            ),
          ),
          captcha_token: token,
        },
      });

      if (error) throw error;

      // Attempt completed → the next submission is a genuinely new one.
      clearIdempotencyKey(IDEMPOTENCY_SCOPE);

      trackConversion({
        event: "Lead_Submit",
        source: "quick_form_homepage",
        // Hashed server-side for Meta advanced matching; never stored raw.
        name: formData.name,
        phone: formData.phone,
        cta_variant: getCtaVariant(),
      });


      setIsSuccess(true);
      toast({
        title: t.quickLeadForm?.successToast || "Mulțumim!",
        description: t.quickLeadForm?.successToastMessage || "Te vom contacta în curând.",
      });

      setTimeout(() => {
        setName("");

        setPhone("");
        setPropertyType("");
        setListingUrl("");
        setIsSuccess(false);
        formDataRef.current = null;
      }, 3000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: t.quickLeadForm?.error || "Eroare",
        description: t.quickLeadForm?.errorMessage || "A apărut o eroare. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      if (failOpenTimerRef.current) {
        clearTimeout(failOpenTimerRef.current);
        failOpenTimerRef.current = null;
      }
      setIsSubmitting(false);
      setIsVerifying(false);
      pendingSubmitRef.current = false;
      inFlightRef.current = false;
      setTurnstileToken(null);

    }
  }, [language, t.quickLeadForm]);

  // Handle Turnstile success
  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    if (pendingSubmitRef.current) {
      submitForm(token);
    }
  }, [submitForm]);

  const handleTurnstileError = useCallback(() => {
    // Silently skip - Turnstile may fail on preview/dev domains
    // Allow form submission without captcha in this case
    console.warn('Turnstile verification failed - allowing submission without captcha');
    setTurnstileToken('bypass');
    if (pendingSubmitRef.current) {
      submitForm('bypass');
    }
  }, [submitForm]);

  const handleListingUrlChange = (value: string) => {
    setListingUrl(value);
    if (listingUrlError) setListingUrlError("");
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (phoneError) setPhoneError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Idempotency layer 1 — client lock + debounce. A rapid double-click fires
    // two submit events before React re-renders the disabled button, so the
    // synchronous refs are what actually stop the second one.
    const now = Date.now();
    if (isSubmitting || inFlightRef.current || pendingSubmitRef.current) return;
    if (now - lastSubmitAtRef.current < SUBMIT_DEBOUNCE_MS) return;
    lastSubmitAtRef.current = now;

    setListingUrlError("");
    setPhoneError("");
    setNameError("");
    setTypeError("");


    // Inline field validation (no blocking toasts — the user sees exactly
    // which field needs attention, which measurably reduces abandonment)
    let hasError = false;
    if (!name.trim()) {
      setNameError(language === "en" ? "Your name is required" : "Numele este obligatoriu");
      hasError = true;
    }
    if (!phone.trim()) {
      setPhoneError(language === "en" ? "Phone number is required" : "Numărul de telefon este obligatoriu");
      hasError = true;
    } else if (!isValidInternationalPhone(phone)) {
      setPhoneError(t.quickLeadForm?.invalidPhone || "Număr invalid");
      hasError = true;
    }
    if (!propertyType) {
      setTypeError(language === "en" ? "Select a property type" : "Alege tipul proprietății");
      hasError = true;
    }
    if (listingUrl.trim()) {
      const urlValidation = listingUrlSchema.safeParse(listingUrl.trim());
      if (!urlValidation.success) {
        setListingUrlError(t.quickLeadForm?.invalidUrl || "Link invalid");
        hasError = true;
      }
    }
    if (hasError) {
      // Validation errors aren't an attempt — don't hold the debounce window.
      lastSubmitAtRef.current = 0;
      return;
    }


    formDataRef.current = {
      name: name.trim(),
      phone: phone.trim(),
      propertyType,
      listingUrl: listingUrl.trim(),
    };

    // Already verified → send immediately
    if (turnstileToken) {
      setIsSubmitting(true);
      pendingSubmitRef.current = true;
      submitForm(turnstileToken);
      return;
    }

    // Not verified yet: queue the submission instead of rejecting the user.
    // The Turnstile success/error callbacks auto-send as soon as the check
    // resolves, and we fail open after a short wait so a slow/blocked
    // captcha never costs us a lead.
    activateSecurity();
    setIsSubmitting(true);
    setIsVerifying(true);
    pendingSubmitRef.current = true;

    if (failOpenTimerRef.current) clearTimeout(failOpenTimerRef.current);
    failOpenTimerRef.current = setTimeout(() => {
      if (pendingSubmitRef.current) submitForm("bypass");
    }, 6000);
  };


  if (isSuccess) {
    return (
      <section className="py-12 bg-gradient-to-b from-background to-card relative overflow-hidden">
        <ConfettiEffect isActive={isSuccess} duration={4000} particleCount={60} />
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex flex-col items-center justify-center py-8 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-success-bounce">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-serif font-semibold text-foreground mb-2">
                {t.quickLeadForm?.success || "Cerere trimisă cu succes!"}
              </h3>
              <p className="text-muted-foreground">
                {t.quickLeadForm?.successMessage || "Te vom contacta în cel mai scurt timp pentru o evaluare gratuită."}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-b from-background to-card relative overflow-hidden">
      {/* Background decorations - hidden on mobile to prevent edge shadows */}
      <div className="absolute top-0 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl hidden md:block" />
      <div className="absolute bottom-0 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl hidden md:block" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Home className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-semibold">
                {t.quickLeadForm?.badge || "Proprietari"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-2">
              {t.quickLeadForm?.title || "Solicită o Evaluare Gratuită"}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t.quickLeadForm?.subtitle || "Află în 24 de ore cât poți câștiga din închirierea apartamentului tău."}
            </p>
          </div>
          
          {/* Inline Form */}
          <form onSubmit={handleSubmit} onFocusCapture={activateSecurity} onPointerDownCapture={activateSecurity} className="relative">
            <div className="flex flex-col md:flex-row gap-3 md:gap-3 p-3 md:p-2 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
              {/* Name Input */}
              <div className="relative flex-1">
                <label htmlFor="ql-name" className="sr-only">
                  {t.quickLeadForm?.namePlaceholder || "Numele tău"}
                </label>
                <User className="absolute left-3 top-6 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="ql-name"
                  autoComplete="name"
                  placeholder={t.quickLeadForm?.namePlaceholder || "Numele tău"}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "ql-name-error" : undefined}
                  className={`pl-10 h-12 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary ${nameError ? "ring-1 ring-destructive" : ""}`}
                  maxLength={100}
                />
                {nameError && (
                  <p id="ql-name-error" className="mt-1 text-xs text-destructive">{nameError}</p>
                )}
              </div>
              
              {/* Phone Input */}
              <div className="flex-1 min-w-[200px]">
                <PhoneInputWithCountry
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={t.quickLeadForm?.phonePlaceholder || "+40 7XX XXX XXX"}
                  error={phoneError}
                  inputClassName="h-12 bg-background/50 border-0"
                  autoDetectLocation={false}
                />
              </div>
              
              {/* Property Type Select */}
              <div className="flex-1 md:max-w-[180px]">
                <Select
                  value={propertyType}
                  onValueChange={(value) => {
                    setPropertyType(value);
                    if (typeError) setTypeError("");
                  }}
                >
                  <SelectTrigger
                    className={`h-12 bg-background/50 border-0 focus:ring-1 focus:ring-primary ${typeError ? "ring-1 ring-destructive" : ""}`}
                    aria-label={language === 'ro' ? 'Tip proprietate' : 'Property type'}
                    aria-invalid={!!typeError}
                  >
                    <Home className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder={t.quickLeadForm?.typePlaceholder || "Tip proprietate"} />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypeKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t.leadForm?.propertyTypes?.[key] || key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {typeError && <p className="mt-1 text-xs text-destructive">{typeError}</p>}
              </div>
              
              {/* Listing URL Input */}
              <div className="relative flex-1 md:max-w-[220px]">
                <label htmlFor="ql-listing" className="sr-only">
                  {t.quickLeadForm?.listingUrlPlaceholder || "Link anunț (opțional)"}
                </label>
                <Link className="absolute left-3 top-6 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="ql-listing"
                  type="url"
                  inputMode="url"
                  placeholder={t.quickLeadForm?.listingUrlPlaceholder || "Link anunț (opțional)"}
                  value={listingUrl}
                  onChange={(e) => handleListingUrlChange(e.target.value)}
                  aria-invalid={!!listingUrlError}
                  aria-describedby={listingUrlError ? "ql-listing-error" : undefined}
                  className={`pl-10 h-12 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary ${listingUrlError ? "ring-1 ring-destructive" : ""}`}
                  maxLength={500}
                />
                {listingUrlError && (
                  <p id="ql-listing-error" className="mt-1 text-xs text-destructive">{listingUrlError}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="lg"
                className="h-12 px-6 md:px-8 font-semibold"
                 disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isVerifying
                      ? (language === "en" ? "Verifying..." : "Se verifică...")
                      : (t.quickLeadForm?.sending || "Se trimite...")}
                  </>
                ) : (
                  <>
                    {t.quickLeadForm?.submit || (language === "en" ? "Get my free estimate" : "Vreau estimarea gratuită")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
            
            {/* Turnstile - visible widget */}
            {turnstileSiteKey && (
              <div className="flex justify-center mt-2">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={handleTurnstileSuccess}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileError}
                  options={{ theme: "auto", size: "compact" }}
                />
              </div>
            )}
            
            {/* Conversion reassurance — reduces hesitation right at the submit button */}
            <FormTrustBadges privacyText={t.quickLeadForm?.trustText} />


          </form>
        </div>
      </div>
    </section>
  );
};

export default QuickLeadForm;
