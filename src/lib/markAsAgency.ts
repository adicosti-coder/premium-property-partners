import { supabase } from "@/integrations/supabase/client";

export interface MarkAsAgencyInput {
  /** ID of the prospect/lead row (optional, used to update the source row) */
  id?: string | null;
  /** Where the row lives. Defaults to "prospect_listings". */
  source?: "prospect_listings" | "scraper_leads_archive_2026" | "voice_calls" | null;
  /** Normalized phone (E.164) — preferred for blocklist matching */
  phone?: string | null;
  /** Raw phone — used as fallback if `phone` (normalized) not provided */
  rawPhone?: string | null;
  /** Anything that looks like a URL — domain will be extracted */
  url?: string | null;
  /** Optional short label included in blocklist `notes` for traceability */
  contextLabel?: string | null;
}

export interface MarkAsAgencyResult {
  ok: boolean;
  blockedPhone?: string | null;
  blockedDomain?: string | null;
  message: string;
  error?: string;
}

export function extractAgencyDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return (
      url
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        ?.replace(/^www\./i, "")
        .toLowerCase() || null
    );
  }
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0040")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("40")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+4" + cleaned;
  return cleaned;
}

/**
 * Mark a contact / listing as an agency:
 *  - flips the source row to `agentie` / archived
 *  - mirrors the change across prospect_listings + scraper_leads_archive_2026 by phone & URL
 *  - inserts phone + domain into `agency_blocklist` (skipping duplicates)
 */
export async function markAsAgency(input: MarkAsAgencyInput): Promise<MarkAsAgencyResult> {
  const phone = input.phone || normalizePhone(input.rawPhone);
  const domain = extractAgencyDomain(input.url);
  const url = input.url || null;
  const reason = "manual_mark_agency";
  const nowIso = new Date().toISOString();
  const notes = `Marcat manual · ${(input.contextLabel || "").slice(0, 100)}`.trim();

  if (!phone && !domain) {
    return { ok: false, message: "Lipsește numărul de telefon și URL-ul pentru blocare.", error: "missing_identifiers" };
  }

  // 1. Check existing blocklist to avoid duplicates
  const orParts: string[] = [];
  if (phone) orParts.push(`phone_normalized.eq.${phone}`);
  if (domain) orParts.push(`domain.eq.${domain}`);
  const { data: existing } = await supabase
    .from("agency_blocklist")
    .select("phone_normalized, domain")
    .or(orParts.join(","));

  const phoneExists = !!existing?.some((e: any) => phone && e.phone_normalized === phone);
  const domainExists = !!existing?.some((e: any) => domain && e.domain === domain);

  const rows: any[] = [];
  if (phone && !phoneExists) rows.push({ phone_normalized: phone, reason, notes });
  if (domain && !domainExists) rows.push({ domain, reason, notes });

  if (rows.length > 0) {
    const { error: blErr } = await supabase.from("agency_blocklist").insert(rows);
    if (blErr) return { ok: false, message: `Eroare blocklist: ${blErr.message}`, error: blErr.message };
  }

  // 2. Update the original row
  const source = input.source || "prospect_listings";
  if (input.id) {
    if (source === "scraper_leads_archive_2026") {
      await supabase
        .from("scraper_leads_archive_2026" as any)
        .update({ prospect_category: "agentie", status: "archived" } as any)
        .eq("id", input.id);
    } else if (source === "prospect_listings") {
      await supabase
        .from("prospect_listings" as any)
        .update({
          prospect_type: "agentie",
          is_active: false,
          lifecycle_status: "archived",
          auto_blacklisted_at: nowIso,
          auto_blacklist_reason: reason,
        } as any)
        .eq("id", input.id);
    }
  }

  // 3. Mirror by phone / URL so the same contact disappears from every source
  const mirrors: Array<PromiseLike<any>> = [];
  if (url) {
    mirrors.push(
      supabase
        .from("scraper_leads_archive_2026" as any)
        .update({ prospect_category: "agentie", status: "archived" } as any)
        .eq("url", url),
    );
    mirrors.push(
      supabase
        .from("prospect_listings" as any)
        .update({
          prospect_type: "agentie",
          is_active: false,
          lifecycle_status: "archived",
          auto_blacklisted_at: nowIso,
          auto_blacklist_reason: reason,
        } as any)
        .eq("source_url", url),
    );
  }
  if (phone) {
    mirrors.push(
      supabase
        .from("prospect_listings" as any)
        .update({
          prospect_type: "agentie",
          is_active: false,
          lifecycle_status: "archived",
          auto_blacklisted_at: nowIso,
          auto_blacklist_reason: reason,
        } as any)
        .eq("phone_normalized", phone),
    );
  }
  await Promise.allSettled(mirrors);

  // 4. Audit log entry — best-effort, never block the destructive flow.
  try {
    await supabase.from("admin_audit_log").insert({
      action: "prospect_marked_agency",
      entity_type: "prospect_listing",
      entity_id: input.id ?? null,
      severity: "warning",
      details: {
        phone,
        domain,
        url,
        source,
        context: input.contextLabel ?? null,
        blocklist_added: rows.length > 0,
        marked_at: nowIso,
      },
    } as any);
  } catch (e) {
    console.warn("[markAsAgency] audit log failed:", (e as Error).message);
  }

  const added = rows.map((r) => r.phone_normalized || r.domain).filter(Boolean).join(" · ");
  if (rows.length === 0) {
    return {
      ok: true,
      blockedPhone: phone,
      blockedDomain: domain,
      message: `🏢 Deja în blocklist (${[phone, domain].filter(Boolean).join(" · ")}). Lead arhivat.`,
    };
  }
  return {
    ok: true,
    blockedPhone: phone,
    blockedDomain: domain,
    message: `🏢 Marcat ca agenție: ${added}. Adăugat în blocklist.`,
  };
}
