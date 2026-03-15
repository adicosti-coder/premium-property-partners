import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { exportInvestmentCatalogPdf } from "@/utils/exportInvestmentCatalogPdf";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp, Building, Star, ArrowRight, Download, MapPin,
  BedDouble, Bath, Users, Euro, CheckCircle2, Shield, BarChart3,
  Sparkles, Lock, Mail, Award, Flame, Plane, Train,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
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
  description_ro: string;
  description_en: string;
  tag: string;
  listing_type: string | null;
  capital_necesar: number | null;
  slug: string | null;
  image_path: string | null;
  images: string[] | null;
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
        .select("name, location, size, bedrooms, bathrooms, capacity, base_price_per_night, roi_percentage, estimated_revenue, booking_rating, booking_review_count, description_ro, description_en, tag, listing_type, capital_necesar, slug, image_path, images")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setProperties(data ?? []);
      setLoading(false);
    };
    fetchProperties();
  }, []);

  const saleProperties = properties.filter(p => p.listing_type === "vanzare" || p.listing_type === "investitie");
  const rentalProperties = properties.filter(p => p.listing_type === "cazare" || p.listing_type === "inchiriere");

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
                  <Button size="sm" variant="premium" onClick={handleDownloadPdf} disabled={downloading}>
                      <Download className="w-4 h-4 mr-2" />
                      {downloading ? (isRo ? "Se generează..." : "Generating...") : t.downloadPdf}
                  </Button>
                </div>
              </div>

              {/* Why Timișoara */}
              <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
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

              {/* Financial Comparison - Bar Chart */}
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

                  {/* Bar Chart */}
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
                          formatter={(value: number, name: string) => [`€${value.toLocaleString()}`, name === "hotel" ? (isRo ? "Regim Hotelier" : "Hotel-style") : (isRo ? "Chirie Clasică" : "Classic Rent")]}
                        />
                        <Bar dataKey="hotel" name={isRo ? "Regim Hotelier" : "Hotel-style"} radius={[6, 6, 0, 0]} fill="#D4AF37">
                          <LabelList dataKey="hotel" position="top" formatter={(v: number) => `€${v.toLocaleString()}`} style={{ fill: "#D4AF37", fontSize: 11, fontWeight: 700 }} />
                        </Bar>
                        <Bar dataKey="classic" name={isRo ? "Chirie Clasică" : "Classic Rent"} radius={[6, 6, 0, 0]} fill="rgba(255,255,255,0.25)">
                          <LabelList dataKey="classic" position="top" formatter={(v: number) => `€${v.toLocaleString()}`} style={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Legend */}
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
const PropertyCard = ({ property, t, index }: { property: Property; t: Record<string, string>; index: number }) => {
  const imgSrc = property.image_path || (property.images && property.images.length > 0 ? property.images[0] : null);
  const roiNum = property.roi_percentage ? parseFloat(property.roi_percentage.replace(/[^0-9.]/g, "")) : 0;
  const isTopRated = property.booking_rating && property.booking_rating >= 9.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all group"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <Building className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}

        {/* ROI Badge */}
        {property.roi_percentage && (
          <span className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg backdrop-blur-sm">
            ROI {property.roi_percentage}
          </span>
        )}

        {/* Urgency Badge */}
        {roiNum >= 8 && (
          <span className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
            <Flame className="w-3.5 h-3.5" />
            {t.night === "noapte" ? "OPORTUNITATE" : "HOT DEAL"}
          </span>
        )}

        {/* Top Rated Badge */}
        {isTopRated && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/80 backdrop-blur-sm shadow-lg">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">TOP RATED</span>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{property.name}</h3>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location + ", Timișoara")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary/80 hover:text-primary flex items-center gap-1 mt-1 hover:underline"
          >
            <MapPin className="w-3 h-3" /> {property.location}
          </a>
        </div>

        {/* Details */}
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

        {/* Financials */}
        <div className="flex flex-wrap gap-2 mb-3">
          {property.base_price_per_night && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
              <Euro className="w-3 h-3" /> €{property.base_price_per_night}/{t.night}
            </span>
          )}
          {property.capital_necesar && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              {t.investment}: €{property.capital_necesar.toLocaleString()}
            </span>
          )}
        </div>

        {/* Rating - Enhanced */}
        {property.booking_rating && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isTopRated ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, si) => (
                <Star
                  key={si}
                  className={`w-3.5 h-3.5 ${
                    si < Math.round(property.booking_rating! / 2)
                      ? "text-primary fill-primary"
                      : "text-muted-foreground/30"
                  }`}
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
  );
};

export default CatalogInvestitii;
