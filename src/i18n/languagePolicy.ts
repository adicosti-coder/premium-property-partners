import type { Language } from './translations';

export function initialLanguage(search: string, stored?: string | null): Language {
  const param = new URLSearchParams(search).get('lang')?.toLowerCase();
  if (param === 'en' || param === 'ro') return param;
  return stored === 'en' ? 'en' : 'ro';
}

export function languageRobots(language: Language, noIndex = false): string {
  if (language === 'en') return 'noindex, follow';
  return noIndex ? 'noindex, nofollow' : 'index, follow';
}
