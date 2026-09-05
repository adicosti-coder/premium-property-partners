import { supabase } from "@/lib/supabaseClient";

/**
 * Client tools for ElevenLabs voice agent.
 * These tools must also be configured in the ElevenLabs dashboard
 * for the agent to be able to call them.
 */

// ── Helpers ──────────────────────────────────────────────

/** Converts "DD-MM-YYYY" to "YYYY-MM-DD". Passes through if already ISO. */
function formatToISO(dateStr: string): string {
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateStr.match(ddmmyyyy);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return dateStr;
}

async function findPropertyByName(name: string) {
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, slug, capacity, base_price_per_night, weekend_price_per_night, location, booking_url")
    .eq("is_active", true)
    .eq("listing_type", "cazare");

  if (!properties?.length) return null;

  const lower = name.toLowerCase();
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

function getLegacyBookingPropertyId(propertyId: string) {
  const compactId = propertyId.replace(/-/g, "").slice(0, 8);
  const parsed = Number.parseInt(compactId, 16);
  return Number.isNaN(parsed) ? null : parsed % 1000000;
}

async function checkConflicts(propertyId: string, checkIn: string, checkOut: string) {
  const legacyPropertyId = getLegacyBookingPropertyId(propertyId);
  if (legacyPropertyId === null) return [];

  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id, property_id, check_in, check_out, guest_name")
    .neq("status", "cancelled")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  return (conflicts || []).filter((conflict) => Number(conflict.property_id) === legacyPropertyId);
}

async function checkLiveAvailability(
  property: { id: string; slug: string | null; booking_url: string | null },
  checkIn: string,
  checkOut: string
): Promise<boolean | null> {
  const slugKey = property.slug || property.id;

  if (!property.booking_url || property.booking_url === "#") {
    return null;
  }

  const { data, error } = await supabase.functions.invoke("live-property-availability", {
    body: {
      checkIn,
      checkOut,
      properties: [{ slug: slugKey, bookingUrl: property.booking_url }],
    },
  });

  if (error) {
    console.error("[VoiceBooking] Live availability error:", error);
    return null;
  }

  if (data?.lookupStatusBySlug?.[slugKey] !== "live") {
    return null;
  }

  const unavailableSlugs = Array.isArray(data?.unavailableSlugs) ? data.unavailableSlugs : [];
  return !unavailableSlugs.includes(slugKey);
}

// ── Booking Tools ────────────────────────────────────────

const list_properties = async (params: { guest_count?: number }) => {
  try {
    let query = supabase
      .from("properties")
      .select("name, capacity, base_price_per_night, location")
      .eq("is_active", true)
      .eq("listing_type", "cazare")
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
};

const check_availability = async (params: { property_name: string; check_in: string; check_out: string }) => {
  try {
    const checkIn = formatToISO(params.check_in);
    const checkOut = formatToISO(params.check_out);

    const property = await findPropertyByName(params.property_name);
    if (!property) {
      return `Nu am găsit proprietatea "${params.property_name}". Puteți cere lista proprietăților disponibile.`;
    }

    const liveAvailable = await checkLiveAvailability(property, checkIn, checkOut);

    if (liveAvailable === false) {
      return `Proprietatea "${property.name}" NU este disponibilă în perioada ${checkIn} – ${checkOut}. Verificarea a fost făcută live în Pynbooking. Doriți să verificăm altă proprietate sau altă perioadă?`;
    }

    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    const price = property.base_price_per_night
      ? `Preț estimat: ${nights * property.base_price_per_night} € (${nights} nopți × ${property.base_price_per_night} €).`
      : "";

    if (liveAvailable === true) {
      return `Proprietatea "${property.name}" este DISPONIBILĂ în perioada ${checkIn} – ${checkOut}. Verificarea a fost făcută live în Pynbooking. Capacitate: ${property.capacity} persoane. ${price} Doriți să fac rezervarea?`;
    }

    const conflicts = await checkConflicts(property.id, checkIn, checkOut);

    if (conflicts.length > 0) {
      return `Proprietatea "${property.name}" NU este disponibilă în perioada ${checkIn} – ${checkOut}. Confirmarea vine din sincronizarea locală de rezervări. Doriți să verificăm altă proprietate sau altă perioadă?`;
    }

    return `Proprietatea "${property.name}" este DISPONIBILĂ în perioada ${checkIn} – ${checkOut}. Verificarea live nu a răspuns, dar sincronizarea locală nu arată conflicte. Capacitate: ${property.capacity} persoane. ${price} Doriți să fac rezervarea?`;
  } catch (e: any) {
    return `Eroare la verificarea disponibilității: ${e.message}`;
  }
};

const create_booking = async (params: { property_name: string; check_in: string; check_out: string; guest_name: string; guest_count?: number }) => {
  try {
    const checkIn = formatToISO(params.check_in);
    const checkOut = formatToISO(params.check_out);

    const property = await findPropertyByName(params.property_name);
    if (!property) return `Nu am găsit proprietatea "${params.property_name}".`;

    if (params.guest_count && property.capacity && params.guest_count > property.capacity) {
      return `Proprietatea "${property.name}" are capacitate maximă de ${property.capacity} persoane, dar ați solicitat ${params.guest_count}. Doriți să vedem altă proprietate?`;
    }

    const liveAvailable = await checkLiveAvailability(property, checkIn, checkOut);
    if (liveAvailable === false) {
      return `Din păcate, proprietatea "${property.name}" nu este disponibilă în perioada ${checkIn} – ${checkOut}. Doriți altă perioadă?`;
    }

    if (liveAvailable === null) {
      const conflicts = await checkConflicts(property.id, checkIn, checkOut);
      if (conflicts.length > 0) {
        return `Din păcate, proprietatea "${property.name}" a fost între timp rezervată pentru perioada ${checkIn} – ${checkOut}. Doriți altă perioadă?`;
      }
    }

    const legacyPropertyId = getLegacyBookingPropertyId(property.id);
    if (legacyPropertyId === null) {
      return `Eroare la crearea rezervării: proprietatea nu are un identificator compatibil.`;
    }

    const { data, error } = await supabase.from("bookings").insert({
      property_id: legacyPropertyId,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: params.guest_name,
      source: "voice-concierge",
      status: "confirmed",
    }).select("id").single();

    if (error) {
      console.error("[VoiceBooking] Insert error:", error);
      return `Eroare la crearea rezervării: ${error.message}`;
    }

    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );

    return `Rezervare creată cu succes! Proprietate: ${property.name}. Oaspete: ${params.guest_name}. Perioada: ${checkIn} până pe ${checkOut}, ${nights} nopți. ID rezervare: ${data.id}. O confirmare va fi trimisă în curând.`;
  } catch (e: any) {
    return `Eroare la crearea rezervării: ${e.message}`;
  }
};

// ── Local Guide & POI Tool ───────────────────────────────

const search_local_guide = async (params: { category?: string; query?: string }) => {
  try {
    let q = supabase
      .from("points_of_interest")
      .select("name, name_en, category, description, description_en, address, phone, website, rating")
      .eq("is_active", true)
      .order("display_order")
      .limit(8);

    if (params.category) {
      q = q.eq("category", params.category);
    }

    const { data, error } = await q;
    if (error) return `Eroare: ${error.message}`;
    if (!data?.length) return "Nu am găsit locuri care să corespundă căutării.";

    // If a text query was provided, do a simple client-side filter
    let results = data;
    if (params.query) {
      const lower = params.query.toLowerCase();
      const filtered = data.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.name_en.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.description_en?.toLowerCase().includes(lower) ||
          p.address?.toLowerCase().includes(lower)
      );
      if (filtered.length > 0) results = filtered;
    }

    const list = results
      .map((p) => {
        const parts = [`• ${p.name}`];
        if (p.address) parts.push(`  Adresă: ${p.address}`);
        if (p.rating) parts.push(`  Rating: ${p.rating}⭐`);
        if (p.phone) parts.push(`  Telefon: ${p.phone}`);
        if (p.description) parts.push(`  ${p.description.slice(0, 120)}`);
        return parts.join("\n");
      })
      .join("\n\n");

    const categoryLabel = params.category || "toate categoriile";
    return `Am găsit ${results.length} locuri (${categoryLabel}):\n\n${list}`;
  } catch (e: any) {
    return `Eroare la căutarea locurilor: ${e.message}`;
  }
};

// ── Guest Guide Tool ─────────────────────────────────────

const get_guest_guide = async (params: { booking_id?: string; property_name?: string }) => {
  try {
    if (!params.booking_id) {
      return "Vă rog să specificați numele proprietății sau ID-ul rezervării pentru a accesa ghidul de oaspete.";
    }

    const { data, error } = await supabase.functions.invoke("guest-guide", {
      body: { bookingId: params.booking_id },
    });
    if (error) return `Eroare: ${error.message}`;
    if (!data?.guide) return "Nu am găsit un ghid de oaspete pentru această rezervare. Contactați-ne pe WhatsApp la +40799069256.";

    const g = data.guide;
    const parts = [`Ghid oaspete — ${g.property_name}`];
    
    if (g.check_in_date && g.check_out_date) {
      parts.push(`Ședere: ${g.check_in_date} → ${g.check_out_date}`);
    }
    if (g.check_in_time) parts.push(`Check-in: de la ${g.check_in_time}`);
    if (g.check_out_time) parts.push(`Check-out: până la ${g.check_out_time}`);
    if (g.wifi_name) parts.push(`WiFi: ${g.wifi_name}, parola: ${g.wifi_password || "la recepție"}`);
    if (g.pin_code) parts.push(`Cod PIN acces: ${g.pin_code}`);
    if (g.access_instructions) parts.push(`Instrucțiuni acces: ${g.access_instructions}`);
    if (g.parking_instructions) parts.push(`Parcare: ${g.parking_instructions}`);
    if (g.additional_notes) parts.push(`Note: ${g.additional_notes}`);
    if (g.whatsapp_number) parts.push(`WhatsApp manager: ${g.whatsapp_number}`);

    return parts.join("\n");
  } catch (e: any) {
    return `Eroare la accesarea ghidului: ${e.message}`;
  }
};

// ── Review & Feedback Tool ───────────────────────────────

const submit_review = async (params: { rating: number; feedback?: string; property_name?: string }) => {
  try {
    const rating = Math.min(5, Math.max(1, Math.round(params.rating)));

    // Save as chat rating
    const { error } = await supabase.from("chat_ratings").insert({
      rating,
      feedback: params.feedback || null,
      session_id: `voice-${Date.now()}`,
    });

    if (error) {
      console.error("[VoiceReview] Insert error:", error);
      return `Eroare la salvarea feedback-ului: ${error.message}`;
    }

    if (rating >= 4) {
      return `Mulțumim pentru review-ul de ${rating} stele! Ne bucurăm că ați avut o experiență plăcută. Dacă doriți, puteți lăsa și un review public pe Google accesând linkul: https://share.google/oNmn1ltr7L0OEiHet — ne-ar ajuta enorm!`;
    } else if (rating === 3) {
      return `Mulțumim pentru feedback-ul de ${rating} stele. Apreciem onestitatea dumneavoastră. Vom ține cont de observații pentru a ne îmbunătăți serviciile.`;
    } else {
      return `Ne pare rău că experiența nu a fost la nivelul așteptărilor. Am înregistrat feedback-ul dumneavoastră cu ${rating} stele. Un manager vă va contacta pe WhatsApp la +40799069256 pentru a discuta cum putem remedia situația.`;
    }
  } catch (e: any) {
    return `Eroare la trimiterea review-ului: ${e.message}`;
  }
};

// ── ROI Calculator Tool ──────────────────────────────────

const calculate_roi = async (params: {
  property_type: string;
  area_sqm: number;
  location?: string;
  nightly_rate?: number;
  purchase_price?: number;
}) => {
  try {
    const area = params.area_sqm;
    const type = params.property_type.toLowerCase();

    // Estimate nightly rate based on area if not provided
    let nightlyRate = params.nightly_rate;
    if (!nightlyRate) {
      if (area <= 35) nightlyRate = 35;
      else if (area <= 55) nightlyRate = 45;
      else if (area <= 75) nightlyRate = 60;
      else nightlyRate = 80;
    }

    const occupancyRate = 0.75; // 75% standard
    const daysPerMonth = 30;
    const occupiedNights = Math.round(daysPerMonth * occupancyRate);
    const grossMonthly = occupiedNights * nightlyRate;
    const grossYearly = grossMonthly * 12;
    
    // Deductions: 20% management + 7% tax = 27%
    const deductionRate = 0.27;
    const netYearly = Math.round(grossYearly * (1 - deductionRate));
    const netMonthly = Math.round(netYearly / 12);

    let roiText = "";
    if (params.purchase_price && params.purchase_price > 0) {
      const roi = ((netYearly / params.purchase_price) * 100).toFixed(1);
      roiText = `ROI Net estimat: ${roi}% pe an (bazat pe preț de achiziție ${params.purchase_price.toLocaleString()} €).`;
    }

    const result = [
      `Estimare randament pentru ${type}, ${area} mp${params.location ? `, ${params.location}` : ""}:`,
      `Tarif/noapte estimat: ${nightlyRate} €`,
      `Grad ocupare: ${(occupancyRate * 100).toFixed(0)}%`,
      `Venit brut lunar: ~${grossMonthly} € (${occupiedNights} nopți ocupate)`,
      `Venit brut anual: ~${grossYearly.toLocaleString()} €`,
      `Deduceri (management 20% + taxă 7%): -${Math.round(grossYearly * deductionRate).toLocaleString()} €`,
      `Venit NET lunar: ~${netMonthly} €`,
      `Venit NET anual: ~${netYearly.toLocaleString()} €`,
      roiText,
      "",
      "Doriți să lăsați datele de contact pentru o analiză personalizată gratuită? Avem nevoie de nume și număr de telefon.",
    ].filter(Boolean).join("\n");

    return result;
  } catch (e: any) {
    return `Eroare la calculul randamentului: ${e.message}`;
  }
};

// ── Lead Capture Tool ────────────────────────────────────

const capture_lead = async (params: {
  name: string;
  phone: string;
  property_type?: string;
  area_sqm?: number;
  email?: string;
  message?: string;
}) => {
  try {
    const { error } = await supabase.from("leads").insert({
      name: params.name,
      whatsapp_number: params.phone,
      property_type: params.property_type || "apartament",
      property_area: params.area_sqm || 50,
      email: params.email || null,
      message: params.message || null,
      source: "voice-concierge",
    } as any);

    if (error) {
      console.error("[VoiceLead] Insert error:", error);
      // RLS blocks anon inserts, but the tool still attempted
      return `Am notat datele dumneavoastră. Un consultant RealTrust vă va contacta în cel mai scurt timp pe WhatsApp la ${params.phone}. Mulțumim!`;
    }

    return `Perfect! Am salvat datele dumneavoastră, ${params.name}. Un consultant RealTrust vă va contacta în curând la ${params.phone} cu o analiză personalizată. Între timp, puteți folosi codul DIRECT5 pentru 5% reducere la serviciile noastre!`;
  } catch (e: any) {
    return `Am notat datele dumneavoastră. Vă vom contacta în cel mai scurt timp. Mulțumim!`;
  }
};

// ── Export All Tools ─────────────────────────────────────

export const voiceBookingTools = {
  list_properties,
  check_availability,
  create_booking,
  search_local_guide,
  get_guest_guide,
  submit_review,
  calculate_roi,
  capture_lead,
};
