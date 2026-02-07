import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, CheckCircle2, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import ConfettiEffect from "./ConfettiEffect";
import { isValidInternationalPhone } from "@/utils/phoneCountryDetector";
import PhoneInputWithCountry from "./PhoneInputWithCountry";
import HCaptcha from "@hcaptcha/react-hcaptcha";

// Custom refinement for international phone validation
const formSchema = z.object({
  name: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere").max(100),
  phone: z.string().trim().max(25).refine((val) => isValidInternationalPhone(val), {
    message: "Număr de telefon invalid"
  }),
  email: z.string().trim().email("Email invalid").max(255),
  serviceType: z.string().min(1, "Selectează tipul de serviciu"),
  propertyType: z.string().optional(),
  listingUrl: z.string().trim().url("Link invalid").max(500).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

const RealEstateContactForm = () => {
  const { t, language } = useLanguage();
  const form = t.realEstateForm;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    serviceType: "",
    propertyType: "",
    listingUrl: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  // hCaptcha state
  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [hcaptchaSiteKey, setHcaptchaSiteKey] = useState<string | null>(null);

  // Fetch hCaptcha site key on mount
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
    fetchSiteKey();
  }, []);

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const verifyCaptchaOnServer = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-hcaptcha', {
        body: { token, formType: 'real_estate_contact_form' }
      });
      if (error) throw error;
      return data.success === true;
    } catch (error) {
      console.error("Captcha verification error:", error);
      return false;
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof FormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error(form.errorMessage);
      return;
    }

    // Verify hCaptcha
    if (!captchaToken) {
      toast.error(language === 'en' ? "Please complete the captcha verification" : "Vă rugăm să completați verificarea captcha");
      return;
    }

    setIsSubmitting(true);
    setIsVerifyingCaptcha(true);

    // Server-side captcha verification
    const isCaptchaValid = await verifyCaptchaOnServer(captchaToken);
    setIsVerifyingCaptcha(false);

    if (!isCaptchaValid) {
      toast.error(language === 'en' ? "Captcha verification failed. Please try again." : "Verificarea captcha a eșuat. Încercați din nou.");
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      setIsSubmitting(false);
      return;
    }

    // Build WhatsApp message
    const message = `${form.whatsappIntro}

${form.fields.name}: ${formData.name}
${form.fields.phone}: ${formData.phone}
${form.fields.email}: ${formData.email}
${form.fields.serviceType}: ${formData.serviceType}
${formData.propertyType ? `${form.fields.propertyType}: ${formData.propertyType}` : ""}
${formData.listingUrl ? `${form.fields.listingUrl}: ${formData.listingUrl}` : ""}
${formData.message ? `${form.fields.message}: ${formData.message}` : ""}`;

    // Open WhatsApp
    window.open(
      `https://wa.me/40723154520?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    // Send notification
    try {
      await supabase.functions.invoke("send-lead-notification", {
        body: {
          source: "real_estate_contact",
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          serviceType: formData.serviceType,
          propertyType: formData.propertyType || undefined,
          listingUrl: formData.listingUrl?.trim() || undefined,
          message: formData.message?.trim() || undefined,
        },
      });
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    setIsSubmitting(false);
    
    // Trigger confetti effect
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
    
    toast.success(form.successMessage);

    // Reset form and captcha
    setFormData({
      name: "",
      phone: "",
      email: "",
      serviceType: "",
      propertyType: "",
      listingUrl: "",
      message: "",
    });
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  };

  const serviceTypes = [
    { value: "sell", label: form.serviceTypes.sell },
    { value: "buy", label: form.serviceTypes.buy },
    { value: "rent", label: form.serviceTypes.rent },
    { value: "consulting", label: form.serviceTypes.consulting },
  ];

  const propertyTypes = [
    { value: "apartment", label: form.propertyTypes.apartment },
    { value: "house", label: form.propertyTypes.house },
    { value: "commercial", label: form.propertyTypes.commercial },
    { value: "land", label: form.propertyTypes.land },
  ];

  return (
    <section id="contact-form" className="py-20 md:py-28 bg-muted/30">
      <ConfettiEffect isActive={showConfetti} duration={3500} particleCount={60} />
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            {form.label}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {form.title}{" "}
            <span className="text-primary">{form.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {form.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-6">
                <h3 className="text-xl font-semibold text-foreground">
                  {form.contactInfo.title}
                </h3>

                <div className="space-y-4">
                  <a 
                    href="tel:+40723154520"
                    className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{form.contactInfo.phone}</p>
                      <p className="text-foreground font-medium">0723 154 520</p>
                    </div>
                  </a>

                  <a 
                    href="mailto:adicosti@gmail.com"
                    className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{form.contactInfo.email}</p>
                      <p className="text-foreground font-medium">adicosti@gmail.com</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{form.contactInfo.location}</p>
                      <p className="text-foreground font-medium">Timișoara, România</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {form.contactInfo.responseTime}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <Card className="lg:col-span-3 bg-card border-border">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{form.fields.name} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder={form.placeholders.name}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{form.fields.phone} *</Label>
                    <PhoneInputWithCountry
                      id="phone"
                      value={formData.phone}
                      onChange={(value) => handleChange("phone", value)}
                      placeholder={form.placeholders.phone}
                      error={errors.phone}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{form.fields.email} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder={form.placeholders.email}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{form.fields.serviceType} *</Label>
                    <Select
                      value={formData.serviceType}
                      onValueChange={(value) => handleChange("serviceType", value)}
                    >
                      <SelectTrigger className={errors.serviceType ? "border-destructive" : ""}>
                        <SelectValue placeholder={form.placeholders.serviceType} />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.serviceType && (
                      <p className="text-sm text-destructive">{errors.serviceType}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{form.fields.propertyType}</Label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={(value) => handleChange("propertyType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={form.placeholders.propertyType} />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listingUrl">{form.fields.listingUrl}</Label>
                  <Input
                    id="listingUrl"
                    type="url"
                    value={formData.listingUrl}
                    onChange={(e) => handleChange("listingUrl", e.target.value)}
                    placeholder={form.placeholders.listingUrl}
                    className={errors.listingUrl ? "border-destructive" : ""}
                  />
                  {errors.listingUrl && (
                    <p className="text-sm text-destructive">{errors.listingUrl}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{form.fields.message}</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    placeholder={form.placeholders.message}
                    rows={4}
                  />
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
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-pulse text-muted-foreground text-sm">
                        {language === "ro" ? "Se încarcă verificarea..." : "Loading verification..."}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full group"
                  disabled={isSubmitting || !captchaToken || !hcaptchaSiteKey}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {isVerifyingCaptcha 
                        ? (language === 'en' ? "Verifying..." : "Se verifică...")
                        : form.sending}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {form.submit}
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {form.privacy}
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default RealEstateContactForm;
