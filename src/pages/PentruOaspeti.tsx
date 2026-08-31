import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const GuestGuideLeadMagnet = lazy(() => import("@/components/GuestGuideLeadMagnet"));
const FacilitiesShowcase = lazy(() => import("@/components/FacilitiesShowcase"));
const DigitalHouseManual = lazy(() => import("@/components/DigitalHouseManual"));
const CleaningStandards = lazy(() => import("@/components/CleaningStandards"));
const PropertyMap = lazy(() => import("@/components/PropertyMap"));
const InteractiveMapWithPOI = lazy(() => import("@/components/InteractiveMapWithPOI"));
const QuickAvailabilitySearch = lazy(() => import("@/components/QuickAvailabilitySearch"));
const AISearchBar = lazy(() => import("@/components/AISearchBar"));
const CityGuideSection = lazy(() => import("@/components/CityGuideSection"));
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import PageSummary from "@/components/PageSummary";
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
import PropertyCard from "@/components/PropertyCard";
import { useFavorites } from "@/hooks/useFavorites";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PentruOaspeti = () => {
  const { language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
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
      title: "Cazare în regim hotelier",
      titleHighlight: "în Timișoara",
      subtitle: "Apartamente ATENEO, GREEN FOREST, Cross Square House și HELIOS — complet echipate, lângă Iulius Mall, Amazonia Aquapark și Centrul Vechi. Curățenie profesională, parcare subterană gratuită și self check-in non-stop.",
      stats: [
        { value: "9,7/10", label: "Scor Booking.com", icon: Star },
        { value: "500+", label: "Recenzii verificate", icon: Award },
        { value: "24/7", label: "Suport disponibil", icon: Clock },
      ],
      ctaPrimary: "Rezervă direct",
      ctaSecondary: "Vezi toate apartamentele",
      benefitsTitle: "De ce să alegi",
      benefitsTitleHighlight: "ApArt Hotel",
      benefitsSubtitle: "Confortul unui apartament privat, cu serviciile unui hotel.",
      benefits: [
        {
          icon: Sparkles,
          title: "Curățenie profesională",
          description: "Standard hotelier, cu verificare în peste 50 de puncte înainte de fiecare check-in."
        },
        {
          icon: Wifi,
          title: "WiFi de mare viteză",
          description: "Internet rapid inclus, potrivit pentru remote work și streaming."
        },
        {
          icon: Key,
          title: "Self check-in",
          description: "Acces non-stop cu cod digital, fără să depinzi de programul recepției."
        },
        {
          icon: MapPin,
          title: "Lângă Iulius Mall și Amazonia",
          description: "La 2 minute de Lidl, 5 minute de Gara de Nord și 8 minute de Centrul Vechi și Piața Unirii."
        },
        {
          icon: Shield,
          title: "Răspuns rapid la solicitări",
          description: "Răspundem de obicei în 30 de minute la orice întrebare sau cerere."
        },
        {
          icon: Heart,
          title: "Experiență personalizată",
          description: "Recomandări locale și servicii adaptate sejurului tău."
        }
      ],
      processTitle: "Procesul de",
      processTitleHighlight: "rezervare",
      processSubtitle: "De la rezervare la check-out, suntem alături de tine.",
      processSteps: [
        {
          step: "01",
          title: "Alegi apartamentul",
          description: "Explorezi portofoliul și alegi spațiul potrivit pentru sejurul tău."
        },
        {
          step: "02",
          title: "Rezervi direct",
          description: "Cel mai bun preț disponibil pentru rezervările directe, cu flexibilitate maximă."
        },
        {
          step: "03",
          title: "Check-in online",
          description: "Completezi datele în avans și primești codul de acces pe email și WhatsApp."
        },
        {
          step: "04",
          title: "Te bucuri de sejur",
          description: "Te relaxezi în apartament, cu toate facilitățile pregătite."
        }
      ],
      propertiesTitle: "Apartamente",
      propertiesTitleHighlight: "disponibile",
      propertiesSubtitle: "ATENEO, GREEN FOREST, Cross Square House și HELIOS — fiecare pregătit pentru confortul tău, cu parcare subterană și bucătărie complet echipată.",
      viewAll: "Vezi toate apartamentele",
      viewDetails: "Vezi detalii",
      perNight: "/noapte",
      faqTitle: "Întrebări",
      faqTitleHighlight: "frecvente",
      faqItems: [
        {
          question: "Oferiți cazare în Timișoara cu parcare?",
          answer: "Da. Toate apartamentele noastre (ATENEO, GREEN FOREST, Cross Square House, HELIOS) includ parcare subterană privată gratuită, securizată non-stop — utilă pentru călători business care vizitează Continental, Hella sau parcurile industriale din nord."
        },
        {
          question: "Aveți apartament cu 2 camere în regim hotelier în Timișoara?",
          answer: "Da, oferim apartamente cu 2 camere în regim hotelier (ATENEO, GREEN FOREST), potrivite pentru familii sau grupuri de până la 4 persoane, cu dormitor separat, living și bucătărie complet echipată."
        },
        {
          question: "Pot rezerva pentru o singură noapte?",
          answer: "Da, acceptăm rezervări flexibile — de la o noapte până la sejururi prelungite, cu tarife preferențiale de la 7 nopți în sus."
        },
        {
          question: "Care este ora de check-in și check-out?",
          answer: "Check-in: de la 15:00. Check-out: până la 11:00. Pentru flexibilitate, contactează-ne în avans."
        },
        {
          question: "Care este politica de anulare și ce metode de plată acceptați?",
          answer: "Acceptăm plata cu cardul (Visa, Mastercard) și transferul bancar. Pentru rezervări directe, anularea este gratuită până cu 48 de ore înainte de check-in."
        },
        {
          question: "Pot aduce animale de companie?",
          answer: "Unele apartamente sunt pet-friendly. Verifică pagina proprietății sau contactează-ne pentru confirmare."
        },
        {
          question: "Apartamentele sunt potrivite pentru familii cu copii?",
          answer: "Da. Apartamentele sunt aproape de Parcul Copiilor, Amazonia Aquapark și Iulius Town, iar pătuțul pentru bebeluși este disponibil la cerere."
        },
        {
          question: "Ce facilități sunt incluse?",
          answer: "WiFi de mare viteză, Netflix, aer condiționat, bucătărie complet echipată, mașină de spălat, produse de igienă, lenjerie la standard hotelier și parcare subterană gratuită."
        },
        {
          question: "Cum funcționează self check-in-ul?",
          answer: "Primești pe email și WhatsApp un cod unic de acces și instrucțiuni video detaliate, disponibile non-stop."
        }
      ],
      ctaTitle: "Pregătit pentru",
      ctaTitleHighlight: "sejurul tău în Timișoara?",
      ctaSubtitle: "Rezervă direct și primești cel mai bun preț disponibil pentru rezervările directe.",
      ctaButton: "Rezervă acum",
      ctaPhone: "Sau sună-ne"
    },
    en: {
      badge: "The ApArt Hotel Experience",
      title: "Premium Accommodation",
      titleHighlight: "in Timișoara",
      subtitle: "ATENEO, GREEN FOREST, Cross Square House & HELIOS apartments — fully equipped, near Iulius Mall, Amazonia Aquapark & the Old Town. Professional cleaning, free underground parking and 24/7 self check-in.",
      stats: [
        { value: "9.7", label: "Booking.com Rating", icon: Star },
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
          title: "Near Iulius Mall & Amazonia",
          description: "2 min from Lidl, 5 min from North Station, 8 min from Old Town & Piața Unirii"
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
      propertiesSubtitle: "ATENEO, GREEN FOREST, Cross Square House, HELIOS — each prepared for your comfort, with underground parking & fully equipped kitchen",
      viewAll: "View All Apartments",
      viewDetails: "View Details",
      perNight: "/night",
      faqTitle: "Frequently",
      faqTitleHighlight: "Asked Questions",
      faqItems: [
        {
          question: "Do you offer accommodation in Timișoara with parking?",
          answer: "Yes. All our apartments (ATENEO, GREEN FOREST, Cross Square House, HELIOS) include free private underground parking, secured 24/7 — ideal for business travelers visiting Continental, Hella or the northern industrial parks."
        },
        {
          question: "Do you have 2-bedroom short-term rental apartments in Timișoara?",
          answer: "Yes, we offer 2-bedroom apartments (ATENEO, GREEN FOREST), perfect for families or groups of up to 4 guests, with separate bedroom, living room and full kitchen."
        },
        {
          question: "Can I book accommodation in Timișoara for just one night?",
          answer: "Yes, we accept flexible bookings — from one night to long-stay reservations with preferential rates for 7+ nights."
        },
        {
          question: "What are the check-in and check-out times?",
          answer: "Check-in: from 3:00 PM | Check-out: until 11:00 AM. For flexibility, contact us in advance."
        },
        {
          question: "What is the cancellation policy and how can I pay?",
          answer: "We accept card payments (Visa, Mastercard) and bank transfer. Flexible cancellation for direct bookings — free cancellation up to 48h before check-in."
        },
        {
          question: "Can I bring pets?",
          answer: "Some apartments are pet-friendly. Check the property page or contact us."
        },
        {
          question: "Are the apartments suitable for families with children?",
          answer: "Yes, we're ideal for families — apartments are close to Parcul Copiilor (Children's Park), Amazonia Aquapark and Iulius Town, with baby cots available on request."
        },
        {
          question: "What amenities are included?",
          answer: "High-speed WiFi, Netflix, AC, fully equipped kitchen, washing machine, premium toiletries, hotel linens and free underground parking."
        },
        {
          question: "How does self check-in work?",
          answer: "You receive a unique access code via email and WhatsApp with detailed video instructions, available 24/7."
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
  // Register FAQ items via centralized context (single FAQPage per page)
  useRegisterFAQs("pentru-oaspeti", t.faqItems.map((item: { question: string; answer: string }) => ({
    question: item.question,
    answer: item.answer,
  })));

  const lodgingJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "ApArt Hotel by RealTrust — Cazare Regim Hotelier Timișoara",
    "url": "https://realtrust.ro/pentru-oaspeti",
    "image": "https://realtrust.ro/images/hero-optimized-1920w.webp",
    "priceRange": "€45 – €120 / noapte",
    "telephone": "+40799069256",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "postalCode": "300125",
      "addressCountry": "RO",
    },
    "geo": { "@type": "GeoCoordinates", "latitude": 45.7672, "longitude": 21.2495 },
    "checkinTime": "15:00",
    "checkoutTime": "11:00",
    "petsAllowed": true,
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Free underground parking", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Air conditioning", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Self check-in 24/7", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Fully equipped kitchen", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Washing machine", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Netflix / Smart TV", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Hotel linens & towels", "value": true },
    ],
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "9.7", "reviewCount": "180", "bestRating": "10" },
    "containsPlace": [
      { "@type": "Apartment", "name": "ATENEO", "numberOfRooms": 2, "occupancy": { "@type": "QuantitativeValue", "maxValue": 4 } },
      { "@type": "Apartment", "name": "GREEN FOREST", "numberOfRooms": 2, "occupancy": { "@type": "QuantitativeValue", "maxValue": 4 } },
      { "@type": "Apartment", "name": "Cross Square House", "numberOfRooms": 3, "numberOfBedrooms": 2, "numberOfBathroomsTotal": 3, "occupancy": { "@type": "QuantitativeValue", "maxValue": 6 } },
      { "@type": "Apartment", "name": "HELIOS", "numberOfRooms": 1, "occupancy": { "@type": "QuantitativeValue", "maxValue": 2 } },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={language === "ro" ? "Cazare Timișoara: apartamente în regim hotelier" : "Short-Term Rental Timișoara | Apartments & Studios"}
        description={language === "ro" 
          ? "Cazare în Timișoara în apartamente și case în regim hotelier, alternativă la hotel: parcare gratuită, self check-in 24/7, rezervare directă fără comision."
          : "Looking for short-term rental in Timișoara? Premium apartments near UVT, Iulius Town, Airport and Old Town. Free parking, 24/7 self check-in. Book direct!"}
        socialDescription={language === "ro"
          ? "Apartamente și case în regim hotelier în Timișoara — parcare gratuită, self check-in 24/7, preț mai bun la rezervare directă."
          : "Premium short-term rental apartments in Timișoara — free parking, 24/7 self check-in, best rate when booking direct."}
        url="https://realtrust.ro/pentru-oaspeti"
        jsonLd={lodgingJsonLd}
      />

      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-6">
          <PageSummary
            summaryRo="Cazare Timișoara în regim hotelier: NordOne, GREEN FOREST, Cross Square House, Apicultorilor House, HELIOS — lângă Iulius Town, Centrul Vechi și Gara de Nord. Parcare gratuită, self check-in 24/7, bucătărie complet echipată."
            summaryEn="Short-term rental apartments Timișoara: NordOne, GREEN FOREST, Cross Square House, Apicultorilor House, HELIOS — near Iulius Town, Old Town and North Station. Free parking, 24/7 self check-in, fully equipped kitchen."
          />
        </div>
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

            {/* AI Smart Search */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 max-w-2xl mx-auto"
            >
              <Suspense fallback={null}><AISearchBar /></Suspense>
            </motion.div>

            {/* Quick Availability Search Widget */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroAnimation.isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 max-w-4xl mx-auto"
            >
              <Suspense fallback={null}><QuickAvailabilitySearch /></Suspense>
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
            <div>
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

                <TabsContent value="properties" className="mt-0" forceMount={undefined}>
                    {/* Global style for card highlight */}
                    <style>{`
                      .ring-highlight-property {
                        outline: 2px solid hsl(var(--primary));
                        outline-offset: 3px;
                        animation: prop-highlight-fade 2s ease forwards;
                      }
                      @keyframes prop-highlight-fade {
                        0% { outline-color: hsl(var(--primary)); }
                        100% { outline-color: transparent; }
                      }
                    `}</style>

                    {activeMapTab === 'properties' && (<div id="property-map-container">
                      <Suspense fallback={null}>
                      <PropertyMap 
                        onPropertySelect={(slug) => {
                          setSelectedProperty(slug);
                          // scroll to card
                          setTimeout(() => {
                            const card = document.getElementById(`property-card-${slug}`);
                            if (card) {
                              card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              card.classList.add('ring-highlight-property');
                              setTimeout(() => card.classList.remove('ring-highlight-property'), 2000);
                            }
                          }, 100);
                        }}
                        selectedProperty={selectedProperty}
                        className="w-full h-[500px] md:h-[600px] rounded-2xl shadow-xl border border-border"
                      />
                      </Suspense>
                    </div>)}
                  
                  {/* Property Cards - synced with map */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getActiveProperties().map((property, index) => (
                      <PropertyCard key={property.id} property={property} index={index} isFavorite={isFavorite(String(property.id))} onToggleFavorite={(id) => toggleFavorite(id)} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="poi" className="mt-0" forceMount={undefined}>
                    {activeMapTab === 'poi' && <Suspense fallback={null}><InteractiveMapWithPOI /></Suspense>}
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
            </div>
          </div>
        </section>

        {/* City Guide Section */}
        <Suspense fallback={null}><CityGuideSection /></Suspense>

        {/* Facilities Showcase */}
        <Suspense fallback={null}><FacilitiesShowcase /></Suspense>

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
        <Suspense fallback={null}><DigitalHouseManual /></Suspense>

        {/* Cleaning Standards */}
        <Suspense fallback={null}><CleaningStandards /></Suspense>

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
                <div key={property.id}>
                  <PropertyCard property={property} index={index} isFavorite={isFavorite(String(property.id))} onToggleFavorite={(id) => toggleFavorite(id)} />
                </div>
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
                <a href="tel:+40799069256" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>{t.ctaPhone}: +40 799 069 256</span>
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
      <Suspense fallback={null}>
        <GuestGuideLeadMagnet />
      </Suspense>
    </div>
  );
};

export default PentruOaspeti;
