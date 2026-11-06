import { useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, MessageCircle, Download } from "lucide-react";
import { calculateManagedIncome, MANAGEMENT_POLICY } from "@/lib/managementPolicy";

const fmt = (n: number) => Math.round(n).toLocaleString("ro-RO");

const Field = ({ id, label, value, onChange, min, max, step, suffix }: { id: string; label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; suffix: string }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Input id={id} type="number" inputMode="decimal" value={value} min={min} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-10 w-28 text-right font-semibold tabular-nums" />
        <span className="w-6 text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
    <Slider value={[Math.min(max, Math.max(min, value))]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
  </div>
);

const InvestmentYieldCalculator = () => {
  const { language } = useLanguage();
  const ro = language === "ro";
  const [pret, setPret] = useState(95000);
  const [renovare, setRenovare] = useState(5000);
  const [nightlyRate, setNightlyRate] = useState(50);
  const [occupancyPct, setOccupancyPct] = useState<number>(MANAGEMENT_POLICY.occupancyDefault * 100);

  // Formula dedicată (neschimbată): canale 15%, utilități 120 €, administrare 20%, impozit ilustrativ 7%.
  const investitieTotala = pret + renovare;
  const monthlyGross = nightlyRate * 30 * (occupancyPct / 100);
  const managed = calculateManagedIncome({ gross: monthlyGross, channelFees: monthlyGross * .15, utilities: 120 });
  const venitAnual = managed.ownerIncome * 12 * .93;
  const yieldAnual = investitieTotala > 0 ? (venitAnual / investitieTotala) * 100 : 0;
  const aniAmortizare = venitAnual > 0 ? investitieTotala / venitAnual : 0;

  const breakdown = [
    [ro ? "Venit brut anual" : "Annual gross", managed.gross * 12, false],
    [ro ? "Comisioane platforme (15%)" : "Channel fees (15%)", managed.channelFees * 12, true],
    [ro ? "Utilități estimate" : "Estimated utilities", managed.utilities * 12, true],
    [ro ? "Administrare (20% din net)" : "Management (20% of net)", managed.managementFee * 12, true],
    [ro ? "Impozit ilustrativ (7%)" : "Illustrative tax (7%)", managed.ownerIncome * 12 * .07, true],
  ] as const;

  const years = useMemo(() => Array.from({ length: 10 }, (_, i) => venitAnual * (i + 1)), [venitAnual]);
  const maxBar = Math.max(investitieTotala, years[9] || 0, 1);

  const handleWhatsApp = useCallback(() => {
    const msg = `Bună ziua! Am simulat un randament imobiliar pe RealTrust.ro:\n- Randament: ${yieldAnual.toFixed(2)}%\n- Amortizare: ${aniAmortizare.toFixed(1)} ani\n- Pagina: ${window.location.origin}${window.location.pathname}`;
    window.open(`https://wa.me/40799069256?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }, [yieldAnual, aniAmortizare]);

  const handleDownload = useCallback(() => {
    const text = [
      "RealTrust | Analiză Investiție — Regim Hotelier",
      "═══════════════════════════════",
      `Preț Achiziție: ${pret.toLocaleString()} €`,
      `Mobilare/Renovare: ${renovare.toLocaleString()} €`,
      `Investiție Totală: ${investitieTotala.toLocaleString()} €`,
      `Tarif/Noapte: ${nightlyRate} €`,
      `Grad Ocupare: ${occupancyPct}%`,
      `Venit Brut Lunar: ${Math.round(monthlyGross).toLocaleString()} €`,
      "───────────────────────────────",
      `Randament Anual (Yield): ${yieldAnual.toFixed(2)}%`,
      `Amortizare: ${aniAmortizare.toFixed(1)} ani`,
      `Profit Net Estimat: ${Math.round(venitAnual).toLocaleString()} € / an`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Analiza-Investitie-RealTrust.txt";
    link.click();
  }, [pret, renovare, investitieTotala, nightlyRate, occupancyPct, monthlyGross, yieldAnual, aniAmortizare, venitAnual]);

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5">
          <div className="border-b border-border px-5 py-6 md:px-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              {ro ? "Calculator randament · rezultat pe loc" : "Yield calculator · instant result"}
            </span>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground md:text-3xl">
              {ro ? "Cât randament aduce o achiziție în regim hotelier?" : "What yield does a hotel-regime purchase deliver?"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {ro ? "Modifică prețul, investiția, tariful sau ocuparea — cifrele se actualizează imediat." : "Change price, investment, rate or occupancy — figures update instantly."}
            </p>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="space-y-7 px-5 py-6 md:px-10 md:py-8">
              <Field id="calc-pret" label={ro ? "Preț achiziție" : "Purchase price"} value={pret} onChange={setPret} min={30000} max={400000} step={1000} suffix="€" />
              <Field id="calc-renovare" label={ro ? "Mobilare / renovare" : "Furnishing / renovation"} value={renovare} onChange={setRenovare} min={0} max={60000} step={500} suffix="€" />
              <Field id="calc-nightly" label={ro ? "Tarif mediu pe noapte" : "Average nightly rate"} value={nightlyRate} onChange={setNightlyRate} min={20} max={250} step={1} suffix="€" />
              <Field id="calc-occupancy" label={ro ? "Grad de ocupare" : "Occupancy rate"} value={occupancyPct} onChange={(n) => setOccupancyPct(Math.min(100, Math.max(0, n)))} min={0} max={100} step={1} suffix="%" />
              <p className="text-xs text-muted-foreground">Ipoteze: canale 15%, utilități estimate 120 €/lună, administrare 20% din net, impozit ilustrativ 7% după administrare. Menaj separat suportat de oaspete. Ajustarea fiscală depinde de situația proprietarului.</p>
            </div>

            <aside aria-live="polite" className="border-t border-border bg-muted/40 px-5 py-6 md:px-8 lg:sticky lg:top-24 lg:self-start lg:border-l lg:border-t-0">
              <p className="text-sm text-muted-foreground">{ro ? "Randament anual net" : "Net annual yield"}</p>
              <p className="mt-1 font-serif text-5xl font-semibold tabular-nums text-primary">{yieldAnual.toFixed(2)}%</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{ro ? "Amortizare" : "Payback"}</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{aniAmortizare.toFixed(1)} {ro ? "ani" : "yrs"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{ro ? "Profit net / an" : "Net profit / yr"}</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{fmt(venitAnual)} €</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{ro ? "Profit cumulat pe 10 ani vs investiția totală" : "Cumulative profit over 10 years vs total investment"}</p>
                <div className="relative flex h-28 items-end gap-1" role="img" aria-label={ro ? `După 10 ani: ${fmt(years[9])} € față de investiția de ${fmt(investitieTotala)} €` : `After 10 years: €${fmt(years[9])} vs €${fmt(investitieTotala)} invested`}>
                  <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/40" style={{ bottom: `${(investitieTotala / maxBar) * 100}%` }} />
                  {years.map((v, i) => (
                    <div key={i} className={`flex-1 rounded-t ${v >= investitieTotala ? "bg-primary" : "bg-primary/35"}`} style={{ height: `${Math.max(2, (v / maxBar) * 100)}%` }} />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{ro ? "An 1" : "Yr 1"}</span><span>{ro ? "An 10" : "Yr 10"}</span></div>
              </div>

              <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                {breakdown.map(([label, val, minus]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular-nums text-foreground">{minus ? "−" : ""}{fmt(val)} €</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
                  <dt>{ro ? "Profit net anual" : "Net annual profit"}</dt>
                  <dd className="tabular-nums text-primary">{fmt(venitAnual)} €</dd>
                </div>
              </dl>

              <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button onClick={handleWhatsApp} size="lg" className="min-h-12">
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  {ro ? "Trimite pe WhatsApp" : "Send via WhatsApp"}
                </Button>
                <Button onClick={handleDownload} variant="outline" size="lg" className="min-h-12">
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  {ro ? "Descarcă rezumat" : "Download summary"}
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InvestmentYieldCalculator;
