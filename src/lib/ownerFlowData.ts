import { supabase } from "@/lib/supabaseClient";
import { isActiveOwnerListing, isIndividualOwnerListing, isResidentialRealEstate, ownerVerification } from "@/lib/ownerListingRules";
import { isWhatsappCapable, normalizeRoPhone } from "@/lib/ownerOutreachTemplates";

export const OWNER_FLOW_QUERY_KEY = ["owner-flow"] as const;
const COLUMNS = "id,title,description,zone,location,rooms,price,currency,contact_name,contact_phone,phone_normalized,contact_email,prospect_type,source_platform,lead_score,lifecycle_status,source_url,category,created_at,is_active,do_not_call,ai_score_breakdown,rejection_reason,score,images,quality_score,quality_analysis,quality_analyzed_at,scraped_at";

export function candidateOf(r: { title: string | null; description: string | null; source_url: string | null; prospect_type: string | null; is_active: boolean | null; lifecycle_status: string | null; ai_score_breakdown: unknown }) {
  const b = r.ai_score_breakdown;
  return { ...r, url: r.source_url, owner_verified: b !== null && typeof b === "object" && "explicit_owner_signal" in b && b.explicit_owner_signal === true };
}

async function activeCandidates() {
  const rows = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase.from("prospect_listings").select(COLUMNS)
      .eq("is_active", true).eq("do_not_call", false).or("prospect_type.is.null,prospect_type.neq.agentie")
      .order("created_at", { ascending: false }).order("id").range(page * 500, page * 500 + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows.filter((r) => {
    const c = candidateOf(r);
    return isActiveOwnerListing(c) && isResidentialRealEstate(c) && isIndividualOwnerListing(c) && ownerVerification(c) !== "agency" && !hasImplausiblePrice(c);
  });
}

export async function fetchOwnerReview() {
  return (await activeCandidates()).filter((r) => r.lifecycle_status === "to_review" || ownerVerification(candidateOf(r)) === "review");
}

async function conversationsFor(phones: string[]) {
  const conversations = [];
  const variants = [...new Set(phones.flatMap((p) => [p, p.slice(1), `0${p.slice(3)}`, `00${p.slice(1)}`]))];
  for (let start = 0; start < variants.length; start += 100) {
    const { data, error } = await supabase.from("wa_conversations").select("phone_normalized,last_inbound_at,last_outbound_at").in("phone_normalized", variants.slice(start, start + 100));
    if (error) throw error;
    conversations.push(...(data ?? []));
  }
  return conversations;
}

export async function fetchOwnerContactReady() {
  const candidates = (await activeCandidates()).filter((r) => ["new", "callback"].includes(r.lifecycle_status ?? "")
    && ownerVerification(candidateOf(r)) === "confirmed" && isWhatsappCapable(normalizeRoPhone(r.phone_normalized || r.contact_phone)));
  const contacted = new Set<string>();
  const blockedPhones = new Set<string>();
  for (let start = 0; start < candidates.length; start += 100) {
    const { data, error } = await supabase.from("owner_outreach_messages").select("prospect_listing_id,phone_normalized").in("prospect_listing_id", candidates.slice(start, start + 100).map((r) => r.id));
    if (error) throw error;
    for (const m of data ?? []) {
      contacted.add(m.prospect_listing_id);
      const phone = normalizeRoPhone(m.phone_normalized);
      if (phone) blockedPhones.add(phone);
    }
  }
  const phones = candidates.map((r) => normalizeRoPhone(r.phone_normalized || r.contact_phone)).filter((p): p is string => p !== null);
  const variants = [...new Set(phones.flatMap((p) => [p, p.slice(1), `0${p.slice(3)}`, `00${p.slice(1)}`]))];
  for (let start = 0; start < variants.length; start += 100) {
    const { data, error } = await supabase.from("owner_outreach_messages").select("phone_normalized").in("phone_normalized", variants.slice(start, start + 100));
    if (error) throw error;
    for (const message of data ?? []) {
      const phone = normalizeRoPhone(message.phone_normalized);
      if (phone) blockedPhones.add(phone);
    }
  }
  for (const c of await conversationsFor(phones)) {
    const phone = normalizeRoPhone(c.phone_normalized);
    if (phone && (c.last_inbound_at || c.last_outbound_at)) blockedPhones.add(phone);
  }
  const seen = new Set<string>();
  return candidates.sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0)).filter((r) => {
    const phone = normalizeRoPhone(r.phone_normalized || r.contact_phone);
    if (!phone || contacted.has(r.id) || blockedPhones.has(phone) || seen.has(phone)) return false;
    seen.add(phone);
    return true;
  });
}

export async function fetchOwnerReminders() {
  const { data: rows, error } = await supabase.from("owner_outreach_messages")
    .select("id,prospect_listing_id,phone_normalized,offer_price,currency,duration_months,reminder_stage,next_reminder_at,sent_at,channel,template_key")
    .is("replied_at", null).not("next_reminder_at", "is", null).lt("reminder_stage", 2)
    .in("status", ["sent", "followed_up"]).order("next_reminder_at", { ascending: true }).limit(500);
  if (error) throw error;
  const ids = [...new Set((rows ?? []).map((r) => r.prospect_listing_id))];
  const listings = new Map<string, Awaited<ReturnType<typeof activeCandidates>>[number]>();
  for (let start = 0; start < ids.length; start += 100) {
    const { data, error: listingError } = await supabase.from("prospect_listings").select(COLUMNS).in("id", ids.slice(start, start + 100));
    if (listingError) throw listingError;
    for (const l of data ?? []) listings.set(l.id, l);
  }
  const phones = (rows ?? []).map((r) => normalizeRoPhone(r.phone_normalized)).filter((p): p is string => p !== null);
  const inbound = new Set<string>();
  for (const c of await conversationsFor(phones)) {
    const phone = normalizeRoPhone(c.phone_normalized);
    if (phone && c.last_inbound_at) inbound.add(phone);
  }
  const seen = new Set<string>();
  const all = (rows ?? []).flatMap((r) => {
    const listing = listings.get(r.prospect_listing_id);
    const phone = normalizeRoPhone(r.phone_normalized);
    if (!listing || listing.do_not_call || !isActiveOwnerListing(candidateOf(listing)) || !phone || !isWhatsappCapable(phone)
      || ownerVerification(candidateOf(listing)) !== "confirmed" || seen.has(phone) || inbound.has(phone)) return [];
    seen.add(phone);
    return [{ ...r, phone_normalized: phone, listing }];
  });
  const now = Date.now();
  return {
    due: all.filter((r) => r.next_reminder_at && new Date(r.next_reminder_at).getTime() <= now),
    upcoming: all.filter((r) => r.next_reminder_at && new Date(r.next_reminder_at).getTime() > now),
  };
}