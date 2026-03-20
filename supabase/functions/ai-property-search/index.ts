import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeText = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);

const expandLocationTerms = (value: string) => {
  const normalizedValue = normalizeText(value);

  const aliases = [
    {
      keys: ["iulius", "iulius mall", "circumvalatiunii", "circumvalațiunii", "city of mara"],
      synonyms: ["iulius", "iulius mall", "circumvalatiunii", "city of mara", "take ionescu"],
    },
    {
      keys: ["centru", "central", "ultracentral", "centrul vechi", "unirii", "victoriei"],
      synonyms: ["centru", "central", "ultracentral", "centrul vechi", "unirii", "victoriei", "gheorghe lazar"],
    },
    {
      keys: ["nord", "torontalului", "ateneo"],
      synonyms: ["nord", "torontalului", "ateneo", "amazonia", "constructorilor"],
    },
  ];

  const matchedAliases = aliases.flatMap((group) =>
    group.keys.some((key) => normalizedValue.includes(key)) ? group.synonyms : []
  );

  return Array.from(new Set([normalizedValue, ...matchedAliases].filter(Boolean)));
};

const buildSearchablePropertyText = (property: Record<string, unknown>) =>
  normalizeText(
    [
      property.name,
      property.location,
      property.description_ro,
      property.description_en,
      property.tag,
      ...(Array.isArray(property.features) ? property.features : []),
      ...(Array.isArray(property.amenities) ? property.amenities : []),
    ]
      .filter(Boolean)
      .join(" ")
  );

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

    const listingType = (filters.listing_type as string) || "cazare";

    const buildBaseQuery = (useStrictNumericFilters: boolean) => {
      let dbQuery = supabase
        .from("properties")
        .select(
          "id, name, slug, location, listing_type, base_price_per_night, weekend_price_per_night, bedrooms, capacity, features, image_path, tag, description_ro, description_en, booking_rating, booking_review_count, amenities, property_images(image_path, is_primary, display_order)"
        )
        .eq("is_active", true)
        .eq("listing_type", listingType);

      if (useStrictNumericFilters) {
        if (filters.bedrooms && typeof filters.bedrooms === "number") {
          dbQuery = dbQuery.eq("bedrooms", filters.bedrooms);
        }

        if (filters.min_capacity && typeof filters.min_capacity === "number") {
          dbQuery = dbQuery.gte("capacity", filters.min_capacity);
        }

        if (filters.max_price && typeof filters.max_price === "number") {
          dbQuery = dbQuery.lte("base_price_per_night", filters.max_price);
        }

        if (filters.min_price && typeof filters.min_price === "number") {
          dbQuery = dbQuery.gte("base_price_per_night", filters.min_price);
        }
      }

      return dbQuery.limit(24);
    };

    // Apply sort
    const sort = filters.sort as string;

    const { data: strictCandidates, error: strictError } = await buildBaseQuery(true);

    if (strictError) {
      console.error("DB error:", strictError);
      throw new Error("Database query failed");
    }

    let properties = strictCandidates || [];
    let fallbackUsed = false;

    if (properties.length === 0) {
      const { data: relaxedCandidates, error: relaxedError } = await buildBaseQuery(false);

      if (relaxedError) {
        console.error("DB fallback error:", relaxedError);
        throw new Error("Database query failed");
      }

      properties = relaxedCandidates || [];
      fallbackUsed = true;
    }

    // Step 3: Score and rank client-side so searches still return useful results
    const keywords = (filters.keywords as string[]) || [];
    const features = (filters.features as string[]) || [];
    const locationTerms = filters.location ? expandLocationTerms(filters.location as string) : [];
    const queryTokens = Array.from(
      new Set([
        ...tokenize(query),
        ...keywords.flatMap((keyword) => tokenize(keyword)),
        ...features.flatMap((feature) => tokenize(feature)),
        ...locationTerms.flatMap((term) => tokenize(term)),
      ])
    );

    const scoredResults = properties.map((property: any) => {
      const searchableText = buildSearchablePropertyText(property);
      let score = 0;

      for (const term of locationTerms) {
        if (searchableText.includes(term)) score += 6;
      }

      for (const term of features.map((feature) => normalizeText(feature))) {
        if (term && searchableText.includes(term)) score += 4;
      }

      for (const term of keywords.map((keyword) => normalizeText(keyword))) {
        if (term && searchableText.includes(term)) score += 3;
      }

      for (const token of queryTokens) {
        if (searchableText.includes(token)) score += 1;
      }

      if (normalizeText(property.name).includes(normalizeText(query))) {
        score += 8;
      }

      return {
        property,
        score,
      };
    });

    const matchedResults = scoredResults.filter(({ score }) => score > 0);

    const rankedResults = (matchedResults.length > 0 ? matchedResults : scoredResults)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        if (sort === "price_asc") {
          return (a.property.base_price_per_night ?? Number.MAX_SAFE_INTEGER) - (b.property.base_price_per_night ?? Number.MAX_SAFE_INTEGER);
        }

        if (sort === "price_desc") {
          return (b.property.base_price_per_night ?? 0) - (a.property.base_price_per_night ?? 0);
        }

        return (b.property.booking_rating ?? 0) - (a.property.booking_rating ?? 0);
      })
      .slice(0, 12)
      .map(({ property }) => property);

    const results = rankedResults;

    // Build a summary for the user
    const filterSummary = {
      parsed_filters: filters,
      fallback_used: fallbackUsed,
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
