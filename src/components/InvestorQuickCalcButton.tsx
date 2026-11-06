import { Calculator } from "lucide-react";
import { requestInlineCalculator } from "@/lib/inlineCalculatorTrigger";

/** Discreet floating trigger for the quick investor calculator (investor pages only). */
const InvestorQuickCalcButton = () => (
  <button
    type="button"
    onClick={requestInlineCalculator}
    aria-label="Calcul rapid randament"
    className="fixed bottom-24 left-4 z-40 flex min-h-12 items-center gap-2 rounded-full border border-primary/30 bg-card px-4 text-sm font-semibold text-primary shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground md:bottom-8"
  >
    <Calculator className="h-5 w-5" aria-hidden="true" />
    <span>Calcul rapid randament</span>
  </button>
);

export default InvestorQuickCalcButton;
