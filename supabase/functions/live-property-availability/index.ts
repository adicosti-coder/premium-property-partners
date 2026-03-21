import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, securityHeaders } from "../_shared/securityHeaders.ts";

interface PropertyPayload {
  slug: string;
  bookingUrl: string;
}

interface AvailabilityCell {
  day?: string | number;
  avail?: number;
  min?: number;
  no_arrival?: number;
  no_departure_in?: number;
}

interface AvailabilityResponse {
  rooms?: unknown[];
  rows?: AvailabilityCell[][];
}

interface RequestBody {
  checkIn?: string;
  checkOut?: string;
  properties?: PropertyPayload[];
  includeUnavailableDates?: boolean;
}

const getMonthsInRange = (checkIn: string, checkOut: string) => {
  const months: Array<{ month: string; year: string }> = [];
  const current = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  current.setDate(1);
  end.setDate(1);

  while (current <= end) {
    months.push({
      month: String(current.getMonth() + 1).padStart(2, "0"),
      year: String(current.getFullYear()),
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

const getDatesInRange = (checkIn: string, checkOut: string) => {
  const dates: string[] = [];
  const current = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

interface AvailabilityContext {
  hotelId: string;
  month: string;
  year: string;
  offerId: string;
  roomId: string;
  rateId: string;
}

const extractAvailabilityContext = (html: string): AvailabilityContext | null => {
  const configMatch = html.match(/new\s+Availability\w*\s*\(\s*\{([\s\S]*?)\}\s*\)/i);
  if (!configMatch) {
    return null;
  }

  const config = configMatch[1];
  const hotelId = config.match(/hotelId:\s*'(\d+)'/i)?.[1];
  const startMonth = config.match(/startMonth:\s*'(\d+)'/i)?.[1];
  const startYear = config.match(/startYear:\s*'(\d+)'/i)?.[1];

  if (!hotelId || !startMonth || !startYear) {
    return null;
  }

  const candidates = [
    ...html.matchAll(/btn_availability_box-(\d+)-(\d+)-(\d+)/gi),
    ...html.matchAll(/book-(\d+)-(\d+)-(\d+)/gi),
    ...html.matchAll(/room-(\d+)-(\d+)-(\d+)/gi),
  ];

  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    return null;
  }

  return {
    hotelId,
    month: startMonth,
    year: startYear,
    offerId: firstCandidate[1],
    roomId: firstCandidate[2],
    rateId: firstCandidate[3],
  };
};

const hasValidAvailabilityPayload = (payload: AvailabilityResponse) => {
  const hasRows = Array.isArray(payload.rows) && payload.rows.length > 0;
  const hasRooms = Array.isArray(payload.rooms) && payload.rooms.length > 0;
  return hasRows && hasRooms;
};

const fetchUnavailableDates = async (bookingUrl: string, checkIn: string, checkOut: string) => {
  const url = new URL(bookingUrl);
  url.searchParams.set("arrivalDate", checkIn);
  url.searchParams.set("departureDate", checkOut);

  const pageResponse = await fetch(url.toString(), {
    headers: { "User-Agent": "RealTrustAvailability/1.0" },
  });

  if (!pageResponse.ok) {
    return null;
  }

  const html = await pageResponse.text();
  const context = extractAvailabilityContext(html);

  if (!context) {
    return null;
  }

  const unavailable = new Set<string>();

  for (const rangeMonth of getMonthsInRange(checkIn, checkOut)) {
    const availabilityUrl = new URL("service/availability/", `${url.protocol}//${url.host}/`);
    const availabilityResponse = await fetch(availabilityUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "RealTrustAvailability/1.0",
      },
      body: new URLSearchParams({
        month: rangeMonth.month,
        year: rangeMonth.year,
        hotelId: context.hotelId,
        offerId: context.offerId,
        roomId: context.roomId,
        rateId: context.rateId,
      }),
    });

    if (!availabilityResponse.ok) {
      return null;
    }

    const availabilityText = await availabilityResponse.text();
    const availabilityData = JSON.parse(availabilityText) as AvailabilityResponse;

    if (!hasValidAvailabilityPayload(availabilityData)) {
      return null;
    }

    for (const row of availabilityData.rows || []) {
      for (const cell of row || []) {
        if (!cell || cell.day === "" || cell.day === undefined || cell.day === null) continue;
        if (cell.avail !== 0 && cell.avail !== -1) continue;

        const day = String(cell.day).padStart(2, "0");
        unavailable.add(`${rangeMonth.year}-${rangeMonth.month}-${day}`);
      }
    }
  }

  return unavailable;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { checkIn, checkOut, properties, includeUnavailableDates } = await req.json() as RequestBody;

    if (!checkIn || !checkOut || !Array.isArray(properties)) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedDates = getDatesInRange(checkIn, checkOut);
    const unavailableSlugs: string[] = [];
    const unavailableDatesBySlug: Record<string, string[]> = {};

    await Promise.all(properties.map(async (property) => {
      try {
        const unavailableDates = await fetchUnavailableDates(property.bookingUrl, checkIn, checkOut);
        if (!unavailableDates) {
          return;
        }

        if (includeUnavailableDates) {
          unavailableDatesBySlug[property.slug] = Array.from(unavailableDates).sort();
        }

        const hasConflict = requestedDates.some((date) => unavailableDates.has(date));

        if (hasConflict) {
          unavailableSlugs.push(property.slug);
        }
      } catch (error) {
        console.error("availability lookup failed", property.slug, error);
      }
    }));

    return new Response(JSON.stringify({ unavailableSlugs, unavailableDatesBySlug }), {
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }), {
      status: 500,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});