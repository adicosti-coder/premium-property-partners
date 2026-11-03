import { describe, expect, it } from 'vitest';
import { isPhraseRouteExcluded, translatePhrase } from './phraseTranslate';

describe('phrase translation', () => {
  const map = { 'Vezi Complexe': 'View Complexes' };
  it('translates exact phrase keeping spacing', () => {
    expect(translatePhrase('  Vezi   Complexe ', map)).toBe('  View Complexes ');
  });
  it('ignores unknown text', () => { expect(translatePhrase('Altceva', map)).toBeNull(); });
  it('keeps admin, owner portal and blog articles Romanian', () => {
    expect(isPhraseRouteExcluded('/admin/andrei')).toBe(true);
    expect(isPhraseRouteExcluded('/portal-proprietar')).toBe(true);
    expect(isPhraseRouteExcluded('/blog/articol')).toBe(true);
    expect(isPhraseRouteExcluded('/pentru-proprietari')).toBe(false);
  });
});
