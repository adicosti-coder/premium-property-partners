import { useState, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Building2, Home, LandPlot, Store, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { neighborhoods } from "@/data/neighborhoods";

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
      <Helmet>
        <title>Evaluare Gratuită Proprietate Timișoara | RealTrust</title>
        <meta name="description" content="Solicită o evaluare gratuită pentru proprietatea ta din Timișoara. Răspundem în maxim 24 de ore cu o estimare personalizată." />
      </Helmet>
      <Header />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
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
      </main>
      <Footer />
    </Suspense>
  );
};

export default EvaluareGratuita;
