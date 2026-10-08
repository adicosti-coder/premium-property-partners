// Recuperare automată a telefonului pentru anunțurile noi fără număr (OLX/Storia/Publi24...).
// Rulează din cron; apelează prospect-recover-phone (simulare „Arată telefonul”) pentru
// anunțurile individuale încă neîncercate. Telefonul găsit pornește automat inspecția (trigger DB).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const INDIVIDUAL = /olx\.ro\/d\/oferta\/|storia\.ro\/ro\/oferta\/|publi24\.ro\/anunturi\/.+\/anunt\/|anuntul\.ro\/anunt|bursaimobiliara\.ro\/.+\d{5,}/i;
const BATCH = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);

  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data, error } = await sb
    .from("prospect_listings")
    .select("id, source_url, admin_notes")
    .eq("is_active", true)
    .is("phone_normalized", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return json({ error: error.message }, 500);

  const todo = (data ?? [])
    .filter((p) => p.source_url && INDIVIDUAL.test(p.source_url) && !/recover-phone/.test(p.admin_notes ?? ""))
    .slice(0, BATCH);

  const results: Array<{ id: string; found: boolean; error?: string }> = [];
  for (const p of todo) {
    try {
      const r = await fetch(`${url}/functions/v1/prospect-recover-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-webhook-secret": key },
        body: JSON.stringify({ prospect_id: p.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false) {
        // Marchează încercarea ca să nu reluăm la nesfârșit același anunț.
        const note = `[recover-phone ${new Date().toISOString().slice(0, 16)}] eroare: ${String(j?.error ?? r.status).slice(0, 120)}`;
        await sb.from("prospect_listings").update({ admin_notes: [p.admin_notes, note].filter(Boolean).join("\n") }).eq("id", p.id);
        results.push({ id: p.id, found: false, error: String(j?.error ?? r.status) });
      } else {
        results.push({ id: p.id, found: !!j?.found });
      }
    } catch (e) {
      results.push({ id: p.id, found: false, error: String(e) });
    }
  }
  return json({ checked: todo.length, recovered: results.filter((r) => r.found).length, results });
});
