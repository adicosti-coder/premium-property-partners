import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeamSection from "@/components/TeamSection";
import WhyUs from "@/components/WhyUs";

import OwnerCaseStudies from "@/components/owners/OwnerCaseStudies";
import OwnerRoiEstimator from "@/components/owners/OwnerRoiEstimator";
import OwnerContactLeadForm from "@/components/owners/OwnerContactLeadForm";
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
import { REAL_ESTATE_AGENT_SCHEMA, REAL_ESTATE_AGENT_REF } from "@/lib/orgIdentity";
import PageSummary from "@/components/PageSummary";
import SEOAboutAdditionsStrip from "@/components/SEOAboutAdditionsStrip";

const AboutUs = () => {
  const { language } = useLanguage();
  const heroAnimation = useScrollAnimation({ threshold: 0.1 });
  const brandsAnimation = useScrollAnimation({ threshold: 0.1 });
  const valuesAnimation = useScrollAnimation({ threshold: 0.1 });
  const statsAnimation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      hero: {
        badge: "Despre Noi · Echipă & Poveste",
        title: "Echipa din spatele",
        titleHighlight: "RealTrust Timișoara",
        subtitle: "Suntem o echipă locală condusă de Adrian Costi, dedicată exclusiv pieței imobiliare din Timișoara. Aici afli povestea noastră, valorile care ne ghidează și oamenii care răspund de fiecare proprietate administrată."
      },
      mission: {
        title: "Misiunea Noastră",
        text: "Să oferim proprietarilor din Timișoara o alternativă profesionistă, transparentă și măsurabilă la administrarea clasică a imobilelor — combinând consultanță imobiliară Timișoara (RealTrust) cu standardele hoteliere (ApArt Hotel) într-un singur partener de încredere. Includem evaluare apartament Timișoara gratuită și analiză comparativă de randament chirie Timișoara versus regim hotelier."
      },
      story: {
        title: "Povestea Noastră",
        subtitle: "De la prima tranzacție la 60+ proprietăți administrate",
        intro: "Am început în Timișoara ca o agenție imobiliară locală, axată pe tranzacții corecte și pe relații pe termen lung. Cu peste 15 ani de experiență directă pe piața imobiliară Timișoara, urmărim zilnic evoluția prețurilor apartamente Timișoara pe fiecare cartier — de la Centru și Iosefin la ISHO, Dumbrăvița și Complex Studențesc — și oferim consultanță credit ipotecar prin parteneriate cu brokeri și bănci (BCR, BT, ING, Raiffeisen, BRD). Pe măsură ce piața s-a maturizat, am observat că tot mai mulți proprietari căutau venituri pasive fără bătăi de cap — așa s-a născut ApArt Hotel, divizia noastră de regim hotelier. Astăzi gestionăm peste 60 de apartamente cu un ROI net verificat de 9,4% și un rating consolidat de 9,7/10.",
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
            description: "Comunicare clară, rapoarte lunare detaliate și comisioane agreate înainte de semnare."
          },
          {
            icon: Target,
            title: "Rezultate măsurabile",
            description: "Performanța noastră se evaluează în randament net, ocupare și satisfacția oaspeților — nu în promisiuni."
          },
          {
            icon: Heart,
            title: "Responsabilitate",
            description: "Tratăm fiecare proprietate cu același nivel de atenție pe care l-am aplica unui imobil propriu."
          },
          {
            icon: TrendingUp,
            title: "Proces continuu",
            description: "Pricing dinamic săptămânal, audit operațional periodic și optimizări bazate pe date."
          }
        ]
      },
      stats: {
        title: "În Cifre",
        items: [
          { value: "60+", label: "Proprietăți administrate" },
          { value: "75%", label: "Ocupare medie anuală" },
          { value: "9,7/10", label: "Rating consolidat oaspeți" },
          { value: "9,4%", label: "Randament net țintă" }
        ]
      },
      company: {
        title: "Date Companie",
        name: "Imo Business Centrum SRL",
        items: [
          { icon: MapPin, label: "Sediu", value: "Timișoara, România" },
          { icon: Phone, label: "Telefon", value: "+40 799 069 256" },
          { icon: Mail, label: "Email", value: "info@realtrust.ro" }
        ]
      },
      faq: {
        title: "Întrebări Frecvente despre RealTrust",
        items: [
          { q: "Cine este fondatorul RealTrust Timișoara?", a: "Compania este fondată și condusă de Adrian Costi, antreprenor local cu peste 25 de ani de experiență în piața imobiliară din Timișoara și vestul României. Adrian este implicat direct în fiecare colaborare cu proprietarii." },
          { q: "Ce comision are agenția imobiliară RealTrust Timișoara?", a: "Pentru vânzări aplicăm un comision standard de 2% + TVA din partea vânzătorului, iar pentru închirieri pe termen lung un comision egal cu o chirie lunară. Pentru administrare în regim hotelier comisionul de management este de 20–25% din venitul net, fără taxe ascunse. Toate comisioanele sunt agreate înainte de semnarea contractului." },
          { q: "Oferiți consultanță pentru credit imobiliar Timișoara?", a: "Da, colaborăm cu brokeri independenți de credite și cu băncile partenere (BCR, BT, ING, Raiffeisen, BRD) pentru pre-aprobare, comparare oferte (dobândă fixă vs. variabilă), Prima Casă/Noua Casă și evaluare ANEVAR. Consultanța inițială este gratuită pentru clienții noștri." },
          { q: "Vindeți și case de vânzare Timișoara, nu doar apartamente?", a: "Da. Portofoliul nostru include case de vânzare Timișoara — case individuale, duplexuri și vile cu teren intravilan în zonele Dumbrăvița, Giroc, Moșnița Nouă, Ghiroda, Săcălaz, Chișoda și Freidorf — pe lângă apartamente (1–4 camere) în tot orașul." },
          { q: "Lucrați cu ansambluri rezidențiale Timișoara?", a: "Da, avem parteneriate active și listări în principalele ansambluri rezidențiale Timișoara: ISHO, Ateneo Residence, Vox Park, Openville, Take Residence, City Business Centre, Coresi, Modern Residence și complexele noi din zona Aradului și Dumbrăvița. Oferim acces la prețuri de dezvoltator și consultanță pentru achiziții off-plan." },
          { q: "Intermediați și terenuri de vânzare Timișoara?", a: "Da. Avem oferte de terenuri de vânzare Timișoara — terenuri intravilane construibile (rezidențiale și comerciale), parcele în zonele de dezvoltare (Dumbrăvița, Giroc, Moșnița, Freidorf) și loturi pentru investitori care doresc să dezvolte ansambluri sau case de vânzare." },
          { q: "În ce zone din Timișoara activați?", a: "Acoperim întreg orașul Timișoara — Centru, ISHO, Iulius Town, Complex Studențesc, Cetate, Iosefin, Elisabetin, Fabric (cu Piața Traian), Mehala, Freidorf, Lipovei, Aradului — plus zonele metropolitane Dumbrăvița, Giroc, Moșnița Nouă și Ghiroda. Avem și cazare corporate / business lângă marii angajatori: Continental Automotive Timișoara, Nokia, Atos, Visma, City Business Centre și Vox Park." },
          { q: "Oferiți cazare lângă spitalele din Timișoara?", a: "Da, gestionăm apartamente în proximitatea principalelor unități medicale: Spitalul Județean Timișoara, Spitalul Municipal Timișoara (Clinica Municipal), Spitalul de Copii Louis Țurcanu și Spitalul Militar — ideale pentru pacienți și aparținători." },
          { q: "Cum mă asigur că proprietatea mea este în siguranță?", a: "Folosim contracte transparente, verificare bonitate chiriași, asigurare PAD obligatorie, smart-lock cu coduri unice per oaspete, monitorizare IoT (zgomot, fum), curățenie după fiecare sejur cu raportare foto și depozit de garanție returnat 100% la finalul colaborării." }
        ]
      },
      cta: {
        title: "Hai să discutăm",
        subtitle: "Programează o consultare fără obligații. Îți răspundem în maximum 24 de ore lucrătoare cu pașii recomandați.",
        button: "Solicită o consultare"
      }
    },
    en: {
      hero: {
        badge: "About Us · Team & Story",
        title: "The team behind",
        titleHighlight: "RealTrust Timișoara",
        subtitle: "We're a local team led by Adrian Costi, dedicated exclusively to the Timișoara real estate market. Here you'll find our story, the values that guide us, and the people responsible for every property we manage."
      },
      mission: {
        title: "Our Mission",
        text: "To offer property owners in Timișoara a professional, transparent and measurable alternative to traditional property management — combining real estate expertise (RealTrust) with hotel standards (ApArt Hotel) in one trusted partner."
      },
      story: {
        title: "Our Story",
        subtitle: "From the first transaction to 60+ properties managed",
        intro: "We started in Timișoara as a local real estate agency, focused on fair transactions and long-term relationships. As the market matured, we noticed more owners sought passive income without hassle — that's how ApArt Hotel was born, our short-term rental division. Today we manage over 60 apartments with a verified 9.4% net ROI and a consolidated 9.7/10 rating.",
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
            description: "Clear communication, detailed monthly reports and commissions agreed before signing."
          },
          {
            icon: Target,
            title: "Measurable results",
            description: "Our performance is judged by net yield, occupancy and guest satisfaction — not by promises."
          },
          {
            icon: Heart,
            title: "Accountability",
            description: "Every property receives the same level of care we would apply to our own assets."
          },
          {
            icon: TrendingUp,
            title: "Continuous process",
            description: "Weekly dynamic pricing, periodic operational audits and data-driven optimisations."
          }
        ]
      },
      stats: {
        title: "In Numbers",
        items: [
          { value: "60+", label: "Properties under management" },
          { value: "75%", label: "Average annual occupancy" },
          { value: "9.7/10", label: "Consolidated guest rating" },
          { value: "9.4%", label: "Target net yield" }
        ]
      },
      company: {
        title: "Company Info",
        name: "Imo Business Centrum SRL",
        items: [
          { icon: MapPin, label: "Office", value: "Timișoara, Romania" },
          { icon: Phone, label: "Phone", value: "+40 799 069 256" },
          { icon: Mail, label: "Email", value: "info@realtrust.ro" }
        ]
      },
      faq: {
        title: "Frequently Asked Questions about RealTrust",
        items: [
          { q: "Who is the founder of RealTrust Timișoara?", a: "The company is founded and led by Adrian Costi, a local entrepreneur with over 25 years of experience in the Timișoara real estate market. Adrian is directly involved in every owner collaboration." },
          { q: "What commission does RealTrust real estate agency charge?", a: "For sales we apply a standard 2% + VAT commission from the seller; for long-term rentals one monthly rent. For short-term rental management the fee is 20–25% of net revenue, with no hidden costs. All commissions are agreed upfront." },
          { q: "Do you offer mortgage consulting in Timișoara?", a: "Yes, we partner with independent mortgage brokers and partner banks (BCR, BT, ING, Raiffeisen, BRD) for pre-approval, offer comparison (fixed vs. variable rate), Prima Casă/Noua Casă programs and ANEVAR appraisal. Initial consulting is free for our clients." },
          { q: "Do you sell houses in Timișoara, not just apartments?", a: "Yes. Our portfolio includes both apartments (1–4 rooms) and houses for sale in Timișoara and the metropolitan area (Dumbrăvița, Giroc, Moșnița Nouă, Ghiroda, Săcălaz) — single-family houses, duplexes and villas with land." },
          { q: "Which areas of Timișoara do you cover?", a: "We cover the entire city of Timișoara — Centru, ISHO, Iulius Town, Complex Studențesc, Cetate, Iosefin, Elisabetin, Fabric, Mehala, Freidorf, Lipovei, Aradului — plus metropolitan areas Dumbrăvița, Giroc, Moșnița Nouă and Ghiroda." },
          { q: "How is my property kept safe?", a: "We use transparent contracts, tenant credit checks, mandatory PAD insurance, smart-lock with unique guest codes, IoT monitoring (noise, smoke), post-stay cleaning with photo reporting and a 100% returned security deposit at the end of the collaboration." }
        ]
      },
      cta: {
        title: "Let's talk",
        subtitle: "Schedule a no-obligation consultation. We respond within 24 business hours with the recommended next steps.",
        button: "Request a consultation"
      }
    }
  };

  const t = content[language];

  const seoContent = {
    ro: {
      title: "Despre RealTrust: Imobiliare & Regim Hotelier Timișoara",
      description: "Echipa RealTrust: experți în imobiliare și regim hotelier Timișoara. Peste 60 proprietăți administrate cu ROI 9.4% net. Contactează-ne acum!"
    },
    en: {
      title: "About RealTrust: Real Estate & Short-Term Rentals Timișoara",
      description: "RealTrust team: real estate and short-term rental experts in Timișoara. Over 60 properties managed with 9.4% net ROI. Contact us today!"
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  // Organization JSON-LD schema — canonical identity + page-specific extras
  const organizationSchema = {
    ...REAL_ESTATE_AGENT_SCHEMA,
    "legalName": "Imo Business Centrum SRL",
    "description": seo.description,
    "foundingDate": "1999",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "9.7",
      "bestRating": "10",
      "ratingCount": "180"
    },
  };

  // Person schema for the founder (E-E-A-T)
  const founderSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Adrian Costi",
    "jobTitle": language === "ro" ? "Fondator & CEO" : "Founder & CEO",
    "worksFor": REAL_ESTATE_AGENT_REF,
    "knowsAbout": [
      "Real Estate Timișoara",
      "Short-term rental management",
      "Property investment ROI",
      "Airbnb & Booking.com optimization",
      "Hotel-style property management"
    ],
    "url": "https://realtrust.ro/despre-noi"
  };

  // FAQPage schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": t.faq.items.map((item: { q: string; a: string }) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
  };

  const combinedSchema = [organizationSchema, founderSchema, faqSchema];

  const breadcrumbItems = [
    { label: language === "ro" ? "Despre Noi" : "About Us" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/despre-noi"
        jsonLd={combinedSchema}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://realtrust.ro" },
          { name: language === "ro" ? "Despre Noi" : "About Us", url: "https://realtrust.ro/despre-noi" },
        ]}
      />
      <Header />
      <PageSummary
        summaryRo="Despre RealTrust — echipă din Timișoara specializată în servicii imobiliare complete, regim hotelier și management imobiliar Timișoara. Colaborăm cu evaluator ANEVAR Timișoara și oferim consultanță juridică imobiliară Timișoara prin parteneri notari și avocați. Cazare corporate lângă City Business Centre, Bega Business Park, Vox Park și Iulius Town."
        summaryEn="About RealTrust — Timișoara team specialized in full-service real estate, short-term rental and property management Timișoara. We work with ANEVAR appraisers and offer legal real estate consulting through notary and lawyer partners. Corporate stays near City Business Centre, Bega Business Park, Vox Park and Iulius Town."
      />
      
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-4">
          <PageBreadcrumb items={breadcrumbItems} />
        </div>

        {/* Table of Contents — jump links for long page (mobile-friendly) */}
        <nav
          aria-label={language === "ro" ? "Cuprins pagină" : "Page contents"}
          className="container mx-auto px-4 mt-4"
        >
          <div className="max-w-4xl mx-auto rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold mb-2 text-foreground">
              {language === "ro" ? "Cuprins" : "Contents"}
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {[
                { id: "misiune", label: language === "ro" ? "Misiune" : "Mission" },
                { id: "poveste", label: language === "ro" ? "Poveste" : "Story" },
                { id: "servicii-extinse", label: language === "ro" ? "Servicii extinse" : "Extended services" },
                { id: "branduri", label: language === "ro" ? "Branduri" : "Brands" },
                { id: "valori", label: language === "ro" ? "Valori" : "Values" },
                { id: "companie", label: language === "ro" ? "Date companie" : "Company info" },
                { id: "intrebari", label: language === "ro" ? "Întrebări frecvente" : "FAQ" },
              ].map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="poveste" className="py-20 md:py-28 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
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
        <section id="misiune" className="py-20 md:py-28 bg-muted/30">
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

            {/* Mission */}
            <div className="max-w-3xl mx-auto mb-16">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-8 text-center">
                  <Target className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-3">{t.mission.title}</h3>
                  <p className="text-foreground/90 leading-relaxed">{t.mission.text}</p>
                </CardContent>
              </Card>
            </div>

            {/* Pillar links — content hub (eliminates duplication with /oaspeti & /complexe) */}
            <div className="max-w-5xl mx-auto mb-16">
              <h3 className="text-xl font-semibold text-center mb-6 text-muted-foreground">
                {language === "ro" ? "Explorează paginile noastre dedicate" : "Explore our dedicated pages"}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { to: "/cartiere", label: language === "ro" ? "Vânzări apartamente & case Timișoara" : "Apartments & houses for sale Timișoara", icon: Building2 },
                  { to: "/calculator-roi", label: language === "ro" ? "Calculator ROI Regim Hotelier" : "Short-term Rental ROI Calculator", icon: TrendingUp },
                  { to: "/cazare", label: language === "ro" ? "Cazare Premium pentru oaspeți" : "Premium stays for guests", icon: Home },
                  { to: "/evaluare-gratuita", label: language === "ro" ? "Evaluare gratuită proprietate" : "Free property valuation", icon: Award }
                ].map((p, i) => (
                  <Link key={i} to={p.to} className="group">
                    <Card className="h-full hover:border-primary hover:shadow-md transition-all">
                      <CardContent className="p-5 flex flex-col items-start gap-3">
                        <p.icon className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">{p.label}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </CardContent>
                    </Card>
                  </Link>
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

        {/* SEO H3 strip — fills audit keyword gaps (ANEVAR, legal, management, business hubs) */}
        <SEOAboutAdditionsStrip />

        {/* Two Brands Section */}
        <section id="branduri" className="py-20 md:py-28">
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

        {/* Why Us — differentiation & trust */}
        <WhyUs variant="about" />

        {/* Company Timeline */}
        <CompanyTimeline />


        {/* Team Section */}
        <TeamSection />

        {/* Case studies from the portfolio managed by Adrian Costi */}
        <OwnerCaseStudies />

        {/* Interactive ROI / income estimator */}
        <OwnerRoiEstimator />

        {/* Optimized short lead capture form */}
        <OwnerContactLeadForm source="despre_noi_contact" />

        {/* Case Study — verified ROI proof */}
        <section id="studiu-caz" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
                  <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                  {language === "ro" ? "Studiu de Caz · ROI Verificat" : "Case Study · Verified ROI"}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  {language === "ro" ? "Cum am ajuns la 9,4% ROI net" : "How we reached 9.4% net ROI"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "ro"
                    ? "Exemplu anonimizat — apartament 2 camere, zona Centru/Iosefin, administrat în regim hotelier."
                    : "Anonymized example — 2-room apartment, Centru/Iosefin area, managed short-term."}
                </p>
              </div>

              <Card className="border-primary/20">
                <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-bold text-lg mb-3">{language === "ro" ? "Date proprietate" : "Property data"}</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Tip" : "Type"}</span><span className="font-medium">2 camere · 52 mp</span></li>
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Zonă" : "Area"}</span><span className="font-medium">Iosefin / Centru</span></li>
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Investiție" : "Investment"}</span><span className="font-medium">€95.000</span></li>
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Mobilare + setup" : "Furnishing + setup"}</span><span className="font-medium">€8.500</span></li>
                      <li className="flex justify-between py-2"><span className="text-muted-foreground">{language === "ro" ? "Ocupare medie" : "Avg. occupancy"}</span><span className="font-medium">82%</span></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-3">{language === "ro" ? "Rezultat anual (net)" : "Annual result (net)"}</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Venit brut" : "Gross income"}</span><span className="font-medium">€16.800</span></li>
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Comision platforme" : "Platform fees"}</span><span className="font-medium">−€2.520</span></li>
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Curățenie + utilități" : "Cleaning + utilities"}</span><span className="font-medium">−€2.400</span></li>
                      <li className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{language === "ro" ? "Management 20%" : "Management 20%"}</span><span className="font-medium">−€2.156</span></li>
                      <li className="flex justify-between py-2 text-base"><span className="font-semibold">{language === "ro" ? "Profit net" : "Net profit"}</span><span className="font-bold text-primary">€9.724 · 9,4%</span></li>
                    </ul>
                  </div>
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button asChild className="flex-1">
                      <Link to="/calculator-roi">
                        {language === "ro" ? "Calculează ROI pentru proprietatea ta" : "Calculate ROI for your property"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link to="/catalog-investitii">
                        {language === "ro" ? "Vezi catalogul de investiții 2026" : "View investment catalog 2026"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section id="valori" className="py-20 bg-muted/30">
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
        <section id="companie" className="py-16 bg-muted/30">
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

        {/* FAQ Section */}
        <section id="intrebari" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{t.faq.title}</h2>
            <div className="space-y-4">
              {t.faq.items.map((item: { q: string; a: string }, idx: number) => (
                <Card key={idx} className="border-l-4 border-l-primary/50">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2">{item.q}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
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
