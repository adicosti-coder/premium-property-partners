import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { MapPin, Phone, Mail, Send, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import AnimationToggle from "./AnimationToggle";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

const emailSchema = z.string().trim().email().max(255);

const Footer = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: result.data });

      if (error) {
        if (error.code === "23505") {
          toast.error(tr.alreadySubscribed);
        } else {
          toast.error(tr.errorMessage);
        }
      } else {
        toast.success(tr.successMessage);
        setEmail("");
      }
    } catch {
      toast.error(tr.errorMessage);
    } finally {
      setIsLoading(false);
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
              <a href="/rezerva-direct" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {language === 'ro' ? 'De ce să rezervi direct?' : 'Why Book Direct?'}
              </a>
              <a href="/online-check-in" className="text-foreground/60 dark:text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.onlineCheckIn}
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
