import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, Clock3, FileText, Home, KeyRound, MapPin, MessageCircle, Send, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import { formatPhoneInput, isValidWhatsAppNumber, trackConversion } from "@/lib/conversionTracking";
import cityHero from "@/assets/apt-03.webp";

const Footer = lazy(() => import("@/components/Footer"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const availabilitySchema = z.object({
  name: z.string().trim().min(2, "Numele trebuie completat.").max(100, "Numele este prea lung."),
  whatsapp: z.string().trim().refine((value) => isValidWhatsAppNumber(value), "Număr WhatsApp invalid."),
  email: z.string().trim().email("Email invalid.").max(255, "Emailul este prea lung.").optional().or(z.literal("")),
  apartmentType: z.string().trim().min(2).max(40),
  message: z.string().trim().max(800, "Mesajul este prea lung.").optional(),
});

const strengths = [
  { icon: MapPin, title: "Locație centrală", text: "City of Mara este pe Calea Circumvalațiunii, cu acces rapid către Iulius Town, centru, business hubs și servicii urbane." },
  { icon: TrendingUp, title: "Randament investițional", text: "Profil potrivit pentru investiții imobiliare Timișoara centru, cu cerere mixtă: chirie lungă, corporate și regim hotelier." },
  { icon: Sparkles, title: "Finisaje și lichiditate", text: "Apartamente noi City of Mara, compartimentări eficiente, parcare subterană și adresă ușor de promovat la revânzare sau închiriere." },
];

const apartmentTypes = [
  { type: "Studio", area: "38–42 mp", use: "Regim hotelier / corporate", roi: "8.4–9.2%", price: "de la 78.000€" },
  { type: "2 camere", area: "50–58 mp", use: "Chirie premium / investiție", roi: "8.6–9.6%", price: "de la 105.000€" },
  { type: "3 camere", area: "68–82 mp", use: "Familie / revânzare", roi: "7.4–8.6%", price: "de la 145.000€" },
  { type: "Penthouse", area: "90+ mp", use: "Premium / capital appreciation", roi: "6.8–8.0%", price: "la cerere" },
];

const priceEvolution = [
  { year: "2021", value: "1.450 €/mp", note: "intrare accesibilă în zonă centrală" },
  { year: "2023", value: "1.680 €/mp", note: "cerere crescută pentru apartamente noi" },
  { year: "2025", value: "1.920 €/mp", note: "lichiditate mai bună în Circumvalațiunii" },
  { year: "2026", value: "2.050+ €/mp", note: "prime pentru unități mobilate și parcări" },
];

const buyerChecklist = [
  { icon: Calculator, title: "Buget total", text: "Verificăm prețul apartamentului, parcarea, mobilarea, taxele notariale și scenariul de credit înainte de ofertare." },
  { icon: KeyRound, title: "Pregătire pentru închiriere", text: "Estimăm costul de mobilare, durata până la prima închiriere și diferența dintre chirie clasică și administrare hotelieră." },
  { icon: ShieldCheck, title: "Due diligence", text: "Analizăm actele, poziția în complex, orientarea, etajul, vecinătățile și lichiditatea la revânzare." },
];

const faqItems = [
  { question: "Merită cumpărate apartamente City of Mara pentru investiție?", answer: "Da, mai ales unitățile compacte cu parcare și compartimentare eficientă, deoarece zona Circumvalațiunii are acces rapid către Iulius Town, centru și hub-uri de business." },
  { question: "Ce tip de apartament are randament mai bun în City of Mara?", answer: "În general, studiourile și apartamentele cu 2 camere au randament mai bun pentru chirie corporate sau regim hotelier, în timp ce apartamentele mai mari sunt mai potrivite pentru locuire și revânzare." },
  { question: "Pot primi lista actualizată de disponibilități City of Mara?", answer: "Da. Completează formularul de pe pagină și trimitem opțiunile disponibile, prețurile actualizate, parcările și o estimare de randament pentru bugetul tău." },
];

const proximityHighlights = [
  { place: "Iulius Town / Openville", time: "5–7 min", value: "cerere corporate și retail premium" },
  { place: "Piața Unirii / Centru", time: "8–10 min", value: "atractiv pentru locuire și cazare urbană" },
  { place: "Gara de Nord", time: "6–9 min", value: "acces bun pentru chiriași mobili" },
  { place: "Business hubs nord", time: "7–12 min", value: "profil stabil de chiriași profesioniști" },
];

const yieldScenarios = [
  { label: "Conservator", occupancy: "65%", monthly: "520–650€", detail: "chirie lungă sau corporate, risc operațional scăzut" },
  { label: "Echilibrat", occupancy: "75%", monthly: "720–920€", detail: "mix chirie medie + perioade scurte, mobilare premium" },
  { label: "Dinamic", occupancy: "82%", monthly: "950–1.250€", detail: "regim hotelier administrat profesional, calendar optimizat" },
];

const decisionHighlights = [
  { value: "2.050+ €/mp", label: "benchmark 2026 în complex", detail: "pentru unități bine poziționate și finisate" },
  { value: "5–10 min", label: "până la repere cheie", detail: "centru, Iulius Town și zone office" },
  { value: "8.4–9.6%", label: "interval orientativ ROI", detail: "în scenarii bune pentru studiouri și 2 camere" },
];

const fitProfiles = [
  { icon: Home, title: "Locuire premium", text: "Pentru cumpărători care vor apartamente noi aproape de centru, cu acces rapid și costuri predictibile de exploatare." },
  { icon: TrendingUp, title: "Buy-to-let", text: "Potrivit pentru investitori care caută cerere constantă din partea profesioniștilor și chiriașilor corporate." },
  { icon: Building2, title: "Portofoliu urban", text: "Interesant pentru cei care urmăresc diversificare în complexuri cunoscute, cu lichiditate mai bună la revânzare." },
];

const acquisitionSteps = [
  { title: "1. Clarificăm ținta", text: "Stabilim rapid dacă urmărești locuire, chirie lungă sau randament din administrare hotelieră." },
  { title: "2. Shortlist real", text: "Selectăm doar unitățile relevante după buget, etaj, orientare, parcare și potențial de negociere." },
  { title: "3. Decizie asistată", text: "Primești comparație de cost total, randament și riscuri înainte de rezervare sau ofertă fermă." },
];

const CityOfMaraTimisoara = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("+40 ");
  const [email, setEmail] = useState("");
  const [apartmentType, setApartmentType] = useState("2 camere");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const whatsappUrl = useMemo(() => {
    const text = encodeURIComponent("Bună! Vreau lista actualizată de disponibilități pentru City of Mara Timișoara.");
    return `https://wa.me/40799069256?text=${text}`;
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ApartmentComplex",
        name: "City of Mara Timișoara",
        url: "https://www.realtrust.ro/complexe/city-of-mara",
        address: { "@type": "PostalAddress", streetAddress: "Calea Circumvalațiunii", addressLocality: "Timișoara", addressRegion: "Timiș", addressCountry: "RO" },
        amenityFeature: [
          { "@type": "LocationFeatureSpecification", name: "Parcare subterană", value: true },
          { "@type": "LocationFeatureSpecification", name: "Apartamente noi", value: true },
          { "@type": "LocationFeatureSpecification", name: "Acces rapid centru", value: true },
        ],
      },
      {
        "@type": "RealEstateAgent",
        name: "RealTrust",
        url: "https://www.realtrust.ro",
        telephone: "+40799069256",
        areaServed: "Timișoara",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = availabilitySchema.safeParse({ name, whatsapp, email, apartmentType, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Verifică datele introduse.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = parsed.data.whatsapp.replace(/\s/g, "");
      const leadMessage = [
        `Solicitare disponibilități City of Mara — ${parsed.data.apartmentType}`,
        parsed.data.message ? `Mesaj: ${parsed.data.message}` : null,
      ].filter(Boolean).join("\n");

      const { error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: parsed.data.name,
          whatsapp_number: cleanPhone,
          email: parsed.data.email || null,
          property_type: "city_of_mara",
          property_area: 0,
          source: "city_of_mara_landing",
          message: leadMessage,
          simulation_data: { apartmentType: parsed.data.apartmentType, page: "/complexe/city-of-mara" },
        },
      });

      if (error) throw error;
      trackConversion({ event: "contact_form_submit", source: "city_of_mara_landing" });
      navigate("/multumim");
    } catch {
      toast.error("Nu am putut trimite solicitarea. Te rugăm să ne scrii direct pe WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    trackConversion({ event: "whatsapp_click", source: "city_of_mara_landing" });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Apartamente City of Mara Timișoara | Vânzare apartamente noi"
        description="Apartamente City of Mara Timișoara: investiții imobiliare Timișoara centru, randament estimat, tipuri de apartamente și listă actualizată de disponibilități."
        url="https://www.realtrust.ro/complexe/city-of-mara"
        image="https://www.realtrust.ro/assets/apt-03.webp"
        jsonLd={jsonLd}
        breadcrumbItems={[
          { name: "Acasă", url: "https://www.realtrust.ro" },
          { name: "Complexe", url: "https://www.realtrust.ro/complexe" },
          { name: "City of Mara", url: "https://www.realtrust.ro/complexe/city-of-mara" },
        ]}
      />
      <Header />

      <main className="pb-20">
        <section className="relative min-h-[88svh] overflow-hidden pt-24">
          <img src={cityHero} alt="Apartamente City of Mara Timișoara cu finisaje moderne" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-foreground/65" />
          <div className="relative container mx-auto flex min-h-[calc(88svh-6rem)] flex-col justify-end px-4 pb-10 md:pb-14">
            <PageBreadcrumb items={[{ label: "Complexe", href: "/complexe" }, { label: "City of Mara Timișoara" }]} className="mb-8 text-primary-foreground/90" />
            <div className="max-w-4xl text-primary-foreground">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-background/15 px-4 py-2 text-sm font-semibold">
                <Building2 className="h-4 w-4" /> Vânzare apartamente noi City of Mara
              </p>
              <h1 className="text-4xl font-bold tracking-normal md:text-6xl">Apartamente City of Mara Timișoara pentru locuire premium și investiție</h1>
              <p className="mt-5 max-w-2xl text-lg text-primary-foreground/85">Landing dedicat pentru cumpărători și investitori care urmăresc investiții imobiliare Timișoara centru, randament predictibil și acces la lista actualizată de disponibilități.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg"><a href="#disponibilitati">Solicită disponibilități <ArrowRight className="h-4 w-4" /></a></Button>
                <Button asChild size="lg" variant="secondary"><a href="#analiza">Analiză prețuri</a></Button>
              </div>
              <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
                {decisionHighlights.map((item) => (
                  <div key={item.label} className="rounded-lg border border-primary-foreground/20 bg-background/15 p-4 backdrop-blur-sm">
                    <p className="text-xl font-bold text-primary-foreground">{item.value}</p>
                    <p className="mt-1 text-sm font-semibold text-primary-foreground">{item.label}</p>
                    <p className="mt-1 text-xs text-primary-foreground/80">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="puncte-forte-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="puncte-forte-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Puncte forte pentru investiții imobiliare Timișoara centru</h2>
            <p className="mt-3 text-muted-foreground">City of Mara combină poziția centrală, lichiditatea unui complex cunoscut și un profil bun pentru închiriere sau revânzare.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {strengths.map((item) => (
              <Card key={item.title} className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <item.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="proximitate-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-primary"><Clock3 className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Proximitate reală</span></div>
              <h2 id="proximitate-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Repere care susțin cererea pentru apartamente City of Mara</h2>
              <p className="mt-3 text-muted-foreground">Pentru cumpărători și investitori, timpul până la punctele-cheie din oraș influențează direct ocuparea, chiria și lichiditatea.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {proximityHighlights.map((item) => (
                <div key={item.place} className="rounded-lg border border-border bg-card p-5">
                  <p className="text-2xl font-bold text-primary">{item.time}</p>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{item.place}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16" aria-labelledby="tipuri-apartamente-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="tipuri-apartamente-city-of-mara" className="text-3xl font-bold text-foreground">Tipuri de apartamente City of Mara</h2>
                <p className="mt-3 text-muted-foreground">Tabel orientativ pentru vânzare apartamente noi City of Mara și analiza randamentului.</p>
              </div>
              <Button asChild variant="outline"><Link to="/analiza-roi-apartament">Calculează ROI</Link></Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/60 text-foreground">
                  <tr>
                    <th className="p-4 font-semibold">Tip</th>
                    <th className="p-4 font-semibold">Suprafață</th>
                    <th className="p-4 font-semibold">Utilizare recomandată</th>
                    <th className="p-4 font-semibold">ROI estimat</th>
                    <th className="p-4 font-semibold">Preț orientativ</th>
                  </tr>
                </thead>
                <tbody>
                  {apartmentTypes.map((item) => (
                    <tr key={item.type} className="border-t border-border">
                      <td className="p-4 font-semibold text-foreground">{item.type}</td>
                      <td className="p-4 text-muted-foreground">{item.area}</td>
                      <td className="p-4 text-muted-foreground">{item.use}</td>
                      <td className="p-4 font-semibold text-primary">{item.roi}</td>
                      <td className="p-4 text-muted-foreground">{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="analiza" className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="analiza-preturi-city-of-mara">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-primary"><BarChart3 className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Blog & analiză integrată</span></div>
              <h2 id="analiza-preturi-city-of-mara" className="text-3xl font-bold text-foreground">Evoluția prețurilor în City of Mara Timișoara</h2>
              <p className="mt-4 text-muted-foreground">City of Mara a trecut de la statutul de opțiune accesibilă lângă centru la un reper pentru cumpărători care vor apartamente noi cu adresă ușor de închiriat. Creșterea a fost susținută de proximitatea față de Iulius Town, deficitul de unități noi în zone centrale și cererea pentru locuințe eficiente energetic.</p>
              <h3 className="mt-7 text-2xl font-semibold text-foreground">De ce contează pentru investitori</h3>
              <p className="mt-3 text-muted-foreground">Pentru investiții imobiliare Timișoara centru, diferența nu este doar prețul pe metru pătrat, ci combinația dintre ocupare, costuri de administrare, parcare și lichiditatea la revânzare. Unitățile compacte, bine mobilate, tind să aibă rotație mai rapidă și randament mai stabil.</p>
            </div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground">Repere de preț €/mp</h3>
                <div className="mt-6 space-y-4">
                  {priceEvolution.map((item, index) => (
                    <div key={item.year} className="grid grid-cols-[72px_1fr] gap-4">
                      <span className="font-semibold text-primary">{item.year}</span>
                      <div>
                        <div className="flex items-center justify-between gap-3"><span className="font-semibold text-foreground">{item.value}</span><span className="text-xs text-muted-foreground">{item.note}</span></div>
                        <div className="mt-2 h-2 rounded-full bg-background"><div className="h-2 rounded-full bg-primary" style={{ width: `${58 + index * 12}%` }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-muted/40 py-12 md:py-16" aria-labelledby="scenarii-randament-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-primary"><Target className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Scenarii de randament</span></div>
              <h2 id="scenarii-randament-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Cum poate performa o investiție în City of Mara</h2>
              <p className="mt-3 text-muted-foreground">Estimările sunt orientative și se calibrează după suprafață, etaj, parcare, mobilare și prețul de achiziție.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {yieldScenarios.map((item) => (
                <article key={item.label} className="rounded-lg border border-primary/20 bg-card p-6">
                  <h3 className="text-xl font-semibold text-foreground">{item.label}</h3>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-primary/5 p-3"><span className="block text-muted-foreground">Ocupare</span><strong className="text-primary">{item.occupancy}</strong></div>
                    <div className="rounded-md bg-primary/5 p-3"><span className="block text-muted-foreground">Venit lunar</span><strong className="text-primary">{item.monthly}</strong></div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="potrivire-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="potrivire-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Pentru cine sunt potrivite apartamentele City of Mara</h2>
            <p className="mt-3 text-muted-foreground">Pagina filtrează rapid tipurile de cumpărători pentru care complexul are sens economic și practic, nu doar vizual.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {fitProfiles.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-card p-6">
                <item.icon className="mb-4 h-7 w-7 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="ghid-cumparator-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="ghid-cumparator-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Ghid rapid pentru cumpărători City of Mara</h2>
            <p className="mt-3 text-muted-foreground">Înainte de ofertă, verificăm dacă apartamentul se potrivește obiectivului tău: locuire, revânzare sau randament din închiriere.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {buyerChecklist.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-card p-6">
                <item.icon className="mb-4 h-7 w-7 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="proces-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <h2 id="proces-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Cum ajungi de la interes la shortlist real</h2>
              <p className="mt-3 text-muted-foreground">Am adăugat un flux scurt, foarte clar, util mai ales pe mobil, pentru utilizatorii care vor răspuns rapid și puțin zgomot vizual.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {acquisitionSteps.map((step) => (
                <div key={step.title} className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="disponibilitati" className="bg-muted/40 py-12 md:py-16" aria-labelledby="formular-city-of-mara">
          <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-primary"><FileText className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Listă actualizată</span></div>
              <h2 id="formular-city-of-mara" className="text-3xl font-bold text-foreground">Solicită lista actualizată de disponibilități</h2>
              <p className="mt-3 text-muted-foreground">Primești unitățile disponibile, prețurile actualizate, opțiunile de parcare și o estimare de randament adaptată tipului de apartament.</p>
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Filtrare după buget, etaj, parcare și scop investițional",
                  "Estimare ROI pentru chirie clasică vs. administrare profesională",
                  "Recomandare rapidă: cumpără, negociază sau așteaptă",
                ].map((item) => <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>)}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city-mara-name">Nume *</Label>
                  <Input id="city-mara-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="city-mara-whatsapp">Telefon / WhatsApp *</Label>
                  <Input id="city-mara-whatsapp" type="tel" inputMode="tel" value={whatsapp} onChange={(event) => setWhatsapp(formatPhoneInput(event.target.value))} maxLength={20} autoComplete="tel" required className="mt-2" aria-invalid={whatsapp.replace(/\D/g, "").length > 3 && !isValidWhatsAppNumber(whatsapp)} />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city-mara-email">Email opțional</Label>
                  <Input id="city-mara-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} autoComplete="email" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="city-mara-type">Tip apartament</Label>
                  <select id="city-mara-type" value={apartmentType} onChange={(event) => setApartmentType(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {apartmentTypes.map((item) => <option key={item.type} value={item.type}>{item.type}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="city-mara-message">Detalii opționale</Label>
                <Textarea id="city-mara-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={800} rows={4} className="mt-2" placeholder="Buget, parcare, etaj preferat sau obiectiv investițional" />
              </div>
              <Button type="submit" size="lg" disabled={submitting} className="mt-5 w-full gap-2">
                <Send className="h-4 w-4" /> {submitting ? "Se trimite..." : "Solicită lista actualizată"}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">Datele sunt folosite doar pentru contact și ofertare. Nu publicăm informațiile tale.</p>
            </form>
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="faq-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <h2 id="faq-city-of-mara" className="text-3xl font-bold text-foreground">Întrebări frecvente despre apartamente City of Mara</h2>
              <p className="mt-3 text-muted-foreground">Răspunsuri scurte pentru cumpărători interesați de vânzare apartamente noi City of Mara și investiții în zona centrală.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {faqItems.map((item) => (
                <article key={item.question} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 md:flex md:items-center md:justify-between md:p-8">
            <div>
              <ShieldCheck className="mb-3 h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Vrei comparație cu ISHO, Ateneo sau Fructus Plaza?</h2>
              <p className="mt-2 text-muted-foreground">Comparăm randamentul, prețul de intrare, lichiditatea și riscul operațional între complexele premium din Timișoara.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
              <Button asChild><Link to="/complexe">Vezi Complexe</Link></Button>
              <Button asChild variant="outline"><Link to="/catalog-investitii">Catalog Investiții</Link></Button>
            </div>
          </div>
        </section>
      </main>

      <button
        type="button"
        onClick={handleWhatsApp}
        className="fixed bottom-5 right-4 z-50 inline-flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-whatsapp px-4 text-whatsapp-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:bottom-6 sm:right-6"
        aria-label="Solicită disponibilități City of Mara pe WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="ml-2 hidden text-sm font-semibold sm:inline">WhatsApp</span>
      </button>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-lg sm:hidden">
        <Button asChild className="min-h-[48px] w-full gap-2">
          <a href="#disponibilitati"><FileText className="h-4 w-4" /> Cere lista City of Mara</a>
        </Button>
      </div>

      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default CityOfMaraTimisoara;
