import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AutoConsentedListings from "@/components/admin/AutoConsentedListings";
import RevokedListingsPanel from "@/components/admin/RevokedListingsPanel";

/**
 * Ecran dedicat acordurilor de publicare primite pe WhatsApp.
 *
 * Este același view ca subtab-ul „Anunțuri Preluate Automat" din Pipeline Prospecți,
 * dar are rută proprie (/admin/anunturi-preluate), ca să poată fi accesat direct
 * din meniu lateral, atât pe desktop, cât și pe mobil.
 */
export default function AutoConsentedListingsPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Anunțurile pentru care proprietarul a răspuns „DA" pe WhatsApp și starea publicării pe realtrust.ro.
        <Link
          to="/admin/unified-pipeline?section=prospects&subtab=preluate"
          className="ml-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Deschide în Pipeline Prospecți
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>

      <AutoConsentedListings />
      <RevokedListingsPanel />
    </div>
  );
}
