import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { query, language = "ro" } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 3 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Step 1: Ask Gemini to extract structured filters from natural language
    const systemPrompt = `You are a property search parser for RealTrust, a real estate & apart-hotel company in Timișoara, Romania.

Extract search filters from the user's natural language query. Return ONLY a JSON object with these optional fields:
- "location": string — zone/area keyword (e.g. "Iulius", "Centru", "Nord", "Paltim", "Ateneo", "Green Forest", "Helios", "FullView")
- "features": string[] — amenities like "parcare", "wifi", "balcon", "bucatarie", "netflix", "masina de spalat", "parking", "kitchen", "balcony"
- "bedrooms": number — number of bedrooms (1, 2, 3)
- "min_capacity": number — minimum guest capacity
- "max_price": number — maximum price per night in EUR
- "min_price": number — minimum price per night
- "listing_type": string — one of: "cazare" (accommodation/hotel), "vanzare" (sale), "inchiriere" (rent), "investitie" (investment)
- "keywords": string[] — any other search terms to match against name or description
- "sort": string — "price_asc", "price_desc", "rating_desc"

If the user mentions "luminos", "spațios", "modern", "luxos", etc., put those in "keywords".
If the user mentions proximity to a landmark, extract the landmark name into "location".
Default listing_type to "cazare" unless the user mentions buying, selling, renting, or investing.

Respond with ONLY the JSON object. No explanation.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          temperature: 0,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI parsing failed");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";

    // Clean markdown code blocks if present
    const cleanJson = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let filters: Record<string, unknown>;
    try {
      filters = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      filters = { keywords: [query] };
    }

    // Step 2: Build Supabase query from structured filters
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let dbQuery = supabase
      .from("properties")
      .select(
        "id, name, slug, location, listing_type, base_price_per_night, weekend_price_per_night, bedrooms, capacity, features, image_path, tag, description_ro, description_en, booking_rating, booking_review_count, amenities, property_images(image_path, is_primary, display_order)"
      )
      .eq("is_active", true);

    // Apply listing_type filter
    const listingType = (filters.listing_type as string) || "cazare";
    dbQuery = dbQuery.eq("listing_type", listingType);

    // Apply location filter (ilike on location or name)
    if (filters.location) {
      const loc = filters.location as string;
      dbQuery = dbQuery.or(
        `location.ilike.%${loc}%,name.ilike.%${loc}%`
      );
    }

    // Apply bedrooms filter
    if (filters.bedrooms && typeof filters.bedrooms === "number") {
      dbQuery = dbQuery.eq("bedrooms", filters.bedrooms);
    }

    // Apply capacity filter
    if (filters.min_capacity && typeof filters.min_capacity === "number") {
      dbQuery = dbQuery.gte("capacity", filters.min_capacity);
    }

    // Apply price filters
    if (filters.max_price && typeof filters.max_price === "number") {
      dbQuery = dbQuery.lte("base_price_per_night", filters.max_price);
    }
    if (filters.min_price && typeof filters.min_price === "number") {
      dbQuery = dbQuery.gte("base_price_per_night", filters.min_price);
    }

    // Apply sort
    const sort = filters.sort as string;
    if (sort === "price_asc") {
      dbQuery = dbQuery.order("base_price_per_night", { ascending: true });
    } else if (sort === "price_desc") {
      dbQuery = dbQuery.order("base_price_per_night", { ascending: false });
    } else if (sort === "rating_desc") {
      dbQuery = dbQuery.order("booking_rating", { ascending: false });
    } else {
      dbQuery = dbQuery.order("display_order", { ascending: true });
    }

    dbQuery = dbQuery.limit(12);

    const { data: properties, error: dbError } = await dbQuery;

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Database query failed");
    }

    // Step 3: If keywords exist, do client-side filtering on results
    let results = properties || [];
    const keywords = (filters.keywords as string[]) || [];
    const features = (filters.features as string[]) || [];

    if (keywords.length > 0 || features.length > 0) {
      const allTerms = [...keywords, ...features].map((k) => k.toLowerCase());
      results = results.filter((p: any) => {
        const searchable = [
          p.name,
          p.location,
          p.description_ro,
          p.description_en,
          ...(p.features || []),
          ...(p.amenities || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        // At least one term must match
        return allTerms.some((term) => searchable.includes(term));
      });
    }

    // Build a summary for the user
    const filterSummary = {
      parsed_filters: filters,
      result_count: results.length,
      listing_type: listingType,
    };

    return new Response(
      JSON.stringify({
        results,
        meta: filterSummary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("ai-property-search error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
