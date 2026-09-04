import { useState, lazy, Suspense, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { submitLead } from "@/lib/leadSubmission";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import FormTrustBadges from "@/components/forms/FormTrustBadges";
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
import { trackConversion, formatPhoneInput } from "@/lib/conversionTracking";

const EVAL_FAQS = [
  {
    question: "Cât valorează apartamentul meu din Timișoara?",
    answer:
      "Valoarea unui apartament în Timișoara depinde de cartier (Circumvalațiunii, ISHO, Complex Studențesc, Iosefin), suprafață utilă, an construcție, etaj, finisaje și dotări. Echipa noastră analizează tranzacții comparabile recente din zonă și îți oferă o estimare în maximum 24 de ore lucrătoare, gratuit și fără obligații.",
  },
  {
    question: "Care este diferența dintre estimarea de piață și un raport de evaluare ANEVAR?",
    answer:
      "Estimarea de piață, oferită gratuit, reflectă prețul realist de vânzare în condițiile actuale și se bazează pe tranzacții comparabile. Raportul de evaluare emis de un evaluator ANEVAR este un document oficial, contra-cost, necesar băncilor pentru credite ipotecare, instanțelor sau partajelor. Pentru decizia de listare, estimarea de piață este de obicei suficientă.",
  },
  {
    question: "Cât durează evaluarea gratuită?",
    answer:
      "Răspundem în maximum 24 de ore lucrătoare. Pentru proprietăți complexe (case, terenuri, spații comerciale) sau pentru zone metropolitane (Dumbrăvița, Ghiroda, Moșnița Nouă, Giroc), poate fi utilă o vizită la fața locului, programată în următoarele 48-72 de ore.",
  },
  {
    question: "Ce date sunt necesare pentru o evaluare corectă?",
    answer:
      "Pentru o estimare apropiată de prețul real de tranzacționare avem nevoie de: tipul proprietății (apartament, casă, teren, comercial), cartierul exact, suprafața utilă, anul construcției, etajul, numărul de camere, starea finisajelor și, opțional, fotografii. Cu cât informațiile sunt mai exacte, cu atât intervalul estimat este mai îngust.",
  },
  {
    question: "Evaluarea gratuită mă obligă să vând prin RealTrust?",
    answer:
      "Nu. Evaluarea este gratuită și fără obligații. Primești raportul de estimare și decizi liber dacă vrei să listezi proprietatea cu noi sau nu. Mulți proprietari folosesc estimarea pentru planificare financiară sau pentru o moștenire.",
  },
  {
    question: "Acoperiți și zone metropolitane ca Dumbrăvița sau Giroc?",
    answer:
      "Da. Lucrăm pe Timișoara și pe zonele metropolitane: Dumbrăvița, Ghiroda, Moșnița Nouă, Giroc, Chișoda și Săcălaz. Cunoaștem prețurile pe metru pătrat și particularitățile fiecărei zone din jurul Timișoarei.",
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

// Maps mini-form apartment types (from PreCalcMiniForm) to (propertyType, rooms).
const APARTMENT_TYPE_MAP: Record<string, { propertyType: string; rooms: string }> = {
  garsoniera: { propertyType: "apartament", rooms: "Garsonieră" },
  "2-camere": { propertyType: "apartament", rooms: "2 camere" },
  "3-camere": { propertyType: "apartament", rooms: "3 camere" },
  "4-camere": { propertyType: "apartament", rooms: "4+ camere" },
  casa: { propertyType: "casa", rooms: "" },
};

const EvaluareGratuita = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Prefill from query params (e.g. coming from PreCalcMiniForm).
  // Supported: ?nume=...&oras=...&tip=garsoniera|2-camere|3-camere|4-camere|casa&zona=<slug>&telefon=...&email=...
  useEffect(() => {
    const nume = searchParams.get("nume") ?? searchParams.get("name") ?? "";
    const tip = searchParams.get("tip") ?? searchParams.get("type") ?? "";
    const zona = searchParams.get("zona") ?? searchParams.get("zone") ?? "";
    const telefon = searchParams.get("telefon") ?? searchParams.get("phone") ?? "";
    const email = searchParams.get("email") ?? "";
    const oras = searchParams.get("oras") ?? searchParams.get("city") ?? "";

    const mapped = tip ? APARTMENT_TYPE_MAP[tip] : undefined;

    // Try to match `oras` against neighborhood slugs/labels (case-insensitive).
    let matchedZone = zona;
    if (!matchedZone && oras) {
      const lower = oras.toLowerCase();
      const found = ZONES.find(
        (z) => z.value.toLowerCase() === lower || z.label.toLowerCase().includes(lower),
      );
      matchedZone = found ? found.value : "alta";
    }

    setForm((prev) => ({
      ...prev,
      name: nume || prev.name,
      phone: telefon || prev.phone,
      email: email || prev.email,
      propertyType: mapped?.propertyType || prev.propertyType,
      rooms: mapped?.rooms || prev.rooms,
      zone: matchedZone || prev.zone,
    }));

    // If we have at least property type + zone, jump straight to step 3 (rooms) or 4 (contact).
    if (mapped?.propertyType && matchedZone) {
      if (mapped.rooms) {
        setStep(4);
      } else {
        setStep(3);
      }
    } else if (mapped?.propertyType) {
      setStep(2);
    }
  }, [searchParams]);

  useRegisterFAQs("evaluare-gratuita", EVAL_FAQS);

  const progress = (step / 4) * 100;

  const canNext = () => {
    if (step === 1) return !!form.propertyType;
    if (step === 2) return !!form.zone;
    if (step === 3) return !!form.rooms;
    if (step === 4) return form.name.trim() && form.phone.trim() && form.email.trim();
    return false;
  };

  const zoneLabel = ZONES.find((z) => z.value === form.zone)?.label ?? form.zone;

  const handleSubmit = async () => {
    if (!canNext() || submitted) return;
    setSubmitted(true);

    // Persist the lead (dedup handled server-side by leads_dedupe_upsert).
    const result = await submitLead({
      name: form.name,
      whatsapp_number: formatPhoneInput(form.phone),
      email: form.email,
      property_type: form.propertyType,
      property_area: 0,
      message: `[evaluare_gratuita] Zonă: ${zoneLabel} · Camere: ${form.rooms || "-"}`,
      source: "evaluare_gratuita",
      simulation_data: withCampaignTracking({
        zone: form.zone,
        zone_label: zoneLabel,
        property_type: form.propertyType,
        rooms: form.rooms,
      }) as never,
    });

    if (result.ok !== true) {
      setSubmitted(false);
      if (result.reason === "validation") {
        toast.error("Verifică numele, telefonul și emailul introduse.");
      } else {
        toast.error("Nu am putut trimite cererea. Te rugăm să încerci din nou.");
      }
      return;
    }

    trackConversion({
      event: "roi_calculator_lead",
      source: "evaluare_gratuita",
      property_type: form.propertyType,
      zone: form.zone,
      name: form.name,
      phone: form.phone,
      email: form.email,
    });

    const params = new URLSearchParams({
      nume: form.name,
      telefon: form.phone,
      email: form.email,
      zona: zoneLabel,
      tip: form.propertyType,
      sursa: "evaluare_gratuita",
    });
    if (form.rooms) params.set("camere", form.rooms);

    navigate(`/multumire?${params.toString()}`);
  };


  return (
    <Suspense fallback={null}>
      <SEOHead
        title="Evaluare gratuită apartament și casă în Timișoara | RealTrust"
        description="Estimare de piață gratuită pentru apartamentul, casa, terenul sau spațiul tău comercial din Timișoara. Răspuns în 24 de ore lucrătoare, fără obligații."
        url="https://realtrust.ro/evaluare-gratuita"
      />
      <Header />
      <main className="min-h-[80vh] px-4 py-12">
        <div className="max-w-3xl mx-auto mb-8 text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Evaluare gratuită a proprietății tale în Timișoara
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Află cât valorează apartamentul, casa, terenul sau spațiul comercial: estimare bazată pe tranzacții reale din cartierul tău, livrată în maximum 24 de ore lucrătoare.
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
              <h2 className="text-xl font-bold text-foreground">Ce tip de proprietate ai?</h2>
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
              <h2 className="text-xl font-bold text-foreground">Datele tale de contact</h2>
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

          {step === 4 && <FormTrustBadges />}
        </div>

        {/* SEO content sections */}
        <div className="max-w-3xl mx-auto mt-16 space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-primary" /> Cum funcționează estimarea de preț
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Metodologia noastră combină <strong>analiza comparativă a pieței</strong> (CMA) cu date proprii din peste
              500 de tranzacții recente din Timișoara. Analizăm prețul mediu pe metru pătrat în cartierul tău
              (Circumvalațiunii, ISHO, Iosefin, Complex Studențesc, Fabric, Elisabetin, Dumbrăvița, Ghiroda),
              ajustăm pentru etaj, finisaje, an de construcție, dotări și expunere, apoi corelăm cu cererea curentă.
            </p>
            <ul className="grid md:grid-cols-2 gap-3 text-sm">
              <li className="flex gap-2"><MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Tranzacții comparabile pe stradă și cartier</li>
              <li className="flex gap-2"><Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Răspuns în 24 de ore lucrătoare</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Gratuit, fără obligații</li>
              <li className="flex gap-2"><Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Acoperim și zonele metropolitane (Dumbrăvița, Giroc, Moșnița)</li>
            </ul>
          </section>

          <section className="space-y-3 bg-muted/40 rounded-xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground">Estimare de piață vs. raport de evaluare ANEVAR</h2>
            <p className="text-muted-foreground leading-relaxed">
              Serviciul nostru oferă o <strong>estimare de piață</strong> — prețul realist la care proprietatea se poate
              vinde în condițiile actuale din Timișoara. Acesta este diferit de un{" "}
              <strong>raport de evaluare</strong> oficial, emis de un <em>evaluator ANEVAR</em>,
              care este un document contra-cost, necesar băncilor pentru credite ipotecare, instanțelor sau partajelor succesorale. Pentru decizia de listare, estimarea de piață este de obicei suficientă.
            </p>
            <p className="text-sm text-muted-foreground">
              Vrei să vinzi după evaluare?{" "}
              <Link to="/cartiere" className="text-primary underline">
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
            <h2 className="text-2xl font-bold text-foreground">Cât valorează apartamentul tău din Timișoara?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pentru a răspunde la întrebarea <strong>„cât valorează apartamentul meu”</strong>, folosim o bază de date proprie cu prețuri de tranzacționare reale (nu prețuri de listare) din ultimele 6-12 luni, segmentate pe cartier și tip de imobil. Pentru o estimare corectă contează cartierul (un 2 camere în Circumvalațiunii nu valorează cât unul în Complex Studențesc), anul construcției, finisajele, etajul și expunerea. Livrabilul este un raport sintetic în PDF, cu interval min/mediu/max recomandat pentru listare.
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
