import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-hero flex items-center overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
      
      <div className="container relative z-10 mx-auto px-6 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream/10 border border-cream/20 mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-cream/80 text-sm font-medium tracking-wide">Administrare Premium în Regim Hotelier</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-semibold text-cream leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Maximizează Venitul.{" "}
            <span className="text-gradient-gold">Fără Efort.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-cream/70 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up font-sans" style={{ animationDelay: '0.3s' }}>
            Transformăm apartamentul tău într-o investiție profitabilă. 
            Gestionăm totul — de la rezervări la curățenie — pentru ca tu să te bucuri doar de rezultate.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Button variant="hero" size="xl">
              Solicită o Evaluare Gratuită
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Află Cum Funcționează
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-cream/10 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <p className="text-cream/40 text-sm mb-4 uppercase tracking-widest font-sans">De Încredere Pentru</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-serif font-semibold text-cream">150+</p>
                <p className="text-cream/50 text-sm font-sans">Proprietăți Gestionate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-serif font-semibold text-cream">98%</p>
                <p className="text-cream/50 text-sm font-sans">Rată de Ocupare</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-serif font-semibold text-cream">4.9★</p>
                <p className="text-cream/50 text-sm font-sans">Rating Mediu</p>
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
