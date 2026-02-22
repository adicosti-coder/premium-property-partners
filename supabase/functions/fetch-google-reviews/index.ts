import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache reviews in memory for 1 hour to avoid excessive API calls
let cachedData: { reviews: any[]; rating: number; totalReviews: number; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured");
    }

    // Return cached data if still valid
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cachedData), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get place_id from request or find it via text search
    const url = new URL(req.url);
    let placeId = url.searchParams.get("place_id");

    if (!placeId) {
      // Find place by text search
      const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=ApArt+Hotel+Timisoara&inputtype=textquery&fields=place_id&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      if (searchData.candidates?.[0]?.place_id) {
        placeId = searchData.candidates[0].place_id;
      } else {
        throw new Error("Could not find place on Google Maps");
      }
    }

    // Fetch place details including reviews
    const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&language=ro&key=${apiKey}`;

    const response = await fetch(placeUrl);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places API error:", data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    const result = data.result;
    const reviews = (result.reviews || []).map((r: any) => ({
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time,
      relative_time_description: r.relative_time_description,
      profile_photo_url: r.profile_photo_url,
    }));

    cachedData = {
      reviews,
      rating: result.rating || 0,
      totalReviews: result.user_ratings_total || 0,
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(cachedData), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error fetching Google reviews:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
