import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { Home, Building2, ArrowRight, ArrowLeft } from "lucide-react";

const BlogArticleCTA = () => {
  const { language } = useLanguage();

  const translations = {
    ro: {
      // Guest Section
      guestLabel: "CAZARE OASPEȚI",
      guestTitle: "Cazare premium în Timișoara",
      guestDescription: "Apartamente premium, self check-in, locații centrale. Simplu, rapid, confortabil.",
      guestCta: "Vezi opțiunile disponibile",
      guestBack: "Înapoi la Acasă",
      
      // Owner Section
      ownerLabel: "PROPRIETARI",
      ownerTitle: "Vrei administrare ca la hotel pentru proprietatea ta?",
      ownerDescription: "Cere o analiză gratuită: estimare realistă + 3 recomandări concrete. Fără obligații.",
      ownerCta: "Cere analiză gratuită",
      ownerBack: "Înapoi la Blog",
      ownerFooter: "Plățile intră direct la tine · structură transparentă · fără obligații.",
    },
    en: {
      // Guest Section
      guestLabel: "GUEST ACCOMMODATION",
      guestTitle: "Premium Accommodation in Timișoara",
      guestDescription: "Premium apartments, self check-in, central locations. Simple, fast, comfortable.",
      guestCta: "See available options",
      guestBack: "Back to Home",
      
      // Owner Section
      ownerLabel: "PROPERTY OWNERS",
      ownerTitle: "Want hotel-style management for your property?",
      ownerDescription: "Request a free analysis: realistic estimate + 3 concrete recommendations. No obligations.",
      ownerCta: "Request free analysis",
      ownerBack: "Back to Blog",
      ownerFooter: "Payments go directly to you · transparent structure · no obligations.",
    },
  };

  const t = translations[language] || translations.ro;

  return (
    <div className="space-y-6 my-12">
      {/* Guest Section */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Home className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {t.guestLabel}
            </span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
            {t.guestTitle}
          </h3>
          
          <p className="text-muted-foreground mb-6">
            {t.guestDescription}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link to="/guests">
                {t.guestCta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                {t.guestBack}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Owner Section */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {t.ownerLabel}
            </span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">
            {t.ownerTitle}
          </h3>
          
          <p className="text-muted-foreground mb-6">
            {t.ownerDescription}
          </p>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <Button asChild className="gap-2">
              <Link to="/pentru-proprietari#calculator">
                {t.ownerCta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4" />
                {t.ownerBack}
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground/70 border-t border-border/30 pt-4">
            {t.ownerFooter}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogArticleCTA;
