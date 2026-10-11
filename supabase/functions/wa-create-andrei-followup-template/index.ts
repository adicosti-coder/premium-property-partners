// Trimite la aprobare Meta șablonul de follow-up după un „DA” în apelul cu Andrei. Internal/admin only.
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "../_shared/waConfig.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { ANDREI_FOLLOWUP_TEMPLATE } from "../_shared/andreiFollowup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BODY = "Bună ziua, {{1}}! Vă mulțumim pentru discuția telefonică cu Andrei, asistentul RealTrust Timișoara. Așa cum am convenit, vă trimitem pe scurt ce vă oferim: {{2}}. Analiza gratuită a proprietății dumneavoastră o găsiți aici: {{3}} Pentru întrebări, răspundeți la acest mesaj. Dacă nu mai doriți mesaje, scrieți STOP.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const token = waToken();
  if (!token) return json({ error: "missing_credentials" }, 500);
  const base = `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates`;
  const r = await fetch(base, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: ANDREI_FOLLOWUP_TEMPLATE, category: "UTILITY", language: "ro",
      components: [{ type: "BODY", text: BODY, example: { body_text: [["Ion", "evaluare corectă de piață, calificarea cumpărătorilor și asistență juridică până la semnare", "https://realtrust.ro/analiza-gratuita?ref=andrei"]] } }],
    }),
  });
  const meta = await r.json().catch(() => ({}));
  return json({ ok: r.ok, status: r.status, meta });
});
