import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeamSection from "@/components/TeamSection";
import CompanyTimeline from "@/components/CompanyTimeline";
import {
  Building2, 
  Home, 
  Users, 
  Target, 
  Heart, 
  Shield, 
  TrendingUp,
  Handshake,
  Award,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";

const AboutUs = () => {
  const { language } = useLanguage();
  const heroAnimation = useScrollAnimation({ threshold: 0.1 });
  const brandsAnimation = useScrollAnimation({ threshold: 0.1 });
  const valuesAnimation = useScrollAnimation({ threshold: 0.1 });
  const statsAnimation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      hero: {
        badge: "Despre Noi",
        title: "Două Branduri,",
        titleHighlight: "O Singură Viziune",
        subtitle: "RealTrust și ApArt Hotel sunt cele două brațe ale aceleiași companii, unite de o misiune comună: să transformăm piața imobiliară din Timișoara prin profesionalism, transparență și rezultate concrete."
      },
      story: {
        title: "Povestea Noastră",
        subtitle: "Peste 25 de ani de excelență în imobiliare",
        intro: "Cu o experiență de peste un sfert de secol în piața imobiliară din România, am devenit un partener de încredere pentru mii de clienți. Am început această călătorie cu pasiunea pentru imobiliare și cu dorința de a aduce standarde internaționale în Timișoara.",
        realEstate: {
          title: "Servicii Imobiliare Complete",
          description: "Sub brandul RealTrust, oferim un spectru complet de servicii imobiliare care acoperă toate nevoile proprietarilor și investitorilor:",
          services: [
            { title: "Vânzări", description: "Strategii de marketing personalizate, fotografii profesionale, prezență pe toate platformele majore și negociere expertă pentru maximizarea valorii proprietății." },
            { title: "Achiziții", description: "Identificarea oportunităților potrivite, due diligence complet, asistență juridică și suport în procesul de finanțare." },
            { title: "Închirieri", description: "Găsirea chiriașilor potriviți, verificarea bonității, contracte profesionale și administrarea relației proprietar-chiriaș." },
            { title: "Administrare Imobile", description: "Gestionarea completă a proprietăților: colectare chirii, relații cu chiriașii, coordonare mentenanță și raportare financiară transparentă." }
          ]
        },
        hotelManagement: {
          title: "Administrare în Regim Hotelier",
          description: "Prin ApArt Hotel, transformăm apartamentele în surse de venit pasiv profitabile:",
          services: [
            { title: "Curățenie Profesională", description: "Echipe dedicate, standarde hoteliere, lenjerie premium și control riguros al calității după fiecare sejur." },
            { title: "Mentenanță Proactivă", description: "Verificări regulate, reparații rapide, coordonare meșteri de încredere și raportare fotografică a intervențiilor." },
            { title: "Digitalizare Completă", description: "Check-in online, ghid digital pentru oaspeți, sistem de smart-lock, monitorizare IoT și automatizare a proceselor." },
            { title: "Prezență Multi-Platformă", description: "Listare optimizată pe Airbnb, Booking.com, VRBO și rezervări directe, cu pricing dinamic pentru maximizarea veniturilor." },
            { title: "Fotografii Profesionale", description: "Ședințe foto cu echipamente profesionale, editare avansată, virtual staging și actualizare sezonieră a imaginilor." },
            { title: "Experiență Oaspeți", description: "Comunicare 24/7, check-in flexibil, recomandări locale personalizate și rezolvare rapidă a oricărei situații." }
          ]
        },
        conclusion: "Am învățat că succesul în imobiliare nu vine din promisiuni, ci din rezultate măsurabile. Fiecare proprietate pe care o administrăm primește aceeași atenție la detalii pe care am perfecționat-o în peste 25 de ani de activitate."
      },
      brands: {
        title: "Două Branduri, Servicii Complete",
        subtitle: "Indiferent dacă vrei să vinzi, să cumperi sau să închiriezi în regim hotelier, avem soluția potrivită.",
        realtrust: {
          name: "RealTrust",
          tagline: "Tranzacții Imobiliare",
          description: "Brandul nostru dedicat tranzacțiilor imobiliare clasice: vânzări, achiziții și consultanță pentru investitori.",
          services: [
            "Vânzare proprietăți rezidențiale și comerciale",
            "Achiziții și intermediere",
            "Consultanță pentru investitori",
            "Evaluări de piață gratuite"
          ],
          cta: "Servicii Imobiliare",
          link: "/imobiliare"
        },
        aparthotel: {
          name: "ApArt Hotel",
          tagline: "Administrare Regim Hotelier",
          description: "Brandul nostru pentru proprietarii care doresc venituri pasive din închirieri pe termen scurt, cu management profesional complet.",
          services: [
            "Administrare completă Airbnb & Booking",
            "Revenue management și pricing dinamic",
            "Curățenie și mentenanță profesională",
            "Suport oaspeți 24/7"
          ],
          cta: "Pentru Proprietari",
          link: "/#beneficii"
        }
      },
      synergy: {
        title: "Puterea Sinergiei",
        description: "Cele două branduri se completează perfect. Un proprietar poate vinde prin RealTrust sau poate genera venituri pasive prin ApArt Hotel. Oferim consultanță personalizată pentru a alege cea mai bună strategie.",
        benefits: [
          "Evaluare completă a opțiunilor: vânzare vs. închiriere",
          "Tranziție simplă între servicii",
          "O singură echipă de încredere pentru toate nevoile imobiliare",
          "Cunoaștere profundă a pieței din Timișoara"
        ]
      },
      values: {
        title: "Valorile Noastre",
        items: [
          {
            icon: Shield,
            title: "Transparență",
            description: "Comunicare deschisă, rapoarte detaliate, fără costuri ascunse."
          },
          {
            icon: Target,
            title: "Rezultate",
            description: "Ne măsurăm prin succesul tău: vânzări rapide, randamente superioare."
          },
          {
            icon: Heart,
            title: "Dedicare",
            description: "Tratăm fiecare proprietate ca și cum ar fi a noastră."
          },
          {
            icon: TrendingUp,
            title: "Inovație",
            description: "Tehnologie modernă și practici de vârf în industrie."
          }
        ]
      },
      stats: {
        title: "În Cifre",
        items: [
          { value: "50+", label: "Proprietăți gestionate" },
          { value: "+80%", label: "Rată de ocupare" },
          { value: "4.9★", label: "Rating mediu" },
          { value: "500+", label: "Oaspeți mulțumiți" }
        ]
      },
      company: {
        title: "Date Companie",
        name: "Imo Business Centrum SRL",
        items: [
          { icon: MapPin, label: "Sediu", value: "Timișoara, România" },
          { icon: Phone, label: "Telefon", value: "+40 723 154 520" },
          { icon: Mail, label: "Email", value: "adicosti@gmail.com" }
        ]
      },
      cta: {
        title: "Pregătit să Începem?",
        subtitle: "Contactează-ne pentru o discuție fără obligații despre cum te putem ajuta.",
        button: "Solicită o Consultație Gratuită"
      }
    },
    en: {
      hero: {
        badge: "About Us",
        title: "Two Brands,",
        titleHighlight: "One Vision",
        subtitle: "RealTrust and ApArt Hotel are the two arms of the same company, united by a common mission: to transform the Timișoara real estate market through professionalism, transparency, and concrete results."
      },
      story: {
        title: "Our Story",
        subtitle: "Over 25 Years of Excellence in Real Estate",
        intro: "With more than a quarter century of experience in the Romanian real estate market, we have become a trusted partner for thousands of clients. We started this journey with a passion for real estate and the desire to bring international standards to Timișoara.",
        realEstate: {
          title: "Complete Real Estate Services",
          description: "Under the RealTrust brand, we offer a complete spectrum of real estate services covering all needs of owners and investors:",
          services: [
            { title: "Sales", description: "Personalized marketing strategies, professional photography, presence on all major platforms, and expert negotiation to maximize property value." },
            { title: "Acquisitions", description: "Identifying suitable opportunities, complete due diligence, legal assistance, and financing support." },
            { title: "Rentals", description: "Finding the right tenants, creditworthiness verification, professional contracts, and landlord-tenant relationship management." },
            { title: "Property Management", description: "Complete property management: rent collection, tenant relations, maintenance coordination, and transparent financial reporting." }
          ]
        },
        hotelManagement: {
          title: "Short-Term Rental Management",
          description: "Through ApArt Hotel, we transform apartments into profitable passive income sources:",
          services: [
            { title: "Professional Cleaning", description: "Dedicated teams, hotel standards, premium linens, and rigorous quality control after each stay." },
            { title: "Proactive Maintenance", description: "Regular inspections, quick repairs, coordination with trusted contractors, and photographic reporting of interventions." },
            { title: "Complete Digitalization", description: "Online check-in, digital guest guide, smart-lock system, IoT monitoring, and process automation." },
            { title: "Multi-Platform Presence", description: "Optimized listings on Airbnb, Booking.com, VRBO, and direct bookings, with dynamic pricing to maximize revenue." },
            { title: "Professional Photography", description: "Photo sessions with professional equipment, advanced editing, virtual staging, and seasonal image updates." },
            { title: "Guest Experience", description: "24/7 communication, flexible check-in, personalized local recommendations, and quick resolution of any situation." }
          ]
        },
        conclusion: "We've learned that success in real estate doesn't come from promises, but from measurable results. Every property we manage receives the same attention to detail that we've perfected over 25 years of activity."
      },
      brands: {
        title: "Two Brands, Complete Services",
        subtitle: "Whether you want to sell, buy, or rent short-term, we have the right solution.",
        realtrust: {
          name: "RealTrust",
          tagline: "Real Estate Transactions",
          description: "Our brand dedicated to classic real estate transactions: sales, acquisitions, and investor consulting.",
          services: [
            "Residential and commercial property sales",
            "Acquisitions and intermediation",
            "Investor consulting",
            "Free market evaluations"
          ],
          cta: "Real Estate Services",
          link: "/imobiliare"
        },
        aparthotel: {
          name: "ApArt Hotel",
          tagline: "Short-Term Rental Management",
          description: "Our brand for property owners who want passive income from short-term rentals, with complete professional management.",
          services: [
            "Complete Airbnb & Booking management",
            "Revenue management and dynamic pricing",
            "Professional cleaning and maintenance",
            "24/7 guest support"
          ],
          cta: "For Property Owners",
          link: "/#beneficii"
        }
      },
      synergy: {
        title: "The Power of Synergy",
        description: "The two brands complement each other perfectly. An owner can sell through RealTrust or generate passive income through ApArt Hotel. We offer personalized consulting to choose the best strategy.",
        benefits: [
          "Complete evaluation of options: sell vs. rent",
          "Simple transition between services",
          "One trusted team for all real estate needs",
          "Deep knowledge of the Timișoara market"
        ]
      },
      values: {
        title: "Our Values",
        items: [
          {
            icon: Shield,
            title: "Transparency",
            description: "Open communication, detailed reports, no hidden costs."
          },
          {
            icon: Target,
            title: "Results",
            description: "We measure ourselves by your success: fast sales, superior returns."
          },
          {
            icon: Heart,
            title: "Dedication",
            description: "We treat every property as if it were our own."
          },
          {
            icon: TrendingUp,
            title: "Innovation",
            description: "Modern technology and industry-leading practices."
          }
        ]
      },
      stats: {
        title: "In Numbers",
        items: [
          { value: "50+", label: "Properties managed" },
          { value: "+80%", label: "Occupancy rate" },
          { value: "4.9★", label: "Average rating" },
          { value: "500+", label: "Happy guests" }
        ]
      },
      company: {
        title: "Company Info",
        name: "Imo Business Centrum SRL",
        items: [
          { icon: MapPin, label: "Office", value: "Timișoara, Romania" },
          { icon: Phone, label: "Phone", value: "+40 723 154 520" },
          { icon: Mail, label: "Email", value: "adicosti@gmail.com" }
        ]
      },
      cta: {
        title: "Ready to Start?",
        subtitle: "Contact us for a no-obligation discussion about how we can help.",
        button: "Request a Free Consultation"
      }
    }
  };

  const t = content[language];

  const seoContent = {
    ro: {
      title: "Despre Noi | RealTrust & ApArt Hotel Timișoara",
      description: "Două branduri, o viziune. 25+ ani experiență în imobiliare. Servicii complete de vânzări, achiziții și administrare în regim hotelier."
    },
    en: {
      title: "About Us | RealTrust & ApArt Hotel Timișoara",
      description: "Two brands, one vision. 25+ years real estate experience. Complete sales, acquisitions and short-term rental management services."
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  const breadcrumbItems = [
    { label: language === "ro" ? "Despre Noi" : "About Us" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrustaparthotel.lovable.app/despre-noi"
      />
      <Header />
      
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-4">
          <PageBreadcrumb items={breadcrumbItems} />
        </div>
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          </div>
          
          <div 
            ref={heroAnimation.ref}
            className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
              heroAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
                <Users className="w-4 h-4 mr-2 text-primary" />
                {t.hero.badge}
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                {t.hero.title}{" "}
                <span className="text-primary">{t.hero.titleHighlight}</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                {t.hero.subtitle}
              </p>

              {/* Brand logos */}
              <div className="flex items-center justify-center gap-4 md:gap-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold">RealTrust</span>
                </div>
                <span className="text-2xl text-muted-foreground">+</span>
                <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-lg">
                  <Home className="w-5 h-5 text-primary" />
                  <span className="font-semibold">ApArt Hotel</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section - Expanded */}
        <section className="py-20 md:py-28 bg-muted/30">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
                <Award className="w-4 h-4 mr-2 text-primary" />
                {t.story.subtitle}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t.story.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t.story.intro}
              </p>
            </div>

            {/* Real Estate Services */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{t.story.realEstate.title}</h3>
                  <p className="text-muted-foreground">{t.story.realEstate.description}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {t.story.realEstate.services.map((service, idx) => (
                  <Card key={idx} className="border-l-4 border-l-primary/50 hover:border-l-primary transition-colors">
                    <CardContent className="p-6">
                      <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        {service.title}
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Hotel Management Services */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Home className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{t.story.hotelManagement.title}</h3>
                  <p className="text-muted-foreground">{t.story.hotelManagement.description}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {t.story.hotelManagement.services.map((service, idx) => (
                  <Card key={idx} className="border-t-4 border-t-amber-500/50 hover:border-t-amber-500 transition-colors hover:shadow-lg">
                    <CardContent className="p-6">
                      <h4 className="text-lg font-semibold mb-2">{service.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Conclusion */}
            <div className="max-w-3xl mx-auto">
              <Card className="bg-gradient-to-r from-primary/5 via-card to-primary/5 border-primary/20">
                <CardContent className="p-8 text-center">
                  <p className="text-lg text-foreground leading-relaxed italic">
                    "{t.story.conclusion}"
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Two Brands Section */}
        <section className="py-20 md:py-28">
          <div 
            ref={brandsAnimation.ref}
            className={`container mx-auto px-4 transition-all duration-700 ${
              brandsAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.brands.title}</h2>
              <p className="text-lg text-muted-foreground">{t.brands.subtitle}</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-16">
              {/* RealTrust Card */}
              <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 group">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/10 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{t.brands.realtrust.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.brands.realtrust.tagline}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {t.brands.realtrust.description}
                  </p>
                  
                  <ul className="space-y-3 mb-6">
                    {t.brands.realtrust.services.map((service, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to={t.brands.realtrust.link}>
                    <Button className="w-full group-hover:bg-blue-600 transition-colors">
                      {t.brands.realtrust.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* ApArt Hotel Card */}
              <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 group">
                <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 flex items-center justify-center">
                      <Home className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{t.brands.aparthotel.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.brands.aparthotel.tagline}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {t.brands.aparthotel.description}
                  </p>
                  
                  <ul className="space-y-3 mb-6">
                    {t.brands.aparthotel.services.map((service, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to={t.brands.aparthotel.link}>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 transition-colors">
                      {t.brands.aparthotel.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Synergy Section */}
            <Card className="bg-gradient-to-r from-primary/5 via-card to-primary/5 border-primary/20">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Handshake className="w-10 h-10 text-primary" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold mb-3">{t.synergy.title}</h3>
                    <p className="text-muted-foreground mb-4">{t.synergy.description}</p>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {t.synergy.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Company Timeline */}
        <CompanyTimeline />

        {/* Team Section - temporarily hidden */}
        {/* <TeamSection /> */}

        {/* Values Section */}
        <section className="py-20 bg-muted/30">
          <div 
            ref={valuesAnimation.ref}
            className={`container mx-auto px-4 transition-all duration-700 ${
              valuesAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t.values.title}</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.values.items.map((value, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <value.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16">
          <div 
            ref={statsAnimation.ref}
            className={`container mx-auto px-4 transition-all duration-700 ${
              statsAnimation.isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            <h2 className="text-2xl font-bold text-center mb-8">{t.stats.title}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {t.stats.items.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-2">{t.company.title}</h2>
              <p className="text-center text-primary font-semibold mb-8">{t.company.name}</p>
              
              <div className="grid md:grid-cols-3 gap-4">
                {t.company.items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 text-center">
                      <item.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="font-medium text-sm">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.cta.title}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{t.cta.subtitle}</p>
            <Link to="/#contact">
              <Button size="lg" className="text-lg px-8">
                {t.cta.button}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default AboutUs;
