"""
Blog SEO / a11y regression check.

Validates, for a set of blog article slugs, that each article page emits:

  1. FAQPage JSON-LD (>= 3 questions).
  2. BreadcrumbList JSON-LD with 3 items.
  3. BlogPosting JSON-LD with a non-empty image (ImageObject preferred).
  4. Canonical <link> stripped of tracking params (utm_*, fbclid, gclid, ?lang).
  5. hreflang alternates for ro / en / x-default.
  6. Every <img> in the article body carries a non-empty alt attribute.

Runs both RO and EN variants of each slug.

Usage:
    python3 scripts/blog-seo-playwright-check.py
    SAMPLE=20 python3 scripts/blog-seo-playwright-check.py       # sample 20 slugs
    SAMPLE=all python3 scripts/blog-seo-playwright-check.py      # all published
    SLUGS="slug-a,slug-b" python3 scripts/blog-seo-playwright-check.py
    BASE_URL=https://realtrust.ro python3 scripts/blog-seo-playwright-check.py
    REPORT=/tmp/blog-seo-report.json python3 scripts/blog-seo-playwright-check.py

Exit code 0 = all slugs pass, 1 = at least one failure.
Writes a JSON regression report at REPORT (default scripts/blog-seo-report.json).
"""

import asyncio
import json
import os
import random
import sys
import time
import urllib.request
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
REPORT_PATH = os.environ.get(
    "REPORT",
    str(Path(__file__).parent / "blog-seo-report.json"),
)
SAMPLE = os.environ.get("SAMPLE", "3")  # "3" (default), an int, or "all"
LANGS = ("ro", "en")

# Curated fallback set (used when we can't reach Supabase to enumerate slugs).
FALLBACK_SLUGS = [
    "top-15-restaurante-din-timisoara-in-2026-ghid-complet-pentru-oaspeti",
    "ghid-turistic-timisoara-atractii-activitati",
    "taxa-hoteliera-locala-timisoara-2026",
]

SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co"
SUPABASE_ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12"
    "enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4"
    "cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8"
)


def fetch_all_slugs() -> list[str]:
    """Pull every published, non-premium slug from the blog_posts table."""
    url = (
        f"{SUPABASE_URL}/rest/v1/blog_posts"
        "?select=slug&status=eq.published&is_premium=eq.false"
    )
    req = urllib.request.Request(
        url,
        headers={"apikey": SUPABASE_ANON, "Authorization": f"Bearer {SUPABASE_ANON}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        return [r["slug"] for r in rows if r.get("slug")]
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] could not fetch slug list from backend: {exc}")
        return []


def pick_slugs() -> list[str]:
    env_slugs = os.environ.get("SLUGS")
    if env_slugs:
        return [s.strip() for s in env_slugs.split(",") if s.strip()]

    all_slugs = fetch_all_slugs() or FALLBACK_SLUGS
    if SAMPLE.lower() == "all":
        return all_slugs

    try:
        n = int(SAMPLE)
    except ValueError:
        n = 3
    n = max(1, min(n, len(all_slugs)))
    # Seed so the same run is reproducible; different runs still get variety.
    random.seed(int(time.time()) // 3600)
    return random.sample(all_slugs, n)


async def check_variant(page, slug: str, lang: str) -> list[str]:
    failures: list[str] = []
    lang_qs = "" if lang == "ro" else "&lang=en"
    url = f"{BASE_URL}/blog/{slug}?utm_source=ci&fbclid=abc123{lang_qs}"
    try:
        await page.goto(url, wait_until="networkidle", timeout=45_000)
    except Exception as exc:  # noqa: BLE001
        return [f"navigation failed: {exc}"]
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
        failures.append(f"FAQPage schema missing or <3 questions")

    bc = result["bc"]
    if not bc or not isinstance(bc.get("itemListElement"), list) or len(bc["itemListElement"]) != 3:
        failures.append(f"BreadcrumbList must have exactly 3 items")

    bp = result["bp"]
    if not bp or not bp.get("image"):
        failures.append(f"BlogPosting missing image")
    else:
        img = bp.get("image")
        if isinstance(img, dict) and img.get("@type") != "ImageObject":
            failures.append(f"BlogPosting.image is not an ImageObject: {img.get('@type')}")
    if bp and bp.get("author", {}).get("name") != "Adrian Costi":
        failures.append(f"BlogPosting author must be 'Adrian Costi', got {bp.get('author')}")

    for img in result["bodyImgs"]:
        alt = (img.get("alt") or "").strip()
        if not alt:
            failures.append(f"body <img> missing alt: src={img.get('src')}")

    return failures


async def main() -> int:
    slugs = pick_slugs()
    print(f"Testing {len(slugs)} slug(s) × {len(LANGS)} lang(s) against {BASE_URL}")
    report: dict = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "baseUrl": BASE_URL,
        "slugCount": len(slugs),
        "results": [],
    }
    exit_code = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for slug in slugs:
            for lang in LANGS:
                failures = await check_variant(page, slug, lang)
                status = "pass" if not failures else "fail"
                if failures:
                    exit_code = 1
                    print(f"[FAIL] {slug} [{lang}]")
                    for f in failures:
                        print(f"   - {f}")
                else:
                    print(f"[ OK ] {slug} [{lang}]")
                report["results"].append(
                    {"slug": slug, "lang": lang, "status": status, "failures": failures}
                )
        await browser.close()

    report["summary"] = {
        "total": len(report["results"]),
        "pass": sum(1 for r in report["results"] if r["status"] == "pass"),
        "fail": sum(1 for r in report["results"] if r["status"] == "fail"),
    }
    Path(REPORT_PATH).parent.mkdir(parents=True, exist_ok=True)

    # Diff against the previous JSON report (if any) BEFORE overwriting it.
    prev_report = None
    if Path(REPORT_PATH).exists():
        try:
            prev_report = json.loads(Path(REPORT_PATH).read_text(encoding="utf-8"))
        except Exception:
            prev_report = None
    diff = compute_diff(prev_report, report)
    report["diff"] = diff
    print_diff(diff)

    Path(REPORT_PATH).write_text(json.dumps(report, indent=2), encoding="utf-8")
    html_path = Path(REPORT_PATH).with_suffix(".html")
    html_path.write_text(render_html_report(report, diff), encoding="utf-8")

    print(f"\nRegression report → {REPORT_PATH}")
    print(f"HTML report       → {html_path}")
    print(f"Summary: {report['summary']}")
    return exit_code


def _key(r: dict) -> str:
    return f"{r['slug']}::{r['lang']}"


def compute_diff(prev: dict | None, curr: dict) -> dict:
    """Compare failure sets per (slug, lang) between runs."""
    prev_map = {_key(r): set(r.get("failures") or []) for r in (prev or {}).get("results", [])}
    curr_map = {_key(r): set(r.get("failures") or []) for r in curr.get("results", [])}
    new_regressions: list[dict] = []   # was passing / absent, now failing
    fixed: list[dict] = []             # was failing, now passing / absent
    changed: list[dict] = []           # both failing, but failure set differs
    for k, cur_fails in curr_map.items():
        prev_fails = prev_map.get(k, set())
        if cur_fails and not prev_fails:
            new_regressions.append({"key": k, "added": sorted(cur_fails)})
        elif not cur_fails and prev_fails:
            fixed.append({"key": k, "removed": sorted(prev_fails)})
        elif cur_fails != prev_fails:
            added = sorted(cur_fails - prev_fails)
            removed = sorted(prev_fails - cur_fails)
            if added or removed:
                changed.append({"key": k, "added": added, "removed": removed})
    for k, prev_fails in prev_map.items():
        if k not in curr_map and prev_fails:
            fixed.append({"key": k, "removed": sorted(prev_fails)})
    return {
        "hadPrevious": prev is not None,
        "newRegressions": new_regressions,
        "fixed": fixed,
        "changed": changed,
    }


def print_diff(diff: dict) -> None:
    if not diff["hadPrevious"]:
        print("\n[diff] no previous report — baseline established.")
        return
    print("\n[diff] vs previous run:")
    if not (diff["newRegressions"] or diff["fixed"] or diff["changed"]):
        print("   no changes.")
        return
    for r in diff["newRegressions"]:
        print(f"   REGRESSION  {r['key']}")
        for f in r["added"]:
            print(f"      + {f}")
    for r in diff["changed"]:
        print(f"   CHANGED     {r['key']}")
        for f in r.get("added", []):
            print(f"      + {f}")
        for f in r.get("removed", []):
            print(f"      - {f}")
    for r in diff["fixed"]:
        print(f"   FIXED       {r['key']}")


def _esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def render_html_report(report: dict, diff: dict) -> str:
    s = report["summary"]
    rows = []
    for r in report["results"]:
        color = "#16a34a" if r["status"] == "pass" else "#dc2626"
        icon = "✅" if r["status"] == "pass" else "❌"
        fails = (
            "<ul style='margin:4px 0 0 18px;padding:0;color:#dc2626;'>"
            + "".join(f"<li><code>{_esc(f)}</code></li>" for f in r["failures"])
            + "</ul>"
            if r["failures"]
            else "<span style='color:#16a34a;'>OK</span>"
        )
        rows.append(
            f"<tr>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;color:{color};font-weight:600;'>{icon} {r['status']}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;font-family:monospace;'>{_esc(r['slug'])}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;'>{r['lang']}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #eee;'>{fails}</td>"
            f"</tr>"
        )
    diff_html = ""
    if diff["hadPrevious"]:
        parts = []
        if diff["newRegressions"]:
            parts.append("<h3 style='color:#dc2626;margin:12px 0 4px;'>New regressions</h3><ul>" +
                         "".join(f"<li><b>{_esc(r['key'])}</b><ul>" +
                                 "".join(f"<li style='color:#dc2626;'>+ <code>{_esc(f)}</code></li>" for f in r['added']) +
                                 "</ul></li>" for r in diff["newRegressions"]) + "</ul>")
        if diff["changed"]:
            parts.append("<h3 style='color:#d97706;margin:12px 0 4px;'>Changed</h3><ul>" +
                         "".join(f"<li><b>{_esc(r['key'])}</b><ul>" +
                                 "".join(f"<li style='color:#dc2626;'>+ <code>{_esc(f)}</code></li>" for f in r.get('added', [])) +
                                 "".join(f"<li style='color:#16a34a;'>− <code>{_esc(f)}</code></li>" for f in r.get('removed', [])) +
                                 "</ul></li>" for r in diff["changed"]) + "</ul>")
        if diff["fixed"]:
            parts.append("<h3 style='color:#16a34a;margin:12px 0 4px;'>Fixed since last run</h3><ul>" +
                         "".join(f"<li><b>{_esc(r['key'])}</b></li>" for r in diff["fixed"]) + "</ul>")
        if not parts:
            parts.append("<p style='color:#16a34a;'>No changes vs previous run.</p>")
        diff_html = "<section style='margin-top:24px;'><h2>Diff vs previous run</h2>" + "".join(parts) + "</section>"
    else:
        diff_html = "<section style='margin-top:24px;color:#6b7280;'>No previous report — baseline established.</section>"

    banner_color = "#16a34a" if s["fail"] == 0 else "#dc2626"
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Blog SEO regression report</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#111;">
  <h1 style="margin:0 0 4px;">Blog SEO regression report</h1>
  <p style="color:#6b7280;margin:0 0 16px;">Generated {report['generatedAt']} · Base: <code>{_esc(report['baseUrl'])}</code></p>
  <div style="padding:12px 16px;border-radius:8px;background:{banner_color};color:white;font-weight:600;">
    {s['pass']} pass · {s['fail']} fail · {s['total']} total ({report['slugCount']} slugs × langs)
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
    <thead><tr style="background:#f9fafb;text-align:left;">
      <th style="padding:8px;">Status</th><th style="padding:8px;">Slug</th><th style="padding:8px;">Lang</th><th style="padding:8px;">Details</th>
    </tr></thead>
    <tbody>{''.join(rows)}</tbody>
  </table>
  {diff_html}
</body></html>"""



if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
