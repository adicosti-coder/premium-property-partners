import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ────────────────────────────────────────────────────────────
   Visitor Memory — cross-function tracker for anonymous and
   authenticated users. Records property views, search queries,
   chatbot conversations, and infers preferences (budget, type,
   neighborhoods) to power personalised recommendations.
──────────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const { action, sessionId, userId } = body;

    if (!sessionId || sessionId.length < 10) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure row exists (upsert)
    const ensureRow = async () => {
      const { data: existing } = await supabase
        .from("visitor_memory")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (existing) return existing;
      const { data: created } = await supabase
        .from("visitor_memory")
        .insert({ session_id: sessionId, user_id: userId || null })
        .select()
        .single();
      return created;
    };

    /* ── GET: return current memory ── */
    if (action === "get") {
      const row = await ensureRow();
      return new Response(JSON.stringify({ memory: row }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── TRACK: append property view / search / preference ── */
    if (action === "track") {
      const { event } = body; // { type: 'view'|'search'|'preference'|'intent', data: {...} }
      const row = await ensureRow();

      const updates: any = { last_seen_at: new Date().toISOString() };
      if (userId) updates.user_id = userId;

      if (event?.type === "view" && event.data?.propertyId) {
        const list = Array.isArray(row.viewed_properties) ? row.viewed_properties : [];
        const filtered = list.filter((v: any) => v.id !== event.data.propertyId).slice(0, 19);
        updates.viewed_properties = [
          { id: event.data.propertyId, name: event.data.name, price: event.data.price, type: event.data.type, viewedAt: new Date().toISOString() },
          ...filtered,
        ];
      }

      if (event?.type === "search" && event.data?.query) {
        const list = Array.isArray(row.search_history) ? row.search_history : [];
        updates.search_history = [
          { query: event.data.query, intent: event.data.intent, at: new Date().toISOString() },
          ...list.slice(0, 19),
        ];
      }

      if (event?.type === "preference") {
        if (event.data.budget_min != null) updates.budget_min = event.data.budget_min;
        if (event.data.budget_max != null) updates.budget_max = event.data.budget_max;
        if (event.data.preferred_neighborhoods) updates.preferred_neighborhoods = event.data.preferred_neighborhoods;
        if (event.data.preferred_listing_type) updates.preferred_listing_type = event.data.preferred_listing_type;
        if (event.data.preferred_rooms) updates.preferred_rooms = event.data.preferred_rooms;
      }

      if (event?.type === "intent" && event.data?.intent) {
        updates.last_intent = event.data.intent;
      }

      // Lead score heuristic
      const views = (updates.viewed_properties || row.viewed_properties || []).length;
      const searches = (updates.search_history || row.search_history || []).length;
      const hasBudget = (updates.budget_max ?? row.budget_max) != null;
      const hasUser = !!(updates.user_id ?? row.user_id);
      updates.lead_score = Math.min(100,
        views * 5 + searches * 3 + (hasBudget ? 20 : 0) + (hasUser ? 25 : 0)
      );

      const { data: updated } = await supabase
        .from("visitor_memory")
        .update(updates)
        .eq("session_id", sessionId)
        .select()
        .single();

      return new Response(JSON.stringify({ memory: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── SUMMARIZE: AI-generate chatbot summary + infer prefs ── */
    if (action === "summarize") {
      const { messages } = body;
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: "messages + LOVABLE_API_KEY required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transcript = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n").slice(0, 8000);

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Analizează conversația vizitatorului cu chatbot-ul RealTrust și returnează STRICT JSON:
{
  "summary": "1-2 propoziții despre ce caută vizitatorul",
  "intent": "cazare|cumparare|investitie|inchiriere|info",
  "budget_min": number sau null,
  "budget_max": number sau null,
  "preferred_neighborhoods": ["..."] sau [],
  "preferred_listing_type": "vanzare|inchiriere|cazare|investitie" sau null,
  "preferred_rooms": number sau null
}`,
            },
            { role: "user", content: transcript },
          ],
        }),
      });

      if (!aiRes.ok) {
        return new Response(JSON.stringify({ error: `AI ${aiRes.status}` }), {
          status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content?.trim() || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(raw.replace(/```json\n?|```/g, "").trim()); } catch { parsed = {}; }

      const updates: any = {
        chatbot_summary: parsed.summary || null,
        last_intent: parsed.intent || null,
        last_seen_at: new Date().toISOString(),
      };
      if (parsed.budget_min != null) updates.budget_min = parsed.budget_min;
      if (parsed.budget_max != null) updates.budget_max = parsed.budget_max;
      if (Array.isArray(parsed.preferred_neighborhoods) && parsed.preferred_neighborhoods.length)
        updates.preferred_neighborhoods = parsed.preferred_neighborhoods;
      if (parsed.preferred_listing_type) updates.preferred_listing_type = parsed.preferred_listing_type;
      if (parsed.preferred_rooms) updates.preferred_rooms = parsed.preferred_rooms;
      if (userId) updates.user_id = userId;

      await ensureRow();
      const { data: updated } = await supabase
        .from("visitor_memory")
        .update(updates)
        .eq("session_id", sessionId)
        .select()
        .single();

      return new Response(JSON.stringify({ memory: updated, parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── RECOMMEND: returns matching properties from prefs ── */
    if (action === "recommend") {
      const row = await ensureRow();
      let q = supabase.from("properties").select("id, name, slug, location, listing_type, base_price_per_night, rooms, image_path, images").eq("is_active", true).limit(6);
      if (row.preferred_listing_type) q = q.eq("listing_type", row.preferred_listing_type);
      if (row.preferred_rooms) q = q.eq("rooms", row.preferred_rooms);
      const { data: props } = await q;
      return new Response(JSON.stringify({ memory: row, recommendations: props || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("visitor-memory error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
