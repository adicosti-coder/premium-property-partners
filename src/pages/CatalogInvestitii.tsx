import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp, Building, Star, ArrowRight, Download, MapPin,
  BedDouble, Bath, Users, Euro, CheckCircle2, Shield, BarChart3,
  Sparkles, Lock, Mail,
} from "lucide-react";

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
  description_ro: string;
  description_en: string;
  tag: string;
  listing_type: string | null;
  capital_necesar: number | null;
  slug: string | null;
  image_path: string | null;
}

const CatalogInvestitii = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const isRo = language === "ro";

  // Check if accessed via email token
  useEffect(() => {
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    if (token === "invest2026" || emailParam) {
      setIsUnlocked(true);
    }
  }, [searchParams]);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from("properties")
        .select("name, location, size, bedrooms, bathrooms, capacity, base_price_per_night, roi_percentage, estimated_revenue, booking_rating, booking_review_count, description_ro, description_en, tag, listing_type, capital_necesar, slug, image_path")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setProperties(data ?? []);
      setLoading(false);
    };
    fetchProperties();
  }, []);

  const saleProperties = properties.filter(p => p.listing_type === "sale" || p.tag === "Investiție");
  const rentalProperties = properties.filter(p => p.listing_type !== "sale" && p.tag !== "Investiție");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(isRo ? "Introdu un email valid." : "Enter a valid email.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Track with MailerLite
      if (window.ml) {
        window.ml("track", {
          event: "investment_catalog_unlock",
          email,
          language,
          source: "catalog_page",
          user_type: "buyer",
        });
      }
      setIsUnlocked(true);
      toast.success(isRo ? "Catalogul a fost deblocat!" : "Catalog unlocked!");
    } catch {
      toast.error(isRo ? "Eroare. Încearcă din nou." : "Error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPdfUrl = () => {
    const fileName = isRo ? "catalog-investitii-timisoara-2026.pdf" : "investment-catalog-timisoara-2026.pdf";
    const { data } = supabase.storage.from("catalogs").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const t = {
    title: isRo ? "Catalogul de Investiții Timișoara 2026" : "Timișoara Investment Catalog 2026",
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
    rooms: isRo ? "camere" : "rooms",
    baths: isRo ? "băi" : "baths",
    guests: isRo ? "persoane" : "guests",
    reviews: isRo ? "recenzii" : "reviews",
    investment: isRo ? "Capital" : "Investment",
    revenue: isRo ? "Venit estimat" : "Est. Revenue",
  };

  const reasons = isRo
    ? [
        { icon: TrendingUp, text: "Creștere turistică +40% — Capitala Culturală Europeană" },
        { icon: Building, text: "Al 2-lea hub IT din România — cerere constantă" },
        { icon: BarChart3, text: "ROI 8-11% hotelier vs 3-4% chirie clasică" },
        { icon: Euro, text: "Prețuri cu 30-50% sub București sau Cluj" },
        { icon: Shield, text: "Infrastructură modernizată: aeroport, tramvaie, regenerare urbană" },
      ]
    : [
        { icon: TrendingUp, text: "+40% tourism growth — European Capital of Culture" },
        { icon: Building, text: "Romania's 2nd IT hub — constant demand" },
        { icon: BarChart3, text: "8-11% hotel-style ROI vs 3-4% classic rental" },
        { icon: Euro, text: "Prices 30-50% below Bucharest or Cluj" },
        { icon: Shield, text: "Modernized infrastructure: airport, trams, urban regeneration" },
      ];

  const comparisonRows = isRo
    ? [
        { label: "Preț mediu/noapte", hotel: "€65", classic: "—" },
        { label: "Chirie lunară", hotel: "—", classic: "€450" },
        { label: "Ocupare medie", hotel: "75%", classic: "100%" },
        { label: "Venit brut/lună", hotel: "€1.460", classic: "€450" },
        { label: "Cheltuieli operaționale", hotel: "-€365", classic: "-€50" },
        { label: "Venit net/lună", hotel: "€1.095", classic: "€400" },
        { label: "Venit net/an", hotel: "€13.140", classic: "€4.800" },
        { label: "ROI anual", hotel: "9,4%", classic: "3,4%", highlight: true },
      ]
    : [
        { label: "Avg price/night", hotel: "€65", classic: "—" },
        { label: "Monthly rent", hotel: "—", classic: "€450" },
        { label: "Avg occupancy", hotel: "75%", classic: "100%" },
        { label: "Gross income/month", hotel: "€1,460", classic: "€450" },
        { label: "Operating costs", hotel: "-€365", classic: "-€50" },
        { label: "Net income/month", hotel: "€1,095", classic: "€400" },
        { label: "Net income/year", hotel: "€13,140", classic: "€4,800" },
        { label: "Annual ROI", hotel: "9.4%", classic: "3.4%", highlight: true },
      ];

  return (
    <>
      <SEOHead
        title={t.title}
        description={t.subtitle}
        canonical="/catalog-investitii"
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
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
                  <>Catalogul de <span className="text-primary">Investiții</span><br />Timișoara 2026</>
                ) : (
                  <>Timișoara <span className="text-primary">Investment</span><br />Catalog 2026</>
                )}
              </h1>

              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
                {t.subtitle}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                {[
                  { value: String(properties.length || "—"), label: isRo ? "Proprietăți" : "Properties" },
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

          {/* Decorative bottom wave */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* Gate / Content */}
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
                  <p className="text-muted-foreground text-center text-sm">
                    {t.unlockDesc}
                  </p>
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

                {/* Preview teaser */}
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
              {/* Download bar */}
              <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {isRo ? "Catalog Deblocat" : "Catalog Unlocked"}
                  </span>
                  <Button size="sm" variant="premium" asChild>
                    <a href={getPdfUrl()} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      {t.downloadPdf}
                    </a>
                  </Button>
                </div>
              </div>

              {/* Why Timișoara */}
              <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground text-center mb-12">
                  {t.whyTitle}
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reasons.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <r.icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{r.text}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Sale Properties */}
              {saleProperties.length > 0 && (
                <section className="bg-muted/30 py-16 md:py-24">
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

              {/* Active Portfolio */}
              {rentalProperties.length > 0 && (
                <section className="py-16 md:py-24">
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

              {/* Financial Comparison */}
              <section className="bg-foreground text-primary-foreground py-16 md:py-24">
                <div className="max-w-4xl mx-auto px-4">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4">
                    {t.comparisonTitle}
                  </h2>
                  <p className="text-white/60 text-center max-w-xl mx-auto mb-12 text-sm">
                    {isRo
                      ? "Comparație pe baza unui apartament de 2 camere în zona centrală (valoare: €140.000)"
                      : "Based on a 2-room central apartment (value: €140,000)"}
                  </p>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-3 gap-0 bg-white/10 px-4 md:px-6 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                        {isRo ? "Indicator" : "Metric"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary text-center">
                        {isRo ? "Regim Hotelier" : "Hotel-style"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/50 text-center">
                        {isRo ? "Chirie Clasică" : "Classic Rent"}
                      </span>
                    </div>
                    {/* Rows */}
                    {comparisonRows.map((row, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-3 gap-0 px-4 md:px-6 py-3 border-t border-white/5 ${
                          row.highlight ? "bg-primary/10" : i % 2 === 0 ? "bg-white/[0.02]" : ""
                        }`}
                      >
                        <span className={`text-sm ${row.highlight ? "font-bold text-primary" : "text-white/80"}`}>
                          {row.label}
                        </span>
                        <span className={`text-sm text-center font-semibold ${row.highlight ? "text-primary text-lg" : "text-white"}`}>
                          {row.hotel}
                        </span>
                        <span className={`text-sm text-center ${row.highlight ? "text-white/60" : "text-white/50"}`}>
                          {row.classic}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Highlight box */}
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

              {/* CTA */}
              <section className="py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-4 text-center">
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                    {t.ctaTitle}
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                    {t.ctaDesc}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="premium" size="xl" asChild>
                      <a href={getPdfUrl()} target="_blank" rel="noopener noreferrer">
                        <Download className="w-5 h-5 mr-2" />
                        {t.downloadPdf}
                      </a>
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
                      <span>📞</span> +40 723 154 520
                    </span>
                  </div>

                  <p className="mt-8 text-xs text-muted-foreground">
                    © {new Date().getFullYear()} RealTrust Aparthotel. {isRo ? "Toate drepturile rezervate." : "All rights reserved."}
                  </p>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

/* Property Card subcomponent */
const PropertyCard = ({ property, t, index }: { property: Property; t: Record<string, string>; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.08 }}
    className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
  >
    <div className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{property.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" /> {property.location}
          </p>
        </div>
        {property.roi_percentage && (
          <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold whitespace-nowrap">
            ROI {property.roi_percentage}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
        {property.size && <span className="flex items-center gap-1">{property.size} m²</span>}
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

      {/* Financials */}
      <div className="flex flex-wrap gap-2 mb-3">
        {property.base_price_per_night && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
            <Euro className="w-3 h-3" /> €{property.base_price_per_night}/{t.night}
          </span>
        )}
        {property.capital_necesar && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-foreground text-xs font-semibold">
            {t.investment}: €{property.capital_necesar.toLocaleString()}
          </span>
        )}
      </div>

      {/* Rating */}
      {property.booking_rating && (
        <div className="flex items-center gap-2 text-xs">
          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
          <span className="font-semibold text-foreground">{property.booking_rating}/10</span>
          {property.booking_review_count && (
            <span className="text-muted-foreground">({property.booking_review_count} {t.reviews})</span>
          )}
        </div>
      )}
    </div>
  </motion.div>
);

export default CatalogInvestitii;
