"""
Blog SEO / a11y regression check.

Runs a headless browser against a local Vite dev server (default
http://localhost:8080) and validates, for a curated set of blog article
slugs, that each article page emits:

  1. FAQPage JSON-LD (at least 3 questions).
  2. BreadcrumbList JSON-LD with 3 items ending in the article title.
  3. BlogPosting JSON-LD with a non-empty image URL.
  4. A canonical <link> stripped of tracking params (utm_*, fbclid, gclid, ?lang).
  5. hreflang alternates for ro / en / x-default.
  6. Every <img> in the article body carries a non-empty alt attribute.

Usage:
    python3 scripts/blog-seo-playwright-check.py
    BASE_URL=https://realtrust.ro python3 scripts/blog-seo-playwright-check.py

Exit code 0 = all slugs pass, 1 = at least one failure.
"""

import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")

# Public (non-premium) articles that exercise different content shapes.
SLUGS = [
    "top-15-restaurante-din-timisoara-in-2026-ghid-complet-pentru-oaspeti",
    "ghid-turistic-timisoara-atractii-activitati",
    "analiza-roi-apartamente-timisoara-2026",
]


async def check_article(page, slug: str) -> list[str]:
    """Return a list of failure messages for the given slug. Empty = pass."""
    failures: list[str] = []
    url = f"{BASE_URL}/blog/{slug}?utm_source=ci&fbclid=abc123"
    await page.goto(url, wait_until="networkidle")
    # Give Helmet + FAQSchemaProvider a beat to flush.
    await page.wait_for_timeout(2500)

    result = await page.evaluate(
        """() => {
          const q = (s) => document.querySelector(s);
          const canon = q('link[rel=canonical]')?.href || null;
          const alts = Array.from(document.querySelectorAll('link[rel=alternate]'))
            .map(l => ({ h: l.hreflang, href: l.href }));
          const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .flatMap(s => { try { const p = JSON.parse(s.textContent); return Array.isArray(p) ? p : [p]; } catch { return []; } });
          const faq = ld.find(x => x && x['@type'] === 'FAQPage');
          const bc  = ld.find(x => x && x['@type'] === 'BreadcrumbList');
          const bp  = ld.find(x => x && x['@type'] === 'BlogPosting');
          const bodyImgs = Array.from(document.querySelectorAll('[data-blog-content-root="1"] img'))
            .map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') }));
          return { canon, alts, faq, bc, bp, bodyImgs };
        }"""
    )

    canon = result["canon"] or ""
    for junk in ("utm_", "fbclid", "gclid", "?lang="):
        if junk in canon:
            failures.append(f"canonical still contains tracking token '{junk}': {canon}")
    if not canon.startswith("https://realtrust.ro/blog/"):
        failures.append(f"canonical does not point at realtrust.ro/blog: {canon}")

    hreflangs = {a["h"] for a in result["alts"]}
    for required in ("ro", "en", "x-default"):
        if required not in hreflangs:
            failures.append(f"missing hreflang '{required}' (present: {sorted(hreflangs)})")

    faq = result["faq"]
    if not faq or not isinstance(faq.get("mainEntity"), list) or len(faq["mainEntity"]) < 3:
        failures.append(f"FAQPage schema missing or has <3 questions: {faq}")

    bc = result["bc"]
    if not bc or not isinstance(bc.get("itemListElement"), list) or len(bc["itemListElement"]) != 3:
        failures.append(f"BreadcrumbList must have exactly 3 items: {bc}")

    bp = result["bp"]
    if not bp or not bp.get("image"):
        failures.append(f"BlogPosting missing image: {bp}")
    if bp and bp.get("author", {}).get("name") != "Adrian Costi":
        failures.append(f"BlogPosting author must be 'Adrian Costi', got {bp.get('author')}")

    for img in result["bodyImgs"]:
        alt = (img.get("alt") or "").strip()
        if not alt:
            failures.append(f"body <img> missing alt: src={img.get('src')}")

    return failures


async def main() -> int:
    exit_code = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for slug in SLUGS:
            failures = await check_article(page, slug)
            if failures:
                exit_code = 1
                print(f"[FAIL] {slug}")
                for f in failures:
                    print(f"   - {f}")
            else:
                print(f"[ OK ] {slug}")
        await browser.close()
    return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
