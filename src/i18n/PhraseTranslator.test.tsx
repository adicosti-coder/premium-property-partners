import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhraseTranslator } from './PhraseTranslator';

const state = vi.hoisted(() => ({ language: 'ro' }));
vi.mock('./LanguageContext', () => ({ useLanguage: () => state }));

beforeEach(() => {
  state.language = 'en';
  window.history.replaceState({}, '', '/preturi');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    'Text original': 'Translated text',
  }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('phrase translation ownership', () => {
  it('translates attributes added to an existing element after initial render', async () => {
    const view = render(<><PhraseTranslator /><input /></>);
    await waitFor(() => expect(fetch).toBeDefined());
    await new Promise(resolve => setTimeout(resolve, 0));
    view.rerender(<><PhraseTranslator /><input placeholder="Text original" /></>);
    await waitFor(() => expect(view.container.querySelector('input')?.getAttribute('placeholder')).toBe('Translated text'));
  });
  it('restores text and all translated attributes on EN → RO without reload', async () => {
    const view = render(<><PhraseTranslator /><span>Text original</span><input placeholder="Text original" aria-label="Text original" title="Text original" /><img alt="Text original" /></>);
    const span = view.container.querySelector('span');
    const input = view.container.querySelector('input');
    const image = view.container.querySelector('img');
    await waitFor(() => expect(span?.textContent).toBe('Translated text'));
    expect(input?.getAttribute('placeholder')).toBe('Translated text');
    state.language = 'ro';
    view.rerender(<><PhraseTranslator /><span>Text original</span><input placeholder="Text original" aria-label="Text original" title="Text original" /><img alt="Text original" /></>);
    expect(span?.textContent).toBe('Text original');
    for (const attribute of ['placeholder', 'aria-label', 'title']) expect(input?.getAttribute(attribute)).toBe('Text original');
    expect(image?.getAttribute('alt')).toBe('Text original');
    state.language = 'en';
    view.rerender(<><PhraseTranslator /><span>Text original</span><input placeholder="Text original" aria-label="Text original" title="Text original" /><img alt="Text original" /></>);
    await waitFor(() => expect(span?.textContent).toBe('Translated text'));
    state.language = 'ro';
    view.rerender(<><PhraseTranslator /><span>Text original</span><input placeholder="Text original" aria-label="Text original" title="Text original" /><img alt="Text original" /></>);
    expect(span?.textContent).toBe('Text original');
  });

  it('does not restore obsolete values over newer React content', async () => {
    const view = render(<><PhraseTranslator /><span>Text original</span><input title="Text original" /></>);
    await waitFor(() => expect(view.container.querySelector('span')?.textContent).toBe('Translated text'));
    view.rerender(<><PhraseTranslator /><span>Valoare actualizată</span><input title="Valoare actualizată" /></>);
    state.language = 'ro';
    view.rerender(<><PhraseTranslator /><span>Valoare actualizată</span><input title="Valoare actualizată" /></>);
    expect(view.container.querySelector('span')?.textContent).toBe('Valoare actualizată');
    expect(view.container.querySelector('input')?.getAttribute('title')).toBe('Valoare actualizată');
  });
});