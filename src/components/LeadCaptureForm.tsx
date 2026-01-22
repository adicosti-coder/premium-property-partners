import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, CheckCircle, Link, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { z } from "zod";
import ConfettiEffect from "./ConfettiEffect";
import { formatRomanianPhone, romanianPhoneRegex } from "@/utils/phoneFormatter";
import { detectCountryFromPhone, getDefaultCountry } from "@/utils/phoneCountryDetector";

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

const LeadCaptureForm = ({
  isOpen,
  onClose,
  calculatedNetProfit,
  calculatedYearlyProfit,
  simulationData,
}: LeadCaptureFormProps) => {
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

  const handlePhoneChange = (value: string) => {
    const formatted = formatRomanianPhone(value);
    setWhatsappNumber(formatted);
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

    // Validate Romanian phone number
    const cleanPhone = whatsappNumber.trim().replace(/\s+/g, " ");
    if (!romanianPhoneRegex.test(cleanPhone)) {
      setPhoneError(t.leadForm.invalidPhone || "Număr de telefon invalid");
      toast({
        title: t.leadForm.invalidPhone || "Număr invalid",
        description: t.leadForm.invalidPhoneMessage || "Formatul corect: +40 7XX XXX XXX sau 07XX XXX XXX",
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

    setIsSubmitting(true);

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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg z-10">
                  {(detectCountryFromPhone(whatsappNumber) || getDefaultCountry()).flag}
                </span>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder={t.leadForm.whatsappPlaceholder}
                  value={whatsappNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  required
                  maxLength={20}
                  className={`pl-10 pr-10 ${
                    phoneError 
                      ? "border-destructive focus-visible:ring-destructive" 
                      : whatsappNumber && romanianPhoneRegex.test(whatsappNumber)
                        ? "border-green-500 focus-visible:ring-green-500"
                        : ""
                  }`}
                />
                {whatsappNumber && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {romanianPhoneRegex.test(whatsappNumber) ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {phoneError ? (
                <p className="text-sm text-destructive">{phoneError}</p>
              ) : whatsappNumber && romanianPhoneRegex.test(whatsappNumber) ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  ✓ {(detectCountryFromPhone(whatsappNumber) || getDefaultCountry())[language === 'en' ? 'nameEn' : 'name']} - {language === 'en' ? 'Valid number' : 'Număr valid'}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {t.leadForm.phoneHint || "📞 Mobil: +40 7XX sau Fix: +40 2XX"}
                </p>
              )}
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.leadForm.sending}
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
};

export default LeadCaptureForm;