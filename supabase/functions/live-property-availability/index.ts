import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, securityHeaders } from "../_shared/securityHeaders.ts";

interface PropertyPayload {
  slug: string;
  bookingUrl: string;
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

const parseUnavailableDates = (html: string) => {
  const unavailable = new Set<string>();
  const noAvailRegex = /<(?:span|a)[^>]*class="[^"]*room-noavail[^"]*"[^>]*data-date="(\d{4}-\d{2}-\d{2})"/g;

  for (const match of html.matchAll(noAvailRegex)) {
    unavailable.add(match[1]);
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
        const url = new URL(property.bookingUrl);
        url.searchParams.set("arrivalDate", checkIn);
        url.searchParams.set("departureDate", checkOut);

        const response = await fetch(url.toString(), {
          headers: { "User-Agent": "RealTrustAvailability/1.0" },
        });

        if (!response.ok) {
          return;
        }

        const html = await response.text();
        const unavailableDates = parseUnavailableDates(html);
        const hasConflict = requestedDates.some((date) => unavailableDates.has(date));

        if (hasConflict) {
          unavailableSlugs.push(property.slug);
        }
      } catch (_error) {
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