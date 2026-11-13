import { useEffect } from "react";

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

/**
 * JSON-LD managed by a commit-phase effect instead of Helmet. Helmet registers
 * instances during render, so a render React throws away (Suspense, language
 * switch) can leave a stale copy of the script behind — for review markup that
 * means duplicate, conflicting AggregateRating nodes. Effects only run for
 * committed trees, so exactly one script per mounted instance exists.
 */
const JsonLdScript = ({ id, data }: { id: string; data: JsonLd }) => {
  const json = JSON.stringify(data);
  useEffect(() => {
    const selector = `script[type="application/ld+json"][data-jsonld-id="${CSS.escape(id)}"]`;
    let el = document.head.querySelector<HTMLScriptElement>(selector);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.dataset.jsonldId = id;
      document.head.appendChild(el);
    }
    if (el.textContent !== json) el.textContent = json;
  }, [id, json]);
  useEffect(() => () => {
    document.head
      .querySelector(`script[type="application/ld+json"][data-jsonld-id="${CSS.escape(id)}"]`)
      ?.remove();
  }, [id]);
  return null;
};

export default JsonLdScript;
