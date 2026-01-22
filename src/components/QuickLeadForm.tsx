import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, CheckCircle, Home, Phone, User, Link, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { z } from "zod";
import ConfettiEffect from "./ConfettiEffect";
import { formatRomanianPhone, romanianPhoneRegex } from "@/utils/phoneFormatter";
import { detectCountryFromPhone, getDefaultCountry } from "@/utils/phoneCountryDetector";

const propertyTypeKeys = ["apartament", "casa", "studio", "penthouse", "vila"] as const;

const formSchema = z.object({
  name: z.string().trim().min(2, "Numele este prea scurt").max(100),
  phone: z.string().trim().regex(romanianPhoneRegex, "Număr de telefon invalid").max(20),
  propertyType: z.string().min(1, "Selectați tipul"),
  listingUrl: z.string().trim().url("Link invalid").max(500).optional().or(z.literal("")),
});

const QuickLeadForm = () => {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [listingUrlError, setListingUrlError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleListingUrlChange = (value: string) => {
    setListingUrl(value);
    if (listingUrlError) setListingUrlError("");
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatRomanianPhone(value);
    setPhone(formatted);
    if (phoneError) setPhoneError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setListingUrlError("");
    setPhoneError("");
    e.preventDefault();
    setListingUrlError("");

    const validation = formSchema.safeParse({ name, phone: phone.trim().replace(/\s+/g, " "), propertyType, listingUrl: listingUrl.trim() || undefined });
    if (!validation.success) {
      const urlError = validation.error.errors.find(e => e.path[0] === "listingUrl");
      const phoneErr = validation.error.errors.find(e => e.path[0] === "phone");
      if (urlError) {
        setListingUrlError(t.quickLeadForm?.invalidUrl || "Link invalid");
      }
      if (phoneErr) {
        setPhoneError(t.quickLeadForm?.invalidPhone || "Număr invalid");
      }
      toast({
        title: t.quickLeadForm?.fillAllFields || "Completează toate câmpurile",
        description: phoneErr 
          ? (t.quickLeadForm?.invalidPhoneMessage || "Format: +40 7XX XXX XXX sau 07XX XXX XXX")
          : (t.quickLeadForm?.fillAllFieldsMessage || "Te rugăm să completezi corect toate câmpurile."),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        whatsapp_number: phone.trim(),
        property_area: 50, // Default value
        property_type: propertyType,
        source: "quick_form",
        simulation_data: listingUrl.trim() ? { listingUrl: listingUrl.trim() } : null,
      });

      if (error) throw error;

      // Try to send notification
      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name: name.trim(),
            whatsappNumber: phone.trim(),
            propertyType: propertyType,
            listingUrl: listingUrl.trim() || undefined,
            source: "quick_form",
          },
        });
      } catch (emailError) {
        console.error("Failed to send notification:", emailError);
      }

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
      }, 3000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: t.quickLeadForm?.error || "Eroare",
        description: t.quickLeadForm?.errorMessage || "A apărut o eroare. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      
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
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex flex-col md:flex-row gap-3 p-3 md:p-2 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
              {/* Name Input */}
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.quickLeadForm?.namePlaceholder || "Numele tău"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  maxLength={100}
                />
              </div>
              
              {/* Phone Input */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg z-10">
                  {(detectCountryFromPhone(phone) || getDefaultCountry()).flag}
                </span>
                <Input
                  type="tel"
                  placeholder={t.quickLeadForm?.phonePlaceholder || "+40 7XX XXX XXX"}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`pl-10 pr-10 h-12 bg-background/50 border-0 focus-visible:ring-1 ${
                    phoneError 
                      ? "ring-1 ring-destructive focus-visible:ring-destructive" 
                      : phone && romanianPhoneRegex.test(phone)
                        ? "ring-1 ring-green-500 focus-visible:ring-green-500"
                        : "focus-visible:ring-primary"
                  }`}
                  maxLength={20}
                />
                {phone && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {romanianPhoneRegex.test(phone) ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
                <p className={`absolute -bottom-5 left-0 text-xs ${
                  phoneError 
                    ? "text-destructive" 
                    : phone && romanianPhoneRegex.test(phone)
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}>
                  {phoneError 
                    ? phoneError 
                    : phone && romanianPhoneRegex.test(phone)
                      ? `✓ ${(detectCountryFromPhone(phone) || getDefaultCountry())[language === 'en' ? 'nameEn' : 'name']}`
                      : (t.quickLeadForm?.phoneHint || "📞 +40 7XX (mobil) sau +40 2XX (fix)")}
                </p>
              </div>
              
              {/* Property Type Select */}
              <div className="flex-1 md:max-w-[180px]">
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="h-12 bg-background/50 border-0 focus:ring-1 focus:ring-primary">
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
              </div>
              
              {/* Listing URL Input */}
              <div className="relative flex-1 md:max-w-[220px]">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder={t.quickLeadForm?.listingUrlPlaceholder || "Link anunț (opțional)"}
                  value={listingUrl}
                  onChange={(e) => handleListingUrlChange(e.target.value)}
                  className={`pl-10 h-12 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary ${listingUrlError ? "ring-1 ring-destructive" : ""}`}
                  maxLength={500}
                />
                {listingUrlError && (
                  <p className="absolute -bottom-5 left-0 text-xs text-destructive">{listingUrlError}</p>
                )}
              </div>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg"
                className="h-12 px-6 md:px-8 font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.quickLeadForm?.sending || "Se trimite..."}
                  </>
                ) : (
                  <>
                    {t.quickLeadForm?.submit || "Trimite"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
            
            {/* Trust text */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              {t.quickLeadForm?.trustText || "🔒 Datele tale sunt în siguranță. Nu le partajăm cu terți."}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default QuickLeadForm;