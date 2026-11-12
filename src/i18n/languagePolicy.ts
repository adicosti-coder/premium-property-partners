import type { Language } from './translations';

export function initialLanguage(search: string, stored?: string | null): Language {
  const param = new URLSearchParams(search).get('lang')?.toLowerCase();
  if (param === 'en' || param === 'ro') return param;
  return stored === 'en' ? 'en' : 'ro';
}

/** Keeps an explicit language address aligned with the visitor's switcher choice. */
export function searchForLanguage(search: string, language: Language): string {
  const params = new URLSearchParams(search);
  if (language === 'en') params.set('lang', 'en');
  else params.delete('lang');
  const next = params.toString();
  return next ? `?${next}` : '';
}

// Robots no longer depend on the language: see seoRobots in src/lib/seoLanguagePolicy.ts.
