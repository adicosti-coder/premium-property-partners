import { BedDouble, Home, KeyRound } from "lucide-react";
import type { SaleEstimate, SaleTier } from "@/lib/calculatorValuation";
import { YIELD_RANGE } from "@/lib/calculatorValuation";

interface Props {
  language: "ro" | "en";
  sale: SaleEstimate | null;
  saleSample?: number;
  classicRent: number;
  rentNote: string;
  netMin: number;
  netMax: number;
  netMid: number;
  yieldDisplay: { kind: "exact"; value: number } | { kind: "range" };
}

const fmt = (n: number) => n.toLocaleString("ro-RO");

export function saleTierLabel(tier: SaleTier, language: "ro" | "en", sample?: number): string {
  const ro = language === "ro";
  if (tier === "listings") return ro ? `mediana a ${sample ?? "peste 5"} anunțuri recente din zonă` : `median of ${sample ?? "5+"} recent local listings`;
  if (tier === "index") return ro ? "indice public de piață Timișoara" : "public Timișoara market index";
  return ro ? "grilă orientativă RealTrust pe cartier" : "RealTrust indicative district grid";
}

export function CalculatorEstimateCards({ language, sale, saleSample, classicRent, rentNote, netMin, netMax, netMid, yieldDisplay }: Props) {
  const ro = language === "ro";
  const yieldText = yieldDisplay.kind === "exact"
    ? `${yieldDisplay.value.toLocaleString("ro-RO")}% ${ro ? "net/an" : "net/yr"}`
    : ro ? `calcul individual · interval tipic ${String(YIELD_RANGE.min).replace(".", ",")}–${String(YIELD_RANGE.max).replace(".", ",")}%` : `individual calculation · typical ${YIELD_RANGE.min}–${YIELD_RANGE.max}%`;
  return (
    <div className="grid gap-2 md:gap-3">
      <div className="rounded-2xl border border-border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><Home className="h-4 w-4 text-primary" aria-hidden="true" />{ro ? "Valoare estimată de vânzare" : "Estimated sale value"}</p>
        {sale ? (
          <>
            <p className="mt-1 font-serif text-2xl font-semibold text-foreground">{fmt(sale.min)} – {fmt(sale.max)} €</p>
            <p className="text-xs text-muted-foreground">~{fmt(sale.eurSqm)} €/mp · {saleTierLabel(sale.tier, language, saleSample)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{ro ? "Pentru acest tip sau această localitate facem o evaluare individuală, pe comparabile." : "For this type or location we prepare an individual, comparable-based valuation."}</p>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />{ro ? "Chirie clasică" : "Long-term rent"}</p>
        <p className="mt-1 font-serif text-2xl font-semibold text-foreground">~{fmt(classicRent)} €<span className="text-sm font-normal text-muted-foreground">/{ro ? "lună" : "mo"}</span></p>
        <p className="text-xs text-muted-foreground">{rentNote}</p>
      </div>
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 md:p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><BedDouble className="h-4 w-4" aria-hidden="true" />{ro ? "Regim hotelier · venit net" : "Short-term rental · net income"}</p>
        <p className="mt-1 font-serif text-3xl font-semibold text-foreground md:text-4xl">{fmt(netMin)}–{fmt(netMax)} €<span className="text-sm font-normal text-muted-foreground">/{ro ? "lună" : "mo"}</span></p>
        <p className="text-xs text-muted-foreground">≈ {fmt(netMid * 12)} € / {ro ? "an" : "year"} · {ro ? "randament" : "yield"}: <span className="font-medium text-foreground">{yieldText}</span></p>
      </div>
    </div>
  );
}
