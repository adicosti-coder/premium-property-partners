import type { Language } from './translations';

export function initialLanguage(search: string): Language {
  return new URLSearchParams(search).get('lang')?.toLowerCase() === 'en' ? 'en' : 'ro';
}

export function languageRobots(language: Language, noIndex = false): string {
  if (language === 'en') return 'noindex, follow';
  return noIndex ? 'noindex, nofollow' : 'index, follow';
}