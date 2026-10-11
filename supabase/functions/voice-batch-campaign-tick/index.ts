// Campanie Andrei: sună pe rând DOAR prospectele fără WhatsApp (Meta 131026),
// neapelate încă (fără tag „apelat-andrei”), L–S 09:00–19:00 (Europe/Bucharest),
// un singur apel odată, cu pauză configurabilă după încheierea apelului anterior.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalNumber } from "../_shared/waInternalNumbers.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function bucharestNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(new Date());
  return { day: parts.find((p) => p.type === "weekday")!.value, hour: Number(parts.find((p) => p.type === "hour")!.value) };
}
const toE164 = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "").replace(/^0040/, "40");
  const n = d.startsWith("40") ? d : d.startsWith("0") ? `40${d.slice(1)}` : d;
  return n ? `+${n}` : "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(URL_, KEY);
  const now = new Date();

  const { data: c } = await sb.from("voice_batch_campaign").select("*").eq("id", 1).maybeSingle();
  const save = async (patch: Record<string, unknown>) =>
    sb.from("voice_batch_campaign").update({ ...patch, last_tick_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", 1);
  if (!c?.enabled) return json({ skipped: "paused" });

  // 1. Apel în curs?
  if (c.current_session_id) {
    const { data: s } = await sb.from("voice_call_sessions").select("ended_at, status, created_at").eq("id", c.current_session_id).maybeSingle();
    const stale = s && now.getTime() - new Date(s.created_at).getTime() > 20 * 60_000;
    if (s && !s.ended_at && !stale) { await save({}); return json({ skipped: "in_call" }); }
    await save({ current_session_id: null, current_prospect_id: null, current_label: null, last_call_ended_at: s?.ended_at || now.toISOString() });
    return json({ ok: "call_finished" });
  }

  // 2. Orar L–S 09–19
  const { day, hour } = bucharestNow();
  if (day === "Sun" || hour < 9 || hour >= 19) { await save({ last_message: "În afara orarului (L–S 09:00–19:00) — reia automat la 09:00." }); return json({ skipped: "outside_hours" }); }

  // 3. Pauză între apeluri
  if (c.last_call_ended_at && now.getTime() - new Date(c.last_call_ended_at).getTime() < c.delay_minutes * 60_000) {
    await save({ last_message: `Pauză ${c.delay_minutes} min între apeluri.` }); return json({ skipped: "delay" });
  }

  // 4. Următorul prospect: EXCLUSIV 131026, neapelat de Andrei
  const { data: q } = await sb.from("wa_outbound_queue").select("prospect_listing_id").eq("status", "failed")
    .ilike("last_error", "%131026%").not("prospect_listing_id", "is", null).limit(1000);
  const ids = [...new Set((q ?? []).map((r: any) => r.prospect_listing_id))];
  if (!ids.length) { await save({ last_message: "Nu mai sunt prospecte fără WhatsApp de sunat." }); return json({ skipped: "empty" }); }
  const { data: rows } = await sb.from("prospect_listings").select("id, title, owner_name, phone_normalized, contact_phone, tags")
    .in("id", ids).eq("is_active", true).is("published_at", null).eq("do_not_call", false).order("created_at", { ascending: true }).limit(200);
  const next = (rows ?? []).find((r: any) => {
    const tags = (r.tags as string[]) || [];
    const to = toE164(r.phone_normalized || r.contact_phone);
    return !tags.includes("apelat-andrei") && /^\+407\d{8}$/.test(to) && !isInternalNumber(to);
  });
  if (!next) { await save({ last_message: "Toate prospectele fără WhatsApp au fost deja apelate de Andrei." }); return json({ skipped: "all_called" }); }

  const to = toE164(next.phone_normalized || next.contact_phone);
  const res = await fetch(`${URL_}/functions/v1/voice-agent-initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ toNumber: to, prospectId: next.id }),
  });
  const out = await res.json().catch(() => ({}));
  const label = next.owner_name || to;
  if (!res.ok || !out?.sessionId) {
    // Marcăm ca încercat ca să nu blocăm coada pe același număr.
    const tags = [...new Set([...((next.tags as string[]) || []), "apelat-andrei"])];
    await sb.from("prospect_listings").update({ tags }).eq("id", next.id);
    await save({ last_call_ended_at: now.toISOString(), last_message: `Apel nepornit către ${label}: ${out?.error || out?.skipped || res.status}` });
    return json({ error: "initiate_failed", details: out });
  }
  await save({ current_session_id: out.sessionId, current_prospect_id: next.id, current_label: label, calls_started: (c.calls_started || 0) + 1, last_message: null });
  return json({ ok: "calling", to, sessionId: out.sessionId });
});
