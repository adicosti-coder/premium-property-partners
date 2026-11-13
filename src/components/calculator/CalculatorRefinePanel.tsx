import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { REFINEMENTS, type RefinementKey, type Refinements } from "@/lib/calculatorRefinements";

interface Props {
  value: Refinements;
  onChange: (next: Refinements) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "ro" | "en";
  preselectedFromPhotos?: boolean;
}

const pct = (v: number) => `+${Math.round(v * 100)}%`;

export function CalculatorRefinePanel({ value, onChange, open, onOpenChange, language, preselectedFromPhotos }: Props) {
  const ro = language === "ro";
  const active = REFINEMENTS.filter((r) => value[r.key]).length;
  const toggle = (key: RefinementKey, checked: boolean) => onChange({ ...value, [key]: checked });
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-2xl border border-border bg-background">
      <CollapsibleTrigger className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          {ro ? "Rafinează estimarea" : "Refine the estimate"}
          {active > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{active}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 px-4 pb-4">
        {REFINEMENTS.map((r) => {
          const id = `uc-refine-${r.key}`;
          return (
            <label key={r.key} htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-sm text-foreground">
              <Checkbox id={id} checked={value[r.key]} onCheckedChange={(c) => toggle(r.key, c === true)} className="h-5 w-5" />
              <span className="flex-1">
                <span className="block font-medium">{r[language]}</span>
                <span className="block text-xs text-muted-foreground">
                  {ro ? "Vânzare" : "Sale"} {pct(r.sale)} · {ro ? "tarif/noapte" : "nightly rate"} {pct(r.nightly)}{r.occupancy > 0 ? ` · ${ro ? "ocupare" : "occupancy"} +${Math.round(r.occupancy * 100)} ${ro ? "puncte" : "pts"}` : ""}
                </span>
              </span>
            </label>
          );
        })}
        {preselectedFromPhotos && <p className="pt-1 text-xs text-muted-foreground">{ro ? "Am bifat mobilarea din analiza foto; o poți debifa." : "Furnishing was ticked from the photo analysis; you can untick it."}</p>}
        <p className="pt-1 text-xs text-muted-foreground">{ro ? "Ocuparea rămâne în intervalul realist 65–75%." : "Occupancy stays within the realistic 65–75% range."}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
