import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, CheckCircle2, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface PropertyRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProperty?: string;
  sourcePage?: string;
}

const PropertyRequestModal = ({ open, onOpenChange, sourceProperty, sourcePage }: PropertyRequestModalProps) => {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const t = language === "ro" ? {
    title: "Caută pentru mine",
    desc: "Spune-ne ce cauți și echipa noastră va identifica opțiunea ideală pentru tine — gratuit și fără obligații.",
    name: "Nume",
    phone: "Telefon",
    email: "Email (opțional)",
    propertyType: "Tip proprietate",
    budgetRange: "Buget orientativ",
    bedrooms: "Camere",
    preferredArea: "Zonă preferată",
    message: "Detalii suplimentare (opțional)",
    messagePlaceholder: "Ex: caut un apartament luminos, cu parcare, aproape de centru...",
    submit: "Trimite cererea",
    success: "Cererea ta a fost trimisă cu succes! Te vom contacta în cel mai scurt timp cu opțiuni personalizate.",
    errorName: "Introduceți numele",
    errorPhone: "Introduceți un număr de telefon valid",
    types: {
      apartment: "Apartament",
      house: "Casă / Vilă",
      studio: "Garsonieră",
      commercial: "Spațiu comercial",
      land: "Teren",
    },
    budgets: {
      under50: "Sub 50.000 €",
      "50_100": "50.000 – 100.000 €",
      "100_150": "100.000 – 150.000 €",
      "150_200": "150.000 – 200.000 €",
      over200: "Peste 200.000 €",
      rent_under500: "Chirie sub 500 €/lună",
      rent_500_1000: "Chirie 500 – 1.000 €/lună",
      rent_over1000: "Chirie peste 1.000 €/lună",
    },
    rooms: { "1": "1 cameră", "2": "2 camere", "3": "3 camere", "4+": "4+ camere" },
    areas: ["Centru", "Complexul Studențesc", "Lipovei", "Girocului", "Dumbravița", "Circumvalațiunii", "Aradului", "Iosefin", "Fabric", "Elisabetin", "Mehala", "Freidorf", "Calea Sagului", "Altă zonă"],
  } : {
    title: "Search for me",
    desc: "Tell us what you're looking for and our team will find the perfect option for you — free and with no obligation.",
    name: "Name",
    phone: "Phone",
    email: "Email (optional)",
    propertyType: "Property type",
    budgetRange: "Budget range",
    bedrooms: "Bedrooms",
    preferredArea: "Preferred area",
    message: "Additional details (optional)",
    messagePlaceholder: "E.g., looking for a bright apartment, with parking, near the center...",
    submit: "Send request",
    success: "Your request has been sent! We'll contact you shortly with personalized options.",
    errorName: "Please enter your name",
    errorPhone: "Please enter a valid phone number",
    types: {
      apartment: "Apartment",
      house: "House / Villa",
      studio: "Studio",
      commercial: "Commercial space",
      land: "Land",
    },
    budgets: {
      under50: "Under €50,000",
      "50_100": "€50,000 – €100,000",
      "100_150": "€100,000 – €150,000",
      "150_200": "€150,000 – €200,000",
      over200: "Over €200,000",
      rent_under500: "Rent under €500/mo",
      rent_500_1000: "Rent €500 – €1,000/mo",
      rent_over1000: "Rent over €1,000/mo",
    },
    rooms: { "1": "1 bedroom", "2": "2 bedrooms", "3": "3 bedrooms", "4+": "4+ bedrooms" },
    areas: ["Center", "Student Complex", "Lipovei", "Girocului", "Dumbravița", "Circumvalațiunii", "Aradului", "Iosefin", "Fabric", "Elisabetin", "Mehala", "Freidorf", "Calea Sagului", "Other area"],
  };

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { toast({ title: t.errorName, variant: "destructive" }); return; }
    if (!phone.trim() || phone.trim().length < 6) { toast({ title: t.errorPhone, variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("property_requests").insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        property_type: propertyType || null,
        budget_range: budgetRange || null,
        bedrooms: bedrooms || null,
        preferred_area: preferredArea || null,
        message: message.trim() || null,
        source_page: sourcePage || window.location.pathname,
        source_property_slug: sourceProperty || null,
      });
      if (error) throw error;
      setIsSuccess(true);
      toast({ title: t.success });
    } catch (err) {
      console.error("Property request error:", err);
      toast({ title: language === "ro" ? "A apărut o eroare. Încearcă din nou." : "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, phone, email, propertyType, budgetRange, bedrooms, preferredArea, message, sourcePage, sourceProperty, t, language]);

  const handleClose = (val: boolean) => {
    if (!val) {
      setName(""); setPhone(""); setEmail(""); setPropertyType("");
      setBudgetRange(""); setBedrooms(""); setPreferredArea(""); setMessage("");
      setIsSuccess(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription className="text-sm">{t.desc}</DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-center text-muted-foreground text-sm max-w-xs">{t.success}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Contact info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="req-name" className="text-xs">{t.name} *</Label>
                <Input id="req-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ion Popescu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req-phone" className="text-xs">{t.phone} *</Label>
                <Input id="req-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40 7XX XXX XXX" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-email" className="text-xs">{t.email}</Label>
              <Input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplu.ro" />
            </div>

            {/* Property preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.propertyType}</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue placeholder={t.propertyType} /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(t.types).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.bedrooms}</Label>
                <Select value={bedrooms} onValueChange={setBedrooms}>
                  <SelectTrigger><SelectValue placeholder={t.bedrooms} /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(t.rooms).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.budgetRange}</Label>
                <Select value={budgetRange} onValueChange={setBudgetRange}>
                  <SelectTrigger><SelectValue placeholder={t.budgetRange} /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(t.budgets).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.preferredArea}</Label>
                <Select value={preferredArea} onValueChange={setPreferredArea}>
                  <SelectTrigger><SelectValue placeholder={t.preferredArea} /></SelectTrigger>
                  <SelectContent>
                    {t.areas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Free-text message */}
            <div className="space-y-1.5">
              <Label htmlFor="req-message" className="text-xs">{t.message}</Label>
              <Textarea
                id="req-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2" variant="premium">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t.submit}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PropertyRequestModal;
