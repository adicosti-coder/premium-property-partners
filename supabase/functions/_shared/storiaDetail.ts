// Citește pagina unui anunț Storia (JSON __NEXT_DATA__) și extrage toate
// pozele, descrierea completă și cartierul. Defensiv: întoarce null la eșec.
export interface StoriaDetail {
  images: string[];
  description: string | null;
  district: string | null;
}

const stripHtml = (s: string) =>
  s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").trim();

export function parseStoriaDetail(html: string): StoriaDetail | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let ad: any;
  try { ad = JSON.parse(m[1])?.props?.pageProps?.ad; } catch { return null; }
  if (!ad) return null;
  const images = Array.from(new Set(
    (Array.isArray(ad.images) ? ad.images : [])
      .map((i: any) => i?.large || i?.medium || i?.small)
      .filter((u: unknown): u is string => typeof u === "string" && /^https:\/\//.test(u)),
  ));
  const description = typeof ad.description === "string" ? stripHtml(ad.description) : null;
  const addr = ad.location?.address ?? {};
  const rev = (ad.location?.reverseGeocoding?.locations ?? []) as any[];
  const district = addr.district?.name
    || rev.find((l) => /district|residential/i.test(String(l?.locationLevel)))?.name
    || null;
  return { images, description: description || null, district };
}

export async function fetchStoriaDetail(url: string): Promise<StoriaDetail | null> {
  if (!/^https:\/\/(www\.)?storia\.ro\/ro\/oferta\//.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
        "Accept-Language": "ro-RO,ro;q=0.9",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return parseStoriaDetail(await res.text());
  } catch { return null; }
}
