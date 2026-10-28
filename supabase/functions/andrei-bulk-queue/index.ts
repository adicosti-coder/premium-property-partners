// Trimitere manuală „Trimite către Andrei (WhatsApp)”: adminul selectează proprietari,
// iar fiecare primește mesajul de WhatsApp prin fluxul unic Make (`outreach-dispatch`).
// Apelul vocal Andrei NU pornește direct: intră în coada `voice-batch-campaign-tick`
// doar ca fallback, când mesajul WhatsApp nu poate fi trimis/livrat (aici sau prin
// callback-ul `outreach-status` cu status „failed”).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isRoMobileE164, toE164 } from "../_shared/andreiQueue.ts";
import { queueVoiceFallback } from "../_shared/voiceFallback.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = await requireAdmin(req, cors);
  if (!admin.ok) return admin.response!;
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.prospect_ids) ? body.prospect_ids.filter((x: unknown) => typeof x === "string" && UUID.test(x)) : [];
    const scenario = typeof body.scenario === "string" ? body.scenario.slice(0, 80) : null;
    if (!ids.length) return json({ error: "Selectează cel puțin un anunț." }, 400);
    if (ids.length > 100) return json({ error: "Maxim 100 de anunțuri odată." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);
    const { data: rows, error } = await sb.from("prospect_listings")
      .select("id, phone_normalized, contact_phone, seller_type, do_not_call, is_active, lifecycle_status, tags, andrei_queued_at, outreach_status")
      .in("id", ids);
    if (error) throw error;

    const skipped: { id: string; reason: string }[] = [];
    let whatsapp = 0;
    let fallback = 0;
    for (const r of rows ?? []) {
      const to = toE164(r.phone_normalized || r.contact_phone);
      const tags = (r.tags as string[] | null) ?? [];
      const reason = !isRoMobileE164(to) ? "telefon invalid (doar mobil 07…)"
        : r.seller_type !== "privat" ? "proprietar neconfirmat"
        : r.do_not_call ? "nu dorește să fie contactat"
        : !r.is_active ? "anunț inactiv"
        : !["new", "callback"].includes(r.lifecycle_status ?? "") ? "deja procesat"
        : r.outreach_status ? "deja trimis pe WhatsApp"
        : r.andrei_queued_at || tags.includes("apelat-andrei") ? "deja trimis la Andrei"
        : null;
      if (reason) { skipped.push({ id: r.id, reason }); continue; }

      // Un singur canal de WhatsApp: outreach-dispatch → Make (fără trimiteri duble).
      const res = await fetch(`${url}/functions/v1/outreach-dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "x-webhook-secret": key },
        body: JSON.stringify({ prospect_id: r.id }),
        signal: AbortSignal.timeout(15_000),
      }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: String(e) }) }) as unknown as Response);
      const out = await res.json().catch(() => ({})) as { ok?: boolean; skipped?: string[]; error?: string };
      if (res.ok && out.ok) { whatsapp++; continue; }
      if (res.ok && out.skipped?.length) {
        const s = out.skipped;
        // Fără webhook WhatsApp configurat → mesajul nu poate pleca, deci fallback pe apel.
        if (s.includes("webhook_not_configured") && await queueVoiceFallback(sb, r.id, scenario)) { fallback++; continue; }
        skipped.push({ id: r.id, reason: `WhatsApp sărit: ${s.join(", ")}` });
        continue;
      }
      // Trimiterea WhatsApp a eșuat → Andrei sună ca fallback.
      if (await queueVoiceFallback(sb, r.id, scenario)) fallback++;
      else skipped.push({ id: r.id, reason: `WhatsApp eșuat: ${String(out.error ?? res.status).slice(0, 120)}` });
    }

    await sb.from("admin_audit_log").insert({
      action: "andrei_bulk_whatsapp", actor_user_id: admin.userId ?? null, entity_type: "prospect_listings", severity: "info",
      details: { whatsapp, voice_fallback: fallback, skipped: skipped.length, scenario },
    }).then(() => {}, () => {});

    return json({ success: true, whatsapp, voice_fallback: fallback, skipped });
  } catch (e) {
    console.error("andrei-bulk-queue error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
