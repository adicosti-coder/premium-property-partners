import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import RealEstateContactForm from "@/components/RealEstateContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Building2, 
  Home, 
  TrendingUp, 
  FileSearch, 
  Handshake, 
  Clock, 
  Shield, 
  Users, 
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

const Imobiliare = () => {
  const { t, language } = useLanguage();
  const realEstate = t.realEstatePage;

  // Scroll animation hooks for each section
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: servicesHeaderRef, isVisible: servicesHeaderVisible } = useScrollAnimation();
  const { ref: servicesGridRef, isVisible: servicesGridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: benefitsHeaderRef, isVisible: benefitsHeaderVisible } = useScrollAnimation();
  const { ref: benefitsGridRef, isVisible: benefitsGridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: processHeaderRef, isVisible: processHeaderVisible } = useScrollAnimation();
  const { ref: processGridRef, isVisible: processGridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  const services = [
    {
      icon: Building2,
      title: realEstate.services.selling.title,
      description: realEstate.services.selling.description,
      features: realEstate.services.selling.features,
    },
    {
      icon: Home,
      title: realEstate.services.buying.title,
      description: realEstate.services.buying.description,
      features: realEstate.services.buying.features,
    },
    {
      icon: TrendingUp,
      title: realEstate.services.renting.title,
      description: realEstate.services.renting.description,
      features: realEstate.services.renting.features,
    },
    {
      icon: FileSearch,
      title: realEstate.services.consulting.title,
      description: realEstate.services.consulting.description,
      features: realEstate.services.consulting.features,
    },
  ];

  const benefits = [
    { icon: Clock, text: realEstate.benefits.experience },
    { icon: Shield, text: realEstate.benefits.transparency },
    { icon: Users, text: realEstate.benefits.personalized },
    { icon: MapPin, text: realEstate.benefits.localExpertise },
    { icon: Handshake, text: realEstate.benefits.fullSupport },
    { icon: CheckCircle2, text: realEstate.benefits.results },
  ];

  const steps = [
    { number: "01", title: realEstate.process.steps[0].title, description: realEstate.process.steps[0].description },
    { number: "02", title: realEstate.process.steps[1].title, description: realEstate.process.steps[1].description },
    { number: "03", title: realEstate.process.steps[2].title, description: realEstate.process.steps[2].description },
    { number: "04", title: realEstate.process.steps[3].title, description: realEstate.process.steps[3].description },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div 
            ref={heroRef}
            className={`max-w-4xl mx-auto text-center transition-all duration-700 ${
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
              {realEstate.hero.badge}
            </span>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
              {realEstate.hero.title}{" "}
              <span className="text-primary">{realEstate.hero.titleHighlight}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {realEstate.hero.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(realEstate.cta.whatsappMessage)}`, '_blank')}
                className="group"
              >
                <Phone className="w-5 h-5 mr-2" />
                {realEstate.cta.contact}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {realEstate.cta.learnMore}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-6">
          <div 
            ref={servicesHeaderRef}
            className={`text-center mb-16 transition-all duration-700 ${
              servicesHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {realEstate.services.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {realEstate.services.title}{" "}
              <span className="text-primary">{realEstate.services.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {realEstate.services.subtitle}
            </p>
          </div>

          <div 
            ref={servicesGridRef}
            className={`grid md:grid-cols-2 gap-8 transition-all duration-700 delay-200 ${
              servicesGridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {service.description}
                      </p>
                      <ul className="space-y-2">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div 
            ref={benefitsHeaderRef}
            className={`text-center mb-16 transition-all duration-700 ${
              benefitsHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {realEstate.benefits.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {realEstate.benefits.title}{" "}
              <span className="text-primary">{realEstate.benefits.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {realEstate.benefits.subtitle}
            </p>
          </div>

          <div 
            ref={benefitsGridRef}
            className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${
              benefitsGridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-300"
                style={{ transitionDelay: `${index * 75}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-foreground font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-6">
          <div 
            ref={processHeaderRef}
            className={`text-center mb-16 transition-all duration-700 ${
              processHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {realEstate.process.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {realEstate.process.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {realEstate.process.subtitle}
            </p>
          </div>

          <div 
            ref={processGridRef}
            className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-700 delay-200 ${
              processGridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="relative"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-6xl font-serif font-bold text-primary/10 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 translate-x-1/2 w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <RealEstateContactForm />

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div 
            ref={ctaRef}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 md:p-16 text-center transition-all duration-700 ${
              ctaVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.2),transparent_50%)]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                {realEstate.cta.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                {realEstate.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {realEstate.cta.contact}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <a href="tel:+40723154520">
                  <Button variant="outline" size="lg">
                    <Phone className="w-5 h-5 mr-2" />
                    0723 154 520
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Imobiliare;
