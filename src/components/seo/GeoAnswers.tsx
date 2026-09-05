import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { geoAnswersFor, type GeoAnswerGroup } from "@/data/geoAnswers";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

interface GeoAnswersProps {
  group: GeoAnswerGroup;
  title: string;
  intro?: string;
  className?: string;
}

/**
 * Visible "direct answers" block for GEO (AI search) — never schema-only.
 *
 * The questions live in src/data/geoAnswers.ts; this component renders them as
 * readable text with an <h3> per question (so answers are extractable) and
 * registers them with the central FAQPage provider, which deduplicates
 * questions across the page.
 */
const GeoAnswers = ({ group, title, intro, className = "" }: GeoAnswersProps) => {
  const answers = geoAnswersFor(group);

  useRegisterFAQs(
    `geo-answers-${group}`,
    answers.map((a) => ({ question: a.question, answer: a.answer })),
  );

  if (answers.length === 0) return null;

  return (
    <section className={`my-12 ${className}`} aria-labelledby={`geo-answers-${group}`}>
      <h2
        id={`geo-answers-${group}`}
        className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-2"
      >
        {title}
      </h2>
      {intro && <p className="text-sm text-muted-foreground mb-6 max-w-3xl">{intro}</p>}

      <div className="space-y-4">
        {answers.map((a) => (
          <article
            key={a.id}
            id={a.id}
            className="rounded-xl border border-border bg-card p-5 scroll-mt-28"
          >
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">
              {a.question}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{a.answer}</p>
            {a.source && (
              <Link
                to={a.source.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {a.source.label}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default GeoAnswers;
