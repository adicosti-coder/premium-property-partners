import { Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/** Describes the income simulation; no invested-capital denominator is supplied. */
const YieldTransparencyNote = ({ className = "" }: { className?: string }) => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const rows = ro ? [
    { title: "Venit brut", body: "Tariful mediu pe noapte înmulțit cu nopțile ocupate din luna simulată." },
    { title: "Costuri incluse", body: "Se scad comisionul platformei introdus, comisionul de administrare din baza netă și curățenia introdusă pentru fiecare sejur." },
    { title: "Costuri neincluse", body: "Utilitățile sunt 0 € în această simulare; impozitele, consumabilele, reparațiile și alte costuri nu sunt scăzute." },
    { title: "Randament", body: "Nu este introdusă valoarea proprietății sau capitalul investit, deci nu se calculează un procent de randament." },
  ] : [
    { title: "Gross revenue", body: "Average nightly rate multiplied by occupied nights in the simulated month." },
    { title: "Included costs", body: "The entered platform fee, management fee on the net base and entered cleaning cost per stay are deducted." },
    { title: "Excluded costs", body: "Utilities are €0 in this simulation; taxes, consumables, repairs and other costs are not deducted." },
    { title: "Yield", body: "No property value or invested capital is supplied, so no yield percentage is calculated." },
  ];

  return (
    <aside
      className={`rounded-xl border border-border bg-secondary/40 p-5 ${className}`}
      aria-label={ro ? "Ce include simularea" : "What the simulation includes"}
    >
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">
          {ro ? "Ce include această simulare" : "What this simulation includes"}
        </h3>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.title} className="text-xs leading-relaxed text-foreground/75">
            <span className="font-semibold text-foreground">{r.title}. </span>
            {r.body}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {ro
          ? "Ocuparea pornește de la 70% și poate fi modificată. Rezultatul este o estimare individuală, nu un rezultat istoric."
          : "Occupancy starts at 70% and can be changed. The result is an individual estimate, not a historical result."}
      </p>
    </aside>
  );
};

export default YieldTransparencyNote;
