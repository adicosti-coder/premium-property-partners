import { Check, X, ClipboardCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import type { NeighborhoodProfile } from "@/data/neighborhoodProfiles";

/**
 * Long-form, zone-specific editorial profile rendered on the neighborhood
 * pages. Purely presentational — every fact lives in
 * src/data/neighborhoodProfiles.ts so the content stays auditable.
 *
 * The leading Q&A block reuses the `.ai-quote` convention (see AIQuoteBlock)
 * so AI engines can lift a standalone 40–100 word answer.
 */
const NeighborhoodProfileSection = ({ profile }: { profile: NeighborhoodProfile }) => (
  <div className="mb-12">
    <section
      className="ai-quote my-8 rounded-xl border-l-4 border-accent bg-muted/40 p-5"
      aria-label={profile.geoQuestion}
      itemScope
      itemType="https://schema.org/Question"
    >
      <h2 className="text-base font-semibold text-foreground" itemProp="name">
        {profile.geoQuestion}
      </h2>
      <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
        <blockquote className="mt-2 text-sm leading-relaxed text-foreground/90" itemProp="text">
          {profile.geoAnswer}
        </blockquote>
      </div>
    </section>

    {profile.sections.map((s) => (
      <section key={s.heading} className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-3">{s.heading}</h2>
        <div className="space-y-3 max-w-3xl">
          {s.paragraphs.map((p, i) => (
            <p key={i} className="text-sm md:text-base leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
      </section>
    ))}

    <div className="grid gap-5 md:grid-cols-2 mb-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Avantajele zonei
        </h2>
        <ul className="space-y-2">
          {profile.pros.map((p) => (
            <li key={p} className="text-sm text-muted-foreground leading-relaxed">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <X className="w-4 h-4 text-destructive" aria-hidden="true" />
          Dezavantajele zonei
        </h2>
        <ul className="space-y-2">
          {profile.cons.map((c) => (
            <li key={c} className="text-sm text-muted-foreground leading-relaxed">
              {c}
            </li>
          ))}
        </ul>
      </section>
    </div>

    <section className="rounded-xl border border-border bg-secondary/40 p-5 mb-8">
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-primary" aria-hidden="true" />
        Ce verifici înainte de cumpărare
      </h2>
      <ol className="space-y-2 list-decimal pl-5">
        {profile.checklist.map((c) => (
          <li key={c} className="text-sm text-muted-foreground leading-relaxed">
            {c}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Ai nevoie de o verificare pe o adresă concretă? Cere o{" "}
        <Link to="/evaluare-gratuita" className="text-primary underline underline-offset-2">
          evaluare gratuită a proprietății
        </Link>
        .
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
        Potențial investițional
      </h2>
      <div className="space-y-3 max-w-3xl">
        {profile.investment.map((p, i) => (
          <p key={i} className="text-sm md:text-base leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Ipoteze publice folosite în analizele noastre: ocupare 75%, deducere operațională 27%,
        randament net de referință 9,4%. Prețul mediu pe metru pătrat afișat pe această pagină este
        un indice intern RealTrust, nu o cotație oficială de piață. Verifică scenariul tău în{" "}
        <Link to="/calculator-roi" className="text-primary underline underline-offset-2">
          analiza de randament
        </Link>
        .
      </p>
    </section>

    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-4">
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
        Riscuri de luat în calcul
      </h2>
      <ul className="space-y-2">
        {profile.risks.map((r) => (
          <li key={r} className="text-sm text-muted-foreground leading-relaxed">
            {r}
          </li>
        ))}
      </ul>
    </section>
  </div>
);

export default NeighborhoodProfileSection;
