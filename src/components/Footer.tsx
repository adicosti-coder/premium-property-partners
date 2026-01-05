import { useLanguage } from "@/i18n/LanguageContext";
import { MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
  const { t, language } = useLanguage();

  const translations = {
    ro: {
      company: "Firmă",
      companyName: "Imo Business Centrum SRL",
      cui: "CUI: RO14380627",
      address: "Timișoara, str. Samuil Micu, nr. 14, ap. 5",
    },
    en: {
      company: "Company",
      companyName: "Imo Business Centrum SRL",
      cui: "Tax ID: RO14380627",
      address: "Timișoara, Samuil Micu St., no. 14, apt. 5",
    },
  };

  const tr = translations[language] || translations.en;

  return (
    <footer className="bg-primary py-12 border-t border-cream/10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-serif font-semibold text-cream">
                Real<span className="text-gold">Trust</span>
              </span>
            </a>
            <p className="text-cream/60 text-sm">
              ApArt Hotel Timișoara
            </p>
          </div>

          {/* Contact */}
          <div className="md:col-span-1">
            <h4 className="text-cream font-semibold mb-4">{t.nav.contact}</h4>
            <div className="space-y-3 text-sm">
              <a href="tel:+40723154520" className="flex items-center gap-2 text-cream/60 hover:text-cream transition-colors">
                <Phone className="w-4 h-4" />
                0723 154 520
              </a>
              <a href="mailto:adicosti@gmail.com" className="flex items-center gap-2 text-cream/60 hover:text-cream transition-colors">
                <Mail className="w-4 h-4" />
                adicosti@gmail.com
              </a>
            </div>
          </div>

          {/* Company Info */}
          <div className="md:col-span-1">
            <h4 className="text-cream font-semibold mb-4">{tr.company}</h4>
            <div className="space-y-2 text-sm text-cream/60">
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
            <h4 className="text-cream font-semibold mb-4">Links</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <a href="#beneficii" className="text-cream/60 hover:text-cream transition-colors">
                {t.nav.benefits}
              </a>
              <a href="#calculator" className="text-cream/60 hover:text-cream transition-colors">
                Calculator
              </a>
              <a href="#portofoliu" className="text-cream/60 hover:text-cream transition-colors">
                {t.nav.portfolio}
              </a>
              <a href="/online-check-in" className="text-cream/60 hover:text-cream transition-colors">
                {t.nav.onlineCheckIn}
              </a>
              <a href="#contact" className="text-cream/60 hover:text-cream transition-colors">
                {t.nav.contact}
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-cream/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream/40 text-sm font-sans">
            © 2024 RealTrust. {t.footer.rights}
          </p>
          <nav className="flex items-center gap-6 text-sm font-sans">
            <a href="#" className="text-cream/60 hover:text-cream transition-colors">
              {t.footer.terms}
            </a>
            <a href="#" className="text-cream/60 hover:text-cream transition-colors">
              {t.footer.privacy}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
