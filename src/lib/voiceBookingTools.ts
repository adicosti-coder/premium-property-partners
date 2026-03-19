import { supabase } from "@/lib/supabaseClient";

/**
 * Client tools for ElevenLabs voice agent to handle bookings.
 * These tools must also be configured in the ElevenLabs dashboard
 * for the agent to be able to call them.
 */

interface CheckAvailabilityParams {
  property_name: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
}

interface CreateBookingParams {
  property_name: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_count?: number;
}

interface ListPropertiesParams {
  guest_count?: number;
}

async function findPropertyByName(name: string) {
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug, capacity, base_price_per_night, weekend_price_per_night, location")
    .eq("is_active", true)
    .eq("tag", "Cazare");

  if (!properties?.length) return null;

  const lower = name.toLowerCase();
  // Try exact-ish match first, then partial
  return (
    properties.find((p) => p.name.toLowerCase() === lower) ||
    properties.find((p) => p.name.toLowerCase().includes(lower)) ||
    properties.find((p) => lower.includes(p.slug?.toLowerCase() || "___")) ||
    properties.find((p) => {
      const words = lower.split(/\s+/);
      return words.some((w) => w.length > 3 && p.name.toLowerCase().includes(w));
    })
  );
}

async function checkConflicts(propertyId: string, checkIn: string, checkOut: string) {
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, guest_name")
    .eq("property_id", propertyId as any)
    .neq("status", "cancelled")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  return conflicts || [];
}

export const voiceBookingTools = {
  list_properties: async (params: ListPropertiesParams) => {
    try {
      let query = supabase
        .from("properties")
        .select("name, capacity, base_price_per_night, location")
        .eq("is_active", true)
        .eq("tag", "Cazare")
        .order("display_order");

      if (params.guest_count) {
        query = query.gte("capacity", params.guest_count);
      }

      const { data, error } = await query;
      if (error) return `Eroare: ${error.message}`;
      if (!data?.length) return "Nu am găsit proprietăți disponibile pentru cazare.";

      const list = data
        .map((p) => `• ${p.name} — ${p.capacity} persoane, ${p.base_price_per_night || "preț la cerere"} €/noapte, ${p.location}`)
        .join("\n");

      return `Proprietăți disponibile pentru cazare:\n${list}`;
    } catch (e: any) {
      return `Eroare la căutarea proprietăților: ${e.message}`;
    }
  },

  check_availability: async (params: CheckAvailabilityParams) => {
    try {
      const property = await findPropertyByName(params.property_name);
      if (!property) {
        return `Nu am găsit proprietatea "${params.property_name}". Puteți cere lista proprietăților disponibile.`;
      }

      const conflicts = await checkConflicts(property.id, params.check_in, params.check_out);

      if (conflicts.length > 0) {
        return `Proprietatea "${property.name}" NU este disponibilă în perioada ${params.check_in} – ${params.check_out}. Există ${conflicts.length} rezervare(i) care se suprapune. Doriți să verificăm altă proprietate sau altă perioadă?`;
      }

      const nights = Math.ceil(
        (new Date(params.check_out).getTime() - new Date(params.check_in).getTime()) / 86400000
      );
      const price = property.base_price_per_night
        ? `Preț estimat: ${nights * property.base_price_per_night} € (${nights} nopți × ${property.base_price_per_night} €).`
        : "";

      return `Proprietatea "${property.name}" este DISPONIBILĂ în perioada ${params.check_in} – ${params.check_out}. Capacitate: ${property.capacity} persoane. ${price} Doriți să fac rezervarea?`;
    } catch (e: any) {
      return `Eroare la verificarea disponibilității: ${e.message}`;
    }
  },

  create_booking: async (params: CreateBookingParams) => {
    try {
      const property = await findPropertyByName(params.property_name);
      if (!property) {
        return `Nu am găsit proprietatea "${params.property_name}".`;
      }

      if (params.guest_count && property.capacity && params.guest_count > property.capacity) {
        return `Proprietatea "${property.name}" are capacitate maximă de ${property.capacity} persoane, dar ați solicitat ${params.guest_count}. Doriți să vedem altă proprietate?`;
      }

      // Re-check availability
      const conflicts = await checkConflicts(property.id, params.check_in, params.check_out);
      if (conflicts.length > 0) {
        return `Din păcate, proprietatea "${property.name}" a fost între timp rezervată pentru perioada ${params.check_in} – ${params.check_out}. Doriți altă perioadă?`;
      }

      const { data, error } = await supabase.from("bookings").insert({
        property_id: property.id as any,
        check_in: params.check_in,
        check_out: params.check_out,
        guest_name: params.guest_name,
        source: "voice-concierge",
        status: "confirmed",
      }).select("id").single();

      if (error) {
        console.error("[VoiceBooking] Insert error:", error);
        return `Eroare la crearea rezervării: ${error.message}`;
      }

      const nights = Math.ceil(
        (new Date(params.check_out).getTime() - new Date(params.check_in).getTime()) / 86400000
      );

      return `Rezervare creată cu succes! 🎉\nProprietate: ${property.name}\nOaspete: ${params.guest_name}\nPerioadă: ${params.check_in} → ${params.check_out} (${nights} nopți)\nID rezervare: ${data.id}\n\nO confirmare va fi trimisă în curând. Vă mulțumim!`;
    } catch (e: any) {
      return `Eroare la crearea rezervării: ${e.message}`;
    }
  },
};
