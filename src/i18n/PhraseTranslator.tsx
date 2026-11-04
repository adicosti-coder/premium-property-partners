import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { isPhraseRouteExcluded, translatePhrase } from './phraseTranslate';

/**
 * Fallback English layer for public pages whose copy is still hardcoded in
 * Romanian: swaps exact known phrases in text nodes and common attributes.
 * Admin, owner portal and blog articles stay Romanian by design.
 */
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
let mapPromise: Promise<Record<string, string>> | null = null;
const loadMap = () =>
  (mapPromise ??= fetch('/i18n/en-phrases.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

export const PhraseTranslator = () => {
  const { language } = useLanguage();

  useEffect(() => {
    if (language !== 'en' || typeof document === 'undefined') return;
    let map: Record<string, string> = {};
    let cancelled = false;
    const texts = new Map<Node, { original: string; translated: string }>();
    const attributes = new Map<Element, Map<string, { original: string; translated: string }>>();

    const apply = (root: Node) => {
      if (isPhraseRouteExcluded(window.location.pathname)) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n: Node | null = walker.currentNode;
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          const parent = n.parentElement;
          if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) {
            const next = translatePhrase(n.nodeValue ?? '', map);
            if (next !== null) {
              texts.set(n, { original: n.nodeValue ?? '', translated: next });
              n.nodeValue = next;
            }
          }
        } else if (n instanceof Element) {
          for (const a of ATTRS) {
            const v = n.getAttribute(a);
            const next = v ? translatePhrase(v, map) : null;
            if (next !== null && v !== null) {
              let saved = attributes.get(n);
              if (!saved) {
                saved = new Map();
                attributes.set(n, saved);
              }
              saved.set(a, { original: v, translated: next });
              n.setAttribute(a, next);
            }
          }
        }
        n = walker.nextNode();
      }
    };

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') apply(r.target);
        r.addedNodes.forEach((node) => apply(node));
      }
    });

    loadMap().then((m) => {
      if (cancelled) return;
      map = m;
      apply(document.body);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      // Restore only values still owned by this layer, not newer React updates.
      for (const [node, saved] of texts) {
        if (node.isConnected && node.nodeValue === saved.translated) node.nodeValue = saved.original;
      }
      for (const [element, saved] of attributes) {
        if (!element.isConnected) continue;
        for (const [attribute, value] of saved) {
          if (element.getAttribute(attribute) === value.translated) {
            element.setAttribute(attribute, value.original);
          }
        }
      }
      texts.clear();
      attributes.clear();
    };
  }, [language]);

  return null;
};
