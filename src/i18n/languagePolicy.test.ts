import { describe, expect, it } from 'vitest';
import { initialLanguage, searchForLanguage } from './languagePolicy';

describe('language address', () => {
  it('removes the English parameter when switching to Romanian', () => expect(searchForLanguage('?lang=en&page=2', 'ro')).toBe('?page=2'));
  it('adds the English parameter when switching to English', () => expect(searchForLanguage('?page=2', 'en')).toBe('?page=2&lang=en'));
});

describe('visitor language', () => {
  it('defaults to Romanian', () => {
    expect(initialLanguage('')).toBe('ro');
  });
  it('allows explicit English URLs', () => {
    expect(initialLanguage('?lang=en')).toBe('en');
  });
});
describe('saved language preference', () => {
  it('keeps saved English after reload', () => { expect(initialLanguage('', 'en')).toBe('en'); });
  it('URL ro overrides saved English', () => { expect(initialLanguage('?lang=ro', 'en')).toBe('ro'); });
  it('defaults to Romanian', () => { expect(initialLanguage('', null)).toBe('ro'); });
});
