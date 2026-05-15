// Lead Auto-Dedup
// Computes a normalized dedup_key for prospect_listings missing it (phone+zone+rooms+size band),
// then marks newer rows as duplicate_of the earliest matching row. Safe & idempotent.
// Supports dry_run.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BATCH = 100;

function normalizePhone(p: string | null): string {
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("40") && digits.length >= 11) return digits.slice(0, 11);
  if (digits.startsWith("0") && digits.length === 10) return "4" + digits.slice(0, 10);
  return digits.slice(-10);
}
function sizeBand(size: number | null): string {
  if (!size || size <= 0) return "—";
  return `${Math.floor(size / 10) * 10}`;
}
function normalizeZone(zone: string | null, location: string | null): string {
  const raw = (zone ?? location ?? "").toLowerCase().trim();
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "unknown";
}
function buildKey(row: {
  contact_phone: string | null; phone_normalized: string | null;
  zone: string | null; location: string | null;
  rooms: number | null; size: number | null;
}): string | null {
  const phone = row.phone_normalized || normalizePhone(row.contact_phone);
  if (!phone) return null;
  return `${phone}|${normalizeZone(row.zone, row.location)}|${row.rooms ?? 0}|${sizeBand(row.size)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const dryRun = body?.dry_run === true;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: missing, error: e1 } = await supabase
    .from("prospect_listings")
    .select("id, contact_phone, phone_normalized, zone, location, rooms, size, created_at")
    .is("dedup_key", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(BATCH);

  if (e1) {
    return new Response(JSON.stringify({ error: e1.message, dry_run: dryRun }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let keysWritten = 0;
  const sampleKeys: Array<{ id: string; key: string }> = [];
  for (const row of missing ?? []) {
    const key = buildKey(row);
    if (!key) continue;
    if (!dryRun) await supabase.from("prospect_listings").update({ dedup_key: key }).eq("id", row.id);
    keysWritten++;
    if (sampleKeys.length < 10) sampleKeys.push({ id: row.id, key });
  }

  // Find duplicate groups
  const { data: rows } = await supabase
    .from("prospect_listings")
    .select("id, dedup_key, created_at, duplicate_of")
    .not("dedup_key", "is", null)
    .is("duplicate_of", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  const byKey = new Map<string, Array<{ id: string; created_at: string }>>();
  for (const r of rows ?? []) {
    const arr = byKey.get(r.dedup_key!) ?? [];
    arr.push({ id: r.id, created_at: r.created_at });
    byKey.set(r.dedup_key!, arr);
  }
  const groups: Array<{ dedup_key: string; ids: string[] }> = [];
  for (const [k, arr] of byKey) {
    if (arr.length > 1) {
      arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
      groups.push({ dedup_key: k, ids: arr.map((x) => x.id) });
    }
  }

  let duplicatesMarked = 0;
  const sampleGroups: Array<{ dedup_key: string; primary: string; duplicates: string[] }> = [];
  for (const g of groups) {
    const [primary, ...rest] = g.ids;
    if (rest.length === 0) continue;
    if (!dryRun) {
      const { error } = await supabase
        .from("prospect_listings")
        .update({ duplicate_of: primary, is_active: false })
        .in("id", rest);
      if (!error) duplicatesMarked += rest.length;
    } else {
      duplicatesMarked += rest.length;
    }
    if (sampleGroups.length < 10) sampleGroups.push({ dedup_key: g.dedup_key, primary, duplicates: rest });
  }

  return new Response(JSON.stringify({
    dry_run: dryRun,
    keys_written: dryRun ? 0 : keysWritten,
    would_write_keys: dryRun ? keysWritten : undefined,
    duplicate_groups: groups.length,
    duplicates_marked: dryRun ? 0 : duplicatesMarked,
    would_mark_duplicates: dryRun ? duplicatesMarked : undefined,
    batch_size: missing?.length ?? 0,
    sample_keys: sampleKeys,
    sample_groups: sampleGroups,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
