import { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { isPhraseRouteExcluded, translatePhrase } from './phraseTranslate';

/**
 * Fallback English layer for public pages whose copy is still hardcoded in
 * Romanian: swaps exact known phrases in text nodes and common attributes.
 * Admin, owner portal and blog articles stay Romanian by design.
 */
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const ORIGINAL = new WeakMap<Node, string>();
let mapPromise: Promise<Record<string, string>> | null = null;
const loadMap = () =>
  (mapPromise ??= fetch('/i18n/en-phrases.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

export const PhraseTranslator = () => {
  const { language } = useLanguage();

  useEffect(() => {
    if (language !== 'en' || typeof document === 'undefined') return;
    let map: Record<string, string> = {};
    let cancelled = false;

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
              if (!ORIGINAL.has(n)) ORIGINAL.set(n, n.nodeValue ?? '');
              n.nodeValue = next;
            }
          }
        } else if (n instanceof Element) {
          for (const a of ATTRS) {
            const v = n.getAttribute(a);
            const next = v ? translatePhrase(v, map) : null;
            if (next !== null) n.setAttribute(a, next);
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
    };
  }, [language]);

  return null;
};
