import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ENTITY_ANSWER,
  ENTITY_HEADING,
  buildEntityQuestionSchema,
} from "@/lib/entityDefinition";
import { SITE_ORIGIN } from "@/lib/orgIdentity";

interface EntityDefinitionBlockProps {
  /** Path of the hosting page, used for the Question schema @id. */
  pagePath?: string;
  /** Emit the Question/Answer JSON-LD. Keep true on one block per page. */
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
  const pageUrl = `${SITE_ORIGIN}${pagePath === "/" ? "/" : pagePath}`;

  return (
    <section
      className={`ai-quote rounded-xl border-l-4 border-accent bg-muted/40 p-6 ${className}`}
      aria-labelledby="ce-este-realtrust"
    >
      {withSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(buildEntityQuestionSchema(pageUrl, lang))}
          </script>
        </Helmet>
      )}
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
