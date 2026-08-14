import { Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Transparency note for the yield calculator.
 *
 * Spells out the full equation behind the advertised 9.4% net ROI so an owner
 * can reconcile the number with their own math:
 *  - 27% operational deduction (platform commissions + effective income tax +
 *    consumables);
 *  - cleaning fee is paid separately by the guest (not deducted from the owner);
 *  - fixed utilities and the management commission are subtracted afterwards,
 *    so the 9.4% figure is genuinely net.
 */
const YieldTransparencyNote = ({ className = "" }: { className?: string }) => {
  const { language } = useLanguage();
  const ro = language !== "en";

  const rows = ro
    ? [
        {
          title: "Deduceri operaționale — 27%",
          body:
            "Include comisioanele platformelor (Booking, Airbnb, Expedia), impozitul efectiv pe venit și consumabilele (produse de igienă, cafea, sare, ulei, lenjerie).",
        },
        {
          title: "Taxa de curățenie — achitată separat de oaspeți",
          body:
            "Curățenia dintre rezervări este facturată oaspetelui la momentul rezervării, deci nu se scade din venitul tău.",
        },
        {
          title: "Utilități & comision de administrare — scăzute ulterior",
          body:
            "Cheltuielile fixe (utilități, internet, întreținere) și comisionul de administrare se scad după deducerea de 27%, astfel încât 9,4% rămâne venit curat (net), nu brut.",
        },
      ]
    : [
        {
          title: "Operational deductions — 27%",
          body:
            "Covers platform commissions (Booking, Airbnb, Expedia), effective income tax and consumables (toiletries, coffee, salt, oil, linen).",
        },
        {
          title: "Cleaning fee — paid separately by guests",
          body:
            "Turnover cleaning is charged to the guest at booking time, so it is not deducted from your revenue.",
        },
        {
          title: "Utilities & management fee — subtracted afterwards",
          body:
            "Fixed costs (utilities, internet, maintenance) and the management commission are subtracted after the 27% deduction, so 9.4% is genuinely net income, not gross.",
        },
      ];

  return (
    <aside
      className={`rounded-xl border border-border bg-secondary/40 p-5 ${className}`}
      aria-label={ro ? "Cum se calculează randamentul net" : "How the net yield is calculated"}
    >
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">
          {ro ? "Cum ajungem la 9,4% net — ecuația completă" : "How we reach 9.4% net — the full equation"}
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
          ? "Ipoteze publice folosite în simulare: ocupare 75%, deducere operațională 27%. Cifra finală pentru apartamentul tău se stabilește după evaluare."
          : "Public assumptions used in the simulation: 75% occupancy, 27% operational deduction. Your final figure is set after the valuation."}
      </p>
    </aside>
  );
};

export default YieldTransparencyNote;
