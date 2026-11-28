import { BookOpenText } from "lucide-react";
import { getLowScorePageSeo } from "@/lib/lowScorePageSeo";

/**
 * Ghidul complet al paginii, cu același text ca prerandarea. Este pliabil ca să
 * nu lungească pagina, dar rămâne accesibil vizitatorilor și crawlerelor.
 */
const PageSeoGuide = ({ path, label = "Ghid complet: zone, costuri și pașii următori în Timișoara" }: { path: string; label?: string }) => {
  const guide = getLowScorePageSeo(path);
  if (!guide) return null;
  return (
    <section className="container mx-auto px-6 py-12" aria-labelledby="page-complete-guide">
      <details className="group rounded-xl border border-border bg-card p-5 md:p-6">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 font-semibold text-foreground marker:content-none">
          <BookOpenText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span id="page-complete-guide">{label}</span>
          <span className="ml-auto text-xl text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div
          className="mt-6 max-w-4xl space-y-4 text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-4 hover:[&_a]:text-primary [&_h2]:pt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:pt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground"
          dangerouslySetInnerHTML={{ __html: guide.body.replace(/ tabindex="-1"/g, "") }}
        />
      </details>
    </section>
  );
};

export default PageSeoGuide;
