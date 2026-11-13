import type { FiveYearProjection } from "@/lib/calculatorValuation";

const fmt = (n: number) => n.toLocaleString("ro-RO");

export function CalculatorFiveYear({ p, hasSale, language }: { p: FiveYearProjection; hasSale: boolean; language: "ro" | "en" }) {
  const ro = language === "ro";
  const rows = [
    ...(hasSale ? [{ key: "sale", label: ro ? "Vânzare azi (sumă încasată)" : "Sell today (amount received)", value: p.saleToday, bar: "bg-muted-foreground" }] : []),
    { key: "hotel", label: ro ? `Regim hotelier, ${p.years} ani` : `Short-term rental, ${p.years} years`, value: p.hotelTotal, bar: "bg-gradient-to-r from-gold-dark via-gold to-gold-light" },
    { key: "rent", label: ro ? `Chirie clasică, ${p.years} ani` : `Long-term rent, ${p.years} years`, value: p.classicTotal, bar: "bg-primary/60" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-background p-3 md:p-4">
      <p className="text-sm font-semibold text-foreground">{ro ? `Proiecție comparativă la ${p.years} ani` : `${p.years}-year comparison`}</p>
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{r.label}</span><span className="shrink-0 font-semibold text-foreground">{fmt(r.value)} €</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full transition-all duration-500 ${r.bar}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{ro ? "La închiriere păstrezi și proprietatea. Fără creșteri de preț sau indexări presupuse; venitul net e după administrare, înainte de impozite." : "When renting you also keep the property. No assumed price growth or indexation; net income is after management, before taxes."}</p>
    </div>
  );
}
