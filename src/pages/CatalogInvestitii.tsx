import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { exportInvestmentCatalogPdf } from "@/utils/exportInvestmentCatalogPdf";
import SEOHead from "@/components/SEOHead";
import { FINANCIAL_SERVICE_SCHEMA } from "@/lib/orgIdentity";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOFooterText from "@/components/SEOFooterText";
import BackToTop from "@/components/BackToTop";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { toast } from "sonner";
import { storageImage, storageImageSrcSet } from "@/utils/supabaseImage";
import {
  TrendingUp, Building, Star, ArrowRight, Download, MapPin,
  BedDouble, Bath, Users, Euro, CheckCircle2, Shield, BarChart3,
  Sparkles, Lock, Mail, Award, Flame, Plane, List, HelpCircle, TreePine, Factory,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";

interface Property {
  name: string;
  location: string;
  size: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  base_price_per_night: number | null;
  roi_percentage: string | null;
  estimated_revenue: string | null;
  booking_rating: number | null;
  booking_review_count: number | null;
  description_ro?: string;
  description_en?: string;
  tag: string;
  listing_type: string | null;
  capital_necesar: number | null;
  slug: string | null;
  image_path: string | null;
  images: string[] | null;
}

const PROPERTY_IMAGES_BUCKET = "property-images";
const CATALOG_URL = "https://realtrust.ro/catalog-investitii";

const localAssetImageMap = Object.entries(
  import.meta.glob("../assets/*.{avif,gif,jpg,jpeg,png,svg,webp}", {
    eager: true,
    import: "default",
  })
).reduce<Record<string, string>>((acc, [filePath, assetUrl]) => {
  const fileName = filePath.split("/").pop();
  if (fileName && typeof assetUrl === "string") {
    acc[fileName] = assetUrl;
  }
  return acc;
}, {});

const extractStoragePathFromUrl = (urlValue: string): string | null => {
  try {
    const parsed = new URL(urlValue);
    const prefixes = [
      `/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`,
      `/storage/v1/object/sign/${PROPERTY_IMAGES_BUCKET}/`,
      `/storage/v1/render/image/public/${PROPERTY_IMAGES_BUCKET}/`,
    ];

    for (const prefix of prefixes) {
      const index = parsed.pathname.indexOf(prefix);
      if (index >= 0) {
        return decodeURIComponent(parsed.pathname.slice(index + prefix.length));
      }
    }

    return null;
  } catch {
    return null;
  }
};

const resolvePropertyImageUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.startsWith("data:image/")) {
    return normalized;
  }

  const normalizedWithoutQuery = normalized.split("?")[0];
  const fileName = normalizedWithoutQuery.split("/").pop();

  if (fileName && localAssetImageMap[fileName]) {
    return localAssetImageMap[fileName];
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    const storagePath = extractStoragePathFromUrl(normalized);
    if (storagePath) {
      return supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    }
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  const path = normalized
    .replace(/^property-images\//, "")
    .replace(/^\//, "");

  return supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
};

const CatalogInvestitii = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const isRo = language === "ro";

  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (token === "invest2026" || emailParam) {
      setIsUnlocked(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProperties = async () => {
      // Parametrized via INVESTMENT_CARD_COLUMNS — no descriptions / blobs.
      // Wrapped in fetchWithRetry: transient 5xx / network blips self-heal
      // before QueryBoundary's fallback ever paints.
      const { fetchPublicListings, INVESTMENT_CARD_COLUMNS } = await import("@/lib/listingQueries");
      const { data, error } = await fetchPublicListings<Property>({
        columns: INVESTMENT_CARD_COLUMNS,
      });
      if (error) {
        const { reportError } = await import("@/lib/errorReporting");
        reportError(error, { scope: "listings:catalog-investitii" });
      }
      setProperties(data ?? []);
      setLoading(false);
    };
    fetchProperties();
  }, []);

  const saleProperties = properties.filter((p) => p.listing_type === "vanzare" || p.listing_type === "investitie");
  const rentalProperties = properties.filter((p) => p.listing_type === "cazare" || p.listing_type === "inchiriere");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(isRo ? "Introdu un email valid." : "Enter a valid email.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Subscribe via Supabase edge function (MailerLite removed for CSP compliance)
      await supabase.functions.invoke("subscribe-newsletter", {
        body: { email, source: "catalog_page", language, user_type: "buyer" },
      }).catch(() => {});
      setIsUnlocked(true);
      toast.success(isRo ? "Catalogul a fost deblocat!" : "Catalog unlocked!");
    } catch {
      toast.error(isRo ? "Eroare. Încearcă din nou." : "Error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await exportInvestmentCatalogPdf({ language: isRo ? "ro" : "en" });
      toast.success(isRo ? "PDF descărcat cu succes!" : "PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error(isRo ? "Eroare la generarea PDF-ului. Încearcă din nou." : "Error generating PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const t = {
    title: isRo ? "Catalog investiții Timișoara 2026 | RealTrust" : "Timișoara Investment Catalog 2026 | RealTrust",
    subtitle: isRo
      ? "Proprietăți premium cu randament garantat în Capitala Culturală a Europei"
      : "Premium properties with guaranteed returns in the European Capital of Culture",
    unlockTitle: isRo ? "Deblochează Catalogul Complet" : "Unlock the Full Catalog",
    unlockDesc: isRo
      ? "Introdu emailul tău pentru acces instant la toate proprietățile, analizele financiare și oportunitățile de investiție."
      : "Enter your email for instant access to all properties, financial analyses and investment opportunities.",
    unlockCta: isRo ? "Deblochează Catalogul" : "Unlock Catalog",
    downloadPdf: isRo ? "Descarcă PDF" : "Download PDF",
    whyTitle: isRo ? "De ce Timișoara în 2026?" : "Why Timișoara in 2026?",
    saleTitle: isRo ? "Proprietăți Disponibile la Vânzare" : "Properties Available for Sale",
    portfolioTitle: isRo ? "Portofoliu Activ — Studii de Caz" : "Active Portfolio — Case Studies",
    comparisonTitle: isRo ? "Analiză Financiară Comparativă" : "Comparative Financial Analysis",
    ctaTitle: isRo ? "Începe să Investești Astăzi" : "Start Investing Today",
    ctaDesc: isRo
      ? "Contactează-ne pentru o consultanță gratuită și analiză personalizată a oportunităților de investiție."
      : "Contact us for a free consultation and personalized investment opportunity analysis.",
    night: isRo ? "noapte" : "night",
    month: isRo ? "lună" : "month",
    rooms: isRo ? "camere" : "rooms",
    baths: isRo ? "băi" : "baths",
    guests: isRo ? "persoane" : "guests",
    reviews: isRo ? "recenzii" : "reviews",
    investment: isRo ? "Capital" : "Investment",
    tocTitle: isRo ? "Cuprins" : "Table of Contents",
    marketTitle: isRo ? "Piața imobiliară Timișoara — analiză 2026" : "Timișoara real estate market — 2026 analysis",
    faqTitle: isRo ? "Întrebări frecvente despre investiții imobiliare" : "Frequently asked questions about real estate investments",
  };

  const tocItems = isRo
    ? [
        { id: "why", label: "De ce Timișoara" },
        { id: "market", label: "Piața imobiliară & prețuri" },
        { id: "properties", label: "Proprietăți de vânzare" },
        { id: "portfolio", label: "Portofoliu activ" },
        { id: "comparison", label: "Comparație ROI" },
        { id: "faq", label: "Întrebări frecvente" },
      ]
    : [
        { id: "why", label: "Why Timișoara" },
        { id: "market", label: "Market & prices" },
        { id: "properties", label: "Properties for sale" },
        { id: "portfolio", label: "Active portfolio" },
        { id: "comparison", label: "ROI comparison" },
        { id: "faq", label: "FAQ" },
      ];

  const faqItems = isRo
    ? [
        {
          question: "Care sunt prețurile apartamentelor în Timișoara în 2026?",
          answer:
            "Prețurile apartamentelor din Timișoara variază între 1.500–2.000 EUR/mp în zonele periferice (Mehala, Plopi) și 2.300–3.200 EUR/mp în zonele premium (Centru, ISHO, Iulius Town, Complex Studențesc). În ansamblurile noi precum ATENEO, City of Mara, Adora Forest, Vivalia sau Nord One, prețurile pornesc de la 1.900 EUR/mp în Dumbrăvița, Giroc și Ghiroda.",
        },
        {
          question: "Există terenuri de vânzare în Timișoara și zonele metropolitane?",
          answer:
            "Da, oferim consultanță pentru terenuri în Giroc, Dumbrăvița, Moșnița Nouă, Ghiroda și Săcălaz, cu prețuri între 60–180 EUR/mp în funcție de utilități, PUZ și zonificare. Sunt ideale pentru dezvoltatori sau investitori care construiesc case sau mici ansambluri de închiriat.",
        },
        {
          question: "Ce ROI pot obține din investiții în regim hotelier vs. chirie clasică?",
          answer:
            "Apartamentele administrate în regim hotelier de RealTrust generează ROI net verificat de 8–11% (mediu 9.4%), comparativ cu 3–4% pe modelul chirie clasică pe termen lung. Diferența anuală pentru un apartament de 140.000 EUR este de aproximativ +8.340 EUR.",
        },
        {
          question: "Care este structura de comision RealTrust?",
          answer:
            "Pentru tranzacții de vânzare/cumpărare comisionul standard este 2% (negociabil). Pentru administrarea în regim hotelier reținem 20% din venitul brut, fără costuri ascunse — totul este transparent în raportul lunar.",
        },
        {
          question: "Cum funcționează creditul ipotecar pentru o investiție imobiliară?",
          answer:
            "Colaborăm cu brokeri locali care obțin pre-aprobări în 48h, cu avans 15–25%, dobânzi fixe sau variabile (IRCC + 2–3%) și perioade de 25–30 ani. Pentru investiții, banca evaluează venitul estimat din chirie ca venit suplimentar.",
        },
        {
          question: "Care sunt avantajele zonelor cu parcuri industriale (Continental, Hella, VGP, WDP, Incontro)?",
          answer:
            "Cartierele Aradului, Calea Torontalului și Ghiroda beneficiază de cerere constantă de chirie din partea angajaților relocați la Continental, Hella, VGP, WDP, Incontro și Linde. Proprietățile aici au ocupare 95%+ și sunt ideale pentru închiriere medii și lungi.",
        },
      ]
    : [
        {
          question: "What are apartment prices in Timișoara in 2026?",
          answer:
            "Timișoara apartment prices range from 1,500–2,000 EUR/sqm in outer areas (Mehala, Plopi) up to 2,300–3,200 EUR/sqm in premium zones (Centru, ISHO, Iulius Town, Student Complex). New developments like ATENEO, City of Mara, Adora Forest, Vivalia or Nord One start from 1,900 EUR/sqm in Dumbrăvița, Giroc and Ghiroda.",
        },
        {
          question: "Are there land plots for sale in Timișoara and metro area?",
          answer:
            "Yes, we advise on plots in Giroc, Dumbrăvița, Moșnița Nouă, Ghiroda and Săcălaz, with prices 60–180 EUR/sqm depending on utilities, PUZ and zoning. Ideal for developers or investors building houses or small rental complexes.",
        },
        {
          question: "What ROI can I get from hotel-style vs. classic rental?",
          answer:
            "Apartments managed in hotel-style by RealTrust generate verified net ROI of 8–11% (average 9.4%), versus 3–4% on long-term classic rental. The yearly difference for a 140,000 EUR apartment is approximately +8,340 EUR.",
        },
        {
          question: "What is RealTrust's commission structure?",
          answer:
            "Sale/purchase transactions: standard 2% commission (negotiable). Hotel-style management: 20% of gross revenue, with no hidden costs — fully transparent in the monthly report.",
        },
        {
          question: "How does a mortgage work for a real estate investment?",
          answer:
            "We work with local brokers who get pre-approval in 48h, with 15–25% down payment, fixed or variable rates (IRCC + 2–3%) and 25–30 year terms. For investments, the bank counts estimated rental income as additional income.",
        },
        {
          question: "What are the benefits of areas near industrial parks (Continental, Hella, VGP, WDP, Incontro)?",
          answer:
            "Aradului, Calea Torontalului and Ghiroda neighborhoods benefit from constant rental demand from employees relocated to Continental, Hella, VGP, WDP, Incontro and Linde. Properties here have 95%+ occupancy and are ideal for medium and long-term rentals.",
        },
      ];

  useRegisterFAQs("catalog-investitii", faqItems);

  const reasons = isRo
    ? [
        { icon: TrendingUp, text: "Creștere turistică +40% — Capitala Culturală Europeană", gradient: "from-amber-500/20 to-yellow-500/10" },
        { icon: Building, text: "Al 2-lea hub IT din România — cerere constantă", gradient: "from-blue-500/20 to-indigo-500/10" },
        { icon: BarChart3, text: "ROI 8-11% hotelier vs 3-4% chirie clasică", gradient: "from-emerald-500/20 to-green-500/10" },
        { icon: Euro, text: "Prețuri cu 30-50% sub București sau Cluj", gradient: "from-amber-500/20 to-orange-500/10" },
        { icon: Plane, text: "Infrastructură modernizată: aeroport, tramvaie, regenerare urbană", gradient: "from-purple-500/20 to-violet-500/10" },
      ]
    : [
        { icon: TrendingUp, text: "+40% tourism growth — European Capital of Culture", gradient: "from-amber-500/20 to-yellow-500/10" },
        { icon: Building, text: "Romania's 2nd IT hub — constant demand", gradient: "from-blue-500/20 to-indigo-500/10" },
        { icon: BarChart3, text: "8-11% hotel-style ROI vs 3-4% classic rental", gradient: "from-emerald-500/20 to-green-500/10" },
        { icon: Euro, text: "Prices 30-50% below Bucharest or Cluj", gradient: "from-amber-500/20 to-orange-500/10" },
        { icon: Plane, text: "Modernized infrastructure: airport, trams, urban regeneration", gradient: "from-purple-500/20 to-violet-500/10" },
      ];

  const breadcrumbItems = [
    {
      name: isRo ? "Catalog Investiții 2026" : "Investment Catalog 2026",
      url: CATALOG_URL,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t.title}
        description={t.subtitle}
        url={CATALOG_URL}
        jsonLd={FINANCIAL_SERVICE_SCHEMA as unknown as Record<string, unknown>}
        breadcrumbItems={breadcrumbItems}
      />
      <Header />

      <main className="pt-16 md:pt-20">
        <section className="relative overflow-hidden bg-foreground text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.1),transparent_60%)]" />

          <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" />
                {isRo ? "Ediția 2026" : "2026 Edition"}
              </span>

              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
                {isRo ? (
                  <>
                    Catalogul de <span className="text-primary">Investiții</span>
                    <br />
                    Timișoara 2026
                  </>
                ) : (
                  <>
                    Timișoara <span className="text-primary">Investment</span>
                    <br />
                    Catalog 2026
                  </>
                )}
              </h1>

              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
                {t.subtitle}
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { value: loading ? "—" : String(properties.length), label: isRo ? "Proprietăți" : "Properties" },
                  { value: "9.4%", label: isRo ? "ROI Mediu" : "Avg ROI" },
                  { value: "85%", label: isRo ? "Ocupare" : "Occupancy" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                  >
                    <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-xs text-white/50 mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </section>

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            <motion.section
              key="gate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto px-4 -mt-8 relative z-10 pb-20"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 pb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-center text-foreground mb-2">
                    {t.unlockTitle}
                  </h2>
                  <p className="text-muted-foreground text-center text-sm">{t.unlockDesc}</p>
                </div>

                <form onSubmit={handleUnlock} className="p-8 pt-6 space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="email@exemplu.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-11 text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="premium"
                    size="xl"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        {t.unlockCta}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-2">
                    <Shield className="w-3.5 h-3.5" />
                    {isRo ? "Nu trimitem spam. Dezabonare oricând." : "No spam. Unsubscribe anytime."}
                  </div>
                </form>

                <div className="border-t border-border px-8 py-6 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {isRo ? "Ce vei primi:" : "What you'll get:"}
                  </p>
                  <div className="space-y-2">
                    {[
                      isRo ? "Analiză completă de piață Timișoara 2026" : "Complete Timișoara 2026 market analysis",
                      isRo ? "Proprietăți cu ROI dovedit de 8-11%" : "Properties with proven 8-11% ROI",
                      isRo ? "Comparație financiară hotelier vs. clasic" : "Hotel-style vs. classic financial comparison",
                      isRo ? "Studii de caz din portofoliul activ" : "Case studies from active portfolio",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="sticky top-16 md:top-20 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {isRo ? "Catalog Deblocat" : "Catalog Unlocked"}
                  </span>
                  <Button size="sm" variant="premium" onClick={handleDownloadPdf} disabled={downloading}>
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? (isRo ? "Se generează..." : "Generating...") : t.downloadPdf}
                  </Button>
                </div>
              </div>

              {/* Table of Contents */}
              <nav
                aria-label={t.tocTitle}
                className="max-w-5xl mx-auto px-4 pt-10"
              >
                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                  <div className="flex items-center gap-2 mb-3 text-foreground font-semibold">
                    <List className="w-4 h-4 text-primary" />
                    {t.tocTitle}
                  </div>
                  <ul className="flex flex-wrap gap-2 text-sm">
                    {tocItems.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/40 hover:text-primary transition-colors text-muted-foreground"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>

              <section id="why" className="max-w-5xl mx-auto px-4 py-16 md:py-24 scroll-mt-24">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center mb-12">
                  {t.whyTitle}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {reasons.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-5 p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <r.icon className="w-7 h-7 text-primary" />
                      </div>
                      <p className="text-sm md:text-base text-foreground leading-relaxed font-medium">{r.text}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Market Analysis Section — keywords: piața imobiliară, prețuri, terenuri, Giroc, parcuri industriale, Adora Forest */}
              <section id="market" className="bg-card border-y border-border py-16 md:py-24 scroll-mt-24">
                <div className="max-w-5xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center mb-4">
                    {t.marketTitle}
                  </h2>
                  <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                    {isRo
                      ? "Analiza completă a pieței imobiliare din Timișoara: prețuri pe cartiere, ansambluri rezidențiale, terenuri și zone metropolitane."
                      : "Complete analysis of Timișoara's real estate market: prices by neighborhood, residential developments, land plots and metropolitan areas."}
                  </p>

                  {/* Pricing grid by zone */}
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Euro className="w-5 h-5 text-primary" />
                    {isRo ? "Prețuri apartamente Timișoara — EUR/mp (2026)" : "Timișoara apartment prices — EUR/sqm (2026)"}
                  </h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-10">
                    {[
                      { zone: isRo ? "Centru / Iosefin" : "Center / Iosefin", price: "2.500 – 3.200" },
                      { zone: "ISHO / Iulius Town", price: "2.400 – 3.000" },
                      { zone: isRo ? "Complex Studențesc" : "Student Complex", price: "2.300 – 2.800" },
                      { zone: "Dumbrăvița / Ghiroda", price: "1.900 – 2.500" },
                      { zone: "Giroc / Moșnița Nouă", price: "1.800 – 2.300" },
                      { zone: isRo ? "Mehala / Plopi" : "Mehala / Plopi", price: "1.500 – 2.000" },
                    ].map((row) => (
                      <div key={row.zone} className="rounded-xl border border-border bg-background p-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{row.zone}</div>
                        <div className="text-lg font-bold text-primary">€{row.price}/mp</div>
                      </div>
                    ))}
                  </div>

                  {/* Residential complexes */}
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    {isRo ? "Ansambluri rezidențiale — stadiu construcție" : "Residential developments — construction status"}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 mb-10">
                    {[
                      { name: "ISHO", status: isRo ? "Finalizat — disponibil imediat" : "Completed — available now" },
                      { name: "ATENEO", status: isRo ? "În construcție — finalizare T4 2026" : "Under construction — Q4 2026" },
                      { name: "City of Mara", status: isRo ? "Faza 2 — finalizare T2 2026" : "Phase 2 — Q2 2026" },
                      { name: "Adora Forest", status: isRo ? "În construcție — Dumbrăvița" : "Under construction — Dumbrăvița" },
                      { name: "Vivalia", status: isRo ? "Pre-vânzare — livrare 2027" : "Pre-sale — 2027 delivery" },
                      { name: "Nord One", status: isRo ? "Finalizat — apartamente cu grădină disponibile" : "Completed — garden apartments available" },
                      { name: "GREEN FOREST", status: isRo ? "Finalizat — Dumbrăvița" : "Completed — Dumbrăvița" },
                      { name: "Cross Square House", status: isRo ? "Finalizat — disponibil pentru investiție" : "Completed — investment-ready" },
                    ].map((c) => (
                      <div key={c.name} className="rounded-xl border border-border bg-background p-4">
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{c.status}</div>
                      </div>
                    ))}
                  </div>

                  {/* Land + metro */}
                  <div className="grid md:grid-cols-2 gap-6 mb-10">
                    <div className="rounded-2xl border border-border bg-background p-6">
                      <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <TreePine className="w-5 h-5 text-primary" />
                        {isRo ? "Terenuri de vânzare Timișoara metropolitan" : "Land for sale — Timișoara metro"}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isRo
                          ? "Oferim terenuri intravilane în Giroc, Dumbrăvița, Moșnița Nouă, Ghiroda și Săcălaz, cu prețuri 60–180 EUR/mp. Ideale pentru construcție casă, mici ansambluri sau apartamente cu grădină."
                          : "We offer plots in Giroc, Dumbrăvița, Moșnița Nouă, Ghiroda and Săcălaz at 60–180 EUR/sqm. Ideal for house construction, small developments or garden apartments."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-6">
                      <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <Factory className="w-5 h-5 text-primary" />
                        {isRo ? "Parcuri industriale — cerere de chirie" : "Industrial parks — rental demand"}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isRo
                          ? "Proximitatea față de Continental, Hella, VGP, WDP, Incontro și Linde generează cerere constantă de chirie pe Calea Aradului, Calea Torontalului și Ghiroda — ocupare 95%+."
                          : "Proximity to Continental, Hella, VGP, WDP, Incontro and Linde drives steady rental demand on Calea Aradului, Calea Torontalului and Ghiroda — 95%+ occupancy."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {saleProperties.length > 0 && (
                <section id="properties" className="bg-muted/30 py-16 md:py-24 scroll-mt-24">
                  <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center mb-4">
                      {t.saleTitle}
                    </h2>
                    <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                      {isRo
                        ? "Apartamente selectate cu potențial dovedit de randament, gata de administrare în regim hotelier."
                        : "Curated apartments with proven yield potential, ready for hotel-style management."}
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      {saleProperties.map((prop, i) => (
                        <PropertyCard key={i} property={prop} t={t} index={i} />
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {rentalProperties.length > 0 && (
                <section id="portfolio" className="py-16 md:py-24 scroll-mt-24">
                  <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center mb-4">
                      {t.portfolioTitle}
                    </h2>
                    <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                      {isRo
                        ? "Proprietăți administrate de RealTrust cu rezultate reale. Studii de caz cu randamente dovedite."
                        : "Properties managed by RealTrust with real results. Case studies with proven returns."}
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rentalProperties.slice(0, 6).map((prop, i) => (
                        <PropertyCard key={i} property={prop} t={t} index={i} />
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section id="comparison" className="bg-foreground text-primary-foreground py-16 md:py-24 scroll-mt-24">
                <div className="max-w-4xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4">
                    {t.comparisonTitle}
                  </h2>
                  <p className="text-white/60 text-center max-w-xl mx-auto mb-12 text-sm">
                    {isRo
                      ? "Comparație pe baza unui apartament de 2 camere în zona centrală (valoare: €140.000)"
                      : "Based on a 2-room central apartment (value: €140,000)"}
                  </p>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-8">
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart
                        data={[
                          { name: isRo ? "Venit Brut/Lună" : "Gross/Month", hotel: 1460, classic: 450 },
                          { name: isRo ? "Cheltuieli" : "Costs", hotel: 365, classic: 50 },
                          { name: isRo ? "Venit Net/Lună" : "Net/Month", hotel: 1095, classic: 400 },
                          { name: isRo ? "Venit Net/An" : "Net/Year", hotel: 13140, classic: 4800 },
                        ]}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                        barGap={4}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v.toLocaleString()}`} />
                        <Tooltip
                          contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 12, color: "#fff", fontSize: 13 }}
                          formatter={(value: number, name: string) => [
                            `€${value.toLocaleString()}`,
                            name === "hotel" ? (isRo ? "Regim Hotelier" : "Hotel-style") : (isRo ? "Chirie Clasică" : "Classic Rent"),
                          ]}
                        />
                        <Bar dataKey="hotel" name={isRo ? "Regim Hotelier" : "Hotel-style"} radius={[6, 6, 0, 0]} fill="#D4AF37">
                          <LabelList dataKey="hotel" position="top" formatter={(v: number) => `€${v.toLocaleString()}`} style={{ fill: "#D4AF37", fontSize: 11, fontWeight: 700 }} />
                        </Bar>
                        <Bar dataKey="classic" name={isRo ? "Chirie Clasică" : "Classic Rent"} radius={[6, 6, 0, 0]} fill="rgba(255,255,255,0.25)">
                          <LabelList dataKey="classic" position="top" formatter={(v: number) => `€${v.toLocaleString()}`} style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="flex justify-center gap-8 mt-4">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-sm bg-primary" />
                        <span className="text-white/70">{isRo ? "Regim Hotelier" : "Hotel-style"}</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-sm bg-white/25" />
                        <span className="text-white/70">{isRo ? "Chirie Clasică" : "Classic Rent"}</span>
                      </span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="mt-8 bg-primary/20 border border-primary/30 rounded-xl p-6 text-center"
                  >
                    <div className="text-sm uppercase tracking-wider text-primary/80 mb-1">
                      {isRo ? "Diferență Anuală" : "Annual Difference"}
                    </div>
                    <div className="text-4xl font-bold text-primary">+€8.340</div>
                    <div className="text-sm text-white/50 mt-1">
                      {isRo ? "în favoarea regimului hotelier" : "in favor of hotel-style management"}
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* FAQ Section — generates FAQPage JSON-LD via useRegisterFAQs */}
              <section id="faq" className="bg-muted/30 py-16 md:py-24 scroll-mt-24">
                <div className="max-w-3xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center mb-4 flex items-center justify-center gap-3">
                    <HelpCircle className="w-8 h-8 text-primary" />
                    {t.faqTitle}
                  </h2>
                  <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">
                    {isRo
                      ? "Răspunsuri la cele mai comune întrebări despre investiții imobiliare în Timișoara."
                      : "Answers to the most common questions about real estate investments in Timișoara."}
                  </p>
                  <Accordion type="single" collapsible className="bg-card border border-border rounded-2xl px-6">
                    {faqItems.map((item, i) => (
                      <AccordionItem key={i} value={`faq-${i}`} className={i === faqItems.length - 1 ? "border-b-0" : ""}>
                        <AccordionTrigger className="text-left text-foreground font-semibold">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>

              <section className="py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-4 text-center">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                    {t.ctaTitle}
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{t.ctaDesc}</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="premium" size="xl" onClick={handleDownloadPdf} disabled={downloading}>
                      <Download className="w-5 h-5 mr-2" />
                      {downloading ? (isRo ? "Se generează..." : "Generating...") : t.downloadPdf}
                    </Button>
                    <Button variant="outline" size="xl" asChild>
                      <a href="/#contact">
                        {isRo ? "Contactează-ne" : "Contact Us"}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </a>
                    </Button>
                  </div>

                  <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> info@realtrust.ro
                    </span>
                    <span className="flex items-center gap-2">
                      <span>📞</span> +40 799 069 256
                    </span>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SEOFooterText pageType="catalog" city="Timișoara" />
      <Footer />
      <BackToTop />
    </div>
  );
};

const PropertyCard = ({ property, t, index }: { property: Property; t: Record<string, string>; index: number }) => {
  const imageCandidates = [property.image_path, ...(property.images ?? [])]
    .map(resolvePropertyImageUrl)
    .filter((src, idx, arr): src is string => Boolean(src) && arr.indexOf(src) === idx);

  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [property.image_path, property.images]);

  const currentImageSrc = imageIndex >= 0 ? imageCandidates[imageIndex] ?? null : null;
  const roiNum = property.roi_percentage ? parseFloat(property.roi_percentage.replace(/[^0-9.]/g, "")) : 0;
  const isTopRated = property.booking_rating && property.booking_rating >= 9.5;

  const detailUrl = property.slug ? `/proprietate/${property.slug}` : null;

  const CardWrapper = ({ children }: { children: React.ReactNode }) =>
    detailUrl ? (
      <a href={detailUrl} className="block">
        {children}
      </a>
    ) : (
      <>{children}</>
    );

  return (
    <CardWrapper>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08 }}
        className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all group cursor-pointer"
      >
      <div className="relative h-48 overflow-hidden bg-muted">
        {currentImageSrc ? (
          <img
            src={storageImage(currentImageSrc, { width: 400 })}
            srcSet={storageImageSrcSet(currentImageSrc)}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            alt={property.name}
            width={400}
            height={192}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            decoding="async"
            onError={() => {
              setImageIndex((prev) => (prev < imageCandidates.length - 1 ? prev + 1 : -1));
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <Building className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}

        {property.roi_percentage && (
          <span className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg backdrop-blur-sm">
            ROI {property.roi_percentage}
          </span>
        )}

        {roiNum >= 8 && (
          <span className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
            <Flame className="w-3.5 h-3.5" />
            {t.night === "noapte" ? "OPORTUNITATE" : "HOT DEAL"}
          </span>
        )}

        {isTopRated && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/80 backdrop-blur-sm shadow-lg">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">TOP RATED</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{property.name}</h3>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location}, Timișoara`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-primary/80 hover:text-primary flex items-center gap-1 mt-1 hover:underline"
          >
            <MapPin className="w-3 h-3" /> {property.location}
          </a>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          {property.size && <span>{property.size} m²</span>}
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" /> {property.bedrooms} {t.rooms}
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath className="w-3 h-3" /> {property.bathrooms} {t.baths}
            </span>
          )}
          {property.capacity && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {property.capacity} {t.guests}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {property.base_price_per_night && (property.listing_type === "cazare" || property.listing_type === "inchiriere") && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              <Euro className="w-3 h-3" /> €{property.base_price_per_night}
              {property.listing_type === "inchiriere" ? `/${t.month}` : `/${t.night}`}
            </span>
          )}
          {property.capital_necesar && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              {t.investment}: €{property.capital_necesar.toLocaleString()}
            </span>
          )}
        </div>

        {property.booking_rating && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isTopRated ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, si) => (
                <Star
                  key={si}
                  className={`w-3.5 h-3.5 ${si < Math.round(property.booking_rating / 2) ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="font-bold text-sm text-foreground">{property.booking_rating}/10</span>
            {property.booking_review_count && (
              <span className="text-xs text-muted-foreground">({property.booking_review_count} {t.reviews})</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
    </CardWrapper>
  );
};

export default CatalogInvestitii;
