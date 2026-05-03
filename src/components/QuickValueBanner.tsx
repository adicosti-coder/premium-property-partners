import { Clock, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

interface QuickValueBannerProps {
  onCtaClick?: () => void;
}

const QuickValueBanner = ({ onCtaClick }: QuickValueBannerProps) => {
  const { language } = useLanguage();

  const content = {
    ro: {
      badge: "În 24 de ore lucrătoare primești",
      items: [
        "Estimare de venit lunar pe baza ipotezelor publice (ocupare 75%, deducere 27%)",
        "Recomandări concrete de optimizare a anunțului",
        "Plan clar de colaborare, fără obligații",
      ],
      cta: "Solicită analiza gratuită",
    },
    en: {
      badge: "Within 24 business hours you receive",
      items: [
        "Monthly income estimate based on public assumptions (75% occupancy, 27% deduction)",
        "Concrete listing optimization recommendations",
        "Clear partnership plan, no obligations",
      ],
      cta: "Request the free analysis",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,hsl(var(--gold)/0.15),transparent_60%)]" />
      
      <div className="container mx-auto px-4 py-6 md:py-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Content */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            {/* Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Clock className="w-5 h-5 text-gold animate-pulse" />
              <span className="font-semibold text-lg">{t.badge}</span>
            </div>

            {/* Items */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-6">
              {t.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={onCtaClick}
            variant="secondary"
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-semibold group shrink-0"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {t.cta}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickValueBanner;
