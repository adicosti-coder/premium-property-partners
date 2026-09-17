import { Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Transparency note for the yield calculator.
 *
 * Spells out the full equation behind the estimated 9.4% net ROI so an owner
 * can reconcile the number with their own math. Each cost is listed exactly
 * once (no double counting):
 *  - Property Management RealTrust: 15-25% of revenue, depending on the package
 *    (same range as the pricing page);
 *  - platform commissions, income tax and consumables are separate costs;
 *  - cleaning fee is paid separately by the guest (not deducted from the owner);
 *  - fixed utilities are subtracted afterwards, so 9.4% is genuinely net.
 */
const YieldTransparencyNote = ({ className = "" }: { className?: string }) => {
  const { language } = useLanguage();
  const ro = language !== "en";

  const rows = ro
    ? [
        {
          title: "Property Management RealTrust — 15-25% din încasări, în funcție de pachet",
          body:
            "Acoperă administrarea completă: listarea și optimizarea prețurilor, comunicarea cu oaspeții, check-in digital, coordonarea curățeniei și raportarea lunară.",
        },
        {
          title: "Comisioanele platformelor, impozitul și consumabilele — costuri separate",
          body:
            "Booking, Airbnb și Expedia își rețin propriul comision din încasări, la care se adaugă impozitul pe venit și consumabilele (produse de igienă, cafea, sare, ulei, lenjerie).",
        },
        {
          title: "Taxa de curățenie — achitată separat de oaspeți",
          body:
            "Curățenia dintre rezervări este facturată oaspetelui la momentul rezervării, deci nu se scade din venitul tău.",
        },
        {
          title: "Utilități & cheltuieli fixe — scăzute ulterior",
          body:
            "Cheltuielile fixe (utilități, internet, întreținere) se scad la final, astfel încât 9,4% rămâne venit curat (net), nu brut.",
        },
      ]
    : [
        {
          title: "RealTrust Property Management — 15-25% of revenue, depending on the package",
          body:
            "Covers full management: listing and price optimisation, guest communication, digital check-in, cleaning coordination and monthly reporting.",
        },
        {
          title: "Platform commissions, income tax and consumables — separate costs",
          body:
            "Booking, Airbnb and Expedia keep their own commission from revenue, on top of effective income tax and consumables (toiletries, coffee, salt, oil, linen).",
        },
        {
          title: "Cleaning fee — paid separately by guests",
          body:
            "Turnover cleaning is charged to the guest at booking time, so it is not deducted from your revenue.",
        },
        {
          title: "Utilities & fixed costs — subtracted afterwards",
          body:
            "Fixed costs (utilities, internet, maintenance) are subtracted at the end, so 9.4% is genuinely net income, not gross.",
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
          ? "Ipoteze publice folosite în simulare: ocupare 75%. Cifra finală pentru apartamentul tău se stabilește după evaluare."
          : "Public assumptions used in the simulation: 75% occupancy. Your final figure is set after the valuation."}
      </p>
    </aside>
  );
};

export default YieldTransparencyNote;
