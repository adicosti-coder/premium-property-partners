import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RealEstateContactForm from "@/components/RealEstateContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
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
  ArrowRight,
  Key,
  Eye
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import InvestmentYieldCalculator from "@/components/InvestmentYieldCalculator";
import PropertyGallery from "@/components/PropertyGallery";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { generateRealEstateAgentSchema, generateBreadcrumbSchema } from "@/utils/schemaGenerators";

interface ListingProperty {
  id: string;
  name: string;
  location: string;
  listing_type: string | null;
  capital_necesar: number | null;
  image_path: string | null;
  tag: string;
  description_ro: string;
  description_en: string;
  property_code: string | null;
}

const Imobiliare = () => {
  const { t, language } = useLanguage();
  const realEstate = t.realEstatePage;
  const navigate = useNavigate();
  const [listingView, setListingView] = useState<'vanzare' | 'inchiriere'>('vanzare');

  // Fetch properties for sale/rent
  const { data: listingProperties, isLoading: listingsLoading } = useQuery({
    queryKey: ["listing-properties", listingView],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, location, listing_type, capital_necesar, image_path, tag, description_ro, description_en, property_code")
        .eq("is_active", true)
        .eq("listing_type", listingView)
        .order("display_order");
      if (error) throw error;
      return data as ListingProperty[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Scroll animation hooks for each section
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: servicesHeaderRef, isVisible: servicesHeaderVisible } = useScrollAnimation();
  const { ref: servicesGridRef, isVisible: servicesGridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: benefitsHeaderRef, isVisible: benefitsHeaderVisible } = useScrollAnimation();
  const { ref: benefitsGridRef, isVisible: benefitsGridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: processHeaderRef, isVisible: processHeaderVisible } = useScrollAnimation();
  const { ref: processGridRef, isVisible: processGridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  // Parallax effects for decorative elements
  const { offset: parallaxSlow } = useParallax({ speed: 0.15, direction: 'up' });
  const { offset: parallaxMedium } = useParallax({ speed: 0.25, direction: 'up' });
  const { offset: parallaxFast } = useParallax({ speed: 0.35, direction: 'down' });

  // Typing animation for Hero title - optimized for mobile
  const { displayedText: typedTitle, isComplete: titleComplete } = useTypingAnimation({
    text: realEstate.hero.title,
    speed: 40, // Faster typing (was 60)
    delay: 200 // Shorter delay (was 300)
  });

  // Typing animation for Hero subtitle (starts after title completes) - optimized
  const titleDuration = realEstate.hero.title.length * 40 + 200 + 250; // Reduced buffer (was 500)
  const { displayedText: typedSubtitle, isComplete: subtitleComplete } = useTypingAnimation({
    text: realEstate.hero.subtitle,
    speed: 20, // Faster typing (was 30)
    delay: titleDuration
  });

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

  const seoContent = {
    ro: {
      title: "Servicii Imobiliare Timișoara | Vânzări, Achiziții, Închirieri | RealTrust",
      description: "Servicii imobiliare complete în Timișoara. Vânzări, achiziții, închirieri și consultanță. Experiență de 25+ ani. Contactați-ne!"
    },
    en: {
      title: "Real Estate Services Timișoara | Sales, Acquisitions, Rentals | RealTrust",
      description: "Complete real estate services in Timișoara. Sales, acquisitions, rentals and consulting. 25+ years experience. Contact us!"
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  const breadcrumbItems = [
    { label: language === "ro" ? "Servicii Imobiliare" : "Real Estate Services" }
  ];

  // Generate Schema.org structured data
  const realEstateAgentSchema = generateRealEstateAgentSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Acasă", url: "https://realtrust.ro" },
    { name: language === "ro" ? "Servicii Imobiliare" : "Real Estate Services", url: "https://realtrust.ro/imobiliare" }
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/imobiliare"
        jsonLd={[realEstateAgentSchema, breadcrumbSchema]}
      />
      <Header />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 pt-24">
        <PageBreadcrumb items={breadcrumbItems} />
      </div>
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        
        {/* Parallax decorative elements - Hero - offset to prevent visible edge overflow */}
        <div 
          className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-primary/5 blur-3xl"
          style={{ transform: `translateY(${parallaxSlow}px)` }}
        />
        <div 
          className="absolute top-40 right-[10%] w-48 h-48 rounded-full bg-primary/8 blur-3xl"
          style={{ transform: `translateY(${parallaxMedium}px)` }}
        />
        <div 
          className="absolute bottom-10 left-1/4 w-24 h-24 rounded-full bg-primary/10 blur-2xl"
          style={{ transform: `translateY(${parallaxFast}px)` }}
        />
        
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
              {typedTitle}
              <span className={`inline-block w-0.5 h-[1em] bg-primary ml-1 align-middle transition-opacity duration-300 ${titleComplete ? 'opacity-0' : 'animate-pulse'}`} />
              {titleComplete && (
                <>
                  {" "}
                  <span className="text-primary animate-fade-in">{realEstate.hero.titleHighlight}</span>
                </>
              )}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {typedSubtitle}
              <span className={`inline-block w-0.5 h-[1em] bg-muted-foreground/50 ml-0.5 align-middle transition-opacity duration-300 ${subtitleComplete || !titleComplete ? 'opacity-0' : 'animate-pulse'}`} />
            </p>
            
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(realEstate.cta.whatsappMessage)}`, '_blank')}
                className={`group transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                style={{ transitionDelay: subtitleComplete ? '50ms' : '0ms' }}
              >
                <Phone className="w-5 h-5 mr-2" />
                {realEstate.cta.contact}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                className={`transition-all duration-300 ${subtitleComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                style={{ transitionDelay: subtitleComplete ? '120ms' : '0ms' }}
              >
                {realEstate.cta.learnMore}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Property Portfolio - showcase before calculator */}
      <PropertyGallery />

      {/* Investment Yield Calculator - only for sales, not rentals */}
      {listingView !== 'inchiriere' && <InvestmentYieldCalculator />}

      {/* Services Section */}
      <section id="services" className="relative py-20 md:py-28 bg-muted/30 overflow-hidden">
        {/* Parallax decorative elements - Services - offset to prevent edge overflow */}
        <div 
          className="absolute top-32 right-[10%] w-40 h-40 rounded-full bg-primary/5 blur-3xl"
          style={{ transform: `translateY(${parallaxMedium}px)` }}
        />
        <div 
          className="absolute bottom-20 left-[10%] w-28 h-28 rounded-full bg-primary/8 blur-2xl"
          style={{ transform: `translateY(${parallaxSlow}px)` }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
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
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Parallax decorative elements - Benefits - offset to prevent edge overflow */}
        <div 
          className="absolute top-16 left-[10%] w-36 h-36 rounded-full bg-primary/5 blur-3xl"
          style={{ transform: `translateY(${parallaxFast}px)` }}
        />
        <div 
          className="absolute bottom-24 right-[10%] w-44 h-44 rounded-full bg-primary/6 blur-3xl"
          style={{ transform: `translateY(${parallaxMedium}px)` }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
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
      <section className="relative py-20 md:py-28 bg-muted/30 overflow-hidden">
        {/* Parallax decorative elements - Process - offset to prevent edge overflow */}
        <div 
          className="absolute top-24 right-[15%] w-32 h-32 rounded-full bg-primary/5 blur-3xl"
          style={{ transform: `translateY(${parallaxSlow}px)` }}
        />
        <div 
          className="absolute bottom-16 left-1/3 w-40 h-40 rounded-full bg-primary/8 blur-3xl"
          style={{ transform: `translateY(${parallaxMedium}px)` }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
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

      {/* Properties Listings Section */}
      <section id="proprietati" className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {language === 'ro' ? 'Portofoliu' : 'Portfolio'}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {language === 'ro' ? 'Proprietăți Disponibile' : 'Available Properties'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {language === 'ro' 
                ? 'Explorează portofoliul nostru de proprietăți disponibile pentru vânzare sau închiriere pe termen lung.' 
                : 'Explore our portfolio of properties available for sale or long-term rental.'}
            </p>

            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-10">
              <Button 
                variant={listingView === 'vanzare' ? 'default' : 'outline'}
                onClick={() => setListingView('vanzare')}
                className="min-w-[140px]"
              >
                <Building2 className="w-4 h-4 mr-2" />
                {language === 'ro' ? 'Vânzări' : 'Sales'}
              </Button>
              <Button 
                variant={listingView === 'inchiriere' ? 'default' : 'outline'}
                onClick={() => setListingView('inchiriere')}
                className="min-w-[140px]"
              >
                <Key className="w-4 h-4 mr-2" />
                {language === 'ro' ? 'Închirieri' : 'Rentals'}
              </Button>
            </div>
          </div>

          {/* Properties Grid */}
          {listingsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-6" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : listingProperties && listingProperties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {listingProperties.map((property) => (
                <Card 
                  key={property.id} 
                  className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                >
                  {/* Property Image */}
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {property.image_path ? (
                      <img 
                        src={property.image_path.startsWith("http") ? property.image_path : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${property.image_path}`}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    {property.property_code && (
                      <Badge className="absolute top-4 left-4 bg-slate-900/80 text-white font-mono text-xs">
                        {property.property_code}
                      </Badge>
                    )}
                    <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                      {property.tag}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className="absolute top-4 right-4"
                    >
                      {listingView === 'vanzare' 
                        ? (language === 'ro' ? 'De Vânzare' : 'For Sale')
                        : (language === 'ro' ? 'De Închiriat' : 'For Rent')}
                    </Badge>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {property.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      {property.location}
                    </div>
                    
                    {property.capital_necesar && (
                      <div className="text-2xl font-bold text-primary mb-4">
                        {new Intl.NumberFormat("ro-RO", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(property.capital_necesar)}
                        {listingView === 'inchiriere' && <span className="text-sm font-normal text-muted-foreground">/lună</span>}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {language === 'ro' ? property.description_ro : property.description_en}
                    </p>

                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate(`/proprietate/${property.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {language === 'ro' ? 'Vezi Detalii' : 'View Details'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button 
                        variant="hero" 
                        className="w-full"
                        onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`${language === "ro" ? "Bună ziua, sunt interesat de proprietatea" : "Hello, I'm interested in the property"} ${property.property_code ? `[${property.property_code}]` : ""}: ${property.name}`)}`, '_blank')}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {language === 'ro' ? 'Programează Vizionare' : 'Schedule Viewing'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {language === 'ro' 
                  ? `Momentan nu avem proprietăți de ${listingView === 'vanzare' ? 'vânzare' : 'închiriat'}`
                  : `No properties for ${listingView === 'vanzare' ? 'sale' : 'rent'} at the moment`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {language === 'ro' 
                  ? 'Contactează-ne pentru a fi notificat când apar noi proprietăți.'
                  : 'Contact us to be notified when new properties become available.'}
              </p>
              <Button 
                variant="hero"
                onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(language === "ro" ? "Bună ziua, caut o proprietate." : "Hello, I'm looking for a property.")}`, '_blank')}
              >
                <Phone className="w-5 h-5 mr-2" />
                {language === 'ro' ? 'Contactează-ne' : 'Contact Us'}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Form Section */}
      <RealEstateContactForm />

      {/* CTA Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Parallax decorative elements - CTA */}
        <div 
          className="absolute top-10 left-1/4 w-24 h-24 rounded-full bg-primary/6 blur-2xl"
          style={{ transform: `translateY(${parallaxFast}px)` }}
        />
        <div 
          className="absolute bottom-20 right-1/4 w-36 h-36 rounded-full bg-primary/5 blur-3xl"
          style={{ transform: `translateY(${parallaxSlow}px)` }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
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
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default Imobiliare;
