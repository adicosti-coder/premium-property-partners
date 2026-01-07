import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Check, 
  X, 
  Percent, 
  Shield, 
  MessageCircle, 
  Clock, 
  Gift, 
  CreditCard,
  HeadphonesIcon,
  Sparkles,
  ArrowRight,
  Quote,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";

const WhyBookDirect = () => {
  const { t } = useLanguage();
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: comparisonRef, isVisible: comparisonVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: benefitsRef, isVisible: benefitsVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: testimonialsRef, isVisible: testimonialsVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation({ threshold: 0.1 });

  const directBookingTestimonials = [
    {
      name: "Maria D.",
      location: "București",
      text: t.whyBookDirect?.testimonials?.maria || "Am economisit 45€ rezervând direct! Plus, am primit early check-in gratuit care pe Booking ar fi costat extra. Comunicarea a fost mult mai rapidă și personalizată.",
      savings: "45€",
      rating: 5,
    },
    {
      name: "Andrei P.",
      location: "Cluj-Napoca",
      text: t.whyBookDirect?.testimonials?.andrei || "Prima dată când am rezervat direct și nu regret! Codul DIRECT5 mi-a adus reducere, iar când am avut nevoie să schimb data, totul s-a rezolvat în 5 minute.",
      savings: "38€",
      rating: 5,
    },
    {
      name: "Elena S.",
      location: "Iași",
      text: t.whyBookDirect?.testimonials?.elena || "Apreciez transparența prețurilor - fără taxe ascunse ca pe platforme. Am primit și un upgrade gratuit la apartament pentru că era disponibil. Super experiență!",
      savings: "52€",
      rating: 5,
    },
  ];

  const benefits = [
    {
      icon: Percent,
      title: t.whyBookDirect?.benefits?.price?.title || "Cel mai bun preț garantat",
      description: t.whyBookDirect?.benefits?.price?.description || "Economisești 5-15% față de platformele externe. Folosește codul DIRECT5 pentru reducere imediată.",
    },
    {
      icon: MessageCircle,
      title: t.whyBookDirect?.benefits?.communication?.title || "Comunicare directă",
      description: t.whyBookDirect?.benefits?.communication?.description || "Vorbești direct cu noi, fără intermediari. Răspunsuri rapide și personalizate la orice întrebare.",
    },
    {
      icon: Clock,
      title: t.whyBookDirect?.benefits?.flexibility?.title || "Flexibilitate maximă",
      description: t.whyBookDirect?.benefits?.flexibility?.description || "Modificări gratuite, check-in/out flexibil și politici adaptate nevoilor tale.",
    },
    {
      icon: Gift,
      title: t.whyBookDirect?.benefits?.perks?.title || "Beneficii exclusive",
      description: t.whyBookDirect?.benefits?.perks?.description || "Early check-in gratuit, upgrade la cameră (dacă disponibil), și surprize pentru oaspeții fideli.",
    },
    {
      icon: Shield,
      title: t.whyBookDirect?.benefits?.security?.title || "Siguranță garantată",
      description: t.whyBookDirect?.benefits?.security?.description || "Plăți securizate, confirmare instantă și suport non-stop pentru orice problemă.",
    },
    {
      icon: HeadphonesIcon,
      title: t.whyBookDirect?.benefits?.support?.title || "Suport dedicat 24/7",
      description: t.whyBookDirect?.benefits?.support?.description || "Echipa noastră este disponibilă oricând pentru a te ajuta, inclusiv în timpul sejurului.",
    },
  ];

  const comparisonItems = [
    { 
      feature: t.whyBookDirect?.comparison?.bestPrice || "Cel mai bun preț", 
      direct: true, 
      platform: false 
    },
    { 
      feature: t.whyBookDirect?.comparison?.directComm || "Comunicare directă cu gazda", 
      direct: true, 
      platform: false 
    },
    { 
      feature: t.whyBookDirect?.comparison?.flexCancel || "Anulare flexibilă", 
      direct: true, 
      platform: false 
    },
    { 
      feature: t.whyBookDirect?.comparison?.noFees || "Fără taxe ascunse", 
      direct: true, 
      platform: false 
    },
    { 
      feature: t.whyBookDirect?.comparison?.earlyCheckin || "Early check-in gratuit", 
      direct: true, 
      platform: false 
    },
    { 
      feature: t.whyBookDirect?.comparison?.exclusiveOffers || "Oferte exclusive", 
      direct: true, 
      platform: false 
    },
    { 
      feature: t.whyBookDirect?.comparison?.instantConfirm || "Confirmare instantă", 
      direct: true, 
      platform: true 
    },
    { 
      feature: t.whyBookDirect?.comparison?.securePayment || "Plată securizată", 
      direct: true, 
      platform: true 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 md:pt-24">
        {/* Hero Section */}
        <section 
          ref={heroRef}
          className="section-padding bg-gradient-to-b from-primary/5 to-background"
        >
          <div className="container mx-auto px-6">
            <div className={`max-w-4xl mx-auto text-center transition-all duration-700 ${
              heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs uppercase tracking-widest rounded-full mb-6">
                {t.whyBookDirect?.badge || "Rezervă Direct & Economisește"}
              </span>
              <h1 className="heading-premium text-4xl md:text-5xl lg:text-6xl mb-6">
                {t.whyBookDirect?.title || "De Ce Să Rezervi"}{" "}
                <span className="text-primary">{t.whyBookDirect?.titleHighlight || "Direct?"}</span>
              </h1>
              <p className="text-premium text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                {t.whyBookDirect?.subtitle || "Descoperă toate avantajele rezervării directe față de platformele externe. Prețuri mai bune, flexibilitate sporită și beneficii exclusive."}
              </p>
              
              {/* Discount Code Banner */}
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 rounded-2xl">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-foreground font-medium">
                  {t.whyBookDirect?.promoText || "Folosește codul"}{" "}
                  <span className="font-bold text-amber-600 bg-amber-500/20 px-2 py-0.5 rounded">DIRECT5</span>{" "}
                  {t.whyBookDirect?.promoSuffix || "pentru 5% reducere!"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section ref={comparisonRef} className="section-padding">
          <div className="container mx-auto px-6">
            <div className={`text-center section-header-spacing transition-all duration-700 ${
              comparisonVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <h2 className="heading-premium text-3xl md:text-4xl mb-4">
                {t.whyBookDirect?.comparisonTitle || "Comparație Rapidă"}
              </h2>
              <p className="text-premium text-muted-foreground max-w-2xl mx-auto">
                {t.whyBookDirect?.comparisonSubtitle || "Vezi diferențele dintre rezervarea directă și platformele externe"}
              </p>
            </div>

            <div className={`max-w-3xl mx-auto transition-all duration-700 delay-200 ${
              comparisonVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <Card className="overflow-hidden border-2">
                <CardContent className="p-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-3 bg-muted/50 border-b">
                    <div className="p-4 font-medium text-muted-foreground">
                      {t.whyBookDirect?.featureLabel || "Caracteristică"}
                    </div>
                    <div className="p-4 text-center font-semibold text-primary border-x bg-primary/5">
                      {t.whyBookDirect?.directLabel || "Direct"}
                    </div>
                    <div className="p-4 text-center font-medium text-muted-foreground">
                      {t.whyBookDirect?.platformLabel || "Platforme"}
                    </div>
                  </div>
                  
                  {/* Table Rows */}
                  {comparisonItems.map((item, index) => (
                    <div 
                      key={index} 
                      className={`grid grid-cols-3 border-b last:border-b-0 transition-all duration-500 ${
                        comparisonVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                      }`}
                      style={{ transitionDelay: `${300 + index * 50}ms` }}
                    >
                      <div className="p-4 text-sm md:text-base">{item.feature}</div>
                      <div className="p-4 flex justify-center items-center border-x bg-primary/5">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="p-4 flex justify-center items-center">
                        {item.platform ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section ref={benefitsRef} className="section-padding bg-secondary/30">
          <div className="container mx-auto px-6">
            <div className={`text-center section-header-spacing transition-all duration-700 ${
              benefitsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <h2 className="heading-premium text-3xl md:text-4xl mb-4">
                {t.whyBookDirect?.benefitsTitle || "Beneficiile Rezervării Directe"}
              </h2>
              <p className="text-premium text-muted-foreground max-w-2xl mx-auto">
                {t.whyBookDirect?.benefitsSubtitle || "Mai mult decât economii — o experiență completă"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card 
                    key={index}
                    className={`group hover:shadow-xl transition-all duration-500 border-2 hover:border-primary/30 ${
                      benefitsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}
                    style={{ transitionDelay: `${150 + index * 100}ms` }}
                  >
                    <CardContent className="p-6 md:p-8">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-serif text-xl font-semibold mb-3">{benefit.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Price Example */}
        <section className="section-padding">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="heading-premium text-2xl md:text-3xl mb-4">
                        {t.whyBookDirect?.exampleTitle || "Exemplu Concret"}
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {t.whyBookDirect?.exampleText || "Pentru un sejur de 3 nopți la 100€/noapte:"}
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground">{t.whyBookDirect?.platformPrice || "Preț pe Booking.com"}</span>
                          <span className="font-semibold line-through text-red-400">315€</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground">{t.whyBookDirect?.ourPrice || "Prețul nostru direct"}</span>
                          <span className="font-semibold">300€</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground">{t.whyBookDirect?.withCode || "Cu codul DIRECT5"}</span>
                          <span className="font-bold text-primary text-lg">285€</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center md:text-right">
                      <div className="inline-block p-6 bg-green-500/10 rounded-2xl">
                        <p className="text-sm text-muted-foreground mb-2">
                          {t.whyBookDirect?.totalSavings || "Economisești în total"}
                        </p>
                        <p className="text-5xl md:text-6xl font-bold text-green-500">30€</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {t.whyBookDirect?.savingsPercent || "~10% economie"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section ref={testimonialsRef} className="section-padding bg-secondary/30">
          <div className="container mx-auto px-6">
            <div className={`text-center section-header-spacing transition-all duration-700 ${
              testimonialsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <h2 className="heading-premium text-3xl md:text-4xl mb-4">
                {t.whyBookDirect?.testimonialsTitle || "Ce Spun Oaspeții Noștri"}
              </h2>
              <p className="text-premium text-muted-foreground max-w-2xl mx-auto">
                {t.whyBookDirect?.testimonialsSubtitle || "Experiențe reale de la oaspeți care au rezervat direct"}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {directBookingTestimonials.map((testimonial, index) => (
                <Card 
                  key={index}
                  className={`relative overflow-hidden border-2 hover:border-primary/30 transition-all duration-500 ${
                    testimonialsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${150 + index * 100}ms` }}
                >
                  <CardContent className="p-6 md:p-8">
                    {/* Quote icon */}
                    <Quote className="w-10 h-10 text-primary/20 mb-4" />
                    
                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    
                    {/* Text */}
                    <p className="text-foreground mb-6 leading-relaxed italic">
                      "{testimonial.text}"
                    </p>
                    
                    {/* Author & Savings */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t.whyBookDirect?.saved || "A economisit"}</p>
                        <p className="font-bold text-green-500 text-lg">{testimonial.savings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section ref={ctaRef} className="section-padding bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-6">
            <div className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
              ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <h2 className="heading-premium text-3xl md:text-4xl mb-6">
                {t.whyBookDirect?.ctaTitle || "Rezervă Direct Acum"}
              </h2>
              <p className="text-premium text-muted-foreground mb-8">
                {t.whyBookDirect?.ctaText || "Explorează proprietățile noastre și beneficiază de cele mai bune prețuri"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/oaspeti">
                  <Button size="lg" className="group px-8">
                    {t.whyBookDirect?.ctaButton || "Vezi Proprietățile"}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/#contact">
                  <Button size="lg" variant="outline" className="px-8">
                    {t.whyBookDirect?.ctaContact || "Contactează-ne"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WhyBookDirect;