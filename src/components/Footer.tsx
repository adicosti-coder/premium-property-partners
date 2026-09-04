import { useState } from "react";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/lib/cookieConsentEvents";

import { useLanguage } from "@/i18n/LanguageContext";
import { Phone, Mail, Send, Lock, ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { neighborhoods } from "@/data/neighborhoods";
import PropertyRequestModal from "@/components/PropertyRequestModal";

const emailSchema = z.string().trim().email().max(255);

const Footer = () => {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const tr = {
    ro: {
      newsletterTitle: "Newsletter",
      newsletterDesc: "Analize de piață, studii de caz și ghiduri pentru proprietari. Un email pe lună, fără spam.",
      emailPlaceholder: "Adresa ta de email",
      subscribe: "Abonează-te",
      successMessage: "Abonare confirmată. Mulțumim.",
      errorMessage: "Nu am putut procesa cererea. Te rugăm să reîncerci.",
      invalidEmail: "Adresă de email invalidă.",
      servicesTitle: "Servicii",
      infoTitle: "Resurse",
      disclaimer: "Estimările de venit se bazează pe date istorice și ipoteze publice (ocupare 75%, deducere 27% pentru management, costuri și taxe). Rezultatele individuale pot varia. Datele personale sunt prelucrate conform GDPR.",
    },
    en: {
      newsletterTitle: "Newsletter",
      newsletterDesc: "Market analysis, case studies and owner guides. One email a month, no spam.",
      emailPlaceholder: "Your email address",
      subscribe: "Subscribe",
      successMessage: "Subscription confirmed. Thank you.",
      errorMessage: "We couldn't process the request. Please try again.",
      invalidEmail: "Invalid email address.",
      servicesTitle: "Services",
      infoTitle: "Resources",
      disclaimer: "Income estimates are based on historical data and public assumptions (75% occupancy, 27% deduction for management, costs and taxes). Individual results may vary. Personal data is processed in accordance with GDPR.",
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
      const { error } = await supabase.functions.invoke("subscribe-newsletter", {
        body: { email: result.data, source: "footer", language },
      });
      if (error) throw error;
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
    { href: "/servicii-imobiliare", label: language === "ro" ? "Servicii Imobiliare Timișoara" : "Real Estate Services Timișoara" },
    { href: "/pentru-proprietari", label: language === "ro" ? "Pentru Proprietari" : "For Owners" },
    { href: "/cazare", label: language === "ro" ? "Cazare Regim Hotelier" : "Hotel Accommodation" },
    { href: "/preturi", label: language === "ro" ? "Prețuri & Pachete" : "Pricing & Packages" },
    { href: "/investitii", label: language === "ro" ? "Investiții Premium" : "Premium Investments" },
    { href: "/ansambluri-rezidentiale", label: language === "ro" ? "Complexuri Rezidențiale" : "Residential Complexes" },
    { href: "#", label: language === "ro" ? "Caut o proprietate potrivită" : "Find a suitable property", isRequestModal: true },
  ];

  const infoLinks = [
    { href: "/blog", label: "Blog" },
    { href: "/despre-noi", label: language === "ro" ? "Despre Noi" : "About Us" },
    { href: "/hostscan-ai", label: "HostScan AI" },
    { href: "/catalog-investitii", label: language === "ro" ? "Catalog 2026" : "Catalog 2026" },
    { href: "/calculator-roi", label: "Calculator ROI" },
    { href: "/analiza-roi-apartament", label: language === "ro" ? "Analiza ROI Apartament" : "Apartment ROI Analysis" },
    { href: "/evaluare-gratuita", label: language === "ro" ? "Evaluare gratuită" : "Free Valuation" },
    { href: "/piata-imobiliara-timisoara", label: language === "ro" ? "Piața imobiliară" : "Real Estate Market" },
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
            <p className="text-sm text-muted-foreground mb-1">Agenție imobiliară Timișoara · administrare proprietăți · regim hotelier</p>
            <p className="text-xs text-muted-foreground mb-4">CUI: RO14380627 · Timișoara</p>
            <address className="not-italic text-xs text-muted-foreground mb-4 leading-relaxed">
              Strada Samuil Micu nr. 14, ap. 4<br />
              300125, Timișoara, Timiș, România
            </address>
            <div className="space-y-2">
              <a href="tel:+40799069256" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" />
                0799 069 256
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
                link.isRequestModal ? (
                  <button key="request-modal" onClick={() => setRequestOpen(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left inline-flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    {link.label}
                  </button>
                ) : (
                  <Link key={link.href} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                )
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

        {/* Neighborhood Links for SEO */}
        <div className="border-t border-border/50 pt-6 mb-6">
          <h3 className="text-foreground font-semibold mb-3 text-sm uppercase tracking-wider">
            {language === "ro" ? "Zone de interes" : "Areas of Interest"}
          </h3>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/cartiere" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {language === "ro" ? "Toate zonele" : "All areas"}
            </Link>
            {neighborhoods.map((n) => (
              <Link
                key={n.slug}
                to={`/imobiliare-timisoara/${n.slug}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {n.fullName}
              </Link>
            ))}
          </nav>
        </div>

        {/* Compact bottom bar */}
        <div className="border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-primary" /> SSL</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> GDPR</span>
            <span>© 2026 RealTrust. {t.footer.rights}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <Link to="/termeni-si-conditii" className="hover:text-foreground transition-colors">{t.footer.terms}</Link>
            <Link to="/politica-confidentialitate" className="hover:text-foreground transition-colors">{t.footer.privacy}</Link>
            {/* GDPR: consent must be withdrawable at any time. */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
              className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Modifică setările de confidențialitate
            </button>
          </div>

        </div>

        {/* Disclaimer - compact */}
        <p className="text-[10px] text-muted-foreground mt-4 text-center max-w-3xl mx-auto">
          {text.disclaimer}
        </p>
      </div>
      <PropertyRequestModal open={requestOpen} onOpenChange={setRequestOpen} sourcePage="footer" />
    </footer>
  );
};

export default Footer;
