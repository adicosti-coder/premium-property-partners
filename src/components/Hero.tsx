import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/apt-01.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Apartament de lux Timișoara"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
      </div>
      
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="container relative z-10 mx-auto px-6 py-20 lg:py-32">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-foreground/80 text-sm font-medium tracking-wide">{t.hero.badge}</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold text-foreground leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {t.hero.title}{" "}
            <span className="text-gradient-gold">{t.hero.titleHighlight}</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {t.hero.subtitle}
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Button variant="hero" size="xl" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
              {t.hero.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="heroOutline" size="xl" onClick={() => document.getElementById('cum-functioneaza')?.scrollIntoView({ behavior: 'smooth' })}>
              {t.hero.ctaSecondary}
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-border animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <p className="text-muted-foreground text-sm mb-4 uppercase tracking-widest">{t.hero.trustTitle}</p>
            <div className="flex flex-wrap gap-8 md:gap-16">
              <div>
                <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">150+</p>
                <p className="text-muted-foreground text-sm">{t.hero.stats.properties}</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">98%</p>
                <p className="text-muted-foreground text-sm">{t.hero.stats.occupancy}</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">4.9★</p>
                <p className="text-muted-foreground text-sm">{t.hero.stats.rating}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
