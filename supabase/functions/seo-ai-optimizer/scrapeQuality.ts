interface ScrapedPageLike {
  title?: string | null;
  metaDescription?: string | null;
  wordCount?: number | null;
  h1Count?: number | null;
  markdown?: string | null;
  fullHtml?: string | null;
}

const BROKEN_PAGE_PATTERNS = [
  /site not found/i,
  /dreamhost/i,
  /owner of this domain has not yet uploaded/i,
  /this site is parked/i,
];

const BUSINESS_SIGNAL_PATTERNS = [
  /realtrust/i,
  /timișoara/i,
  /timisoara/i,
  /imobiliare/i,
  /regim hotelier/i,
  /apartamente/i,
];

function buildSignalText(page: ScrapedPageLike | null | undefined): string {
  if (!page) return "";
  return [
    page.title || "",
    page.metaDescription || "",
    page.markdown || "",
    page.fullHtml || "",
  ].join(" ");
}

export function isClearlyBrokenScrape(page: ScrapedPageLike | null | undefined): boolean {
  const signalText = buildSignalText(page);

  if (BROKEN_PAGE_PATTERNS.some((pattern) => pattern.test(signalText))) {
    return true;
  }

  const wordCount = page?.wordCount || 0;
  const hasBusinessSignals = BUSINESS_SIGNAL_PATTERNS.some((pattern) => pattern.test(signalText));

  return wordCount < 40 && !hasBusinessSignals;
}

export function pickBestScrapeResult<T extends ScrapedPageLike>(pages: T[]): T {
  return [...pages].sort((a, b) => scoreScrapeQuality(b) - scoreScrapeQuality(a))[0];
}

export function isObviouslyInvalidCachedAudit(audit: any): boolean {
  const signalText = [
    audit?.title || "",
    audit?.meta_description || "",
    JSON.stringify(audit?.raw_analysis || {}),
  ].join(" ");

  if (BROKEN_PAGE_PATTERNS.some((pattern) => pattern.test(signalText))) {
    return true;
  }

  return audit?.overall_score === 0 && /site not found|dreamhost/i.test(signalText);
}

function scoreScrapeQuality(page: ScrapedPageLike): number {
  let score = Math.min(page.wordCount || 0, 2000);
  score += Math.min((page.title || "").length * 2, 120);
  score += Math.min((page.metaDescription || "").length, 180);
  score += Math.min((page.h1Count || 0) * 20, 60);

  const signalText = buildSignalText(page);
  if (BUSINESS_SIGNAL_PATTERNS.some((pattern) => pattern.test(signalText))) {
    score += 120;
  }
  if (BROKEN_PAGE_PATTERNS.some((pattern) => pattern.test(signalText))) {
    score -= 1500;
  }

  return score;
}