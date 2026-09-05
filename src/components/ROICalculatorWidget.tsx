import { useState, useMemo, lazy, Suspense } from "react";
import { Calculator, TrendingUp, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { submitLead } from "@/lib/leadSubmission";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import { trackConversion, formatPhoneInput } from "@/lib/conversionTracking";

/** Randament net de referință RealTrust (ocupare 75%, deducere 27%). */
const TARGET_NET_YIELD = 0.094;

const TIERS = [
  { value: 15, label: "15%" },
  { value: 18, label: "18%" },
  { value: 20, label: "20%" },
  { value: 25, label: "25%" },
];

const ROICalculatorWidget = () => {
  const [propertyValue, setPropertyValue] = useState(120000);
  const [surface, setSurface] = useState(55);
  const [selectedTier, setSelectedTier] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  const calculations = useMemo(() => {
    // Chirie clasică: valoare × 0.004 / lună
    const classicRent = propertyValue * 0.004;
    // Venit RealTrust: chirie clasică × 1.6 × (1 - tier%)
    const realtrustIncome = classicRent * 1.6 * (1 - selectedTier / 100);
    const monthlyDelta = realtrustIncome - classicRent;
    // ROI anual
    const classicROI = ((classicRent * 12) / propertyValue) * 100;
    const realtrustROI = ((realtrustIncome * 12) / propertyValue) * 100;

    // Referință RealTrust: randament net țintă 9,4% pe an.
    const targetNetAnnual = propertyValue * TARGET_NET_YIELD;

    return {
      targetNetAnnual: Math.round(targetNetAnnual),
      targetNetMonthly: Math.round(targetNetAnnual / 12),
      classicRent: Math.round(classicRent),
      realtrustIncome: Math.round(realtrustIncome),
      monthlyDelta: Math.round(monthlyDelta),
      classicROI: classicROI.toFixed(1),
      realtrustROI: realtrustROI.toFixed(1),
    };
  }, [propertyValue, surface, selectedTier]);

  const chartData = [
    { name: "Chirie Clasică", value: calculations.classicRent, color: "hsl(var(--muted-foreground))" },
    { name: "RealTrust", value: calculations.realtrustIncome, color: "hsl(var(--primary))" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error("Completează toate câmpurile");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLead({
        name: formData.name,
        whatsapp_number: formatPhoneInput(formData.phone),
        email: formData.email,
        property_type: "apartament",
        property_area: surface,
        message: `[calculator_roi] Valoare: ${propertyValue} € · Suprafață: ${surface} mp · Tier management: ${selectedTier}%`,
        source: "calculator_roi_widget",
        simulation_data: withCampaignTracking({
          property_value: propertyValue,
          surface,
          management_tier: selectedTier,
          classic_rent: calculations.classicRent,
          realtrust_income: calculations.realtrustIncome,
          target_net_yield: TARGET_NET_YIELD,
          target_net_annual: calculations.targetNetAnnual,
        }) as never,
      });

      if (result.ok !== true) {
        if (result.reason === "validation") {
          toast.error("Verifică numele, telefonul și emailul introduse.");
        } else {
          toast.error("Nu am putut trimite cererea. Te rugăm să încerci din nou.");
        }
        return;
      }

      trackConversion({
        event: "roi_calculator_lead",
        source: "calculator_roi_widget",
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      });

      setFormSubmitted(true);
      toast.success("Cerere trimisă! Îți trimitem proiecția pe email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          Calculator ROI — Regim Hotelier vs. Chirie Clasică
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders */}
        <div className="space-y-6">
          {/* Property value */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm font-medium">Valoarea proprietății</Label>
              <span className="text-sm font-bold text-primary">
                {propertyValue.toLocaleString("ro-RO")} €
              </span>
            </div>
            <Slider
              value={[propertyValue]}
              onValueChange={([v]) => setPropertyValue(v)}
              min={50000}
              max={500000}
              step={5000}
              className="w-full"
              aria-label="Valoarea proprietății"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>50.000 €</span>
              <span>500.000 €</span>
            </div>
          </div>

          {/* Surface */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm font-medium">Suprafață</Label>
              <span className="text-sm font-bold text-primary">{surface} mp</span>
            </div>
            <Slider
              value={[surface]}
              onValueChange={([v]) => setSurface(v)}
              min={30}
              max={150}
              step={5}
              className="w-full"
              aria-label="Suprafață proprietate"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>30 mp</span>
              <span>150 mp</span>
            </div>
          </div>

          {/* Management tier */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Tier management</Label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              {TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  aria-pressed={selectedTier === tier.value}
                  onClick={() => setSelectedTier(tier.value)}
                  className={`flex-1 min-h-12 py-2.5 text-sm font-semibold transition-colors ${
                    selectedTier === tier.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Classic rent */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Chirie clasică estimată</p>
            <p className="text-2xl font-bold text-foreground">
              {calculations.classicRent.toLocaleString("ro-RO")} €<span className="text-sm font-normal text-muted-foreground">/lună</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ROI anual: {calculations.classicROI}%
            </p>
          </div>

          {/* RealTrust income */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-primary mb-1">Venit RealTrust estimat</p>
            <p className="text-2xl font-bold text-primary">
              {calculations.realtrustIncome.toLocaleString("ro-RO")} €<span className="text-sm font-normal text-muted-foreground">/lună</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ROI anual: {calculations.realtrustROI}%
            </p>
          </div>

          {/* Randament net de referință 9,4% */}
          <div className="bg-muted/20 border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">
              Estimare la randamentul net de referință RealTrust (9,4%)
            </p>
            <p className="text-xl font-bold text-foreground">
              {calculations.targetNetAnnual.toLocaleString("ro-RO")} €
              <span className="text-sm font-normal text-muted-foreground">/an net</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {calculations.targetNetMonthly.toLocaleString("ro-RO")} €/lună · ipoteze: ocupare 75%, deducere 27% (management, costuri, taxe)
            </p>
          </div>

          {/* Delta */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                calculations.monthlyDelta > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {calculations.monthlyDelta > 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {calculations.monthlyDelta > 0 ? "+" : ""}
              {calculations.monthlyDelta.toLocaleString("ro-RO")} €/lună
            </div>
            <span className="text-sm text-muted-foreground">diferență lunară</span>
          </div>

          {/* Chart */}
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString("ro-RO")} €/lună`, ""]}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CTA Card */}
      <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Descarcă proiecția completă</p>
          <p className="text-sm text-muted-foreground">
            Primești un raport detaliat cu estimări lunare și anuale personalizate.
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Download className="w-4 h-4 mr-2" />
              Vreau proiecția gratuită
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Proiecție ROI Personalizată</DialogTitle>
            </DialogHeader>
            {formSubmitted ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-foreground mb-1">Cerere trimisă cu succes!</p>
                <p className="text-sm text-muted-foreground">
                  Vei primi proiecția pe email în maxim 24 de ore.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="roi-name">Nume</Label>
                  <Input
                    id="roi-name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Numele tău"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="roi-phone">Telefon</Label>
                  <Input
                    id="roi-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="07XX XXX XXX"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="roi-email">Email</Label>
                  <Input
                    id="roi-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplu.ro"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Se trimite..." : "Vreau proiecția gratuită"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ROICalculatorWidget;
