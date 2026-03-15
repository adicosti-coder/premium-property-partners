import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { MapPin, Phone, Mail, Send, Settings, ShieldCheck, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import AnimationToggle from "./AnimationToggle";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

const emailSchema = z.string().trim().email().max(255);

declare global {
  interface Window {
    ml?: (command: string, payload: string | object) => void;
  }
}

const Footer = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const mailerLiteLoadedRef = useRef(false);

  // Load MailerLite script on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if script already loaded
    if (document.getElementById("mailerlite-script")) {
      mailerLiteLoadedRef.current = true;
      return;
    }
    
    const script = document.createElement("script");
    script.id = "mailerlite-script";
    script.async = true;
    script.src = "https://assets.mailerlite.com/js/universal.js";
    
    script.onload = () => {
      if (window.ml) {
        window.ml("account", "2192327");
        mailerLiteLoadedRef.current = true;
      }
    };
    
    script.onerror = () => {
      console.error("Failed to load MailerLite script");
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup not needed for external scripts
    };
  }, []);

  const translations = {
    ro: {
      company: "Firmă",
      companyName: "Imo Business Centrum SRL",
      cui: "CUI: RO14380627",
      address: "Strada Samuel Clain Micu Nr.14, ap.4, 300125 Timișoara",
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
      address: "Strada Samuel Clain Micu Nr.14, ap.4, 300125 Timișoara",
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

    setIsLoading(true);

    try {
      // Check if MailerLite is loaded
      if (!window.ml || !mailerLiteLoadedRef.current) {
        throw new Error("MailerLite not loaded");
      }

      // Trigger MailerLite subscription with tracking event
      window.ml("track", {
        event: "newsletter_signup",
        email: result.data,
        language: language,
        source: "footer",
      });

      setIsSubscribed(true);
      toast.success(tr.successMessage);
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error(tr.errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-card py-12 border-t border-border/50 dark:border-border">
      <div className="container mx-auto px-6">
        <h2 className="sr-only">{language === 'ro' ? 'Informații site' : 'Site information'}</h2>
        <div className="grid md:grid-cols-6 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <a href="/" className="flex flex-col gap-1 mb-4">
              <span className="text-xl font-serif font-semibold">
                <span className="text-foreground">Real</span>
                <span className="text-primary">Trust</span>
                <span className="text-foreground"> & </span>
                <span className="text-foreground">ApArt</span>
                <span className="text-foreground"> Hotel</span>
              </span>
            </a>
            <p className="text-foreground/60 dark:text-muted-foreground text-sm">
              Timișoara, România
            </p>
          </div>

          {/* Contact */}
          <div className="md:col-span-1">
            <h3 className="text-foreground font-semibold mb-4 text-base">{t.nav.contact}</h3>
            <div className="space-y-3 text-sm">
              <a href="tel:+40723154520" className="flex items-center gap-2 text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" />
                0723 154 520
              </a>
              <a href="mailto:info@realtrust.ro" className="flex items-center gap-2 text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" />
                info@realtrust.ro
              </a>
            </div>
          </div>

          {/* Company Info */}
          <div className="md:col-span-1">
            <h3 className="text-foreground font-semibold mb-4 text-base">{tr.company}</h3>
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
            <h3 className="text-foreground font-semibold mb-4 text-base">Links</h3>
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
            <h3 className="text-foreground font-semibold mb-4 text-base">{tr.newsletter}</h3>
            <p className="text-foreground/60 dark:text-muted-foreground text-sm mb-4">{tr.newsletterDesc}</p>
            {isSubscribed ? (
              <p className="text-sm text-[hsl(142,76%,36%)] font-medium">
                {language === 'ro' ? '✓ Abonat cu succes!' : '✓ Successfully subscribed!'}
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={tr.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-foreground/40 dark:placeholder:text-muted-foreground text-sm"
                  required
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                  aria-label={language === 'ro' ? 'Abonează-te la newsletter' : 'Subscribe to newsletter'}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>

          {/* Accessibility Settings */}
          <div className="md:col-span-1">
            <h3 className="text-foreground font-semibold mb-4 text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {tr.accessibility}
            </h3>
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
          <h3 className="text-foreground font-semibold mb-4 text-base">
            {language === 'ro' ? 'Termeni și Condiții' : 'Terms and Conditions'}
          </h3>
          <div className="space-y-4 text-xs text-foreground/70 dark:text-muted-foreground">
            <p>
              {language === 'ro' 
                ? '* Toate cifrele, procentele și estimările de venit prezentate pe acest site sunt orientative și se bazează pe date istorice și previziuni de piață. Acestea nu constituie garanții ale rezultatelor viitoare. Veniturile reale pot varia în funcție de locație, sezonalitate, starea proprietății și alți factori. Vă recomandăm să discutați cu echipa noastră pentru o evaluare personalizată.'
                : '* All figures, percentages and income estimates presented on this website are indicative and based on historical data and market forecasts. They do not constitute guarantees of future results. Actual revenues may vary depending on location, seasonality, property condition and other factors. We recommend discussing with our team for a personalized evaluation.'
              }
            </p>
            <p>
              {language === 'ro'
                ? '** Protecția datelor personale: Datele personale furnizate prin formularele de pe acest site sunt prelucrate în conformitate cu Regulamentul (UE) 2016/679 (GDPR). Le folosim exclusiv pentru a răspunde solicitărilor dumneavoastră, a vă contacta în legătură cu serviciile noastre și a îmbunătăți experiența pe site. Datele sunt păstrate în siguranță și nu sunt transmise terților fără consimțământul dumneavoastră, cu excepția obligațiilor legale. Aveți dreptul de acces, rectificare, ștergere și portabilitate a datelor. Pentru întrebări, ne puteți contacta la info@realtrust.ro.'
                : '** Personal data protection: Personal data provided through forms on this website is processed in accordance with Regulation (EU) 2016/679 (GDPR). We use it exclusively to respond to your requests, contact you regarding our services and improve the site experience. Data is kept secure and not shared with third parties without your consent, except for legal obligations. You have the right to access, rectify, delete and port your data. For questions, contact us at info@realtrust.ro.'
              }
            </p>
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