// SSRF guard: only public http(s) URLs on standard ports whose hostname does not
// resolve to loopback/private/link-local/metadata addresses.
const OWN_HOSTS = new Set(["realtrust.ro", "www.realtrust.ro", "realtrust-aparthotel.lovable.app"]);

export function isOwnSiteUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (u.protocol === "https:" || u.protocol === "http:") && OWN_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateV6(ip: string): boolean {
  const h = ip.toLowerCase();
  return h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") ||
    h.startsWith("::ffff:");
}

export async function assertSafePublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("URL not allowed");
  if (u.username || u.password) throw new Error("URL not allowed");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("URL not allowed");
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") || h === "localhost" || /\.(localhost|local|internal|lan|home|corp)$/.test(h)) {
    throw new Error("URL not allowed");
  }
  if (h.includes(":")) throw new Error("URL not allowed");
  if (/^[\d.]+$/.test(h)) {
    if (isPrivateV4(h)) throw new Error("URL not allowed");
    return u;
  }
  const [v4, v6] = await Promise.all([
    Deno.resolveDns(h, "A").catch(() => [] as string[]),
    Deno.resolveDns(h, "AAAA").catch(() => [] as string[]),
  ]);
  if (v4.length + v6.length === 0) throw new Error("URL not resolvable");
  if (v4.some(isPrivateV4) || v6.some(isPrivateV6)) throw new Error("URL not allowed");
  return u;
}
