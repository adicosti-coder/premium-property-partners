import { Quote, Star, TrendingUp } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Premium testimonials section for property owners.
 * Highlights peace-of-mind from full management and 9%+ ROI.
 */
const OwnerTestimonials = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const t = {
    ro: {
      badge: "Proprietari mulțumiți",
      title: "Liniște completă, randament real",
      subtitle:
        "Citate reale de la proprietari care au ales managementul complet RealTrust și au depășit pragul de 9% ROI net anual.",
      items: [
        {
          quote:
            "Am uitat că am apartament. Primesc raportul lunar, banii intră în cont, iar randamentul a depășit 9.6% în primul an. Liniște absolută.",
          name: "Mihai D.",
          role: "Proprietar 2 apartamente · ISHO",
          roi: "9.6% ROI net",
        },
        {
          quote:
            "Locuiesc în Germania, apartamentul e în Timișoara. RealTrust se ocupă de tot — oaspeți, curățenie, mentenanță. Eu doar verific încasările.",
          name: "Andreea P.",
          role: "Proprietar · Cetate (Centrul Istoric)",
          roi: "9.2% ROI net",
        },
        {
          quote:
            "Am comparat 3 firme de management. RealTrust a fost singura care mi-a arătat un calcul transparent, fără costuri ascunse. ROI promis = ROI livrat.",
          name: "Cristian B.",
          role: "Investitor · 4 apartamente Dumbrăvița",
          roi: "9.8% ROI net",
        },
      ],
    },
    en: {
      badge: "Happy owners",
      title: "Complete peace of mind, real returns",
      subtitle:
        "Real quotes from owners who chose RealTrust full management and broke the 9% net annual ROI mark.",
      items: [
        {
          quote:
            "I forgot I own an apartment. I get the monthly report, money lands in my account, and yield went above 9.6% in year one. Absolute peace of mind.",
          name: "Mihai D.",
          role: "Owner of 2 apartments · ISHO",
          roi: "9.6% net ROI",
        },
        {
          quote:
            "I live in Germany, the apartment is in Timișoara. RealTrust handles everything — guests, cleaning, maintenance. I just check the payouts.",
          name: "Andreea P.",
          role: "Owner · Cetate (Historic Center)",
          roi: "9.2% net ROI",
        },
        {
          quote:
            "I compared 3 management firms. RealTrust was the only one with a transparent calculation, no hidden fees. Promised ROI = delivered ROI.",
          name: "Cristian B.",
          role: "Investor · 4 apartments Dumbrăvița",
          roi: "9.8% net ROI",
        },
      ],
    },
  }[lang];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-secondary/20 to-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <Star className="w-4 h-4 fill-current" />
            {t.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {t.items.map((item, i) => (
            <article
              key={i}
              className="relative flex flex-col p-6 md:p-7 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-elegant transition-all duration-300"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/15" />

              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-500 text-amber-500" />
                ))}
              </div>

              <p className="text-base text-foreground/90 leading-relaxed mb-6 flex-1">
                "{item.quote}"
              </p>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.role}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold whitespace-nowrap">
                    <TrendingUp className="w-3 h-3" />
                    {item.roi}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OwnerTestimonials;
