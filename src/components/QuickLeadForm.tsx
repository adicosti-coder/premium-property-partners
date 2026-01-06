import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, CheckCircle, Home, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { z } from "zod";

const propertyTypeKeys = ["apartament", "casa", "studio", "penthouse", "vila"] as const;

const formSchema = z.object({
  name: z.string().trim().min(2, "Numele este prea scurt").max(100),
  phone: z.string().trim().min(10, "Număr invalid").max(20),
  propertyType: z.string().min(1, "Selectați tipul"),
});

const QuickLeadForm = () => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = formSchema.safeParse({ name, phone, propertyType });
    if (!validation.success) {
      toast({
        title: t.quickLeadForm?.fillAllFields || "Completează toate câmpurile",
        description: t.quickLeadForm?.fillAllFieldsMessage || "Te rugăm să completezi corect toate câmpurile.",
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
      });

      if (error) throw error;

      // Try to send notification
      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name: name.trim(),
            whatsappNumber: phone.trim(),
            propertyType: propertyType,
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
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex flex-col items-center justify-center py-8 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
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
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder={t.quickLeadForm?.phonePlaceholder || "Telefon / WhatsApp"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  maxLength={20}
                />
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