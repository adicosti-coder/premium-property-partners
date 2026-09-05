import { useLanguage } from "@/i18n/LanguageContext";
import { ENTITY_ANSWER, ENTITY_HEADING } from "@/lib/entityDefinition";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

interface EntityDefinitionBlockProps {
  /** Kept for API compatibility; the schema no longer needs a per-page @id. */
  pagePath?: string;
  /** Contribute the Q&A to the page's single FAQPage node. */
  withSchema?: boolean;
  /** Heading level so the block fits each page's semantic hierarchy. */
  as?: "h2" | "h3";
  className?: string;
}

/**
 * ENTITY SEO / GEO block — the canonical, self-contained answer to
 * "Ce este RealTrust?". Rendered identically on the homepage, /despre-noi,
 * /contact and /pentru-proprietari so search and AI engines resolve one
 * unambiguous company entity. Text comes from src/lib/entityDefinition.ts —
 * never re-write it inline.
 */
const EntityDefinitionBlock = ({
  pagePath = "/",
  withSchema = true,
  as: Heading = "h2",
  className = "",
}: EntityDefinitionBlockProps) => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";
  void pagePath;

  // The visible Q&A joins the page's single consolidated FAQPage node instead
  // of emitting a second FAQPage on the same URL.
  useRegisterFAQs(
    "entity-definition",
    withSchema
      ? [{ question: ENTITY_HEADING[lang], answer: ENTITY_ANSWER[lang] }]
      : [],
  );

  return (
    <section
      className={`ai-quote rounded-xl border-l-4 border-accent bg-muted/40 p-6 ${className}`}
      aria-labelledby="ce-este-realtrust"
    >
      <Heading
        id="ce-este-realtrust"
        className="text-xl font-serif font-semibold text-foreground"
      >
        {ENTITY_HEADING[lang]}
      </Heading>
      <p className="mt-3 max-w-3xl text-sm md:text-base leading-relaxed text-foreground/90">
        {ENTITY_ANSWER[lang]}
      </p>
    </section>
  );
};

export default EntityDefinitionBlock;
