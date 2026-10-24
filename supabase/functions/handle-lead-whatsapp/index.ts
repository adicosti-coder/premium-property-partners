// Receives the "Calcul venit" form data and forwards a personalised
// WhatsApp message to Make.com via MAKE_WHATSAPP_WEBHOOK_URL.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  nume: z.string().trim().min(2).max(80),
  telefon: z.string().trim().regex(/^(\+?4?0)?7\d{8}$/),
  zona: z.string().trim().min(2).max(60),
  numar_camere: z.string().trim().min(1).max(30),
  venit_estimat_min: z.number().int().min(0).max(100000),
  venit_estimat_max: z.number().int().min(0).max(100000),
});

const ROOM_LABELS: Record<string, string> = {
  garsoniera: "garsoniera",
  "2-camere": "apartamentul de 2 camere",
  "3-camere": "apartamentul de 3 camere",
  "4-camere": "apartamentul de 4 camere",
  casa: "casa",
};

/** Romanian mobile → full international digits without "+" (07… → 407…). */
const toIntl = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("40")) return d;
  if (d.startsWith("0")) return `4${d}`;
  return `40${d}`;
};

const fmt = (n: number) => n.toLocaleString("ro-RO");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const d = parsed.data;
  if (d.venit_estimat_max < d.venit_estimat_min) return json({ error: "Interval venit invalid" }, 400);

  const webhookUrl = Deno.env.get("MAKE_WHATSAPP_WEBHOOK_URL");
  if (!webhookUrl) {
    console.warn("MAKE_WHATSAPP_WEBHOOK_URL not configured");
    return json({ skipped: true, reason: "webhook_not_configured" });
  }

  const prenume = d.nume.split(/\s+/)[0];
  const tip = ROOM_LABELS[d.numar_camere] ?? d.numar_camere;
  const mesaj = [
    `Bună, ${prenume}! Sunt de la RealTrust Timișoara.`,
    ``,
    `Am primit calculul de venit pentru ${tip} din ${d.zona}.`,
    `Estimarea în regim hotelier: ${fmt(d.venit_estimat_min)} – ${fmt(d.venit_estimat_max)} € pe lună, randament 6,5–9,4% net estimat.`,
    ``,
    `Cifrele exacte depind de apartament. Când ți-ar fi comod o discuție scurtă de 10 minute?`,
  ].join("\n");

  const payload = {
    event: "calcul_venit_lead",
    timestamp: new Date().toISOString(),
    phone: toIntl(d.telefon),
    nume: d.nume,
    zona: d.zona,
    numar_camere: d.numar_camere,
    venit_estimat_min: d.venit_estimat_min,
    venit_estimat_max: d.venit_estimat_max,
    message: mesaj,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Make webhook failed [${res.status}]: ${text}`);
      return json({ error: "Webhook failed", status: res.status, details: text }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("handle-lead-whatsapp error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
