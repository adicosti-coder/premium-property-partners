// Shared URL allowlist / SSRF guard for image-fetching edge functions.

const SUPABASE_HOST = (Deno.env.get("SUPABASE_URL") || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");

const DEFAULT_ALLOWED_SUFFIXES = [
  SUPABASE_HOST,
  "supabase.co",
  "supabase.in",
  "booking.com",
  "bstatic.com",
  "cf.bstatic.com",
  "cloudfront.net",
  "imobiliare.ro",
  "olx.ro",
  "storia.ro",
  "publi24.ro",
  "anuntul.ro",
  "airbnb.com",
  "muscache.com",
  "pynbooking.direct",
  "googleusercontent.com",
  "ggpht.com",
  "unsplash.com",
  "pexels.com",
  "pixabay.com",
  "cloudinary.com",
  "res.cloudinary.com",
].filter(Boolean);

export interface UrlGuardOptions {
  extraHostSuffixes?: string[];
}

export function isUrlAllowed(rawUrl: string, opts: UrlGuardOptions = {}): { ok: boolean; reason?: string; parsed?: URL } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Only http(s) allowed" };
  }
  const host = parsed.hostname.toLowerCase();
  // Block obvious local / private hosts
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    /^127\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return { ok: false, reason: "Private/loopback host blocked" };
  }
  const allowed = [...DEFAULT_ALLOWED_SUFFIXES, ...(opts.extraHostSuffixes || [])];
  const ok = allowed.some((suffix) => suffix && (host === suffix || host.endsWith("." + suffix)));
  if (!ok) return { ok: false, reason: `Host not allowlisted: ${host}` };
  return { ok: true, parsed };
}

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function fetchWithSizeCap(
  url: string,
  init?: RequestInit,
  maxBytes: number = MAX_BYTES,
  allowlist?: UrlGuardOptions,
): Promise<{ ok: boolean; status: number; bytes?: Uint8Array; contentType?: string; error?: string }> {
  let res: Response;
  if (allowlist) {
    // Follow redirects manually, re-validating every hop against the allowlist.
    let current = url;
    let hops = 0;
    while (true) {
      const check = isUrlAllowed(current, allowlist);
      if (!check.ok) return { ok: false, status: 403, error: "Redirect target not allowed" };
      res = await fetch(current, { ...init, redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel();
        if (!loc || ++hops > 5) return { ok: false, status: 502, error: "Too many or invalid redirects" };
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
  } else {
    res = await fetch(url, init);
  }
  if (!res.ok) return { ok: false, status: res.status, error: `Upstream ${res.status}` };
  const contentLength = Number(res.headers.get("content-length") || "0");
  if (contentLength > maxBytes) {
    return { ok: false, status: 413, error: `Payload too large (${contentLength})` };
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > maxBytes) {
    return { ok: false, status: 413, error: `Payload too large (${buf.byteLength})` };
  }
  return {
    ok: true,
    status: res.status,
    bytes: buf,
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}
