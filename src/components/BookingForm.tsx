import { useState, useRef, useEffect } from "react";
import { Calendar, Users, Phone, Mail, MessageSquare, Globe, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
}

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

const BookingForm = ({ isOpen, onClose, propertyName }: BookingFormProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        body: { token, formType: 'booking_form' }
      });
      if (error) throw error;
      return data.success === true;
    } catch (error) {
      console.error("Captcha verification error:", error);
      return false;
    }
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

  const sendEmailNotification = async () => {
    try {
      await supabase.functions.invoke('send-booking-notification', {
        body: {
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guests: formData.guests,
          country: formData.country,
          message: formData.message,
          propertyName: propertyName || (language === 'en' ? "Any available property" : "Orice proprietate disponibilă"),
        }
      });
    } catch (error) {
      console.error("Email notification error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: t.booking.error,
        description: t.booking.errorMessage,
        variant: "destructive",
      });
      return;
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
        description: language === 'en' ? "Captcha verification failed. Please try again." : "Verificarea captcha a eșuat. Vă rugăm să încercați din nou.",
        variant: "destructive",
      });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      setIsSubmitting(false);
      return;
    }

    // Send email notification
    await sendEmailNotification();

    // Build WhatsApp message
    const property = propertyName || (language === 'en' ? "Any available property" : "Orice proprietate disponibilă");
    const whatsappMessage = language === 'en' 
      ? `🏠 *Booking Request - RealTrust & ApArt Hotel*

👤 *Name:* ${formData.name}
📧 *Email:* ${formData.email}
📱 *Phone:* ${formData.phone}
🌍 *Country:* ${formData.country}

📅 *Check-in:* ${formData.checkIn}
📅 *Check-out:* ${formData.checkOut}
👥 *Number of guests:* ${formData.guests}

🏡 *Property:* ${property}

💬 *Message:* ${formData.message || "No additional message"}`
      : `🏠 *Cerere de Rezervare - RealTrust & ApArt Hotel*

👤 *Nume:* ${formData.name}
📧 *Email:* ${formData.email}
📱 *Telefon:* ${formData.phone}
🌍 *Țara:* ${formData.country}

📅 *Check-in:* ${formData.checkIn}
📅 *Check-out:* ${formData.checkOut}
👥 *Număr oaspeți:* ${formData.guests}

🏡 *Proprietate:* ${property}

💬 *Mesaj:* ${formData.message || "Fără mesaj adițional"}`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/40742000000?text=${encodedMessage}`;

    // Open WhatsApp
    window.open(whatsappUrl, "_blank");

    toast({
      title: t.booking.success,
      description: t.booking.successMessage,
    });

    setIsSubmitting(false);
    onClose();
    setFormData({
      name: "",
      phone: "",
      email: "",
      checkIn: "",
      checkOut: "",
      guests: "",
      country: "",
      message: "",
    });
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          {/* hCaptcha widget */}
          <div className="flex flex-col items-center gap-2 pt-2">
            {hcaptchaSiteKey ? (
              <>
                <HCaptcha
                  ref={captchaRef}
                  sitekey={hcaptchaSiteKey}
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                  languageOverride={language}
                  theme="dark"
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
              disabled={isSubmitting || !captchaToken || !hcaptchaSiteKey}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                isVerifyingCaptcha 
                  ? (language === 'en' ? "Verifying..." : "Se verifică...")
                  : t.booking.sending
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t.booking.submit}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;