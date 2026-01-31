import { useState, useRef, useEffect, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, CheckCircle, Link, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { z } from "zod";
import ConfettiEffect from "./ConfettiEffect";
//import { isValidInternationalPhone } from "@/utils/phoneCountryDetector";
import PhoneInputWithCountry from "./PhoneInputWithCountry";
import HCaptcha from "@hcaptcha/react-hcaptcha";

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

const LeadCaptureForm = forwardRef<HTMLDivElement, LeadCaptureFormProps>(({
  isOpen,
  onClose,
  calculatedNetProfit,
  calculatedYearlyProfit,
  simulationData,
}, ref) => {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [propertyArea, setPropertyArea] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [listingUrlError, setListingUrlError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // hCaptcha state
  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [hcaptchaSiteKey, setHcaptchaSiteKey] = useState<string | null>(null);

  // Fetch hCaptcha site key
  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-hcaptcha-site-key');
        if (error) throw error;
        setHcaptchaSiteKey(data.siteKey);
      } catch (error) {
        console.error("Failed to fetch hCaptcha site key:", error);
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
      captchaRef.current?.resetCaptcha();
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
      const { data, error } = await supabase.functions.invoke('verify-hcaptcha', {
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
    setPhoneError("");
    setListingUrlError("");
    
    if (!name.trim() || !whatsappNumber.trim() || !propertyArea || !propertyType) {
      toast({
        title: t.leadForm.fillAllFields,
        description: t.leadForm.fillAllFieldsMessage,
        variant: "destructive",
      });
      return;
    }

    // Validate phone number internationally
    if (!isValidInternationalPhone(whatsappNumber)) {
      setPhoneError(t.leadForm.invalidPhone || "Număr de telefon invalid");
      toast({
        title: t.leadForm.invalidPhone || "Număr invalid",
        description: t.leadForm.invalidPhoneMessage || "Verifică formatul numărului de telefon",
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
    setIsVerifyingCaptcha(true);

    // Server-side captcha verification
    const isCaptchaValid = await verifyCaptchaOnServer(captchaToken);
    setIsVerifyingCaptcha(false);

    if (!isCaptchaValid) {
      toast({
        title: language === 'en' ? "Verification failed" : "Verificare eșuată",
        description: language === 'en' ? "Captcha verification failed. Please try again." : "Verificarea captcha a eșuat. Încercați din nou.",
        variant: "destructive",
      });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        whatsapp_number: whatsappNumber.trim(),
        property_area: parseInt(propertyArea),
        property_type: propertyType,
        calculated_net_profit: calculatedNetProfit,
        calculated_yearly_profit: calculatedYearlyProfit,
        simulation_data: {
          ...simulationData,
          listingUrl: listingUrl.trim() || undefined,
        },
      });

      if (error) throw error;

      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name: name.trim(),
            whatsappNumber: whatsappNumber.trim(),
            propertyArea: parseInt(propertyArea),
            propertyType: propertyType,
            listingUrl: listingUrl.trim() || undefined,
            calculatedNetProfit,
            calculatedYearlyProfit,
            simulationData,
          },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      setIsSuccess(true);
      toast({
        title: t.leadForm.successToast,
        description: t.leadForm.successToastMessage,
      });

      setTimeout(() => {
        setName("");
        setWhatsappNumber("");
        setPropertyArea("");
        setPropertyType("");
        setListingUrl("");
        setIsSuccess(false);
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: t.leadForm.error,
        description: t.leadForm.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-success-bounce" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.leadForm.success}</h3>
              <p className="text-muted-foreground">{t.leadForm.successMessage}</p>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* hCaptcha widget */}
            <div className="flex flex-col items-center gap-2">
              {hcaptchaSiteKey ? (
                <>
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={hcaptchaSiteKey}
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    languageOverride={language}
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

            <Button type="submit" className="w-full" disabled={isSubmitting || !captchaToken || !hcaptchaSiteKey}>
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
