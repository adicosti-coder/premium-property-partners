import { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Building2, Home, LandPlot, Store, ChevronLeft, ChevronRight, CheckCircle2, FileCheck, MapPin, Clock, ShieldCheck } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { neighborhoods } from "@/data/neighborhoods";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

const EVAL_FAQS = [
  {
    question: "Cât valorează apartamentul meu din Timișoara?",
    answer:
      "Valoarea unui apartament în Timișoara depinde de cartier (ex: Circumvalațiunii, ISHO, Complex Studențesc, Iosefin), suprafață utilă, an construcție, etaj, finisaje și dotări. Echipa RealTrust analizează tranzacții comparabile recente din zonă și vă oferă o estimare preț apartament Timișoara în maxim 24 de ore, complet gratuit.",
  },
  {
    question: "Care este diferența între estimarea de piață și un raport de evaluare ANEVAR?",
    answer:
      "Estimarea de piață oferită gratuit de RealTrust reflectă prețul realist de vânzare bazat pe cererea actuală și tranzacții comparabile. Un raport de evaluare proprietate emis de un evaluator ANEVAR Timișoara este un document oficial, contra-cost, necesar pentru bănci (credite ipotecare), instanțe judecătorești sau partaje. Estimarea noastră este ideală pentru a decide prețul de listare la vânzare.",
  },
  {
    question: "Cât durează evaluarea gratuită?",
    answer:
      "Răspundem în maxim 24 de ore lucrătoare. Pentru proprietăți complexe (case, terenuri, spații comerciale) sau zone metropolitane (Dumbrăvița, Ghiroda, Moșnița Nouă, Giroc), poate fi necesară o vizită la fața locului, programată în următoarele 48-72h.",
  },
  {
    question: "Ce date trebuie să furnizez pentru o evaluare corectă?",
    answer:
      "Pentru o estimare precisă avem nevoie de: tipul proprietății (apartament, casă, teren, comercial), cartierul exact, suprafața utilă, anul construcției, etajul, numărul de camere, starea finisajelor (renovat, semi-renovat, vechi) și opțional fotografii. Cu cât detaliile sunt mai exacte, cu atât estimarea este mai apropiată de prețul real de tranzacționare.",
  },
  {
    question: "Evaluarea gratuită mă obligă să vând prin RealTrust?",
    answer:
      "Nu. Evaluarea este 100% gratuită și fără obligații. Primiți raportul de estimare și decideți liber dacă doriți să listați proprietatea cu noi sau nu. Mulți proprietari folosesc estimarea doar pentru a-și planifica viitorul financiar sau o moștenire.",
  },
  {
    question: "Acoperiți și zone metropolitane ca Dumbrăvița sau Giroc?",
    answer:
      "Da. Oferim evaluare apartament Circumvalațiunii, estimare preț casă Dumbrăvița, precum și pentru Ghiroda, Moșnița Nouă, Giroc, Chișoda și Săcălaz. Cunoaștem prețurile pe metru pătrat și particularitățile fiecărei zone metropolitane din jurul Timișoarei.",
  },
];

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

const PROPERTY_TYPES = [
  { value: "apartament", label: "Apartament", icon: Building2 },
  { value: "casa", label: "Casă", icon: Home },
  { value: "teren", label: "Teren", icon: LandPlot },
  { value: "comercial", label: "Spațiu comercial", icon: Store },
] as const;

const ROOM_OPTIONS = ["Garsonieră", "2 camere", "3 camere", "4+ camere"] as const;

const ZONES = [
  ...neighborhoods.map((n) => ({ value: n.slug, label: n.fullName })),
  { value: "alta", label: "Altă zonă" },
];

const EvaluareGratuita = () => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    propertyType: "",
    zone: "",
    rooms: "",
    name: "",
    phone: "",
    email: "",
  });

  useRegisterFAQs("evaluare-gratuita", EVAL_FAQS);

  const progress = (step / 4) * 100;

  const canNext = () => {
    if (step === 1) return !!form.propertyType;
    if (step === 2) return !!form.zone;
    if (step === 3) return !!form.rooms;
    if (step === 4) return form.name.trim() && form.phone.trim() && form.email.trim();
    return false;
  };

  const handleSubmit = () => {
    if (canNext()) setSubmitted(true);
  };

  if (submitted) {
    return (
      <Suspense fallback={null}>
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Cererea a fost trimisă!</h1>
            <p className="text-muted-foreground">
              Vă contactăm în maxim 24 de ore cu o evaluare personalizată.
            </p>
            <Button asChild variant="outline">
              <a href="/">Înapoi la pagina principală</a>
            </Button>
          </div>
        </div>
        <Footer />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <SEOHead
        title="Evaluare Gratuită Apartament & Casă Timișoara | RealTrust"
        description="Primește o evaluare gratuită pentru apartamentul sau casa ta din Timișoara. Află un preț corect de piață în 24h. Experții noștri locali analizează datele pentru o estimare precisă."
        url="https://www.realtrust.ro/evaluare-gratuita"
      />
      <Header />
      <main className="min-h-[80vh] px-4 py-12">
        <div className="max-w-3xl mx-auto mb-8 text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Evaluare Gratuită Proprietate Imobiliară în Timișoara
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Aflați cât valorează apartamentul, casa, terenul sau spațiul comercial din Timișoara —
            estimare preț bazată pe tranzacții reale din cartierul dvs., livrată în maxim 24 de ore.
          </p>
        </div>
        <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pasul {step} din 4</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Ce tip de proprietate aveți?</h2>
              <div className="grid grid-cols-2 gap-3">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, propertyType: t.value }))}
                    className={cn(
                      "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all text-sm font-medium",
                      form.propertyType === t.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <t.icon className="w-8 h-8" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">În ce zonă se află?</h2>
              <div className="space-y-2">
                {ZONES.map((z) => (
                  <button
                    key={z.value}
                    onClick={() => setForm((f) => ({ ...f, zone: z.value }))}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm",
                      form.zone === z.value
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-foreground hover:border-primary/30"
                    )}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Câte camere?</h2>
              <div className="grid grid-cols-2 gap-3">
                {ROOM_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((f) => ({ ...f, rooms: r }))}
                    className={cn(
                      "px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium",
                      form.rooms === r
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-primary/30"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Datele dumneavoastră</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="eval-name">Nume</Label>
                  <Input
                    id="eval-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Numele complet"
                  />
                </div>
                <div>
                  <Label htmlFor="eval-phone">Telefon</Label>
                  <Input
                    id="eval-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="07xxxxxxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="eval-email">Email</Label>
                  <Input
                    id="eval-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemplu.ro"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Înapoi
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Următorul <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canNext()}>
                Trimite cererea
              </Button>
            )}
          </div>
        </div>

        {/* SEO content sections */}
        <div className="max-w-3xl mx-auto mt-16 space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-primary" /> Cum funcționează estimarea preț apartament Timișoara
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Metodologia RealTrust combină <strong>analiza comparativă a pieței</strong> (CMA) cu date proprii din peste
              500 de tranzacții recente din Timișoara. Analizăm prețul mediu pe metru pătrat în cartierul dvs.
              (Circumvalațiunii, ISHO, Iosefin, Complex Studențesc, Fabric, Elisabetin, Dumbrăvița, Ghiroda),
              ajustăm pentru etaj, finisaje, an construcție, dotări și expunere, apoi corelăm cu cererea curentă.
            </p>
            <ul className="grid md:grid-cols-2 gap-3 text-sm">
              <li className="flex gap-2"><MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Tranzacții comparabile pe stradă/cartier</li>
              <li className="flex gap-2"><Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Răspuns garantat în 24h</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Fără obligații, 100% gratuit</li>
              <li className="flex gap-2"><Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Acoperim și zone metropolitane (Dumbrăvița, Giroc, Moșnița)</li>
            </ul>
          </section>

          <section className="space-y-3 bg-muted/40 rounded-xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground">Estimare de piață vs. raport de evaluare ANEVAR</h2>
            <p className="text-muted-foreground leading-relaxed">
              Serviciul nostru oferă o <strong>estimare de piață</strong> — prețul realist la care proprietatea se poate
              vinde în condițiile actuale ale pieței din Timișoara. Aceasta este diferită de un{" "}
              <strong>raport de evaluare proprietate</strong> oficial, emis de un <em>evaluator ANEVAR Timișoara</em>,
              care este un document contra-cost necesar băncilor pentru credite ipotecare, instanțelor sau pentru
              partaje succesorale. Pentru decizia de vânzare, estimarea noastră este suficientă și mai relevantă.
            </p>
            <p className="text-sm text-muted-foreground">
              Vrei să vinzi după evaluare?{" "}
              <Link to="/imobiliare-timisoara" className="text-primary underline">
                Vezi cum vindem proprietățile
              </Link>{" "}
              sau{" "}
              <Link to="/calculator-roi" className="text-primary underline">
                calculează randamentul investiției
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Cât valorează apartamentul meu din Timișoara?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pentru a răspunde rapid la întrebarea <strong>„cât valorează apartamentul meu”</strong>, RealTrust
              folosește o bază de date proprie cu prețuri de tranzacționare reale (nu prețuri de listare) din
              ultimele 6-12 luni, segmentate pe cartier și tip de imobil. Pentru o{" "}
              <strong>estimare preț apartament Timișoara</strong> corectă contează cartierul (un 2 camere în
              Circumvalațiunii nu valorează cât unul în Complex Studențesc), anul construcției, finisajele,
              etajul și expunerea. Livrabilul este un <strong>raport de evaluare proprietate</strong> sintetic
              în PDF, cu interval min/mediu/max recomandat pentru listare.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Exemple de evaluări recente în Timișoara</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Apartament 2 camere · Circumvalațiunii",
                  details: "55 mp utili, etaj 3/4, renovat 2022, centrală proprie",
                  price: "€95.000 – €105.000",
                  factors: "Evaluare apartament Circumvalațiunii — cerere ridicată, finisaje moderne",
                },
                {
                  title: "Casă individuală · Dumbrăvița",
                  details: "P+1, 140 mp, teren 400 mp, an 2018",
                  price: "€235.000 – €260.000",
                  factors: "Estimare preț casă Dumbrăvița — zonă metropolitană în expansiune",
                },
                {
                  title: "Apartament 3 camere · ISHO",
                  details: "78 mp, etaj 5, vedere Bega, complet mobilat",
                  price: "€155.000 – €172.000",
                  factors: "Premium, randament regim hotelier 8-10%",
                },
                {
                  title: "Apartament 2 camere · Complex Studențesc",
                  details: "48 mp, etaj 2, semi-renovat, lângă UVT",
                  price: "€78.000 – €88.000",
                  factors: "Cerere studenți, randament chirie clasică ridicat",
                },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <h3 className="font-semibold text-foreground text-sm">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">{c.details}</p>
                  <p className="text-primary font-bold text-sm">{c.price}</p>
                  <p className="text-[11px] text-muted-foreground italic">Factori: {c.factors}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Date anonimizate, exemple ilustrative din portofoliul RealTrust 2025-2026.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Întrebări frecvente despre evaluarea proprietății</h2>
            <Accordion type="single" collapsible className="w-full">
              {EVAL_FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </main>
      <Footer />
    </Suspense>
  );
};

export default EvaluareGratuita;
