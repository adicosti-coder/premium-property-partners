import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import FacilitiesShowcase from "@/components/FacilitiesShowcase";
import DigitalHouseManual from "@/components/DigitalHouseManual";
import CleaningStandards from "@/components/CleaningStandards";
import PropertyMap from "@/components/PropertyMap";
import InteractiveMapWithPOI from "@/components/InteractiveMapWithPOI";
import QuickAvailabilitySearch from "@/components/QuickAvailabilitySearch";
import CityGuideSection from "@/components/CityGuideSection";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { 
  Star, 
  Shield, 
  Clock, 
  Wifi, 
  MapPin, 
  Heart,
  CheckCircle2,
  ArrowRight,
  Calendar,
  MessageSquare,
  Key,
  Sparkles,
  Award,
  Users,
  Phone,
  Map,
  Building2,
  Navigation
} from "lucide-react";
import { getActiveProperties } from "@/data/properties";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PentruOaspeti = () => {
  const { language } = useLanguage();
  const [selectedProperty, setSelectedProperty] = useState<string | undefined>();
  const [activeMapTab, setActiveMapTab] = useState<string>("properties");
  const heroAnimation = useScrollAnimation({ threshold: 0.1 });
  const benefitsAnimation = useScrollAnimation({ threshold: 0.1 });
  const mapAnimation = useScrollAnimation({ threshold: 0.1 });
  const processAnimation = useScrollAnimation({ threshold: 0.1 });
  const propertiesAnimation = useScrollAnimation({ threshold: 0.1 });
  const faqAnimation = useScrollAnimation({ threshold: 0.1 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Experiența ApArt Hotel",
      title: "Cazare Premium",
      titleHighlight: "în Timișoara",
      subtitle: "Apartamente complet echipate, curățenie profesională și servicii de hotel 5 stele într-un mediu intim și confortabil.",
      stats: [
        { value: "9.4", label: "Rating Booking.com", icon: Star },
        { value: "500+", label: "Recenzii 5 stele", icon: Award },
        { value: "24/7", label: "Suport disponibil", icon: Clock },
      ],
      ctaPrimary: "Rezervă Direct",
      ctaSecondary: "Vezi Toate Apartamentele",
      benefitsTitle: "De Ce Să Alegi",
      benefitsTitleHighlight: "ApArt Hotel?",
      benefitsSubtitle: "Combinăm confortul unui apartament privat cu serviciile unui hotel de lux",
      benefits: [
        {
          icon: Sparkles,
          title: "Curățenie Profesională",
          description: "Standard hotelier cu verificare în 50+ puncte înainte de fiecare check-in"
        },
        {
          icon: Wifi,
          title: "WiFi High-Speed",
          description: "Internet de mare viteză inclus, ideal pentru remote work sau streaming"
        },
        {
          icon: Key,
          title: "Self Check-in",
          description: "Acces 24/7 cu cod digital, fără a depinde de programul recepției"
        },
        {
          icon: MapPin,
          title: "Locații Centrale",
          description: "Toate apartamentele în zone premium, la câțiva pași de atracțiile principale"
        },
        {
          icon: Shield,
          title: "Garanție de Calitate",
          description: "Răspundem în maxim 30 de minute la orice solicitare sau problemă"
        },
        {
          icon: Heart,
          title: "Experiență Personalizată",
          description: "Recomandări locale și servicii adaptate nevoilor tale"
        }
      ],
      processTitle: "Procesul de",
      processTitleHighlight: "Rezervare",
      processSubtitle: "Din momentul rezervării până la check-out, suntem alături de tine",
      processSteps: [
        {
          step: "01",
          title: "Alege Apartamentul",
          description: "Explorează portofoliul nostru și selectează spațiul perfect pentru sejurul tău"
        },
        {
          step: "02",
          title: "Rezervă Direct",
          description: "Beneficiezi de cel mai bun preț garantat și flexibilitate maximă"
        },
        {
          step: "03",
          title: "Check-in Online",
          description: "Completează datele în avans și primești codul de acces"
        },
        {
          step: "04",
          title: "Bucură-te de Sejur",
          description: "Relaxează-te în apartamentul tău cu toate facilitățile premium"
        }
      ],
      propertiesTitle: "Apartamente",
      propertiesTitleHighlight: "Premium",
      propertiesSubtitle: "Fiecare spațiu este atent pregătit pentru confortul tău",
      viewAll: "Vezi Toate Apartamentele",
      viewDetails: "Vezi Detalii",
      perNight: "/noapte",
      faqTitle: "Întrebări",
      faqTitleHighlight: "Frecvente",
      faqItems: [
        {
          question: "Care este ora de check-in și check-out?",
          answer: "Check-in: de la 15:00 | Check-out: până la 11:00. Pentru flexibilitate, contactează-ne în avans."
        },
        {
          question: "Pot aduce animale de companie?",
          answer: "Unele apartamente acceptă animale de companie. Verifică pagina proprietății sau contactează-ne."
        },
        {
          question: "Ce facilități sunt incluse?",
          answer: "WiFi, Netflix, bucătărie complet echipată, mașină de spălat, produse de igienă premium și lenjerie de hotel."
        },
        {
          question: "Cum funcționează self check-in?",
          answer: "Primești un cod unic de acces pe email și WhatsApp cu instrucțiuni video detaliate."
        },
        {
          question: "Ce se întâmplă dacă am o problemă?",
          answer: "Suntem disponibili 24/7 pe WhatsApp și telefon. Răspundem în maxim 30 de minute."
        }
      ],
      ctaTitle: "Pregătit pentru",
      ctaTitleHighlight: "o experiență unică?",
      ctaSubtitle: "Rezervă direct și beneficiază de cel mai bun preț garantat",
      ctaButton: "Rezervă Acum",
      ctaPhone: "Sau sună-ne"
    },
    en: {
      badge: "The ApArt Hotel Experience",
      title: "Premium Accommodation",
      titleHighlight: "in Timișoara",
      subtitle: "Fully equipped apartments, professional cleaning and 5-star hotel services in an intimate and comfortable environment.",
      stats: [
        { value: "9.4", label: "Booking.com Rating", icon: Star },
        { value: "500+", label: "5-Star Reviews", icon: Award },
        { value: "24/7", label: "Support Available", icon: Clock },
      ],
      ctaPrimary: "Book Direct",
      ctaSecondary: "View All Apartments",
      benefitsTitle: "Why Choose",
      benefitsTitleHighlight: "ApArt Hotel?",
      benefitsSubtitle: "We combine the comfort of a private apartment with luxury hotel services",
      benefits: [
        {
          icon: Sparkles,
          title: "Professional Cleaning",
          description: "Hotel standard with 50+ point verification before each check-in"
        },
        {
          icon: Wifi,
          title: "High-Speed WiFi",
          description: "High-speed internet included, ideal for remote work or streaming"
        },
        {
          icon: Key,
          title: "Self Check-in",
          description: "24/7 access with digital code, no reception schedule dependency"
        },
        {
          icon: MapPin,
          title: "Central Locations",
          description: "All apartments in premium areas, steps away from main attractions"
        },
        {
          icon: Shield,
          title: "Quality Guarantee",
          description: "We respond within 30 minutes to any request or issue"
        },
        {
          icon: Heart,
          title: "Personalized Experience",
          description: "Local recommendations and services tailored to your needs"
        }
      ],
      processTitle: "The Booking",
      processTitleHighlight: "Process",
      processSubtitle: "From booking to check-out, we're with you every step",
      processSteps: [
        {
          step: "01",
          title: "Choose Your Apartment",
          description: "Explore our portfolio and select the perfect space for your stay"
        },
        {
          step: "02",
          title: "Book Direct",
          description: "Get the best price guaranteed and maximum flexibility"
        },
        {
          step: "03",
          title: "Online Check-in",
          description: "Complete your details in advance and receive your access code"
        },
        {
          step: "04",
          title: "Enjoy Your Stay",
          description: "Relax in your apartment with all premium amenities"
        }
      ],
      propertiesTitle: "Premium",
      propertiesTitleHighlight: "Apartments",
      propertiesSubtitle: "Each space is carefully prepared for your comfort",
      viewAll: "View All Apartments",
      viewDetails: "View Details",
      perNight: "/night",
      faqTitle: "Frequently",
      faqTitleHighlight: "Asked Questions",
      faqItems: [
        {
          question: "What are the check-in and check-out times?",
          answer: "Check-in: from 3:00 PM | Check-out: until 11:00 AM. For flexibility, contact us in advance."
        },
        {
          question: "Can I bring pets?",
          answer: "Some apartments accept pets. Check the property page or contact us."
        },
        {
          question: "What amenities are included?",
          answer: "WiFi, Netflix, fully equipped kitchen, washing machine, premium toiletries and hotel linens."
        },
        {
          question: "How does self check-in work?",
          answer: "You receive a unique access code via email and WhatsApp with detailed video instructions."
        },
        {
          question: "What happens if I have a problem?",
          answer: "We're available 24/7 on WhatsApp and phone. We respond within 30 minutes."
        }
      ],
      ctaTitle: "Ready for",
      ctaTitleHighlight: "a unique experience?",
      ctaSubtitle: "Book direct and get the best price guaranteed",
      ctaButton: "Book Now",
      ctaPhone: "Or call us"
    }
  };

  const t = content[language as keyof typeof content] || content.ro;
  const topProperties = getActiveProperties().slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={language === "ro" ? "Pentru Oaspeți | Cazare Premium Timișoara | ApArt Hotel" : "For Guests | Premium Accommodation Timișoara | ApArt Hotel"}
        description={language === "ro" 
          ? "Cazare premium în Timișoara cu facilități hoteliere, check-in automat și suport 24/7. Rezervă direct pentru cel mai bun preț!"
          : "Premium accommodation in Timișoara with hotel-style amenities, self check-in and 24/7 support. Book direct for the best price!"}
        url="https://realtrust.ro/pentru-oaspeti"
      />
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section 
          ref={heroAnimation.ref as React.RefObject<HTMLElement>}
          className="relative py-20 md:py-32 overflow-hidden"
        >
          {/* Background decorations */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">{t.badge}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6">
                {t.title}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {t.titleHighlight}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t.subtitle}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-10">
                {t.stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={heroAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/rezerva-direct">
                  <Button size="lg" className="group">
                    {t.ctaPrimary}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/oaspeti">
                  <Button size="lg" variant="outline">
                    {t.ctaSecondary}
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Quick Availability Search Widget */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 max-w-4xl mx-auto"
            >
              <QuickAvailabilitySearch />
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section 
          ref={benefitsAnimation.ref as React.RefObject<HTMLElement>}
          className="py-20 bg-muted/30"
        >
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={benefitsAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                {t.benefitsTitle}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {t.benefitsTitleHighlight}
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.benefitsSubtitle}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {t.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={benefitsAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Map Section */}
        <section 
          ref={mapAnimation.ref as React.RefObject<HTMLElement>}
          className="py-20"
        >
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mapAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Map className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {language === 'ro' ? 'Hartă Interactivă' : 'Interactive Map'}
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                {language === 'ro' ? 'Explorează' : 'Explore'}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {language === 'ro' ? 'Locațiile Noastre' : 'Our Locations'}
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {language === 'ro' 
                  ? 'Descoperă apartamentele noastre premium și punctele de interes din apropiere pe hartă'
                  : 'Discover our premium apartments and nearby points of interest on the map'}
              </p>
            </motion.div>

            {/* Map Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={mapAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Tabs value={activeMapTab} onValueChange={setActiveMapTab} className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                  <TabsTrigger value="properties" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {language === 'ro' ? 'Apartamente' : 'Apartments'}
                  </TabsTrigger>
                  <TabsTrigger value="poi" className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    {language === 'ro' ? 'Puncte de Interes' : 'Points of Interest'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="properties" className="mt-0">
                  <div className="rounded-2xl overflow-hidden shadow-xl border border-border">
                    <PropertyMap 
                      onPropertySelect={setSelectedProperty}
                      selectedProperty={selectedProperty}
                      className="w-full h-[500px] md:h-[600px]"
                    />
                  </div>
                  
                  {/* Property Quick Links */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {getActiveProperties().slice(0, 8).map((property) => (
                      <button
                        key={property.slug}
                        onClick={() => setSelectedProperty(property.slug)}
                        className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                          selectedProperty === property.slug
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className={`w-3 h-3 ${selectedProperty === property.slug ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs text-muted-foreground truncate">{property.location}</span>
                        </div>
                        <h4 className="text-sm font-medium truncate">{property.name}</h4>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="poi" className="mt-0">
                  <div className="rounded-2xl overflow-hidden shadow-xl border border-border">
                    <InteractiveMapWithPOI />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Map Legend */}
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {language === 'ro' ? 'Apartamente Premium' : 'Premium Apartments'}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-muted-foreground">
                    {language === 'ro' ? 'Puncte de Interes' : 'Points of Interest'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* City Guide Section */}
        <CityGuideSection />

        {/* Facilities Showcase */}
        <FacilitiesShowcase />

        {/* Booking Process */}
        <section 
          ref={processAnimation.ref as React.RefObject<HTMLElement>}
          className="py-20 bg-muted/30"
        >
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={processAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                {t.processTitle}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {t.processTitleHighlight}
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.processSubtitle}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.processSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={processAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative"
                >
                  {/* Connector line */}
                  {index < t.processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
                  )}
                  
                  <div className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary">{step.step}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Digital House Manual */}
        <DigitalHouseManual />

        {/* Cleaning Standards */}
        <CleaningStandards />

        {/* Properties Preview */}
        <section 
          ref={propertiesAnimation.ref as React.RefObject<HTMLElement>}
          className="py-20"
        >
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={propertiesAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                {t.propertiesTitle}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {t.propertiesTitleHighlight}
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.propertiesSubtitle}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {topProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={propertiesAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link 
                    to={`/proprietate/${property.slug}`}
                    className="group block rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={property.images[0]} 
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {property.rating}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                        {property.name}
                      </h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.location}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-primary">€{property.pricePerNight}</span>
                          <span className="text-muted-foreground text-sm">{t.perNight}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary/10">
                          {t.viewDetails}
                          <ArrowRight className="ml-1 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Link to="/oaspeti">
                <Button size="lg" variant="outline" className="group">
                  {t.viewAll}
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section 
          ref={faqAnimation.ref as React.RefObject<HTMLElement>}
          className="py-20 bg-muted/30"
        >
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={faqAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                {t.faqTitle}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {t.faqTitleHighlight}
                </span>
              </h2>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-4">
              {t.faqItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={faqAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border"
                >
                  <h3 className="text-lg font-semibold mb-2 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    {item.question}
                  </h3>
                  <p className="text-muted-foreground pl-8">{item.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section 
          ref={ctaAnimation.ref as React.RefObject<HTMLElement>}
          className="py-20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          
          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={ctaAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                {t.ctaTitle}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  {t.ctaTitleHighlight}
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t.ctaSubtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/oaspeti">
                  <Button size="lg" className="group px-8">
                    {t.ctaButton}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="tel:+40723154520" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>{t.ctaPhone}: +40 723 154 520</span>
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
      <AccessibilityPanel />
    </div>
  );
};

export default PentruOaspeti;
