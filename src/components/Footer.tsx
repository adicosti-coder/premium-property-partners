import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Phone, Mail, Send, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import { Link } from "react-router-dom";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    script.onerror = () => {};
    document.head.appendChild(script);
  }, []);

  const tr = {
    ro: {
      newsletterTitle: "Noutăți & Oferte",
      newsletterDesc: "Abonează-te pentru oferte speciale și ghiduri utile.",
      emailPlaceholder: "Email-ul tău",
      subscribe: "Abonează-te",
      successMessage: "Te-ai abonat cu succes!",
      errorMessage: "A apărut o eroare. Încearcă din nou.",
      invalidEmail: "Adresă de email invalidă.",
      servicesTitle: "Servicii",
      infoTitle: "Informații",
      disclaimer: "* Estimările de venit sunt orientative, bazate pe date istorice. Rezultatele pot varia. Datele personale sunt protejate conform GDPR.",
    },
    en: {
      newsletterTitle: "News & Offers",
      newsletterDesc: "Subscribe for special offers and useful guides.",
      emailPlaceholder: "Your email",
      subscribe: "Subscribe",
      successMessage: "Successfully subscribed!",
      errorMessage: "An error occurred. Please try again.",
      invalidEmail: "Invalid email address.",
      servicesTitle: "Services",
      infoTitle: "Information",
      disclaimer: "* Income estimates are indicative, based on historical data. Results may vary. Personal data is protected under GDPR.",
    },
  };

  const text = tr[language as keyof typeof tr] || tr.ro;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(text.invalidEmail);
      return;
    }
    setIsLoading(true);
    try {
      if (!window.ml || !mailerLiteLoadedRef.current) throw new Error("MailerLite not loaded");
      window.ml("track", { event: "newsletter_signup", email: result.data, language, source: "footer" });
      setIsSubscribed(true);
      toast.success(text.successMessage);
      setEmail("");
    } catch {
      toast.error(text.errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const serviceLinks = [
    { href: "/pentru-proprietari", label: language === "ro" ? "Pentru Proprietari" : "For Owners" },
    { href: "/pentru-oaspeti", label: language === "ro" ? "Cazare Regim Hotelier" : "Hotel Accommodation" },
    { href: "/preturi", label: language === "ro" ? "Prețuri & Pachete" : "Pricing & Packages" },
    { href: "/investitii", label: language === "ro" ? "Investiții Premium" : "Premium Investments" },
    { href: "/complexe", label: language === "ro" ? "Complexuri Rezidențiale" : "Residential Complexes" },
  ];

  const infoLinks = [
    { href: "/blog", label: "Blog" },
    { href: "/despre-noi", label: language === "ro" ? "Despre Noi" : "About Us" },
    { href: "/analiza-proprietate", label: "HostScan AI" },
    { href: "/catalog-investitii", label: language === "ro" ? "Catalog 2026" : "Catalog 2026" },
    { href: "#contact", label: t.nav.contact, isAnchor: true },
  ];

  return (
    <footer className="bg-card border-t border-border/50 dark:border-border">
      <div className="container mx-auto px-6 py-12">
        <h2 className="sr-only">{language === "ro" ? "Informații site" : "Site information"}</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand + Contact */}
          <div>
            <a href="/" className="inline-block mb-4">
              <span className="text-xl font-serif font-semibold">
                Real<span className="text-primary">Trust</span>
                <span className="text-muted-foreground font-normal italic"> & </span>
                <span className="text-primary">ApArt</span> Hotel
              </span>
            </a>
            <p className="text-sm text-muted-foreground mb-1">Imo Business Centrum SRL</p>
            <p className="text-xs text-muted-foreground mb-4">CUI: RO14380627 · Timișoara</p>
            <div className="space-y-2">
              <a href="tel:+40723154520" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" />
                0723 154 520
              </a>
              <a href="mailto:info@realtrust.ro" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" />
                info@realtrust.ro
              </a>
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <h3 className="text-foreground font-semibold mb-4 text-sm uppercase tracking-wider">{text.servicesTitle}</h3>
            <nav className="flex flex-col gap-2.5">
              {serviceLinks.map((link) => (
                <Link key={link.href} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 3: Info */}
          <div>
            <h3 className="text-foreground font-semibold mb-4 text-sm uppercase tracking-wider">{text.infoTitle}</h3>
            <nav className="flex flex-col gap-2.5">
              {infoLinks.map((link) => (
                link.isAnchor ? (
                  <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                )
              ))}
            </nav>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h3 className="text-foreground font-semibold mb-4 text-sm uppercase tracking-wider">{text.newsletterTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">{text.newsletterDesc}</p>
            {isSubscribed ? (
              <p className="text-sm text-primary font-medium">✓ {text.successMessage}</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={text.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm"
                  required
                />
                <Button type="submit" size="icon" disabled={isLoading} className="shrink-0" aria-label={text.subscribe}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Compact bottom bar */}
        <div className="border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-primary" /> SSL</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> GDPR</span>
            <span>© 2026 RealTrust. {t.footer.rights}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{t.footer.terms}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t.footer.privacy}</a>
          </div>
        </div>

        {/* Disclaimer - compact */}
        <p className="text-[10px] text-muted-foreground/60 mt-4 text-center max-w-3xl mx-auto">
          {text.disclaimer}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
