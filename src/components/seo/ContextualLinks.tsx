import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ContextualLink } from "@/lib/internalLinking";

interface ContextualLinksProps {
  title: string;
  intro?: string;
  links: ContextualLink[];
  className?: string;
  /** "grid" (default) for hub/detail pages, "list" for narrow content columns. */
  layout?: "grid" | "list";
}

/**
 * Contextual internal-links block ("continuă documentarea").
 * Purely presentational — the link selection lives in src/lib/internalLinking.ts.
 * Rendered as a semantic <nav> so crawlers and AI engines can read the
 * relationship between the current page and the cluster it belongs to.
 */
const ContextualLinks = ({
  title,
  intro,
  links,
  className = "",
  layout = "grid",
}: ContextualLinksProps) => {
  if (!links || links.length === 0) return null;

  return (
    <nav aria-label={title} className={`my-10 ${className}`}>
      <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1">{title}</h2>
      {intro && <p className="text-sm text-muted-foreground mb-4 max-w-2xl">{intro}</p>}
      <ul
        className={
          layout === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"
            : "space-y-2 mt-4"
        }
      >
        {links.map((l) => (
          <li key={l.href}>
            <Link
              to={l.href}
              className="group flex items-start gap-2 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              <span>
                <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {l.label}
                </span>
                {l.description && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{l.description}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ContextualLinks;
