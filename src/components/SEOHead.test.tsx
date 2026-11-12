import { cleanup, render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SEOHead from './SEOHead';
import { getPublicRouteSeo } from '@/lib/publicRouteSeo';

const state = vi.hoisted(() => ({ language: 'ro' as 'ro' | 'en' }));
vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => state }));
vi.mock('@/hooks/useSeoOverride', () => ({ readSeoOverride: async () => ({ title: 'Obsolete override', meta_description: 'Obsolete override description' }) }));
afterEach(cleanup);

describe('audited public head policy', () => {
  it('removes shell duplicates and keeps approved metadata after interaction and language changes', async () => {
    window.history.replaceState({}, '', '/preturi');
    state.language = 'ro';
    for (const name of ['description', 'robots']) {
      const tag = document.createElement('meta');
      tag.name = name;
      tag.content = 'old shell';
      document.head.appendChild(tag);
    }
    const view = render(<HelmetProvider><SEOHead title="Old page title" description="Old page description" /></HelmetProvider>);
    document.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(document.title).toBe(getPublicRouteSeo('/preturi', 'ro')?.title));
    await waitFor(() => expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1));
    expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1);
    state.language = 'en';
    view.rerender(<HelmetProvider><SEOHead title="Old page title" description="Old page description" /></HelmetProvider>);
    await waitFor(() => expect(document.title).toBe(getPublicRouteSeo('/preturi', 'en')?.title));
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(getPublicRouteSeo('/preturi', 'en')?.description);
    state.language = 'ro';
    view.rerender(<HelmetProvider><SEOHead /></HelmetProvider>);
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow'));
  });
});