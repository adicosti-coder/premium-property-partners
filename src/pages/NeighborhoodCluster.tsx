import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { REAL_ESTATE_AGENT_SCHEMA } from "@/lib/orgIdentity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  MapPin,
  Star,
  CheckCircle2,
  Phone,
  MessageCircle,
  ArrowRight,
  Building2,
  Users,
  Calendar,
} from "lucide-react";

const QuickLeadForm = lazy(() => import("@/components/QuickLeadForm"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

interface NeighborhoodFAQ {
  q: string;
  a: string;
}

interface NeighborhoodData {
  slug: string;
  name: string;
  hero: { ro: string; en: string };
  intro: { ro: string; en: string };
  stats: { roi: string; avgIncome: string; occupancy: string; rating: string };
  highlights: { ro: string; en: string }[];
  whyInvest: { ro: string[]; en: string[] };
  nearby: { ro: string[]; en: string[] };
  faqs: { ro: NeighborhoodFAQ[]; en: NeighborhoodFAQ[] };
  geo: { lat: number; lng: number };
}

const data: Record<string, NeighborhoodData> = {
  isho: {
    slug: "isho",
    name: "ISHO",
    hero: {
      ro: "Investiții ISHO Timișoara — Apartamente Regim Hotelier cu ROI 9.2%",
      en: "ISHO Timișoara Investments — Short-Term Rental Apartments with 9.2% ROI",
    },
    intro: {
      ro: "ISHO este unul dintre cele mai dorite ansambluri rezidențiale din Timișoara, cu acces direct la Centrul Vechi, Piața Unirii și principalele atracții turistice. Apartamentele administrate de RealTrust în ISHO generează în medie €1.200/lună cu o rată de ocupare de 92%.",
      en: "ISHO is one of the most sought-after residential complexes in Timișoara, with direct access to the Old Town, Unirii Square and main tourist attractions. RealTrust-managed apartments in ISHO generate on average €1,200/month with a 92% occupancy rate.",
    },
    stats: { roi: "9.2%", avgIncome: "€1.200", occupancy: "92%", rating: "9.6" },
    highlights: [
      {
        ro: "5 minute pe jos până în Piața Unirii și Centrul Vechi",
        en: "5-minute walk to Unirii Square and the Old Town",
      },
      {
        ro: "Acces direct la Splaiul Tudor Vladimirescu și malul Begăi",
        en: "Direct access to Splaiul Tudor Vladimirescu and the Bega riverbank",
      },
      {
        ro: "Restaurante, cafenele și spații coworking la parterul ansamblului",
        en: "Restaurants, cafés and coworking spaces on the ground floor",
      },
      {
        ro: "Comunitate mixtă rezidențial-business cu cerere constantă",
        en: "Mixed residential-business community with constant demand",
      },
    ],
    whyInvest: {
      ro: [
        "Locație ultracentral cu cerere turistică ridicată tot anul",
        "Apartamente noi cu finisaje premium și parcare subterană",
        "Cerere puternică din partea turiștilor business și culturali",
        "ROI verificat 9.2% net cu break-even în ~10 ani",
        "Potențial de apreciere a valorii proprietății cu 5-7% anual",
      ],
      en: [
        "Ultra-central location with high tourist demand year-round",
        "New apartments with premium finishes and underground parking",
        "Strong demand from business and cultural tourists",
        "Verified 9.2% net ROI with ~10-year break-even",
        "Property value appreciation potential of 5-7% annually",
      ],
    },
    nearby: {
      ro: [
        "Piața Unirii (5 min pe jos)",
        "Catedrala Mitropolitană (8 min)",
        "Iulius Town (15 min cu mașina)",
        "UVT — Universitatea de Vest (10 min)",
        "Aeroport Internațional Timișoara (20 min)",
      ],
      en: [
        "Unirii Square (5-min walk)",
        "Metropolitan Cathedral (8-min walk)",
        "Iulius Town (15 min by car)",
        "West University (10 min)",
        "Timișoara International Airport (20 min)",
      ],
    },
    faqs: {
      ro: [
        {
          q: "Cât costă un apartament în ISHO Timișoara?",
          a: "Prețurile pornesc de la €85.000 pentru o garsonieră modernă și ajung la €180.000 pentru un apartament cu 3 camere. Investiția medie pentru regim hotelier este de €95.000.",
        },
        {
          q: "Ce ROI pot obține cu un apartament în ISHO administrat în regim hotelier?",
          a: "ROI-ul net mediu verificat în ISHO este de 9.2% anual, cu venituri lunare medii de €1.200 și ocupare de 92%. Datele provin din portofoliul real RealTrust pe ultimele 24 de luni.",
        },
        {
          q: "Sunt permise apartamentele Airbnb în ISHO?",
          a: "Da, ansamblul ISHO permite și încurajează regimul hotelier. RealTrust gestionează deja peste 15 apartamente în ISHO cu autorizație ANAF și plată impozite la zi.",
        },
      ],
      en: [
        {
          q: "How much does an apartment in ISHO Timișoara cost?",
          a: "Prices start from €85,000 for a modern studio up to €180,000 for a 3-room apartment. Average investment for short-term rental is €95,000.",
        },
        {
          q: "What ROI can I get with a short-term rental apartment in ISHO?",
          a: "Verified average net ROI in ISHO is 9.2% annually, with average monthly income of €1,200 and 92% occupancy. Data from RealTrust portfolio over the last 24 months.",
        },
        {
          q: "Are Airbnb apartments allowed in ISHO?",
          a: "Yes, the ISHO complex permits and encourages short-term rentals. RealTrust already manages 15+ apartments in ISHO with full ANAF compliance.",
        },
      ],
    },
    geo: { lat: 45.7494, lng: 21.225 },
  },
  "iulius-town": {
    slug: "iulius-town",
    name: "Iulius Town",
    hero: {
      ro: "Investiții Iulius Town Timișoara — Apartamente Regim Hotelier cu ROI 9.3%",
      en: "Iulius Town Timișoara Investments — Short-Term Rental Apartments with 9.3% ROI",
    },
    intro: {
      ro: "Iulius Town este cel mai mare proiect mixed-use din vestul României, integrând shopping, birouri clasa A, restaurante și apartamente premium. Zona generează cerere constantă din partea turiștilor business, oaspeților UnitedBusinessCenter și călătorilor în tranzit.",
      en: "Iulius Town is the largest mixed-use project in western Romania, integrating shopping, Class A offices, restaurants and premium apartments. The area generates constant demand from business tourists, United Business Center guests and transit travelers.",
    },
    stats: { roi: "9.3%", avgIncome: "€1.250", occupancy: "91%", rating: "9.5" },
    highlights: [
      {
        ro: "Acces direct la Iulius Mall (200+ magazine, food court, cinema)",
        en: "Direct access to Iulius Mall (200+ stores, food court, cinema)",
      },
      {
        ro: "United Business Center — 7 turnuri de birouri clasa A",
        en: "United Business Center — 7 Class A office towers",
      },
      {
        ro: "Parcul Iulius Town — 5 hectare verzi în mijlocul orașului",
        en: "Iulius Town Park — 5 hectares of greenery in the city center",
      },
      {
        ro: "30+ restaurante și cafenele premium la câteva minute distanță",
        en: "30+ premium restaurants and cafés minutes away",
      },
    ],
    whyInvest: {
      ro: [
        "Cea mai puternică cerere business din Timișoara (corporate guests)",
        "Ocupare constantă tot anul, mai ales L-J",
        "Self check-in 24/7 cu acces controlat — securitate premium",
        "Parcare gratuită subterană pentru oaspeți",
        "Proximitate Aeroport (15 min) — atrage business travelers internaționali",
      ],
      en: [
        "Strongest business demand in Timișoara (corporate guests)",
        "Year-round constant occupancy, especially Mon-Thu",
        "24/7 self check-in with controlled access — premium security",
        "Free underground parking for guests",
        "Airport proximity (15 min) — attracts international business travelers",
      ],
    },
    nearby: {
      ro: [
        "Iulius Mall (la fața locului)",
        "United Business Center (la fața locului)",
        "Parcul Iulius Town (la fața locului)",
        "Centrul Vechi (15 min cu mașina)",
        "Aeroport Internațional Timișoara (15 min)",
      ],
      en: [
        "Iulius Mall (on-site)",
        "United Business Center (on-site)",
        "Iulius Town Park (on-site)",
        "Old Town (15 min by car)",
        "Timișoara International Airport (15 min)",
      ],
    },
    faqs: {
      ro: [
        {
          q: "Cât costă un apartament în Iulius Town?",
          a: "Investiția medie pentru un apartament potrivit regimului hotelier în zona Iulius Town este de €87.000 - €110.000, în funcție de etaj, vedere și suprafață.",
        },
        {
          q: "Care este profilul tipic al oaspeților în zona Iulius Town?",
          a: "Aproximativ 65% sunt călători business (corporate stays 2-4 nopți), 25% turiști de weekend și 10% călători în tranzit spre/dinspre aeroport. Ocupare medie 91%.",
        },
        {
          q: "Ce facilități atrag oaspeții în zona Iulius Town?",
          a: "Mall-ul integrat, accesul rapid la birourile UBC, parcurile, restaurantele și apropierea de aeroport. Ratingurile Booking pentru proprietățile RealTrust din zonă sunt 9.5+.",
        },
      ],
      en: [
        {
          q: "How much does an apartment in Iulius Town cost?",
          a: "Average investment for a short-term rental-suited apartment in Iulius Town is €87,000 - €110,000, depending on floor, view and size.",
        },
        {
          q: "What is the typical guest profile in the Iulius Town area?",
          a: "Approximately 65% business travelers (2-4 night corporate stays), 25% weekend tourists, 10% airport transit travelers. Average occupancy 91%.",
        },
        {
          q: "What attracts guests to the Iulius Town area?",
          a: "The integrated mall, quick UBC office access, parks, restaurants and airport proximity. Booking ratings for RealTrust properties in the area are 9.5+.",
        },
      ],
    },
    geo: { lat: 45.7669, lng: 21.2287 },
  },
};

const NeighborhoodCluster = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const isRo = language === "ro";

  const n = slug ? data[slug] : null;
  if (!n) return <Navigate to="/cartiere" replace />;

  const url = `https://realtrust.ro/cartier/${n.slug}`;
  const hero = isRo ? n.hero.ro : n.hero.en;
  const intro = isRo ? n.intro.ro : n.intro.en;
  const faqs = isRo ? n.faqs.ro : n.faqs.en;
  const why = isRo ? n.whyInvest.ro : n.whyInvest.en;
  const nearby = isRo ? n.nearby.ro : n.nearby.en;

  // Multi-schema: Place + RealEstateListing + FAQPage + Breadcrumb
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Place",
      "@id": `${url}#place`,
      name: `${n.name}, Timișoara`,
      description: intro,
      url,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Timișoara",
        addressRegion: "Timiș",
        addressCountry: "RO",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: n.geo.lat,
        longitude: n.geo.lng,
      },
    },
    {
      ...REAL_ESTATE_AGENT_SCHEMA,
      areaServed: {
        "@type": "Place",
        name: `${n.name}, Timișoara`,
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "9.7",
        bestRating: "10",
        ratingCount: "180",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      isRo
        ? `Bună ziua! Sunt interesat de o investiție în apartament regim hotelier în zona ${n.name}.`
        : `Hello! I'm interested in a short-term rental investment in the ${n.name} area.`,
    );
    window.open(`https://wa.me/40799069256?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const stats = [
    { label: "ROI", value: n.stats.roi, icon: TrendingUp },
    { label: isRo ? "Venit mediu/lună" : "Avg income/month", value: n.stats.avgIncome, icon: Calendar },
    { label: isRo ? "Ocupare" : "Occupancy", value: n.stats.occupancy, icon: Users },
    { label: "Rating Booking", value: n.stats.rating, icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={hero}
        description={intro.slice(0, 160)}
        url={url}
        jsonLd={schemas}
        breadcrumbItems={[
          { name: isRo ? "Acasă" : "Home", url: "https://realtrust.ro" },
          {
            name: isRo ? "Imobiliare Timișoara" : "Timișoara Real Estate",
            url: "https://realtrust.ro/cartiere",
          },
          { name: n.name, url },
        ]}
      />

      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 mb-8">
          <PageBreadcrumb
            items={[
              { label: isRo ? "Imobiliare Timișoara" : "Timișoara Real Estate", href: "/cartiere" },
              { label: n.name },
            ]}
          />
        </div>

        {/* Hero */}
        <section className="relative py-12 md:py-16 bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <MapPin className="w-3 h-3 mr-1" />
                {n.name}, Timișoara
              </Badge>
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
                {hero}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">{intro}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={handleWhatsApp} className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {isRo ? "Contact WhatsApp" : "WhatsApp Contact"}
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <a href="tel:+40799069256">
                    <Phone className="w-4 h-4" />
                    +40 799 069 256
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 border-y border-border/50 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-10">
                {isRo
                  ? `De ce ${n.name} e ideal pentru regim hotelier`
                  : `Why ${n.name} is ideal for short-term rentals`}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {n.highlights.map((h, i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="pt-6 flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-foreground text-sm">{isRo ? h.ro : h.en}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Invest + Nearby */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {isRo ? "De ce să investești" : "Why invest"}
                  </h3>
                  <ul className="space-y-2">
                    {why.map((w, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {isRo ? "În proximitate" : "Nearby"}
                  </h3>
                  <ul className="space-y-2">
                    {nearby.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ROI Calculator */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <ProfitCalculator />
            </Suspense>
          </div>
        </section>

        {/* Lead form */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-6">
            <Suspense fallback={<div className="min-h-[300px]" />}>
              <QuickLeadForm />
            </Suspense>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-8">
              {isRo ? `Întrebări frecvente — ${n.name}` : `FAQ — ${n.name}`}
            </h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="pt-5">
                    <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                    <p className="text-sm text-muted-foreground">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
              {isRo
                ? `Investește în ${n.name} cu RealTrust`
                : `Invest in ${n.name} with RealTrust`}
            </h2>
            <p className="text-muted-foreground mb-8">
              {isRo
                ? "Echipa noastră îți oferă consultanță gratuită, identifică apartamentul potrivit și preia administrarea completă în regim hotelier."
                : "Our team provides free consultation, identifies the right apartment and takes over full short-term rental management."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={handleWhatsApp} className="gap-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/pentru-proprietari">
                  {isRo ? "Vezi pachetele de administrare" : "View management packages"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default NeighborhoodCluster;
