import type { AnalizaPrefill } from "@/pages/AnalizaAnunt";

/** Codul din linkul scurt https://realtrust.ro/e/<cod> (7–8 litere/cifre). */
export const ESTIMATE_CODE_RE = /^[a-z0-9]{7,8}$/;

export function normalizeEstimateCode(raw: string | undefined | null): string | null {
  const c = String(raw ?? "").trim().toLowerCase();
  return ESTIMATE_CODE_RE.test(c) ? c : null;
}

/** Transformă răspunsul RPC `get_estimate_link` în datele precompletate ale analizei (sau null). */
export function estimatePrefillFromRpc(data: unknown): AnalizaPrefill | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const url = typeof d.source_url === "string" && /^https:\/\//i.test(d.source_url) ? d.source_url.slice(0, 500) : null;
  const zoneRaw = typeof d.zone === "string" ? d.zone.replace(/[^\p{L}\p{N} .,'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const lt = d.listing_type === "vanzare" || d.listing_type === "inchiriere" ? d.listing_type : null;
  return { url, zone: zoneRaw.length >= 2 ? zoneRaw : null, listingType: lt };
}
