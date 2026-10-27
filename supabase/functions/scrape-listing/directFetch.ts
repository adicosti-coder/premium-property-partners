// Free, fast first attempt for server-rendered listing pages, plus URL cleanup.
// Scrape.do stays the fallback for JS-only / anti-bot portals.

const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|gbraid|wbraid|msclkid|igshid|mibextid|sfnsn|ref|ref_src|_gl|mc_cid|mc_eid|si|s)$/i;

/** Strip tracking params and unwrap Facebook/Google redirect links. */
export function cleanListingUrl(raw: string): string {
  let url = raw.trim();
  for (let i = 0; i < 3; i++) {
    let u: URL;
    try { u = new URL(url); } catch { return raw.trim(); }
    const host = u.hostname.replace(/^www\./, '');
    const wrapped =
      (/^(l|lm)\.facebook\.com$/.test(host) || host === 'l.instagram.com') ? u.searchParams.get('u')
      : (host === 'google.com' || host === 'google.ro') && u.pathname === '/url' ? (u.searchParams.get('q') || u.searchParams.get('url'))
      : null;
    if (wrapped && /^https?:\/\//i.test(wrapped)) { url = wrapped; continue; }
    for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
    u.hash = '';
    return u.toString();
  }
  return url;
}

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Pull listing fields from schema.org JSON-LD and OpenGraph tags. */
export function parseStructuredHtml(html: string): Record<string, any> {
  const out: Record<string, any> = {};
  const images: string[] = [];
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes: any[] = [];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1].trim());
      const walk = (x: any) => {
        if (!x || typeof x !== 'object') return;
        if (Array.isArray(x)) return x.forEach(walk);
        nodes.push(x);
        if (x['@graph']) walk(x['@graph']);
        if (x.itemOffered) walk(x.itemOffered);
        if (x.mainEntity) walk(x.mainEntity);
      };
      walk(j);
    } catch { /* ignore invalid JSON-LD */ }
  }
  const LISTING = /RealEstateListing|Product|Offer|Apartment|House|Residence|Accommodation|SingleFamilyResidence|Place/i;
  for (const n of nodes) {
    const t = String(n['@type'] ?? '');
    if (!LISTING.test(t)) continue;
    out.title ??= n.name;
    out.description_full ??= n.description;
    const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
    const price = num(offer?.price ?? n.price);
    if (price) { out.price ??= price; out.currency ??= offer?.priceCurrency ?? n.priceCurrency ?? null; }
    const area = n.floorSize?.value ?? n.floorSize;
    if (num(area)) out.size ??= num(area);
    if (num(n.numberOfRooms)) out.rooms ??= num(n.numberOfRooms);
    if (num(n.numberOfBathroomsTotal)) out.bathrooms ??= num(n.numberOfBathroomsTotal);
    const geo = n.geo ?? n.contentLocation?.geo;
    if (geo?.latitude && geo?.longitude) { out.latitude ??= Number(geo.latitude); out.longitude ??= Number(geo.longitude); }
    const addr = n.address ?? n.contentLocation?.address;
    if (addr && typeof addr === 'object') {
      const loc = [addr.streetAddress, addr.addressLocality].filter(Boolean).join(', ');
      if (loc) out.location ??= loc;
    }
    const img = n.image ?? n.photo;
    for (const i of (Array.isArray(img) ? img : [img])) {
      const s = typeof i === 'string' ? i : i?.url ?? i?.contentUrl;
      if (s) images.push(s);
    }
  }
  const meta = (p: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)`, 'i'))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, 'i'))?.[1];
  out.title ??= meta('og:title');
  out.description_short ??= meta('og:description');
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/gi)) images.push(m[1]);
  const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (out.title) out.title = decode(String(out.title)).replace(/\s*\|\s*[^|]{1,30}$/, '').trim();
  if (images.length) out.images = [...new Set(images.map(decode))];
  return out;
}

/** Plain server-side GET. Returns null when the page looks blocked or JS-only. */
export async function directFetchHtml(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    if (html.length < 3000) return null;
    if (/captcha|cf-chl|Access denied|enable JavaScript to run this app/i.test(html.slice(0, 20000)) && !/ld\+json/i.test(html)) return null;
    return html;
  } catch {
    return null;
  }
}
