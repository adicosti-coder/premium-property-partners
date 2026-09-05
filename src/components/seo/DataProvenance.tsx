import { Info } from "lucide-react";

interface DataProvenanceProps {
  /** Externally sourced data, each item ideally naming the source. */
  external?: string[];
  /** RealTrust working assumptions (never presented as market data). */
  assumptions?: string[];
  /** Derived calculations / scenarios built on the two lists above. */
  calculations?: string[];
  /** Human-readable date the figures on the page were last checked. */
  verifiedOn: string;
  className?: string;
}

/**
 * Visible provenance box: separates EXTERNAL DATA vs. REALTRUST ASSUMPTIONS vs.
 * CALCULATIONS / SCENARIOS, and states when the figures were last verified.
 *
 * Deliberately rendered as readable text (not only structured data) so both
 * users and AI engines can tell which numbers are measured and which ones are
 * modelled.
 */
const DataProvenance = ({
  external,
  assumptions,
  calculations,
  verifiedOn,
  className = "",
}: DataProvenanceProps) => (
  <aside
    className={`rounded-xl border border-border bg-secondary/40 p-5 ${className}`}
    aria-label="Surse, ipoteze și metodologie"
  >
    <div className="flex gap-3">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
        <p className="text-foreground font-semibold">Surse, ipoteze și metodologie</p>

        {external && external.length > 0 && (
          <div>
            <p className="text-foreground font-medium">Date externe</p>
            <ul className="list-disc pl-4 space-y-1 mt-1">
              {external.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {assumptions && assumptions.length > 0 && (
          <div>
            <p className="text-foreground font-medium">Ipoteze RealTrust</p>
            <ul className="list-disc pl-4 space-y-1 mt-1">
              {assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {calculations && calculations.length > 0 && (
          <div>
            <p className="text-foreground font-medium">Calcule și scenarii</p>
            <ul className="list-disc pl-4 space-y-1 mt-1">
              {calculations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <p>
          <strong className="text-foreground">Verificat la:</strong> {verifiedOn}. Valorile
          dependente de piață, taxe sau legislație se pot schimba; nu afișăm cifre fără sursă sau
          fără ipoteza de calcul indicată.
        </p>
      </div>
    </div>
  </aside>
);

export default DataProvenance;
