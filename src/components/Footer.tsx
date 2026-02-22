import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { MapPin, Phone, Mail, Send, Settings, ShieldCheck, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { z } from "zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import AnimationToggle from "./AnimationToggle";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

const emailSchema = z.string().trim().email().max(255);

const Footer = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hcaptchaSiteKey, setHcaptchaSiteKey] = useState<string>("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const hcaptchaRef = useRef<HCaptcha>(null);

  // Defer hCaptcha loading until user interacts with the newsletter form
  const loadCaptcha = () => {
    if (captchaReady) return;
    setCaptchaReady(true);
    supabase.functions.invoke("get-hcaptcha-site-key").then(({ data }) => {
      if (data?.siteKey) setHcaptchaSiteKey(data.siteKey);
    });
  };

  const translations = {
    ro: {
      company: "Firmă",
      companyName: "Imo Business Centrum SRL",
      cui: "CUI: RO14380627",
      address: "Timișoara, str. Samuil Micu, nr. 14, ap. 5",
      newsletter: "Newsletter",
      newsletterDesc: "Abonează-te pentru a primi noutăți și oferte speciale.",
      emailPlaceholder: "Adresa ta de email",
      subscribe: "Abonează-te",
      successMessage: "Te-ai abonat cu succes!",
      errorMessage: "A apărut o eroare. Încearcă din nou.",
      alreadySubscribed: "Acest email este deja abonat.",
      invalidEmail: "Te rugăm să introduci o adresă de email validă.",
      accessibility: "Accesibilitate",
      accessibilityDesc: "Personalizează experiența ta",
      animations: "Animații",
      theme: "Temă",
      language: "Limbă",
    },
    en: {
      company: "Company",
      companyName: "Imo Business Centrum SRL",
      cui: "Tax ID: RO14380627",
      address: "Timișoara, Samuil Micu St., no. 14, apt. 5",
      newsletter: "Newsletter",
      newsletterDesc: "Subscribe to receive news and special offers.",
      emailPlaceholder: "Your email address",
      subscribe: "Subscribe",
      successMessage: "Successfully subscribed!",
      errorMessage: "An error occurred. Please try again.",
      alreadySubscribed: "This email is already subscribed.",
      invalidEmail: "Please enter a valid email address.",
      accessibility: "Accessibility",
      accessibilityDesc: "Customize your experience",
      animations: "Animations",
      theme: "Theme",
      language: "Language",
    },
  };

  const tr = translations[language] || translations.en;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(tr.invalidEmail);
      return;
    }

    // Trigger invisible hCaptcha verification
    if (hcaptchaRef.current && hcaptchaSiteKey) {
      setIsLoading(true);
      hcaptchaRef.current.execute();
    } else {
      // Fallback if hCaptcha not loaded - still allow submission but log warning
      console.warn("hCaptcha not loaded, proceeding without verification");
      await submitNewsletter(result.data, null);
    }
  };

  const submitNewsletter = async (validatedEmail: string, captchaToken: string | null) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "subscribe-newsletter",
        { body: { email: validatedEmail, captchaToken, captchaType: "hcaptcha", formType: "newsletter_footer" } }
      );

      if (fnError) throw fnError;

      if (data?.duplicate) {
        toast.error(tr.alreadySubscribed);
      } else {
        toast.success(tr.successMessage);
        setEmail("");
      }
    } catch {
      toast.error(tr.errorMessage);
    } finally {
      setIsLoading(false);
      hcaptchaRef.current?.resetCaptcha();
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    const result = emailSchema.safeParse(email);
    if (result.success) {
      await submitNewsletter(result.data, token);
    }
  };

  return (
    <footer className="bg-card py-12 border-t border-border/50 dark:border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-6 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <a href="/" className="flex flex-col gap-1 mb-4">
              <span className="text-xl font-serif font-semibold">
                <span className="text-foreground">Real</span>
                <span className="text-primary">Trust</span>
                <span className="text-foreground"> & </span>
                <span className="text-amber-500">ApArt</span>
                <span className="text-foreground"> Hotel</span>
              </span>
            </a>
            <p className="text-foreground/60 dark:text-muted-foreground text-sm">
              Timișoara, România
            </p>
          </div>

          {/* Contact */}
          <div className="md:col-span-1">
            <h4 className="text-foreground font-semibold mb-4">{t.nav.contact}</h4>
            <div className="space-y-3 text-sm">
              <a href="tel:+40723154520" className="flex items-center gap-2 text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" />
                0723 154 520
              </a>
              <a href="mailto:adicosti@gmail.com" className="flex items-center gap-2 text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" />
                adicosti@gmail.com
              </a>
            </div>
          </div>

          {/* Company Info */}
          <div className="md:col-span-1">
            <h4 className="text-foreground font-semibold mb-4">{tr.company}</h4>
            <div className="space-y-2 text-sm text-foreground/60 dark:text-muted-foreground">
              <p>{tr.companyName}</p>
              <p>{tr.cui}</p>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{tr.address}</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-1">
            <h4 className="text-foreground font-semibold mb-4">Links</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <a href="#beneficii" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.benefits}
              </a>
              <a href="#calculator" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                Calculator
              </a>
              <a href="#portofoliu" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.portfolio}
              </a>
              <a href="/complexe" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {language === 'ro' ? 'Complexe Rezidențiale' : 'Residential Complexes'}
              </a>
              <a href="/rezerva-direct" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {language === 'ro' ? 'De ce să rezervi direct?' : 'Why Book Direct?'}
              </a>
              <a href="/investitii" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {language === 'ro' ? 'Investiții' : 'Investments'}
              </a>
              <a href="#contact" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.contact}
              </a>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-1">
            <h4 className="text-foreground font-semibold mb-4">{tr.newsletter}</h4>
            <p className="text-foreground/60 dark:text-muted-foreground text-sm mb-4">{tr.newsletterDesc}</p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder={tr.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={loadCaptcha}
                className="bg-muted border-border text-foreground placeholder:text-foreground/40 dark:placeholder:text-muted-foreground text-sm"
                required
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
              {hcaptchaSiteKey && (
                <HCaptcha
                  ref={hcaptchaRef}
                  sitekey={hcaptchaSiteKey}
                  size="invisible"
                  onVerify={handleCaptchaVerify}
                  onError={() => {
                    setIsLoading(false);
                    toast.error(language === "ro" ? "Eroare captcha" : "Captcha error");
                  }}
                />
              )}
            </form>
          </div>

          {/* Accessibility Settings */}
          <div className="md:col-span-1">
            <h4 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {tr.accessibility}
            </h4>
            <p className="text-foreground/60 dark:text-muted-foreground text-sm mb-4">{tr.accessibilityDesc}</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 dark:text-muted-foreground text-sm">{tr.animations}</span>
                <AnimationToggle />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 dark:text-muted-foreground text-sm">{tr.theme}</span>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground/60 dark:text-muted-foreground text-sm">{tr.language}</span>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimers */}
        <div className="border-t border-border/50 dark:border-border pt-8 mb-8">
          <h4 className="text-foreground font-semibold mb-4">
            {language === 'ro' ? 'Termeni și Condiții' : 'Terms and Conditions'}
          </h4>
          <div className="space-y-4 text-xs text-foreground/50 dark:text-muted-foreground/70">
            <p>
              {language === 'ro' 
                ? '* Toate cifrele, procentele și estimările de venit prezentate pe acest site sunt orientative și se bazează pe date istorice și previziuni de piață. Acestea nu constituie garanții ale rezultatelor viitoare. Veniturile reale pot varia în funcție de locație, sezonalitate, starea proprietății și alți factori. Vă recomandăm să discutați cu echipa noastră pentru o evaluare personalizată.'
                : '* All figures, percentages and income estimates presented on this website are indicative and based on historical data and market forecasts. They do not constitute guarantees of future results. Actual revenues may vary depending on location, seasonality, property condition and other factors. We recommend discussing with our team for a personalized evaluation.'
              }
            </p>
            <p>
              {language === 'ro'
                ? '** Protecția datelor personale: Datele personale furnizate prin formularele de pe acest site sunt prelucrate în conformitate cu Regulamentul (UE) 2016/679 (GDPR). Le folosim exclusiv pentru a răspunde solicitărilor dumneavoastră, a vă contacta în legătură cu serviciile noastre și a îmbunătăți experiența pe site. Datele sunt păstrate în siguranță și nu sunt transmise terților fără consimțământul dumneavoastră, cu excepția obligațiilor legale. Aveți dreptul de acces, rectificare, ștergere și portabilitate a datelor. Pentru întrebări, ne puteți contacta la adicosti@gmail.com.'
                : '** Personal data protection: Personal data provided through forms on this website is processed in accordance with Regulation (EU) 2016/679 (GDPR). We use it exclusively to respond to your requests, contact you regarding our services and improve the site experience. Data is kept secure and not shared with third parties without your consent, except for legal obligations. You have the right to access, rectify, delete and port your data. For questions, contact us at adicosti@gmail.com.'
              }
            </p>
          </div>
        </div>

        {/* Download App */}
        <div className="border-t border-border/50 dark:border-border pt-6 pb-6">
          <h4 className="text-foreground font-semibold mb-4 text-center">
            {language === 'ro' ? '📱 Descarcă Aplicația' : '📱 Download the App'}
          </h4>
          <p className="text-foreground/60 dark:text-muted-foreground text-sm text-center mb-4">
            {language === 'ro'
              ? 'Instalează aplicația RealTrust direct pe telefonul tău pentru acces rapid.'
              : 'Install the RealTrust app directly on your phone for quick access.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://play.google.com/store/apps/details?id=app.lovable.b9975a45416b429bb6fa9e3d771a5693"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.725-2.302 2.725-2.302zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/></svg>
              Google Play
            </a>
            <a
              href="https://apps.apple.com/app/realtrust-apart-hotel/id0000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              App Store
            </a>
          </div>
        </div>

        {/* Security & Trust Badges */}
        <div className="border-t border-border/50 dark:border-border pt-6 pb-2">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-medium">SSL 256-bit</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="font-medium">{language === 'ro' ? 'Conform GDPR' : 'GDPR Compliant'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="font-medium">{language === 'ro' ? 'Plăți Securizate' : 'Secure Payments'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="font-medium">{language === 'ro' ? 'Date Protejate' : 'Data Protected'}</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 dark:border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-foreground/60 dark:text-muted-foreground text-sm font-sans">
            © 2026 RealTrust. {t.footer.rights}
          </p>
          <nav className="flex items-center gap-6 text-sm font-sans">
            <a href="#" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
              {t.footer.terms}
            </a>
            <a href="#" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
              {t.footer.privacy}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
