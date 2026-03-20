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
  rows?: AvailabilityCell[][];
}

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

const extractAvailabilityContext = (html: string) => {
  const configMatch = html.match(/new\s+Availability\w*\s*\(\s*\{([\s\S]*?)\}\s*\)/i);
  const showAvailabilityMatch = html.match(/showAvailability\((\d+),(\d+),(\d+)\)/i);

  if (!configMatch || !showAvailabilityMatch) {
    return null;
  }

  const config = configMatch[1];
  const hotelId = config.match(/hotelId:\s*'(\d+)'/i)?.[1];
  const startMonth = config.match(/startMonth:\s*'(\d+)'/i)?.[1];
  const startYear = config.match(/startYear:\s*'(\d+)'/i)?.[1];

  if (!hotelId || !startMonth || !startYear) {
    return null;
  }

  return {
    hotelId,
    month: startMonth,
    year: startYear,
    offerId: showAvailabilityMatch[1],
    roomId: showAvailabilityMatch[2],
    rateId: showAvailabilityMatch[3],
  };
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

  const availabilityUrl = new URL("service/availability/", `${url.protocol}//${url.host}/`);
  const availabilityResponse = await fetch(availabilityUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "RealTrustAvailability/1.0",
    },
    body: new URLSearchParams({
      month: context.month,
      year: context.year,
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
  const unavailable = new Set<string>();

  for (const row of availabilityData.rows || []) {
    for (const cell of row || []) {
      if (!cell || cell.day === "" || cell.day === undefined || cell.day === null) continue;
      if (cell.avail !== 0 && cell.avail !== -1) continue;

      const day = String(cell.day).padStart(2, "0");
      unavailable.add(`${context.year}-${context.month.padStart(2, "0")}-${day}`);
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
    const { checkIn, checkOut, properties } = await req.json() as {
      checkIn?: string;
      checkOut?: string;
      properties?: PropertyPayload[];
    };

    if (!checkIn || !checkOut || !Array.isArray(properties)) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedDates = getDatesInRange(checkIn, checkOut);
    const unavailableSlugs: string[] = [];

    await Promise.all(properties.map(async (property) => {
      try {
        const unavailableDates = await fetchUnavailableDates(property.bookingUrl, checkIn, checkOut);
        if (!unavailableDates) {
          return;
        }

        const hasConflict = requestedDates.some((date) => unavailableDates.has(date));

        if (hasConflict) {
          unavailableSlugs.push(property.slug);
        }
      } catch (error) {
        console.error("availability lookup failed", property.slug, error);
      }
    }));

    return new Response(JSON.stringify({ unavailableSlugs }), {
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }), {
      status: 500,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});