import { useState } from "react";
import { Key, Clock, Sparkles, ShieldCheck, Wifi, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import BookingForm from "./BookingForm";

const icons = [Key, Clock, Sparkles, ShieldCheck, Wifi, MapPin];

const GuestSection = () => {
  const { t } = useLanguage();
  const [bookingOpen, setBookingOpen] = useState(false);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  return (
    <section id="oaspeti" className="py-24 bg-card relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Key className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.guestSection.badge}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.guestSection.title} <span className="text-gradient-gold">{t.guestSection.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.guestSection.subtitle}
          </p>
        </div>

        <div 
          ref={gridRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12"
        >
          {t.guestSection.features.map((feature, index) => {
            const Icon = icons[index];
            return (
              <div
                key={index}
                className={`group p-6 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border hover:border-primary/20 transition-all duration-500 ${
                  gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 75}ms` : '0ms' }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div 
          ref={ctaRef}
          className={`text-center flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 ${
            ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Button 
            variant="hero" 
            size="xl" 
            onClick={() => setBookingOpen(true)}
          >
            <Calendar className="w-5 h-5 mr-2" />
            {t.guestSection.bookNow}
          </Button>
          <Button 
            variant="heroOutline" 
            size="xl" 
            onClick={() => {
              const portfolioSection = document.getElementById('portofoliu');
              portfolioSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t.guestSection.viewApartments}
          </Button>
        </div>
      </div>

      {/* Booking Form Modal */}
      <BookingForm 
        isOpen={bookingOpen} 
        onClose={() => setBookingOpen(false)} 
      />
    </section>
  );
};

export default GuestSection;