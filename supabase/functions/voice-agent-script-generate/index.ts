// Edge function: generates a premium A/B variant of an existing voice-agent script
// using Lovable AI Gateway. Returns { name, system_prompt, notes }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { script_id, mode = "premium_variant" } = await req.json().catch(() => ({}));
    if (!script_id) {
      return new Response(JSON.stringify({ error: "script_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: must be admin
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await userClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: script } = await admin
      .from("voice_agent_scripts").select("*").eq("id", script_id).maybeSingle();
    if (!script) {
      return new Response(JSON.stringify({ error: "Script not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode-specific system instruction
    const MODE_INSTRUCTIONS: Record<string, string> = {
      premium_variant: `Ești un expert în conversational AI pentru imobiliare în România. Vei primi un system prompt existent pentru un voice agent telefonic și vei genera o VARIANTĂ A/B PREMIUM îmbunătățită.
Schimbări țintă:
- Ton mai cald, mai natural, ca un concierge de hotel 5*.
- Întrebări de calificare mai inteligente (BANT light: buget, timeline, motivație).
- Tehnici subtile de social proof ("alți proprietari din zonă au ales...").
- Gestionare obiecții ("nu mă interesează", "sunt la lucru", "mai gândesc").
- Încheiere cu CTA clar (vizionare în 24-48h).
Păstrează: limba (română), structura turn-based, regulile anti-derapaj.`,

      microcopy_cta: `Ești un copywriter expert în Conversion Rate Optimization pentru voice agents imobiliari. Vei primi un system prompt existent și vei genera o VARIANTĂ A/B optimizată EXCLUSIV pe MICROCOPY-ul de CTA / încheiere apel.
Schimbări țintă:
- Reformulează frazele de încheiere ca să maximizeze conversia (programare vizionare, confirmare WhatsApp, follow-up).
- Aplică tehnici de microcopy: alternativă forțată ("preferați marți la 14 sau miercuri la 10?"), commitment & consistency, low-friction asks ("îmi confirmați WhatsApp-ul?").
- Elimină frazele pasive ("v-ar interesa eventual"). Înlocuiește cu acțiune directă.
- Maxim 1-2 întrebări CTA pe finalul apelului. Niciodată mai multe.
- Păstrează totul în afara secțiunii de CTA (calificare, ton) la fel — DOAR microcopy-ul de încheiere se schimbă.
Păstrează limba (română) și structura turn-based.`,

      british_premium: `You are an expert in conversational AI for luxury & international real estate. You will receive an existing voice agent system prompt and generate a PREMIUM A/B VARIANT in BRITISH ENGLISH with a refined, upscale tone suited for high-end and international clientele.
Targeted changes:
- Switch language to polished British English (use "shall", "would you mind", "perhaps", "do let me know").
- Tone: discreet, confident, concierge-grade — think Claridge's or Mandarin Oriental.
- Replace any Romanian-specific cultural references with internationally neutral equivalents.
- Qualification questions framed politely (timeline, intent, budget brackets in EUR/GBP).
- CTA: offer a private viewing or video walkthrough within 24-48h.
Keep the turn-based structure and anti-derail rules.`,

      layout_sections: `Ești un editor structural pentru system prompts. Vei primi un prompt existent și îl vei REORGANIZA într-un layout clar cu secțiuni Markdown, FĂRĂ a schimba conținutul de fond sau tonul.
Reguli stricte:
- Păstrează exact aceeași limbă, ton și informație ca în original.
- Reorganizează conținutul în următoarele secțiuni (în ordine), folosind heading-uri Markdown ## :
  ## ROL & PERSONA
  ## REGULI ANTI-DERAPAJ
  ## INTRO (primele 2 replici)
  ## CALIFICARE (întrebări BANT light)
  ## OBIECȚII FRECVENTE
  ## FAQ
  ## CTA & ÎNCHEIERE
- Dacă o secțiune nu există în original, las-o cu placeholder "_(de completat)_" — nu inventa conținut nou.
- Folosește bullet points (- ) pentru liste.
- Numele scriptului = numele original + " — Layout".`,
    };

    const sysInstruction = (MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.premium_variant) +
      `\n\nReturnează JSON strict prin tool call: {"name": "<sub 80 caractere>", "system_prompt": "<text complet>", "notes": "<ce ai schimbat, max 200 caractere>"}.`;

    const userMessage = `SCRIPT EXISTENT (numit "${script.name}", limbă "${script.language}"):\n\n${script.system_prompt}\n\nGenerează varianta în JSON (mode=${mode}).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sysInstruction },
          { role: "user", content: userMessage },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_variant",
            description: "Emit the generated A/B variant",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Sub 60 caractere" },
                system_prompt: { type: "string", description: "System prompt complet" },
                notes: { type: "string", description: "Ce a fost schimbat" },
              },
              required: ["name", "system_prompt", "notes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_variant" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Reîncearcă în câteva secunde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Credite AI epuizate. Adaugă credite în Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI nu a returnat o variantă structurată" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try { parsed = JSON.parse(toolCall.function.arguments); } catch {
      return new Response(JSON.stringify({ error: "AI output invalid" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert as a new (inactive) script
    const newName = (parsed.name || `${script.name} — Variant B`).slice(0, 80);
    const { data: inserted, error: insErr } = await admin
      .from("voice_agent_scripts")
      .insert({
        name: newName,
        system_prompt: parsed.system_prompt,
        notes: parsed.notes || `AI-generated A/B variant of "${script.name}" (mode: ${mode})`,
        language: script.language,
        is_active: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, script: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
