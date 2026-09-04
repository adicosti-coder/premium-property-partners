import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, Clock3, FileText, Home, KeyRound, MapPin, MessageCircle, Send, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
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
import { REAL_ESTATE_AGENT_REF } from "@/lib/orgIdentity";

const Footer = lazy(() => import("@/components/Footer"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const purchaseGoals = ["Investiție", "Locuire proprie", "Revânzare", "Încă compar opțiuni"] as const;
const budgetRanges = ["Sub 90.000€", "90.000–120.000€", "120.000–160.000€", "Peste 160.000€"] as const;

const availabilitySchema = z.object({
  name: z.string().trim().min(2, "Numele trebuie completat.").max(100, "Numele este prea lung."),
  whatsapp: z.string().trim().refine((value) => isValidWhatsAppNumber(value), "Număr WhatsApp invalid."),
  email: z.string().trim().email("Email invalid.").max(255, "Emailul este prea lung.").optional().or(z.literal("")),
  apartmentType: z.string().trim().min(2).max(40),
  purchaseGoal: z.enum(purchaseGoals),
  budgetRange: z.enum(budgetRanges),
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

const pricingDrivers = [
  { title: "Etaj și orientare", text: "Unitățile luminoase, cu orientare bună și zgomot redus, tind să susțină mai bine prețul și revânzarea." },
  { title: "Parcare și boxă", text: "În complexele centrale, locul de parcare poate influența puternic atât lichiditatea, cât și chiria obținută." },
  { title: "Mobilare și stare", text: "Apartamentele pregătite pentru mutare sau închiriere reduc timpul până la monetizare și presiunea pe bugetul total." },
];

const costChecklist = [
  "preț apartament + avans / structură credit",
  "loc de parcare, boxă și costuri notariale",
  "mobilare, electrocasnice și buget de lansare",
  "randament net estimat după costuri reale",
];

const negotiationSignals = [
  { title: "Unitate listată de mai mult timp", text: "Poate crea spațiu pentru negociere, mai ales dacă proprietarul urmărește viteză de vânzare." },
  { title: "Mobilare incompletă", text: "Prețul cerut poate părea bun, dar costul real crește dacă apartamentul nu este pregătit pentru utilizare imediată." },
  { title: "Poziție inferioară în complex", text: "Parter, expunere zgomotoasă sau lipsa parcării pot influența atât prețul de intrare, cât și lichiditatea." },
];

const deliverables = [
  "listă actualizată cu unități relevante pentru bugetul tău",
  "filtrare după etaj, orientare, parcare și potențial de închiriere",
  "estimare de cost total, nu doar preț de listare",
  "recomandare scurtă: potrivit pentru locuire, chirie sau de evitat",
];

const suitabilityMatrix = [
  { profile: "Investitor", bestFit: "studio / 2 camere", focus: "ocupare, lichiditate, randament net", note: "cele mai potrivite pentru cerere constantă și monetizare mai rapidă" },
  { profile: "Locuire proprie", bestFit: "2 / 3 camere", focus: "compartimentare, lumină, confort urban", note: "utile pentru cumpărători care prioritizează accesul rapid spre centru și office" },
  { profile: "Revânzare", bestFit: "2 camere / penthouse", focus: "adresă, poziție, prezentare", note: "interesează mai ales unitățile cu poziție bună și elemente premium clare" },
];

const finalObjectionsFaq = [
  { question: "Se justifică prețul mai mare față de alte zone?", answer: "De obicei da, dacă unitatea are poziție bună, parcare și rămâne competitivă pentru chirie sau revânzare. Locația centrală susține diferența de preț mai bine decât zonele periferice." },
  { question: "Ce tip de apartament se mișcă mai repede la revânzare?", answer: "În general, unitățile cu 2 camere bine compartimentate sunt cele mai lichide, pentru că atrag atât locuire proprie, cât și cumpărători-investitori." },
  { question: "Merită să cer comparație între mai multe unități înainte de ofertă?", answer: "Da. Diferențele de etaj, orientare, parcare și mobilare schimbă semnificativ costul total și potențialul de randament, chiar în același complex." },
];

const notIdealFor = [
  "cumpărători care caută strict cel mai mic preț/mp din Timișoara",
  "profiluri care nu valorizează locația centrală și lichiditatea la revânzare",
  "investitori care vor randament mare fără buget pentru mobilare sau parcare",
];

const responseTrustSignals = [
  "răspuns orientativ în aceeași zi lucrătoare",
  "shortlist filtrat, nu listă generică",
  "context local și comparații relevante pentru Timișoara",
];

const callPrepChecklist = [
  "bugetul maxim și dacă ai nevoie de credit",
  "dacă vrei locuire, investiție sau doar comparație",
  "preferințe pentru etaj, parcare și termen de mutare",
];

const financingReadiness = [
  { title: "Avans și rezervă", text: "Nu te uita doar la avans. E util să păstrezi și un buffer pentru notar, mobilare, parcare și mici corecții după achiziție." },
  { title: "Preaprobarea de credit", text: "Dacă finanțezi prin bancă, preaprobarea scurtează timpul de decizie și te ajută să negociezi mai clar în limita bugetului real." },
  { title: "Calendar realist", text: "Pentru investiție, contează intervalul dintre achiziție și prima monetizare. Pentru locuire, contează data mutării și costul total până la cheie." },
];

const viewingChecklist = [
  "nivelul real de zgomot la ore diferite și expunerea către trafic",
  "lumina naturală, orientarea și distanța față de vecini",
  "calitatea finisajelor, ușilor, băilor și spațiilor de depozitare",
  "accesul concret la parcare, lift și zonele comune",
];

const riskSignals = [
  { title: "Preț bun, cost total slab", text: "Unele unități par atractive doar prin prețul de intrare. Fără parcare, mobilare sau cu poziție mai slabă, costul total poate deveni mai puțin competitiv." },
  { title: "Randament estimat fără scenariu real", text: "Un ROI credibil are nevoie de chirie probabilă, grad de ocupare, costuri operaționale și buget de lansare, nu doar de un procent orientativ." },
  { title: "Decizie grăbită fără comparație", text: "În același buget, două apartamente din același complex pot avea rezultate foarte diferite în funcție de etaj, orientare și pregătirea pentru utilizare imediată." },
];

const shortlistSignals = [
  "apartamentul are parcare sau un plan clar pentru parcare în bugetul total",
  "orientarea și lumina naturală susțin atât locuirea, cât și închirierea",
  "compartimentarea permite mobilare eficientă fără compromisuri mari",
  "prețul final rămâne competitiv și după costuri de lansare sau mutare",
];

const documentChecks = [
  { title: "Acte și proprietate", text: "Verificăm rapid situația juridică, extrasul relevant, datele unității, parcarea și dacă descrierea comercială se potrivește cu realitatea contractuală." },
  { title: "Costuri recurente", text: "E util să clarifici întreținerea estimată, costurile de exploatare și orice element care poate afecta confortul sau randamentul net." },
  { title: "Scenariu de exit", text: "Pentru investiție, analizăm cât de ușor se poate revinde unitatea peste 2–5 ani și ce profil de cumpărător ar intra natural pe ea." },
];

const viewingQuestions = [
  "Care este costul total real dacă includ parcare, mobilare și taxe?",
  "Cât de repede s-ar putea închiria sau revinde această unitate față de altele similare?",
  "Există limitări practice legate de etaj, orientare, zgomot sau compartimentare?",
  "Ce variantă din shortlist are cel mai bun echilibru între preț, lichiditate și utilizare?",
];

const resaleSignals = [
  { title: "Tipologie lichidă", text: "Apartamentele cu 2 camere bine compartimentate rămân de obicei cele mai ușor de repoziționat atât pentru locuire, cât și pentru investiție." },
  { title: "Poziție ușor de explicat", text: "Unitățile cu orientare bună, lumină naturală și acces clar la parcare sunt mai simple de vândut fără discount agresiv." },
  { title: "Produs gata de folosit", text: "Dacă apartamentul poate fi ocupat sau închiriat rapid, cumpărătorii percep mai ușor valoarea totală și decid mai repede." },
];

const microLocationSignals = [
  { title: "Acces zilnic simplu", text: "Contează cât de repede ieși spre centru, office și zone comerciale fără fricțiune mare la orele aglomerate." },
  { title: "Confort urban real", text: "Nu doar adresa vinde, ci și distanța practică până la cafenele, sală, supermarket și servicii utile pentru viața de zi cu zi." },
  { title: "Percepție bună la închiriere", text: "Chiriașii premium reacționează bine la complexuri ușor de explicat și ușor de atins din reperele cunoscute ale orașului." },
];

const redFlagChecklist = [
  "preț aparent bun, dar fără parcare sau cu cost suplimentar care schimbă total comparația",
  "apartament care cere buget mare de amenajare înainte să poată fi locuit sau închiriat",
  "poziție în complex greu de justificat la revânzare: zgomot, lumină slabă, vecinătăți incomode",
  "randament calculat optimist, fără costuri recurente și fără perioade de neocupare",
];

const decisionTimeline = [
  { title: "Înainte de vizionare", text: "Fixăm bugetul total și criteriile care nu sunt negociabile: parcare, etaj, lumină, termen de mutare sau monetizare." },
  { title: "După shortlist", text: "Comparăm 2–4 unități pe cost total, lichiditate și risc, nu doar pe prețul de listare sau impresia de moment." },
  { title: "Înainte de rezervare", text: "Verificăm dacă unitatea aleasă rămâne cea mai bună opțiune și după acte, costuri recurente și scenariul de exit." },
];

const CityOfMaraTimisoara = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("+40 ");
  const [email, setEmail] = useState("");
  const [apartmentType, setApartmentType] = useState("2 camere");
  const [purchaseGoal, setPurchaseGoal] = useState("Investiție");
  const [budgetRange, setBudgetRange] = useState("90.000–120.000€");
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
        url: "https://realtrust.ro/complexe/city-of-mara",
        address: { "@type": "PostalAddress", streetAddress: "Calea Circumvalațiunii", addressLocality: "Timișoara", addressRegion: "Timiș", addressCountry: "RO" },
        amenityFeature: [
          { "@type": "LocationFeatureSpecification", name: "Parcare subterană", value: true },
          { "@type": "LocationFeatureSpecification", name: "Apartamente noi", value: true },
          { "@type": "LocationFeatureSpecification", name: "Acces rapid centru", value: true },
        ],
      },
      {
        ...REAL_ESTATE_AGENT_REF,
        url: "https://realtrust.ro",
        areaServed: "Timișoara",
      },
      {
        "@type": "FAQPage",
        mainEntity: [...faqItems, ...finalObjectionsFaq].map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = availabilitySchema.safeParse({ name, whatsapp, email, apartmentType, purchaseGoal, budgetRange, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Verifică datele introduse.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = parsed.data.whatsapp.replace(/\s/g, "");
      const leadMessage = [
        `Solicitare disponibilități City of Mara — ${parsed.data.apartmentType}`,
        `Obiectiv: ${parsed.data.purchaseGoal}`,
        `Buget: ${parsed.data.budgetRange}`,
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
          simulation_data: { apartmentType: parsed.data.apartmentType, purchaseGoal: parsed.data.purchaseGoal, budgetRange: parsed.data.budgetRange, page: "/complexe/city-of-mara" },
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
        title="City of Mara Timișoara | Analiză ROI & Investiții RealTrust"
        description="Vezi analiza financiară completă pentru complexul City of Mara din Timișoara. Calcul ROI, prețuri medii și oportunități de property management prin ApArt Hotel."
        url="https://realtrust.ro/complexe/city-of-mara"
        image="https://realtrust.ro/assets/apt-03.webp"
        jsonLd={jsonLd}
        breadcrumbItems={[
          { name: "Acasă", url: "https://realtrust.ro" },
          { name: "Complexe", url: "https://realtrust.ro/complexe" },
          { name: "City of Mara", url: "https://realtrust.ro/complexe/city-of-mara" },
        ]}
      />
      <Header />

      <main className="pb-20">
        <section className="relative min-h-[88svh] overflow-hidden pt-24">
          <img src={cityHero} alt="Apartamente City of Mara Timișoara cu finisaje moderne" className="absolute inset-0 h-full w-full object-cover" {...({ fetchpriority: "high" } as Record<string, string>)} />
          <div className="absolute inset-0 bg-foreground/65" />
          <div className="relative container mx-auto flex min-h-[calc(88svh-6rem)] flex-col justify-end px-4 pb-10 md:pb-14">
            <PageBreadcrumb items={[{ label: "Complexe", href: "/ansambluri-rezidentiale" }, { label: "City of Mara Timișoara" }]} className="mb-8 text-primary-foreground/90" />
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

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="factori-pret-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <h2 id="factori-pret-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Ce influențează prețul în City of Mara</h2>
              <p className="mt-3 text-muted-foreground">În acest complex, diferențele de preț între apartamente aparent similare apar din câțiva factori foarte clari, pe care merită să-i vezi înainte de ofertă.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {pricingDrivers.map((item) => (
                <article key={item.title} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="negociere-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="negociere-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Semnale utile înainte să faci o ofertă</h2>
            <p className="mt-3 text-muted-foreground">Nu toate apartamentele City of Mara trebuie tratate la fel. Am adăugat repere rapide care te ajută să separi o oportunitate reală de o unitate doar bine marketată.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {negotiationSignals.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            ))}
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

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="riscuri-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-primary"><AlertTriangle className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Filtrare inteligentă</span></div>
              <h2 id="riscuri-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Riscuri și capcane pe care merită să le eviți</h2>
              <p className="mt-3 text-muted-foreground">Am adăugat și partea mai puțin confortabilă, dar utilă: ce poate părea bun la prima vedere și unde apar diferențele reale de performanță.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {riskSignals.map((item) => (
                <article key={item.title} className="rounded-lg border border-border bg-card p-6">
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="cand-nu-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <h2 id="cand-nu-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Când City of Mara poate să nu fie alegerea potrivită</h2>
              <p className="mt-3 text-muted-foreground">Am adăugat și partea de transparență, ca să filtrăm mai bine lead-urile și să oferim un context credibil, nu doar argumente de vânzare.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                {notIdealFor.map((item) => (
                  <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="matrice-potrivire-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="matrice-potrivire-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Cum se potrivește City of Mara în funcție de obiectiv</h2>
            <p className="mt-3 text-muted-foreground">Secțiune practică pentru utilizatori care nu caută doar informație generală, ci vor să știe rapid dacă un tip de apartament are sens pentru scopul lor real.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="p-4 font-semibold">Profil</th>
                  <th className="p-4 font-semibold">Tip recomandat</th>
                  <th className="p-4 font-semibold">Ce urmărești</th>
                  <th className="p-4 font-semibold">Observație</th>
                </tr>
              </thead>
              <tbody>
                {suitabilityMatrix.map((item) => (
                  <tr key={item.profile} className="border-t border-border">
                    <td className="p-4 font-semibold text-foreground">{item.profile}</td>
                    <td className="p-4 text-muted-foreground">{item.bestFit}</td>
                    <td className="p-4 text-muted-foreground">{item.focus}</td>
                    <td className="p-4 text-muted-foreground">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="finantare-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="finantare-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Pregătire financiară și de decizie</h2>
            <p className="mt-3 text-muted-foreground">Secțiune utilă pentru lead-uri mai bune: ajută utilizatorul să înțeleagă diferența dintre bugetul afișat și bugetul cu adevărat pregătit pentru achiziție.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {financingReadiness.map((item) => (
              <article key={item.title} className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="shortlist-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <h2 id="shortlist-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Cum arată un shortlist bun în City of Mara</h2>
              <p className="mt-3 text-muted-foreground">Bloc practic pentru utilizatorii care vor să compare rapid câteva opțiuni fără să piardă timp pe unități doar "ok" la prima vedere.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                {shortlistSignals.map((item) => (
                  <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="documente-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="documente-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Ce merită verificat înainte de rezervare sau ofertă</h2>
            <p className="mt-3 text-muted-foreground">Am adăugat și o secțiune de due diligence simplificată, utilă atât pentru cumpărători la prima achiziție, cât și pentru investitori care vor decizie mai disciplinată.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {documentChecks.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40 py-12 md:py-16" aria-labelledby="revanzare-city-of-mara">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <h2 id="revanzare-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Ce susține revânzarea mai bună în City of Mara</h2>
              <p className="mt-3 text-muted-foreground">Util pentru cumpărători care vor flexibilitate pe termen mediu, nu doar o decizie bună pentru momentul actual.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {resaleSignals.map((item) => (
                <article key={item.title} className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="micro-locatie-city-of-mara">
          <div className="mb-8 max-w-3xl">
            <h2 id="micro-locatie-city-of-mara" className="text-3xl font-bold text-foreground md:text-4xl">Detalii de micro-locație care schimbă decizia</h2>
            <p className="mt-3 text-muted-foreground">Aici se face diferența dintre un apartament care arată bine în anunț și unul care rămâne bun și după folosire, închiriere sau revânzare.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {microLocationSignals.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            ))}
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
              <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-5">
                <h3 className="text-lg font-semibold text-foreground">Checklist cost total de achiziție</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {costChecklist.map((item) => (
                    <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-5">
                <h3 className="text-lg font-semibold text-foreground">Ce primești când ceri disponibilitățile</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {deliverables.map((item) => (
                    <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-5">
                <h3 className="text-lg font-semibold text-foreground">Cum răspundem</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {responseTrustSignals.map((item) => (
                    <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-5">
                <h3 className="text-lg font-semibold text-foreground">Ca să primești un răspuns mai util</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {callPrepChecklist.map((item) => (
                    <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-5">
                <h3 className="text-lg font-semibold text-foreground">Ce să verifici la vizionare</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {viewingChecklist.map((item) => (
                    <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-5">
                <h3 className="text-lg font-semibold text-foreground">Întrebări bune la vizionare sau la call</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {viewingQuestions.map((item) => (
                    <p key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-5">
                <h3 className="text-lg font-semibold text-foreground">Red flags care merită filtrate devreme</h3>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {redFlagChecklist.map((item) => (
                    <p key={item} className="flex gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</p>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-5">
                <h3 className="text-lg font-semibold text-foreground">Plan scurt de decizie</h3>
                <div className="mt-4 space-y-4">
                  {decisionTimeline.map((item) => (
                    <article key={item.title} className="rounded-md border border-primary/15 bg-background p-4">
                      <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                    </article>
                  ))}
                </div>
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
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city-mara-goal">Scop achiziție</Label>
                  <select id="city-mara-goal" value={purchaseGoal} onChange={(event) => setPurchaseGoal(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {purchaseGoals.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="city-mara-budget">Buget orientativ</Label>
                  <select id="city-mara-budget" value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {budgetRanges.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="city-mara-message">Detalii opționale</Label>
                <Textarea id="city-mara-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={800} rows={4} className="mt-2" placeholder="Buget, parcare, etaj preferat sau obiectiv investițional" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cu cât contextul e mai clar, cu atât shortlist-ul va fi mai relevant.</span>
                  <span>{message.length}/800</span>
                </div>
              </div>
              <Button type="submit" size="lg" disabled={submitting} className="mt-5 w-full gap-2">
                <Send className="h-4 w-4" /> {submitting ? "Se trimite..." : "Solicită lista actualizată"}
              </Button>
              <p className="mt-3 text-sm text-muted-foreground">Răspuns cu shortlist și observații utile, de regulă în aceeași zi lucrătoare.</p>
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
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {finalObjectionsFaq.map((item) => (
                <article key={item.question} className="rounded-lg border border-primary/20 bg-primary/5 p-6">
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
              <Button asChild><Link to="/ansambluri-rezidentiale">Vezi Complexe</Link></Button>
              <Button asChild variant="outline"><Link to="/catalog-investitii">Catalog Investiții</Link></Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-12 md:pb-16" aria-labelledby="resurse-city-of-mara">
          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/analiza-roi-apartament" className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <Calculator className="h-6 w-6 text-primary" />
              <h2 id="resurse-city-of-mara" className="mt-4 text-xl font-semibold text-foreground">Analiza ROI apartament</h2>
              <p className="mt-2 text-sm text-muted-foreground">Calculează rapid scenarii de randament pentru bugetul și tipul tău de apartament.</p>
            </Link>
            <Link to="/piata-imobiliara-timisoara" className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">Piața imobiliară Timișoara</h3>
              <p className="mt-2 text-sm text-muted-foreground">Vezi contextul local al prețurilor, cererii și principalelor zone de interes pentru investitori.</p>
            </Link>
            <Link to="/ansambluri-rezidentiale" className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">Alte complexe premium</h3>
              <p className="mt-2 text-sm text-muted-foreground">Compară City of Mara cu alte ansambluri relevante din Timișoara înainte de decizia finală.</p>
            </Link>
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
