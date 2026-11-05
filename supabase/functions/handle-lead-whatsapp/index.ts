// Receives the "Calcul venit" form data and forwards a personalised
// WhatsApp message to Make.com via MAKE_WHATSAPP_WEBHOOK_URL.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendToMake } from "./sendToMake.ts";
import { notifyCalculatorLead } from "./metaNotify.ts";
import { calcLeadAdminUrl } from "../_shared/calculatorLeadTemplates.ts";
import { getLeadLocationDetails, getLeadPropertyDetails, getLocationLeadMessage } from "./propertyDetails.ts";
import { appendSocialFollow, runtimeSocialProfiles } from "../_shared/socialFollow.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  nume: z.string().trim().min(2).max(80),
  // Separatorii sunt o chestiune de afișare: vizitatorul tastează „0722 123 456”
  // sau browserul completează „+40 722 123 456”; cifra rămâne una și aceeași.
  telefon: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/[\s\-().]/g, "") : v),
    z.string().trim().regex(/^(\+?4?0)?7\d{8}$/),
  ),
  zona: z.string().trim().min(2).max(120).regex(/^[^\r\n<>]+$/),
  location_mode: z.enum(["local", "regional"]).optional(),
  numar_camere: z.preprocess((v) => typeof v === "number" ? String(v) : v, z.string().trim().min(1).max(30).optional()),
  property_type: z.string().trim().min(1).max(50).optional(),
  property_type_label: z.string().trim().min(1).max(60).optional(),
  tip_proprietate: z.string().trim().min(1).max(60).optional(),
  venit_estimat_min: z.number().int().min(0).max(100000),
  venit_estimat_max: z.number().int().min(0).max(100000),
  // Detalii opționale din etapele 2-3 ale formularului.
  suprafata_mp: z.number().int().min(10).max(5000).optional(),
  stare: z.string().trim().max(40).optional(),
  mobilat: z.string().trim().max(40).optional(),
  disponibilitate: z.string().trim().max(40).optional(),
  situatie_actuala: z.string().trim().max(40).optional(),
  tip_administrare: z.string().trim().max(40).optional(),
  observatii: z.string().trim().max(500).optional(),
  // Calculatorul ROI (/calculator-randament).
  email: z.string().trim().email().max(255).optional(),
  parcare: z.boolean().optional(),
  finisaje: z.enum(["standard", "premium"]).optional(),
  chirie_clasica: z.number().int().min(0).max(100000).optional(),
  venit_net_realtrust: z.number().int().min(0).max(100000).optional(),
  sursa: z.string().trim().max(40).optional(),
  lead_id: z.string().uuid().optional(),
});


/** Romanian mobile → full international digits without "+" (07… → 407…). */
const toIntl = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("40")) return d;
  if (d.startsWith("0")) return `4${d}`;
  return `40${d}`;
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const d = parsed.data;
  if (d.venit_estimat_max < d.venit_estimat_min) return json({ error: "Interval venit invalid" }, 400);

  // Trimitere directă prin Meta doar pentru o cerere salvată recent, cu același telefon —
  // altfel oricine ar putea folosi funcția ca să trimită mesaje.
  let direct: Awaited<ReturnType<typeof notifyCalculatorLead>> | null = null;
  {
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const last9 = (s: string) => s.replace(/\D/g, "").slice(-9);
      // Formularul salvează direct (fără id întors), deci găsim cererea după telefon.
      let query = supabase.from("leads").select("id, whatsapp_number, created_at, simulation_data");
      query = d.lead_id
        ? query.eq("id", d.lead_id)
        : query.ilike("whatsapp_number", `%${last9(d.telefon)}`)
          .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
          .order("created_at", { ascending: false }).limit(1);
      const { data: rows } = await query;
      const lead = rows?.[0];
      if (lead) d.lead_id = lead.id;
      const fresh = lead && Date.now() - new Date(lead.created_at).getTime() < 15 * 60_000;
      if (lead && fresh && last9(lead.whatsapp_number ?? "") === last9(d.telefon)) {
        const loc = getLeadLocationDetails(d);
        const label = d.property_type_label ?? d.tip_proprietate ?? "Proprietate";
        direct = await notifyCalculatorLead(supabase, {
          leadId: lead.id, name: d.nume, phone: toIntl(d.telefon), location: loc.location,
          serviceTag: [lead.simulation_data?.repeat_submission ? "[Calcul nou / Actualizat]" : null, loc.service_tag].filter(Boolean).join(" ") || null, property: `${label}${d.suprafata_mp ? ` · ${d.suprafata_mp} mp` : ""}`,
          incomeRange: `${d.venit_estimat_min} – ${d.venit_estimat_max} €/lună`,
        });
        console.log(`handle-lead-whatsapp direct lead=${lead.id} admin=${JSON.stringify(direct.admin)} visitor=${JSON.stringify(direct.visitor)}`);
      } else {
        console.warn(`handle-lead-whatsapp: lead ${d.lead_id} not eligible for direct send`);
      }
    } catch (e) {
      console.error("handle-lead-whatsapp direct send failed", e);
    }
  }

  const webhookUrl = Deno.env.get("MAKE_WHATSAPP_WEBHOOK_URL");
  if (!webhookUrl) {
    console.warn("MAKE_WHATSAPP_WEBHOOK_URL not configured");
    return json({ ok: true, webhook: "not_configured", delivery: direct });
  }

  const mesaj = getLocationLeadMessage(d) ?? [
    `Bună ziua! Cu mare drag vă ajutăm cu o estimare exactă de randament pentru Timișoara! 📊`,
    ``,
    `Pentru a vă calcula venitul net estimat (chirie clasică vs. regim hotelier), scrieți-ne scurt:`,
    ``,
    ...(d.property_type_label || d.tip_proprietate ? [`• Tip proprietate: ${d.property_type_label ?? d.tip_proprietate}`] : []),
    `• În ce zonă / complex se află proprietatea? (ex: Torontalului, Complex, Centru)`,
    `• Câte camere are și ce stare/dotări are?`,
    ``,
    `Analizăm datele pe zonă și revenim direct aici pe WhatsApp cu simularea detaliată!`,
  ].join("\n");

  const payload = {
    event: "calcul_venit_lead",
    timestamp: new Date().toISOString(),
    // Chei canonice cerute de scenariul Make (formularul calculator_roi_widget).
    name: d.nume,
    phone: toIntl(d.telefon),
    email: d.email ?? null,
    location: d.zona,
    ...getLeadLocationDetails(d),
    ...getLeadPropertyDetails(d),
    surface: d.suprafata_mp ?? null,
    // Cheile istorice rămân în payload pentru compatibilitatea hărții Make.
    nume: d.nume,
    zona: d.zona,
    venit_estimat_min: d.venit_estimat_min,
    venit_estimat_max: d.venit_estimat_max,
    suprafata_mp: d.suprafata_mp ?? null,
    stare: d.stare ?? null,
    mobilat: d.mobilat ?? null,
    disponibilitate: d.disponibilitate ?? null,
    situatie_actuala: d.situatie_actuala ?? null,
    tip_administrare: d.tip_administrare ?? null,
    observatii: d.observatii ?? null,
    parcare: d.parcare ?? null,
    finisaje: d.finisaje ?? null,
    chirie_clasica: d.chirie_clasica ?? null,
    venit_net_realtrust: d.venit_net_realtrust ?? null,
    sursa: d.sursa ?? "calcul_venit",
    lead_id: d.lead_id ?? null,
    lead_url: d.lead_id ? calcLeadAdminUrl(d.lead_id) : null,
    // Confirmarea către vizitator a plecat deja prin șablonul Meta aprobat.
    whatsapp_template_sent: direct?.visitor.status === "sent",
    message: appendSocialFollow(mesaj, runtimeSocialProfiles()),
  };

  // Make.com e un canal secundar: vizitatorul are cererea salvată deja, deci
  // așteptăm webhook-ul maximum 3 secunde și răspundem mereu cu succes.
  // Un Make lent, stricat sau indisponibil se înregistrează în loguri, nu
  // blochează formularul și nu afișează o eroare clientului.
  const sent = await sendToMake(webhookUrl, payload);
  if (sent.status !== "sent") {
    console.error(
      `handle-lead-whatsapp: Make webhook ${sent.status} after ${sent.elapsedMs}ms: ${sent.detail}`,
    );
  }
  return json({ ok: true, webhook: sent.status, delivery: direct });
});
