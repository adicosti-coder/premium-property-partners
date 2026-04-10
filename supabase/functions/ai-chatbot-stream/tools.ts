import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Shared Supabase client for tool functions */
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── TOOL: Check Availability ───────────────────────────────

export async function checkAvailability(args: {
  check_in?: string;
  check_out?: string;
  guests?: number;
  property_name?: string;
}): Promise<string> {
  const sb = getSupabase();
  const checkIn = args.check_in || new Date().toISOString().split("T")[0];
  const checkOut = args.check_out || new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];

  // Get active accommodation properties
  let query = sb
    .from("properties")
    .select("id, name, slug, capacity, base_price_per_night, booking_url, property_code, tag, location, bedrooms, bathrooms, size")
    .eq("is_active", true)
    .in("listing_type", ["cazare"]);

  if (args.property_name) {
    query = query.ilike("name", `%${args.property_name}%`);
  }
  if (args.guests) {
    query = query.gte("capacity", args.guests);
  }

  const { data: properties } = await query.order("display_order");
  if (!properties?.length) {
    return JSON.stringify({ available: [], message: "Nu am găsit proprietăți care să corespundă criteriilor." });
  }

  // --- Live availability check via Pynbooking ---
  const livePayload = properties
    .filter((p: any) => p.booking_url && p.booking_url !== "#")
    .map((p: any) => ({ slug: p.slug || p.id, bookingUrl: p.booking_url }));

  let unavailableSlugs = new Set<string>();
  let liveCheckWorked = false;

  if (livePayload.length > 0) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      console.log(`[checkAvailability] v2 — calling live-property-availability for ${livePayload.length} properties, ${checkIn} to ${checkOut}`);
      const liveRes = await fetch(`${supabaseUrl}/functions/v1/live-property-availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          checkIn,
          checkOut,
          properties: livePayload,
        }),
      });

      if (liveRes.ok) {
        const liveData = await liveRes.json();
        console.log(`[checkAvailability] Live response:`, JSON.stringify(liveData));
        if (liveData.unavailableSlugs) {
          unavailableSlugs = new Set(liveData.unavailableSlugs);
          liveCheckWorked = true;
          console.log(`[checkAvailability] Unavailable: ${liveData.unavailableSlugs.join(', ')}`);
        }
        // Also mark unresolved lookups — check bookings fallback for those
        const unresolvedSlugs = new Set<string>();
        if (liveData.lookupStatusBySlug) {
          for (const [slug, status] of Object.entries(liveData.lookupStatusBySlug)) {
            if (status === "unresolved") unresolvedSlugs.add(slug);
          }
        }
        // Fallback: check local bookings for unresolved properties
        if (unresolvedSlugs.size > 0) {
          const unresolvedProps = properties.filter((p: any) => unresolvedSlugs.has(p.slug || p.id));
          const localUnavailable = await checkBookingsLocal(sb, unresolvedProps, checkIn, checkOut);
          for (const slug of localUnavailable) unavailableSlugs.add(slug);
        }
      } else {
        const errText = await liveRes.text();
        console.error(`[checkAvailability] Live check failed: ${liveRes.status} ${errText}`);
      }
    } catch (e) {
      console.error("Live availability check failed, falling back to bookings:", e);
    }
  }

  // Fallback: if live check didn't work at all, use local bookings
  if (!liveCheckWorked) {
    const localUnavailable = await checkBookingsLocal(sb, properties, checkIn, checkOut);
    for (const slug of localUnavailable) unavailableSlugs.add(slug);
  }

  const available = properties
    .filter((p: any) => !unavailableSlugs.has(p.slug || p.id))
    .map((p: any) => ({
      name: p.name,
      code: p.property_code,
      location: p.location,
      capacity: p.capacity,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      size: p.size,
      price_per_night: p.base_price_per_night,
      booking_url: p.booking_url && p.booking_url !== "#" ? p.booking_url : `https://www.realtrust.ro/proprietate/${p.slug}`,
    }));

  const unavailable = properties
    .filter((p: any) => unavailableSlugs.has(p.slug || p.id))
    .map((p: any) => p.name);

  return JSON.stringify({
    check_in: checkIn,
    check_out: checkOut,
    guests: args.guests || "nespecificat",
    available,
    unavailable,
    total_properties: properties.length,
    source: liveCheckWorked ? "live" : "bookings_fallback",
  });
}

/** Fallback: check local bookings table for conflicts (handles property_id as numeric property_code) */
async function checkBookingsLocal(
  sb: ReturnType<typeof getSupabase>,
  properties: any[],
  checkIn: string,
  checkOut: string
): Promise<Set<string>> {
  // bookings.property_id is numeric — derived from property UUID
  // We need to map property_code or compute the numeric ID to match
  const unavailableSlugs = new Set<string>();

  // Get all bookings in the date range
  const { data: bookings } = await sb
    .from("bookings")
    .select("property_id, check_in, check_out, status, ical_source_id")
    .neq("status", "cancelled")
    .lte("check_in", checkOut)
    .gte("check_out", checkIn);

  if (!bookings?.length) return unavailableSlugs;

  // Also check via ical_sources to map bookings back to properties by UUID
  const { data: icalSources } = await sb
    .from("ical_sources")
    .select("id, property_id");

  const icalPropertyMap = new Map<string, string>();
  for (const src of icalSources || []) {
    icalPropertyMap.set(src.id, src.property_id);
  }

  // Build a set of property UUIDs that have booking conflicts
  const bookedPropertyUUIDs = new Set<string>();

  for (const b of bookings) {
    // Try matching via ical_source_id -> property UUID
    if (b.ical_source_id && icalPropertyMap.has(b.ical_source_id)) {
      bookedPropertyUUIDs.add(icalPropertyMap.get(b.ical_source_id)!);
    }
    // Also try matching via numeric property_id to property_code
    for (const p of properties) {
      const numericId = parseInt(p.id.replace(/-/g, "").substring(0, 8), 16) % 1000000;
      if (numericId === b.property_id) {
        bookedPropertyUUIDs.add(p.id);
      }
    }
  }

  for (const p of properties) {
    if (bookedPropertyUUIDs.has(p.id)) {
      unavailableSlugs.add(p.slug || p.id);
    }
  }

  return unavailableSlugs;
}

// ─── TOOL: Calculate ROI ────────────────────────────────────

export function calculateROI(args: {
  property_type: string;
  zone: string;
  purchase_price?: number;
  rooms?: number;
}): string {
  const baseRevenue: Record<string, number> = {
    studio: 1000,
    "2_camere": 1400,
    "3_camere": 2000,
    "apartament": 1400,
  };

  const zoneMultipliers: Record<string, { mult: number; label: string }> = {
    centru: { mult: 1.2, label: "Centru / Cetate" },
    cetate: { mult: 1.2, label: "Centru / Cetate" },
    iulius: { mult: 1.1, label: "Iulius Town / Dumbravița" },
    dumbravita: { mult: 1.1, label: "Iulius Town / Dumbravița" },
    giroc: { mult: 1.0, label: "Giroc / Alte zone" },
    other: { mult: 1.0, label: "Altă zonă" },
  };

  const type = args.property_type?.toLowerCase() || "studio";
  const zoneLower = args.zone?.toLowerCase() || "other";
  const zoneKey = Object.keys(zoneMultipliers).find((k) => zoneLower.includes(k)) || "other";

  const monthly = (baseRevenue[type] || baseRevenue["apartament"]!) * zoneMultipliers[zoneKey].mult;
  const managementFee = 0.20;
  const netMonthly = Math.round(monthly * (1 - managementFee));
  const netYearly = netMonthly * 12;

  const purchasePrice = args.purchase_price || null;
  const roi = purchasePrice ? ((netYearly / purchasePrice) * 100).toFixed(1) : null;
  const payback = purchasePrice ? (purchasePrice / netYearly).toFixed(1) : null;

  // Classic rent comparison
  const classicRent: Record<string, number> = {
    studio: 350,
    "2_camere": 450,
    "3_camere": 600,
    "apartament": 450,
  };
  const classic = classicRent[type] || 450;
  const advantage = Math.round(((netMonthly - classic) / classic) * 100);

  return JSON.stringify({
    property_type: type,
    zone: zoneMultipliers[zoneKey].label,
    zone_multiplier: zoneMultipliers[zoneKey].mult,
    gross_monthly_revenue: Math.round(monthly),
    management_fee_percent: managementFee * 100,
    net_monthly_income: netMonthly,
    net_yearly_income: netYearly,
    purchase_price: purchasePrice,
    annual_roi_percent: roi,
    payback_years: payback,
    classic_rent_monthly: classic,
    advantage_vs_classic_percent: advantage,
    benchmark_roi: "9.4%",
  });
}

// ─── TOOL: Schedule Viewing ─────────────────────────────────

export async function scheduleViewing(args: {
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  preferred_date?: string;
  preferred_time_slot?: string;
  property_interest?: string;
  appointment_type?: string;
  notes?: string;
}): Promise<string> {
  const sb = getSupabase();

  if (!args.contact_name || !args.contact_phone) {
    return JSON.stringify({
      success: false,
      missing_fields: [
        !args.contact_name && "contact_name",
        !args.contact_phone && "contact_phone",
      ].filter(Boolean),
      message: "Am nevoie de numele și telefonul dumneavoastră pentru a programa vizita.",
    });
  }

  const { data, error } = await sb.from("chatbot_appointments").insert({
    contact_name: args.contact_name,
    contact_phone: args.contact_phone,
    contact_email: args.contact_email || null,
    preferred_date: args.preferred_date || null,
    preferred_time_slot: args.preferred_time_slot || null,
    property_interest: args.property_interest || null,
    appointment_type: args.appointment_type || "vizionare",
    notes: args.notes || null,
    status: "pending",
  }).select("id").single();

  if (error) {
    console.error("Failed to schedule viewing:", error);
    return JSON.stringify({ success: false, message: "Eroare la salvarea programării." });
  }

  // Also save as lead
  try {
    await sb.from("leads").insert({
      name: args.contact_name,
      whatsapp_number: args.contact_phone,
      email: args.contact_email || null,
      property_type: "vizionare",
      property_area: 0,
      source: "AI Chatbot - Programare",
      message: `Programare: ${args.appointment_type || "vizionare"} | ${args.property_interest || "N/A"} | ${args.preferred_date || "fără dată"} ${args.preferred_time_slot || ""}`,
    });
  } catch {}

  return JSON.stringify({
    success: true,
    appointment_id: data?.id,
    contact_name: args.contact_name,
    preferred_date: args.preferred_date,
    preferred_time_slot: args.preferred_time_slot,
    property_interest: args.property_interest,
    message: "Programare înregistrată cu succes!",
  });
}

// ─── TOOL: Tourist Guide ────────────────────────────────────

export async function getTouristRecommendations(args: {
  interest_type: string;
  traveler_type?: string;
  property_name?: string;
}): Promise<string> {
  const sb = getSupabase();

  let query = sb
    .from("points_of_interest")
    .select("name, category, description_ro, description_en, address, rating, distance_from_center, image_url, latitude, longitude")
    .eq("is_active", true)
    .order("rating", { ascending: false })
    .limit(15);

  const interest = args.interest_type?.toLowerCase() || "";
  if (interest.includes("restaurant") || interest.includes("mancare") || interest.includes("food")) {
    query = query.in("category", ["restaurant", "cafenea", "bar"]);
  } else if (interest.includes("cultur") || interest.includes("muzeu") || interest.includes("vizit")) {
    query = query.in("category", ["atractie_turistica", "muzeu", "monument"]);
  } else if (interest.includes("sport") || interest.includes("fitness") || interest.includes("activ")) {
    query = query.in("category", ["sport", "fitness", "parc"]);
  } else if (interest.includes("shopping") || interest.includes("cumparat")) {
    query = query.in("category", ["mall", "supermarket", "shopping"]);
  } else if (interest.includes("copii") || interest.includes("famil") || interest.includes("kids")) {
    query = query.in("category", ["parc", "atractie_turistica", "sport"]);
  }

  const { data: pois } = await query;

  // If we have a property, get its coordinates for distance calculation
  let propertyCoords: { lat: number; lng: number } | null = null;
  if (args.property_name) {
    const { data: prop } = await sb
      .from("properties")
      .select("latitude, longitude, name")
      .ilike("name", `%${args.property_name}%`)
      .limit(1)
      .single();
    if (prop?.latitude && prop?.longitude) {
      propertyCoords = { lat: prop.latitude, lng: prop.longitude };
    }
  }

  const recommendations = (pois || []).map((poi: any) => {
    let distanceFromProperty = null;
    if (propertyCoords && poi.latitude && poi.longitude) {
      const R = 6371;
      const dLat = ((poi.latitude - propertyCoords.lat) * Math.PI) / 180;
      const dLon = ((poi.longitude - propertyCoords.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((propertyCoords.lat * Math.PI) / 180) * Math.cos((poi.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      distanceFromProperty = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000);
    }
    return {
      name: poi.name,
      category: poi.category,
      description: poi.description_ro,
      address: poi.address,
      rating: poi.rating,
      distance_from_center_km: poi.distance_from_center,
      distance_from_property_m: distanceFromProperty,
    };
  });

  const travelerTips: Record<string, string> = {
    familie: "Pentru familii recomandăm Parcul Rozelor, Amazonia Aquapark și plimbările pe canalul Bega.",
    cuplu: "Pentru cupluri: cinele romantice la restaurantele din Piața Unirii și plimbările serale pe Corso.",
    business: "Pentru călătorii de afaceri: proximitatea de Iulius Town, cafenelele cu WiFi și restaurantele cu prânz rapid.",
    solo: "Pentru călătorii solo: cafenelele artizanale, tururile culturale ghidate și barurile din Fabric.",
  };
  const travelerKey = Object.keys(travelerTips).find((k) => (args.traveler_type || "").toLowerCase().includes(k));

  return JSON.stringify({
    interest_type: args.interest_type,
    traveler_type: args.traveler_type || "general",
    recommendations,
    traveler_tip: travelerKey ? travelerTips[travelerKey] : null,
    internal_links: {
      blog_guide: "https://www.realtrust.ro/blog",
      interactive_map: "https://www.realtrust.ro/oaspeti",
    },
  });
}

// ─── TOOL DEFINITIONS for OpenAI-compatible API ─────────────

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "check_availability",
      description: "Check real-time apartment availability for specific dates and guest count. Use when user asks about availability, free dates, or wants to book.",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Check-in date in YYYY-MM-DD format" },
          check_out: { type: "string", description: "Check-out date in YYYY-MM-DD format" },
          guests: { type: "number", description: "Number of guests" },
          property_name: { type: "string", description: "Specific property name to check (optional)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_roi",
      description: "Calculate investment ROI, monthly/yearly profit, and comparison with classic rent. Use when user asks about investment returns, profit estimates, or property yield.",
      parameters: {
        type: "object",
        properties: {
          property_type: { type: "string", enum: ["studio", "2_camere", "3_camere"], description: "Type of property" },
          zone: { type: "string", description: "Zone/neighborhood in Timișoara (e.g. Centru, Iulius Town, Dumbravița, Giroc)" },
          purchase_price: { type: "number", description: "Property purchase price in EUR (optional, for ROI calculation)" },
          rooms: { type: "number", description: "Number of rooms" },
        },
        required: ["property_type", "zone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_viewing",
      description: "Schedule a property viewing or evaluation appointment. Collect contact details step by step. Use when user wants to visit a property, schedule a meeting, or arrange an evaluation.",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Full name of the person" },
          contact_phone: { type: "string", description: "Phone number (preferably WhatsApp)" },
          contact_email: { type: "string", description: "Email address (optional)" },
          preferred_date: { type: "string", description: "Preferred date in YYYY-MM-DD format" },
          preferred_time_slot: { type: "string", description: "Preferred time slot (e.g. '10:00-12:00', 'dimineata', 'dupa-amiaza')" },
          property_interest: { type: "string", description: "Which property or type of property they're interested in" },
          appointment_type: { type: "string", enum: ["vizionare", "evaluare", "consultanta", "semnare_contract"], description: "Type of appointment" },
          notes: { type: "string", description: "Additional notes or requirements" },
        },
        required: ["contact_name", "contact_phone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_tourist_recommendations",
      description: "Get personalized tourist recommendations for Timișoara based on interests and traveler type. Use when user asks about what to visit, restaurants, activities, or local tips.",
      parameters: {
        type: "object",
        properties: {
          interest_type: { type: "string", description: "Type of interest: restaurants, cultural, sport, shopping, nightlife, kids/family" },
          traveler_type: { type: "string", enum: ["familie", "cuplu", "business", "solo"], description: "Type of traveler" },
          property_name: { type: "string", description: "Property name to calculate distances from (optional)" },
        },
        required: ["interest_type"],
      },
    },
  },
];

// ─── TOOL EXECUTOR ──────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  switch (name) {
    case "check_availability":
      return await checkAvailability(args);
    case "calculate_roi":
      return calculateROI(args);
    case "schedule_viewing":
      return await scheduleViewing(args);
    case "get_tourist_recommendations":
      return await getTouristRecommendations(args);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
