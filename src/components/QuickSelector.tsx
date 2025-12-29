import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Building, Users, Home, ArrowRight, Phone, MessageCircle, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickSelector = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const translations = {
    ro: {
      badge: "Alege direcția potrivită în 30 de secunde:",
      subtitle: "3 opțiuni. 0 confuzie. Context suficient ca să iei o decizie bună în 1–2 minute.",
      startRapid: "Start rapid:",
      startRapidText: "trimite zona + suprafața + 8–12 poze și primești o estimare realistă + pași concreți.",
      options: [
        {
          badge: "PROPRIETARI",
          badgeColor: "bg-primary/20 text-primary border-primary/30",
          action: "Recomandat",
          title: "Administrare completă în regim hotelier",
          description: "Preț dinamic, listări, oaspeți, curățenie, mentenanță, recenzii și raportare. Tu rămâi cu venitul și liniștea.",
          features: [
            "Poziționare + conversie (poze, titlu, descriere)",
            "Standard operațional (checklists, consumabile)",
            "Protecția activului (intervenții rapide)"
          ],
          cta: "Vreau ofertă",
          ctaSecondary: "Cum lucrăm",
          icon: Building,
          scrollTo: "contact"
        },
        {
          badge: "OASPEȚI",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          action: "Rezervare",
          title: "Apartamente premium în Timișoara",
          description: "Self check-in, curățenie impecabilă, locații excelente. Vezi lista și rezervă ușor.",
          features: [
            "Instrucțiuni clare + suport rapid",
            "Standard hotel (lenjerii, prosoape)",
            "Locații ultracentrale / parcare"
          ],
          cta: "Vezi apartamente",
          ctaSecondary: "EN Guests",
          icon: Users,
          scrollTo: "oaspeti"
        },
        {
          badge: "IMOBILIARE",
          badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          action: "Investiții",
          title: "Cumperi pentru randament?",
          description: "Te ajutăm să alegi unități care 'țin' în regim hotelier: zonă, layout, parcare, risc.",
          features: [
            "Selecție unități + filtrare",
            "Scenarii de randament: chirie vs hotelier",
            "Plan minim amenajare pentru conversie"
          ],
          cta: "Merg la Imobiliare",
          ctaSecondary: "Cere consultanță",
          icon: Home,
          link: "/imobiliare"
        }
      ]
    },
    en: {
      badge: "Choose the right direction in 30 seconds:",
      subtitle: "3 options. 0 confusion. Enough context to make a good decision in 1–2 minutes.",
      startRapid: "Quick start:",
      startRapidText: "send the area + surface + 8–12 photos and receive a realistic estimate + concrete steps.",
      options: [
        {
          badge: "OWNERS",
          badgeColor: "bg-primary/20 text-primary border-primary/30",
          action: "Recommended",
          title: "Complete hotel-style management",
          description: "Dynamic pricing, listings, guests, cleaning, maintenance, reviews and reporting. You keep the income and peace of mind.",
          features: [
            "Positioning + conversion (photos, title, description)",
            "Operational standard (checklists, consumables)",
            "Asset protection (quick interventions)"
          ],
          cta: "Get an offer",
          ctaSecondary: "How we work",
          icon: Building,
          scrollTo: "contact"
        },
        {
          badge: "GUESTS",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          action: "Book",
          title: "Premium apartments in Timișoara",
          description: "Self check-in, impeccable cleaning, excellent locations. See the list and book easily.",
          features: [
            "Clear instructions + quick support",
            "Hotel standard (linens, towels)",
            "Central locations / parking"
          ],
          cta: "See apartments",
          ctaSecondary: "RO Oaspeți",
          icon: Users,
          scrollTo: "oaspeti"
        },
        {
          badge: "REAL ESTATE",
          badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          action: "Investments",
          title: "Buying for yield?",
          description: "We help you choose units that 'work' in hotel mode: area, layout, parking, risk.",
          features: [
            "Unit selection + filtering",
            "Yield scenarios: rent vs hotel",
            "Minimum renovation plan for conversion"
          ],
          cta: "Go to Real Estate",
          ctaSecondary: "Get consulting",
          icon: Home,
          link: "/imobiliare"
        }
      ]
    }
  };

  const t = translations[language];

  const handleOptionClick = (option: typeof t.options[0]) => {
    if (option.link) {
      navigate(option.link);
    } else if (option.scrollTo) {
      document.getElementById(option.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 md:py-24 bg-card/50 border-y border-border/50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-muted-foreground mb-4">{t.subtitle}</p>
        </div>

        {/* Quick Start Banner */}
        <div className="max-w-3xl mx-auto mb-12 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-center text-foreground/90">
            <span className="font-semibold text-primary">{t.startRapid}</span>{" "}
            <span className="text-muted-foreground">{t.startRapidText}</span>
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <a 
              href="https://wa.me/40723154520" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
            <a 
              href="tel:+40723154520"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              0723 154 520
            </a>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {t.options.map((option, index) => {
            const Icon = option.icon;
            return (
              <div 
                key={index}
                className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Badge + Action */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${option.badgeColor}`}>
                    {option.badge}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{option.action}</span>
                </div>

                {/* Icon */}
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                  {option.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {option.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTAs */}
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => handleOptionClick(option)}
                    className="w-full group/btn"
                  >
                    {option.cta}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (option.scrollTo === 'contact') {
                        document.getElementById('cum-functioneaza')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {option.ctaSecondary}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickSelector;
