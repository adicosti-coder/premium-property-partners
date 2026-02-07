import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client for auth validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication - require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error("Invalid authentication:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify admin role - only admins can translate articles
    const { data: isAdmin, error: roleError } = await supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" });

    if (roleError || !isAdmin) {
      console.error("Unauthorized: User is not admin", user.id);
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Admin ${user.id} translating article`);

    const { title, excerpt, content } = await req.json();

    if (!title || !excerpt || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, excerpt, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a professional translator specializing in real estate and property management content. 
Translate the following Romanian blog article content to English. 

IMPORTANT RULES:
1. Maintain the exact same HTML structure and formatting
2. Keep all HTML tags intact (<h2>, <p>, <strong>, <em>, <ul>, <li>, etc.)
3. Preserve any URLs, email addresses, or phone numbers as-is
4. Use natural, fluent English appropriate for a professional real estate blog
5. Maintain the same tone - professional yet accessible
6. Keep brand names like "RealTrust" unchanged
7. Translate Romanian-specific terms appropriately (e.g., "închiriere pe termen scurt" → "short-term rental")

Return ONLY a valid JSON object with these exact keys:
{
  "title_en": "translated title",
  "excerpt_en": "translated excerpt", 
  "content_en": "translated HTML content"
}`;

    const userPrompt = `Translate this Romanian blog article to English:

TITLE:
${title}

EXCERPT:
${excerpt}

CONTENT (HTML):
${content}`;

    console.log("Calling Lovable AI for translation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Translation service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received");

    const assistantMessage = data.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid response from translation service" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    let translation;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      let jsonStr = assistantMessage;
      const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      translation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw response:", assistantMessage);
      return new Response(
        JSON.stringify({ error: "Failed to parse translation response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!translation.title_en || !translation.excerpt_en || !translation.content_en) {
      console.error("Incomplete translation response:", translation);
      return new Response(
        JSON.stringify({ error: "Incomplete translation received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Translation successful");

    return new Response(
      JSON.stringify({
        title_en: translation.title_en,
        excerpt_en: translation.excerpt_en,
        content_en: translation.content_en,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
