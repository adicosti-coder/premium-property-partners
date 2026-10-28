// Fallback vocal: când WhatsApp nu poate livra mesajul (număr fără WhatsApp,
// eroare de trimitere), proprietarul intră o singură dată în coada lui Andrei.
// Apelul pleacă tot prin `voice-batch-campaign-tick` (L–S 09–20, câte unul).
// deno-lint-ignore no-explicit-any
type Sb = any;

export async function queueVoiceFallback(sb: Sb, id: string, scenario: string | null = null): Promise<boolean> {
  const { data: p } = await sb.from("prospect_listings")
    .select("phone_normalized, contact_phone, seller_type, do_not_call, is_active, lifecycle_status, tags, andrei_queued_at")
    .eq("id", id).maybeSingle();
  if (!p) return false;
  const digits = String(p.phone_normalized || p.contact_phone || "").replace(/\D/g, "").replace(/^0040/, "40");
  const e164 = digits.startsWith("40") ? digits : digits.startsWith("0") ? `40${digits.slice(1)}` : digits;
  const tags: string[] = p.tags ?? [];
  if (!/^407\d{8}$/.test(e164) || p.seller_type !== "privat" || p.do_not_call || !p.is_active) return false;
  if (!["new", "callback"].includes(p.lifecycle_status ?? "") || p.andrei_queued_at || tags.includes("apelat-andrei")) return false;
  const now = new Date().toISOString();
  const { data } = await sb.from("prospect_listings")
    .update({ andrei_queued_at: now, andrei_call_after: now, andrei_queue_scenario: scenario ?? "Fallback: WhatsApp nelivrat" })
    .eq("id", id).is("andrei_queued_at", null).select("id");
  return (data ?? []).length > 0;
}
