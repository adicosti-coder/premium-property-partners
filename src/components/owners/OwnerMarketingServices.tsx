import { Camera, Video, Calculator, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Owner-focused marketing & advisory services.
 * SEO targets: "fotografii profesionale imobiliare Timișoara",
 * "tur virtual 360 apartament", "consultanță fiscală imobiliare Timișoara".
 */
const OwnerMarketingServices = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const t = {
    ro: {
      badge: "Marketing premium inclus",
      title: "Marketing premium și consultanță fiscală pentru proprietari",
      subtitle:
        "Fiecare apartament administrat beneficiază de un pachet complet de prezentare profesională și suport pentru optimizarea fiscală — fără costuri suplimentare ascunse.",
      items: [
        {
          icon: Camera,
          title: "Fotografii profesionale imobiliare Timișoara",
          desc: "Ședință foto de tip hospitality realizată de fotografi specializați în imobiliare, cu echipament profesional, iluminare cinematică și editare premium pentru Booking, Airbnb și anunțuri de vânzare.",
        },
        {
          icon: Video,
          title: "Tur virtual 360 apartament",
          desc: "Producem tur virtual 360 al apartamentului tău, integrat direct în listările Booking, Airbnb și pe pagina dedicată proprietății — crește semnificativ conversia și reduce vizionările necalificate.",
        },
        {
          icon: Calculator,
          title: "Consultanță fiscală imobiliare Timișoara",
          desc: "Suport dedicat pentru proprietari pe taxe venituri din chirii, regim hotelier vs. cedarea folosinței bunurilor, micro-întreprindere, PFA și optimizare fiscală conform Codului Fiscal 2026.",
        },
        {
          icon: Sparkles,
          title: "Optimizare anunț și SEO listare",
          desc: "Copywriting bilingv, pricing dinamic AI, optimizare titluri și descrieri pentru Booking, Airbnb și Expedia — apartamentul tău apare în top căutări locale.",
        },
      ],
    },
    en: {
      badge: "Premium marketing included",
      title: "Premium marketing & tax advisory for owners",
      subtitle:
        "Every managed apartment receives a complete professional presentation package and tax optimization support — with no hidden fees.",
      items: [
        {
          icon: Camera,
          title: "Professional real estate photography Timișoara",
          desc: "Hospitality-grade photo session by specialized real estate photographers, with professional gear, cinematic lighting and premium editing for Booking, Airbnb and sales listings.",
        },
        {
          icon: Video,
          title: "360° virtual tour for your apartment",
          desc: "We produce a 360° virtual tour embedded directly into Booking, Airbnb and the dedicated property page — significantly higher conversion and fewer unqualified visits.",
        },
        {
          icon: Calculator,
          title: "Real estate tax consulting Timișoara",
          desc: "Dedicated owner support for rental income tax, short-term rental vs. long-term lease, micro-company, PFA and full tax optimization per the 2026 Fiscal Code.",
        },
        {
          icon: Sparkles,
          title: "Listing & SEO optimization",
          desc: "Bilingual copywriting, AI dynamic pricing, optimized titles and descriptions for Booking, Airbnb and Expedia — your apartment ranks at the top of local searches.",
        },
      ],
    },
  }[lang];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            {t.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
          {t.items.map(({ icon: Icon, title, desc }, i) => (
            <article
              key={i}
              className="flex gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-elegant transition-all duration-300"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OwnerMarketingServices;
