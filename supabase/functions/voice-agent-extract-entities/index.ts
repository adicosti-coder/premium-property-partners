import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Voice Agent — extract entities + update caller profile.
   Server-to-server only. Authenticated via SUPABASE_SERVICE_ROLE_KEY bearer
   OR triggered internally from voice-agent-twiml via EdgeRuntime.waitUntil. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTRACT_PROMPT = `Ești un extractor de entități pentru apeluri imobiliare în limba română (Timișoara).
Primești ULTIMELE replici dintr-un apel telefonic. Returnează DOAR un JSON valid (fără markdown) cu structura:
{
  "budget_min": number|null,
  "budget_max": number|null,
  "preferred_zones": string[],   // ex: ["Iosefin","Cetate","Dumbrăvița"]
  "property_types": string[],    // ex: ["apartament","garsonieră","casă","studio"]
  "rooms_min": number|null,
  "rooms_max": number|null,
  "timeline": "urgent"|"1-3 luni"|"3-6 luni"|"explorare"|null,
  "branch": "vanzare"|"inchiriere"|"cazare"|null,
  "summary": string,             // 1 frază scurtă, în română, ce vrea apelantul
  "last_objection": string|null  // ultima obiecție clară a apelantului (ex: "preț prea mare", "vrea zonă centrală"), sau null
}
Reguli: dacă o valoare nu este menționată CLAR, pune null sau []. Bugetul mereu în EUR. NU inventa.`;

async function extractWithGemini(apiKey: string, transcriptTail: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: transcriptTail },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const txt = data.choices?.[0]?.message?.content?.trim() || "{}";
  try { return JSON.parse(txt); } catch { return {}; }
}

function mergeEntities(prev: any, next: any) {
  const out = { ...(prev || {}) };
  for (const key of ["budget_min","budget_max","rooms_min","rooms_max","timeline","branch"]) {
    if (next[key] !== null && next[key] !== undefined && next[key] !== "") out[key] = next[key];
  }
  for (const key of ["preferred_zones","property_types"]) {
    const merged = new Set([...(out[key] || []), ...((next[key] || []) as string[])]);
    out[key] = [...merged].filter(Boolean);
  }
  if (next.summary && next.summary.length > 3) out.summary = next.summary;
  out.updated_at = new Date().toISOString();
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    // Auth: only service role bearer (server-to-server)
    const auth = req.headers.get("Authorization") || "";
    if (auth !== `Bearer ${SERVICE_KEY}`) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: session } = await sb
      .from("voice_call_sessions")
      .select("id, transcript, extracted_entities, to_number, caller_profile_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript: any[] = Array.isArray(session.transcript) ? session.transcript : [];
    if (transcript.length < 2) {
      return new Response(JSON.stringify({ skipped: true, reason: "transcript too short" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tail = transcript.slice(-10)
      .map((t: any) => `${t.role === "user" ? "OASPETE" : "ANDREI"}: ${t.text}`)
      .join("\n");

    const next = await extractWithGemini(LOVABLE_API_KEY, tail);
    const merged = mergeEntities(session.extracted_entities || {}, next);

    await sb.from("voice_call_sessions")
      .update({ extracted_entities: merged })
      .eq("id", sessionId);

    // Persist into caller profile (if we have a phone)
    let profileId: string | null = session.caller_profile_id || null;
    const phone = (session.to_number || "").trim();
    if (phone) {
      const { data: existing } = await sb
        .from("voice_caller_profiles")
        .select("id, preferred_zones, property_types, mentioned_property_ids, notes, call_count")
        .eq("phone_normalized", phone)
        .maybeSingle();

      const zones = [...new Set([...(existing?.preferred_zones || []), ...(merged.preferred_zones || [])])].filter(Boolean);
      const ptypes = [...new Set([...(existing?.property_types || []), ...(merged.property_types || [])])].filter(Boolean);

      if (existing) {
        // Increment call_count only first time this session links to profile
        const isFirstLink = session.caller_profile_id !== existing.id;
        await sb.from("voice_caller_profiles").update({
          preferred_branch: merged.branch ?? undefined,
          budget_min: merged.budget_min ?? undefined,
          budget_max: merged.budget_max ?? undefined,
          preferred_zones: zones,
          property_types: ptypes,
          rooms_min: merged.rooms_min ?? undefined,
          rooms_max: merged.rooms_max ?? undefined,
          timeline: merged.timeline ?? undefined,
          notes: merged.summary || existing.notes,
          last_objection: next.last_objection || undefined,
          last_session_id: sessionId,
          last_call_at: new Date().toISOString(),
          call_count: isFirstLink ? (existing.call_count || 0) + 1 : existing.call_count,
        }).eq("id", existing.id);
        profileId = existing.id;
      } else {
        const { data: created } = await sb.from("voice_caller_profiles").insert({
          phone_normalized: phone,
          preferred_branch: merged.branch || null,
          budget_min: merged.budget_min ?? null,
          budget_max: merged.budget_max ?? null,
          preferred_zones: zones,
          property_types: ptypes,
          rooms_min: merged.rooms_min ?? null,
          rooms_max: merged.rooms_max ?? null,
          timeline: merged.timeline || null,
          notes: merged.summary || null,
          last_objection: next.last_objection || null,
          call_count: 1,
          last_call_at: new Date().toISOString(),
          last_session_id: sessionId,
        }).select("id").maybeSingle();
        profileId = created?.id || null;
      }

      if (profileId && profileId !== session.caller_profile_id) {
        await sb.from("voice_call_sessions").update({ caller_profile_id: profileId }).eq("id", sessionId);
      }
    }

    return new Response(JSON.stringify({ success: true, entities: merged, profileId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("voice-agent-extract-entities error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
