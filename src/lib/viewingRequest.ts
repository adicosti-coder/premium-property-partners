import { z } from "zod";
import { roMobileField } from "./phoneField";
import { submitLead } from "./leadSubmission";
import { formatPhoneInput, trackConversion } from "./conversionTracking";
import { withCampaignTracking } from "./campaignAttribution";

export const viewingRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: roMobileField("phone_invalid"),
  timeSlot: z.enum(["morning", "afternoon", "evening"]),
  propertyId: z.string().trim().min(1).max(150),
  propertyName: z.string().trim().min(1).max(200),
});

export async function saveViewingRequest(raw: z.input<typeof viewingRequestSchema>, captchaToken: string) {
  const parsed = viewingRequestSchema.safeParse(raw);
  if (!parsed.success || !captchaToken) throw new Error("Date invalide sau verificare de securitate incompletă.");
  const d = parsed.data;
  const labels = { morning: "Dimineață (9:00–12:00)", afternoon: "După-amiază (12:00–17:00)", evening: "Seara (17:00–20:00)" };
  const message = `Vizionare: ${d.propertyName} (${d.propertyId})\nNume: ${d.name}\nTelefon: ${d.phone}\nInterval: ${labels[d.timeSlot]}`;
  const result = await submitLead({
    name: d.name, whatsapp_number: formatPhoneInput(d.phone),
    property_type: "apartament", property_area: 0,
    message, source: "whatsapp_viewing", viaServer: true, captcha_token: captchaToken,
    simulation_data: withCampaignTracking({ property_id: d.propertyId, property_name: d.propertyName, time_slot: d.timeSlot, status_label: "Nou - WhatsApp", page_url: `${window.location.origin}${window.location.pathname}` }),
  });
  if (!result.ok || !result.leadId) throw new Error("Cererea nu a putut fi salvată. Încearcă din nou.");
  trackConversion({ event: "Lead_Submit", source: "whatsapp_viewing", property_id: d.propertyId });
  return { leadId: result.leadId, whatsappUrl: `https://wa.me/40799069256?text=${encodeURIComponent(message)}` };
}