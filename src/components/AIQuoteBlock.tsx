import { useLanguage } from "@/i18n/LanguageContext";

/**
 * GEO (Generative Engine Optimization) block.
 *
 * Short, self-contained question + 2-3 sentence factual answer that LLMs
 * (ChatGPT, Claude, Perplexity, Google AI Overviews) can lift verbatim.
 * The `.ai-quote` class is also targeted by Speakable schema.
 *
 * Rules: keep answers factual and consistent with /llms.txt — no claims that
 * are not published elsewhere on the site.
 */

interface AIQuoteBlockProps {
  questionRo: string;
  questionEn: string;
  answerRo: string;
  answerEn: string;
}

const AIQuoteBlock = ({ questionRo, questionEn, answerRo, answerEn }: AIQuoteBlockProps) => {
  const { language } = useLanguage();
  const isEn = language === "en";
  const question = isEn ? questionEn : questionRo;
  const answer = isEn ? answerEn : answerRo;

  return (
    <section
      className="ai-quote my-8 rounded-xl border-l-4 border-accent bg-muted/40 p-5"
      aria-label={question}
      itemScope
      itemType="https://schema.org/Question"
    >
      <h2 className="text-base font-semibold text-foreground" itemProp="name">
        {question}
      </h2>
      <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
        <blockquote className="mt-2 text-sm leading-relaxed text-foreground/90" itemProp="text">
          {answer}
        </blockquote>
      </div>
    </section>
  );
};

export default AIQuoteBlock;
