import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { List, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleTableOfContentsProps {
  htmlContent: string;
  className?: string;
}

const translations = {
  ro: { title: "Cuprins", show: "Arată cuprinsul", hide: "Ascunde cuprinsul" },
  en: { title: "Table of Contents", show: "Show contents", hide: "Hide contents" },
};

const ArticleTableOfContents = ({ htmlContent, className }: ArticleTableOfContentsProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ro;
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeId, setActiveId] = useState<string>("");

  const headings = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const elements = doc.querySelectorAll("h2, h3");
    const items: TOCItem[] = [];

    elements.forEach((el, index) => {
      const text = el.textContent?.trim() || "";
      if (text) {
        const id = `heading-${index}-${text.toLowerCase().replace(/[^a-zăâîșț0-9]/gi, "-").replace(/-+/g, "-").slice(0, 50)}`;
        items.push({
          id,
          text,
          level: el.tagName === "H2" ? 2 : 3,
        });
      }
    });

    return items;
  }, [htmlContent]);

  // Inject IDs into actual DOM headings after render
  useEffect(() => {
    const articleEl = document.querySelector(".prose");
    if (!articleEl) return;

    const elements = articleEl.querySelectorAll("h2, h3");
    let idx = 0;
    elements.forEach((el) => {
      const text = el.textContent?.trim() || "";
      if (text && idx < headings.length) {
        el.id = headings[idx].id;
        idx++;
      }
    });
  }, [headings, htmlContent]);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav
      aria-label={t.title}
      className={cn(
        "my-8 rounded-xl border border-border bg-muted/30 p-5",
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <List className="h-4 w-4 text-primary" />
          {t.title}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <ol className="mt-4 space-y-1 text-sm" role="list">
          {headings.map((item) => (
            <li
              key={item.id}
              className={cn(
                item.level === 3 && "ml-4",
              )}
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveId(item.id);
                  }
                }}
                className={cn(
                  "block rounded-md px-3 py-1.5 transition-colors hover:bg-primary/10 hover:text-primary",
                  activeId === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
};

export default ArticleTableOfContents;
