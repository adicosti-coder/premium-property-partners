import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from "react";
import { Helmet } from "react-helmet-async";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaContextValue {
  /** Register FAQ items from a component. Returns an unregister function. */
  registerFAQs: (sourceId: string, items: FAQItem[]) => () => void;
}

const FAQSchemaContext = createContext<FAQSchemaContextValue | null>(null);

/**
 * Provider that collects FAQ items from all children and renders
 * a single consolidated FAQPage JSON-LD block in <head>.
 *
 * Wrap each page (or the app layout) with this provider.
 */
export const FAQSchemaProvider = ({ children }: { children: ReactNode }) => {
  const sourcesRef = useRef<Map<string, FAQItem[]>>(new Map());
  const [allItems, setAllItems] = useState<FAQItem[]>([]);

  const flush = useCallback(() => {
    const merged: FAQItem[] = [];
    const seen = new Set<string>();
    for (const items of sourcesRef.current.values()) {
      for (const item of items) {
        // Deduplicate by question text (case-insensitive)
        const key = item.question.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
    }
    setAllItems(merged);
  }, []);

  const registerFAQs = useCallback(
    (sourceId: string, items: FAQItem[]) => {
      sourcesRef.current.set(sourceId, items);
      flush();
      return () => {
        sourcesRef.current.delete(sourceId);
        flush();
      };
    },
    [flush],
  );

  return (
    <FAQSchemaContext.Provider value={{ registerFAQs }}>
      {children}
      {allItems.length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: allItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            })}
          </script>
        </Helmet>
      )}
    </FAQSchemaContext.Provider>
  );
};

/**
 * Hook for child components to register their FAQ items.
 * Automatically unregisters on unmount.
 *
 * @param sourceId  Unique identifier for this source (e.g. "property-detail", "the-advisor")
 * @param items     Array of { question, answer } objects
 */
export const useRegisterFAQs = (sourceId: string, items: FAQItem[]) => {
  const ctx = useContext(FAQSchemaContext);

  useEffect(() => {
    if (!ctx || items.length === 0) return;
    const unregister = ctx.registerFAQs(sourceId, items);
    return unregister;
    // Stringify items to detect content changes without infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, sourceId, JSON.stringify(items)]);
};
