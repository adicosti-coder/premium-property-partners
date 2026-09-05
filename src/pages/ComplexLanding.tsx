import { lazy, Suspense } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Building2,
  Star,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Phone,
  MapPin,
} from "lucide-react";

const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const CTA = lazy(() => import("@/components/CTA"));
const ComplexZoneListings = lazy(() => import("@/components/ComplexZoneListings"));
const OccupancyUrgencyBadge = lazy(() => import("@/components/complex/OccupancyUrgencyBadge"));


interface ComplexData {
  name: string;
  slug: string;
  roi: string;
  avgIncome: string;
  occupancy: string;
  rating: string;
  avgPrice: number;
  avgADR: number;
  /** Keywords matched against properties.location/zone to auto-load approved listings. */
  zoneMatchers?: string[];
  advantages: { ro: string; en: string }[];
}


const complexesData: Record<string, ComplexData> = {
  isho: {
    name: "ISHO",
    slug: "isho",
    roi: "9.2%",
    avgIncome: "€1,200",
    occupancy: "92%",
    rating: "9.6",
    avgPrice: 95000,
    avgADR: 55,
    zoneMatchers: ["ISHO", "Iosefin"],
    advantages: [
      { ro: "Situat lângă Centrul Vechi și Piața Unirii — acces direct la cele mai vizitate zone turistice", en: "Located near the Old Town and Unirii Square — direct access to the most visited tourist areas" },
      { ro: "Comunitate mixtă rezidențial-business cu cerere constantă de cazare pe termen scurt", en: "Mixed residential-business community with constant demand for short-term accommodation" },
      { ro: "Infrastructură premium cu spații comerciale, restaurante și coworking la parter", en: "Premium infrastructure with commercial spaces, restaurants and coworking on the ground floor" },
    ],
  },
  paltim: {
    name: "Paltim",
    slug: "paltim",
    roi: "9.5%",
    avgIncome: "€1,320",
    occupancy: "93%",
    rating: "9.7",
    avgPrice: 92000,
    avgADR: 56,
    zoneMatchers: ["Paltim", "Cetate", "Centru"],
    advantages: [
      { ro: "Poziție premium în Cetate — la pas de Piața Unirii și Catedrală", en: "Premium position in Cetate — walking distance from Unirii Square and the Cathedral" },
      { ro: "Cerere ridicată tot anul din partea turiștilor culturali și business travelers", en: "High year-round demand from cultural tourists and business travelers" },
      { ro: "Finisaje premium și smart-lock — perfecte pentru self check-in 24/7", en: "Premium finishes and smart-lock — perfect for self check-in 24/7" },
    ],
  },

  ateneo: {
    name: "ATENEO",
    slug: "ateneo",
    roi: "9.5%",
    avgIncome: "€1,350",
    occupancy: "94%",
    rating: "9.7",
    avgPrice: 85000,
    avgADR: 55,
    zoneMatchers: ["Ateneo", "Cetate", "Parcul Central"],
    advantages: [
      { ro: "Poziție ultracentral lângă Parcul Central și Catedrala Mitropolitană", en: "Ultra-central position near Central Park and the Metropolitan Cathedral" },
      { ro: "Design modern cu finisaje premium și parcare subterană — atracție pentru turiști business", en: "Modern design with premium finishes and underground parking — attractive for business tourists" },
      { ro: "Scor excelent pe Booking.com cu recenzii de 9.7+ — cerere ridicată tot anul", en: "Excellent Booking.com score with 9.7+ reviews — high demand year-round" },
    ],
  },
  "green-forest": {
    name: "GREEN FOREST",
    slug: "green-forest",
    roi: "9.4%",
    avgIncome: "€1,280",
    occupancy: "93%",
    rating: "9.7",
    avgPrice: 88000,
    avgADR: 52,
    zoneMatchers: ["Green Forest", "Padurea Verde", "Pădurea Verde"],
    advantages: [
      { ro: "Lângă Pădurea Verde și Amazonia Aquapark — ideal pentru familii și turism de weekend", en: "Near Green Forest and Amazonia Aquapark — ideal for families and weekend tourism" },
      { ro: "Zonă liniștită cu aer curat, combinată cu acces rapid la centrul orașului", en: "Quiet area with fresh air, combined with quick access to the city center" },
      { ro: "Cerere ridicată pentru sejururi de 3-7 nopți din partea familiilor cu copii", en: "High demand for 3-7 night stays from families with children" },
    ],
  },
  helios: {
    name: "HELIOS",
    slug: "helios",
    roi: "9.3%",
    avgIncome: "€1,200",
    occupancy: "91%",
    rating: "9.5",
    avgPrice: 82000,
    avgADR: 50,
    zoneMatchers: ["Helios", "Iulius Town", "Take Ionescu"],
    advantages: [
      { ro: "Complex modern cu facilități complete — sală fitness, spații verzi, loc de joacă", en: "Modern complex with complete facilities — gym, green spaces, playground" },
      { ro: "Apropiere de zona comercială Iulius Town — atracție pentru oaspeții corporate", en: "Close to Iulius Town commercial area — attractive for corporate guests" },
      { ro: "Apartamente luminoase cu orientare sudică și eficiență energetică ridicată", en: "Bright apartments with southern orientation and high energy efficiency" },
    ],
  },
  "fructus-plaza": {
    name: "Fructus Plaza",
    slug: "fructus-plaza",
    roi: "9.6%",
    avgIncome: "€1,400",
    occupancy: "95%",
    rating: "9.8",
    avgPrice: 90000,
    avgADR: 58,
    zoneMatchers: ["Fructus", "Cetate", "Victoriei"],

    advantages: [
      { ro: "Poziție ultracentral pe strada principală — la 2 minute de Piața Victoriei", en: "Ultra-central position on the main street — 2 minutes from Victory Square" },
      { ro: "Cel mai bine cotat complex din portofoliu cu rating 9.8 pe Booking.com", en: "Best rated complex in portfolio with 9.8 rating on Booking.com" },
      { ro: "Cerere constantă din partea turiștilor culturali și business travelers", en: "Constant demand from cultural tourists and business travelers" },
    ],
  },
  "city-of-mara": {
    name: "City of Mara",
    slug: "city-of-mara",
    roi: "9.1%",
    avgIncome: "€1,150",
    occupancy: "90%",
    rating: "9.5",
    avgPrice: 80000,
    avgADR: 48,
    zoneMatchers: ["Mara", "Circumvalațiunii", "Circumvalatiunii", "Aradului"],
    advantages: [

      { ro: "Zona Circumvalațiunii lângă Iulius Mall — acces rapid la shopping și divertisment", en: "Circumvalațiunii area near Iulius Mall — quick access to shopping and entertainment" },
      { ro: "Complex mare cu comunitate activă și servicii integrate", en: "Large complex with active community and integrated services" },
      { ro: "Preț de achiziție accesibil cu randament competitiv — ideal pentru prima investiție", en: "Accessible purchase price with competitive yield — ideal for first investment" },
    ],
  },
  vivalia: {
    name: "Vivalia",
    slug: "vivalia",
    roi: "9.0%",
    avgIncome: "€1,100",
    occupancy: "89%",
    rating: "9.4",
    avgPrice: 78000,
    avgADR: 47,
    zoneMatchers: ["Vivalia", "Dumbravita", "Dumbrăvița"],
    advantages: [
      { ro: "Complex nou cu finisaje premium și eficiență energetică clasă A", en: "New complex with premium finishes and class A energy efficiency" },
      { ro: "Zonă în dezvoltare rapidă cu potențial de apreciere a valorii proprietății", en: "Rapidly developing area with property value appreciation potential" },
      { ro: "Acces facil la transport public și principalele artere rutiere", en: "Easy access to public transport and main road arteries" },
    ],
  },
  "nord-one": {
    name: "Nord One",
    slug: "nord-one",
    roi: "8.9%",
    avgIncome: "€1,050",
    occupancy: "88%",
    rating: "9.3",
    avgPrice: 75000,
    avgADR: 45,
    zoneMatchers: ["Nord One", "Aradului", "Torontalului"],
    advantages: [
      { ro: "Zona de nord a Timișoarei cu acces rapid la autostradă și aeroport", en: "Northern Timișoara with quick access to highway and airport" },
      { ro: "Popular în rândul călătorilor de afaceri datorită proximității față de parcurile industriale", en: "Popular with business travelers due to proximity to industrial parks" },
      { ro: "Costuri de achiziție reduse cu potențial de creștere pe termen lung", en: "Low acquisition costs with long-term growth potential" },
    ],
  },
  "xcity-towers": {
    name: "XCity Towers",
    slug: "xcity-towers",
    roi: "9.2%",
    avgIncome: "€1,250",
    occupancy: "92%",
    rating: "9.5",
    avgPrice: 87000,
    avgADR: 53,
    zoneMatchers: ["XCity", "X City", "Aradului", "Oasis"],
    advantages: [
      { ro: "Poziție strategică pe Calea Aradului cu vedere panoramică asupra orașului", en: "Strategic position on Calea Aradului with panoramic city views" },
      { ro: "Complex mixed-use cu retail și birouri — fluxuri constante de oaspeți corporate", en: "Mixed-use complex with retail and offices — constant corporate guest flows" },
      { ro: "Infrastructură modernă cu smart home integrat — experiență premium pentru oaspeți", en: "Modern infrastructure with integrated smart home — premium guest experience" },
    ],
  },
  "denya-forest": {
    name: "Denya Forest",
    slug: "denya-forest",
    roi: "9.1%",
    avgIncome: "€1,180",
    occupancy: "90%",
    rating: "9.4",
    avgPrice: 83000,
    avgADR: 50,
    zoneMatchers: ["Denya", "Padurea Verde", "Pădurea Verde", "Ghiroda"],
    advantages: [
      { ro: "Situat la marginea Pădurii Verde — liniște și natură la câteva minute de centru", en: "Located at the edge of Green Forest — peace and nature minutes from downtown" },
      { ro: "Atracție deosebită pentru familii și cupluri care caută o experiență de retreat urban", en: "Special attraction for families and couples seeking an urban retreat experience" },
      { ro: "Cerere sezonieră puternică pentru weekend-uri și vacanțe scurte", en: "Strong seasonal demand for weekends and short vacations" },
    ],
  },
};

const ComplexLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();

  const complex = slug ? complexesData[slug] : null;

  if (!complex) {
    return <Navigate to="/ansambluri-rezidentiale" replace />;
  }

  const isRo = language === "ro";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    name: `${complex.name}, Timișoara`,
    description: `Apartamente în regim hotelier în ${complex.name} administrate de RealTrust.`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Timișoara",
      addressCountry: "RO",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Self check-in 24/7", value: true },
      { "@type": "LocationFeatureSpecification", name: "Parcare subterană", value: true },
    ],
  };

  const stats = [
    { label: "ROI", value: complex.roi },
    { label: isRo ? "Venit mediu/lună" : "Avg income/month", value: complex.avgIncome },
    { label: isRo ? "Ocupare medie" : "Avg occupancy", value: complex.occupancy },
    { label: "Rating Booking", value: complex.rating },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={isRo
          ? `Apartamente de închiriat și vânzare în ${complex.name} Timișoara | RealTrust`
          : `Apartments for rent and sale in ${complex.name} Timișoara | RealTrust`}
        description={isRo
          ? `Apartamente disponibile în ${complex.name}, Timișoara. ROI ${complex.roi}, venit ${complex.avgIncome}/lună, ocupare ${complex.occupancy}. Cele mai recente anunțuri verificate de RealTrust + analiză financiară completă pentru regim hotelier.`
          : `Apartments available in ${complex.name}, Timișoara. ROI ${complex.roi}, income ${complex.avgIncome}/month, occupancy ${complex.occupancy}. Latest RealTrust-verified listings plus complete short-term-rental financial analysis.`}

        url={`https://realtrust.ro/complexe/${complex.slug}`}
        jsonLd={jsonLd}
        breadcrumbItems={[
          { name: isRo ? "Acasă" : "Home", url: "https://realtrust.ro" },
          { name: isRo ? "Complexe" : "Complexes", url: "https://realtrust.ro/ansambluri-rezidentiale" },
          { name: complex.name, url: `https://realtrust.ro/complexe/${complex.slug}` },
        ]}
      />

      <Header />

      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-6 mb-8">
          <PageBreadcrumb
            items={[
              { label: isRo ? "Complexe" : "Complexes", href: "/ansambluri-rezidentiale" },
              { label: complex.name },
            ]}
          />
        </div>

        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <MapPin className="w-3 h-3 mr-1" />
                Timișoara
              </Badge>
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-6">
                {isRo
                  ? `Apartament ${complex.name} în regim hotelier — Timișoara`
                  : `${complex.name} Apartment — Short-Term Rental Timișoara`}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {isRo
                  ? `ROI net țintă ${complex.roi}, calculat pe ipoteze publice (ocupare 75%, deducere 27%). Venit lunar estimat ${complex.avgIncome}, ocupare observată ${complex.occupancy}. Operațiuni gestionate end-to-end de echipa RealTrust și ApArt Hotel.`
                  : `Target net ROI ${complex.roi}, calculated on public assumptions (75% occupancy, 27% deduction). Estimated monthly income ${complex.avgIncome}, observed occupancy ${complex.occupancy}. Operations handled end-to-end by the RealTrust and ApArt Hotel team.`}
              </p>
              <Suspense fallback={null}>
                <OccupancyUrgencyBadge
                  complexSlug={complex.slug}
                  complexName={complex.name}
                  baselineOccupancy={complex.occupancy}
                  isRo={isRo}
                />
              </Suspense>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <Link to="/pentru-proprietari">
                  <Button variant="premium" size="lg" className="gap-2">
                    <Phone className="w-4 h-4" />
                    {isRo ? "Solicită o consultație gratuită" : "Request a free consultation"}
                  </Button>
                </Link>
                <Link to="/oaspeti">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    {isRo ? "Vezi apartamentele disponibile" : "View available apartments"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-8 border-y border-border/50 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why This Complex */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground text-center mb-10">
              {isRo
                ? `De ce ${complex.name} e ideal pentru regim hotelier`
                : `Why ${complex.name} is ideal for short-term rental`}
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {complex.advantages.map((adv, idx) => (
                <Card key={idx} className="border-border/50">
                  <CardContent className="pt-6">
                    <CheckCircle2 className="w-8 h-8 text-primary mb-4" />
                    <p className="text-foreground">{isRo ? adv.ro : adv.en}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Auto-loaded approved listings for this complex's zone */}
        {complex.zoneMatchers && complex.zoneMatchers.length > 0 && (
          <Suspense fallback={null}>
            <ComplexZoneListings
              complexName={complex.name}
              zoneMatchers={complex.zoneMatchers}
              isRo={isRo}
            />
          </Suspense>
        )}

        {/* ROI Calculator */}

        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-6">
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <ProfitCalculator />
            </Suspense>
          </div>
        </section>

        {/* CTA Section */}
        <Suspense fallback={null}>
          <CTA />
        </Suspense>
      </main>

      <Footer />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default ComplexLanding;
