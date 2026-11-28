import { BookOpenText } from "lucide-react";
import { HOMEPAGE_PRERENDER_BODY } from "@/lib/prioritySeoContent";

/**
 * The same trusted, static Romanian copy used by the prerender. Keeping it in
 * an expandable guide avoids a long repeated scroll while leaving every fact
 * available to visitors and to non-JS crawlers.
 */
const HomepageSeoGuide = () => (
  <section className="container mx-auto px-6 pb-16" aria-labelledby="homepage-complete-guide">
    <details className="group rounded-xl border border-border bg-card p-5 md:p-6">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 font-semibold text-foreground marker:content-none">
        <BookOpenText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span id="homepage-complete-guide">Ghid complet: servicii, zone și randament în Timișoara</span>
        <span className="ml-auto text-xl text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div
        className="mt-6 max-w-4xl space-y-4 text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-4 hover:[&_a]:text-primary [&_article]:space-y-3 [&_h2]:pt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:pt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground"
        dangerouslySetInnerHTML={{ __html: HOMEPAGE_PRERENDER_BODY.replace(/ tabindex="-1"/g, "") }}
      />
    </details>
  </section>
);

export default HomepageSeoGuide;
