import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Twilio TwiML webhook — drives the conversational flow.
   3 branches: Vânzare / Închiriere / Regim Hotelier (cazare).
─────────────────────────────────────────────────────────────── */

const xmlResponse = (xml: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    headers: { "Content-Type": "text/xml" },
  });

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

/**
 * Detectează ramura conversației pe baza listing_type / property_type.
 * Returnează: "vanzare" | "inchiriere" | "cazare"
 */
function detectBranch(listingType?: string | null, propertyType?: string | null): "vanzare" | "inchiriere" | "cazare" {
  const t = (listingType || propertyType || "").toLowerCase();
  if (/cazare|hotel|regim|noapte|airbnb|booking/.test(t)) return "cazare";
  if (/inchiri|rent|chirie|lună|luna/.test(t)) return "inchiriere";
  return "vanzare";
}

/**
 * Salutul inițial — diferit per ramură.
 */
function openingLine(branch: "vanzare" | "inchiriere" | "cazare", contextSummary: string): string {
  const intro = "Bună ziua, sunt Ana de la RealTrust Timișoara";
  if (branch === "vanzare") {
    return `${intro}. V-am contactat în legătură cu proprietatea pe care o aveți la vânzare${contextSummary ? " — " + contextSummary : ""}. Aveți un minut să discutăm? Suntem o agenție premium și avem cumpărători activi pe zona Timișoarei.`;
  }
  if (branch === "inchiriere") {
    return `${intro}. V-am contactat în legătură cu proprietatea dumneavoastră de închiriat${contextSummary ? " — " + contextSummary : ""}. Aveți un moment? Lucrăm cu chiriași verificați și putem garanta venituri lunare stabile.`;
  }
  return `${intro}, agenție specializată în regim hotelier. V-am contactat în legătură cu proprietatea pe care o gestionați${contextSummary ? " — " + contextSummary : ""}. Aveți un minut? Putem crește veniturile cu peste 40% față de chiria clasică, fără bătăi de cap.`;
}

/**
 * System prompt-ul AI pentru fiecare ramură.
 */
function systemPromptForBranch(branch: "vanzare" | "inchiriere" | "cazare", leadContext: string, objective: string): string {
  const common = `Ești Ana, asistent vocal al RealTrust, agenție de imobiliare premium din Timișoara. Vorbești NUMAI în limba română, scurt, natural, cu maxim 2-3 propoziții per replică. ${leadContext}\n\nObiectiv principal: ${objective === "qualify" ? "calificare interes (buget, timeline, urgență)" : objective === "schedule" ? "programare vizionare/întâlnire la birou" : "follow-up amabil"}. Dacă persoana pare deranjată sau spune că nu este interesată, închizi politicos cu „Mulțumesc pentru timp, vă doresc o zi bună. La revedere."`;

  if (branch === "vanzare") {
    return `${common}\n\nRAMURĂ: VÂNZARE. Întrebări cheie: (1) Mai este disponibilă proprietatea? (2) Ce preț ferm aveți în minte? (3) Aveți deja cumpărători interesați? (4) Acceptați colaborare cu o agenție pentru găsire cumpărători calificați? Dacă da, propune o vizionare a proprietății pentru evaluare profesională în 2-3 zile.`;
  }
  if (branch === "inchiriere") {
    return `${common}\n\nRAMURĂ: ÎNCHIRIERE. Întrebări cheie: (1) Mai este disponibilă pentru închiriere? (2) Ce chirie lunară solicitați? (3) Pe ce perioadă (minim 1 an / flexibil)? (4) Aveți preferințe (familie, fără animale, etc)? Propune servicii de management închiriere sau aducere de chiriași verificați. Vizionare în 2-3 zile.`;
  }
  return `${common}\n\nRAMURĂ: REGIM HOTELIER. Întrebări cheie: (1) Proprietatea este deja în regim hotelier sau o închiriază clasic? (2) Ce venit lunar obține acum? (3) Ar fi deschis(ă) la o analiză gratuită de potențial venit? Beneficii cheie de menționat: 9.4% ROI net verificat, gestionare completă (curățenie, check-in, prețuri dinamice), zero bătăi de cap. Propune o întâlnire scurtă la birou sau pe Zoom.`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const turn = parseInt(url.searchParams.get("turn") || "0", 10);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!sessionId) {
      return xmlResponse(`<Response><Say language="ro-RO">Eroare configurare. La revedere.</Say><Hangup/></Response>`);
    }

    const { data: session } = await supabase
      .from("voice_call_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return xmlResponse(`<Response><Hangup/></Response>`);

    // Determine branch + context
    let branch: "vanzare" | "inchiriere" | "cazare" = "vanzare";
    let contextSummary = "";
    let leadContext = "";

    if (session.scraper_lead_id) {
      const { data: lead } = await supabase
        .from("scraper_leads")
        .select("title, listing_type, prospect_category, agency_name, original_price, city")
        .eq("id", session.scraper_lead_id)
        .maybeSingle();
      if (lead) {
        branch = detectBranch(lead.listing_type);
        contextSummary = `${lead.title || "anunțul dvs"}${lead.city ? ", " + lead.city : ""}`;
        leadContext = `Context lead: ${lead.title || ""} — ${lead.city || ""} — preț listat ${lead.original_price || "?"} EUR — tip: ${lead.listing_type || "?"} — prospect: ${lead.prospect_category || "?"}.`;
      }
    } else if (session.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, property_type, property_area, message")
        .eq("id", session.lead_id)
        .maybeSingle();
      if (lead) {
        branch = detectBranch(null, lead.property_type);
        contextSummary = `${lead.property_type || "proprietatea"} de ${lead.property_area || "?"}mp`;
        leadContext = `Context lead: ${lead.name} — ${lead.property_type} ${lead.property_area}mp. Mesaj: ${(lead.message || "").slice(0, 200)}`;
      }
    }

    const objective = session.call_objective || "qualify";

    // Parse user speech
    let userSpeech = "";
    if (req.method === "POST") {
      const form = await req.formData();
      userSpeech = (form.get("SpeechResult") as string) || "";
    }

    const transcript: any[] = Array.isArray(session.transcript) ? session.transcript : [];
    if (userSpeech) {
      transcript.push({ role: "user", text: userSpeech, at: new Date().toISOString() });
    }

    let aiReply = "";
    let shouldHangup = false;

    if (turn === 0) {
      aiReply = openingLine(branch, contextSummary);
    } else if (LOVABLE_API_KEY) {
      const systemPrompt = session.voice_agent_prompt || systemPromptForBranch(branch, leadContext, objective);
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...transcript.slice(-8).map((t: any) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text })),
          ],
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiReply = aiData.choices?.[0]?.message?.content?.trim() || "Mulțumesc pentru timp. La revedere.";
      } else {
        aiReply = "Mulțumesc pentru timp. Vă voi contacta în curând. O zi bună!";
        shouldHangup = true;
      }
    } else {
      aiReply = "Mulțumesc pentru timp. La revedere.";
      shouldHangup = true;
    }

    transcript.push({ role: "assistant", text: aiReply, at: new Date().toISOString() });

    if (turn >= 8 || /la revedere|închid|nu mai|mulțumesc.*revedere|o zi bună/i.test(aiReply)) {
      shouldHangup = true;
    }

    await supabase.from("voice_call_sessions").update({
      transcript,
      status: shouldHangup ? "completing" : "in-progress",
    }).eq("id", sessionId);

    if (shouldHangup) {
      return xmlResponse(
        `<Response><Say language="ro-RO" voice="Polly.Carmen">${escapeXml(aiReply)}</Say><Hangup/></Response>`
      );
    }

    const nextUrl = `${SUPABASE_URL}/functions/v1/voice-agent-twiml?sessionId=${sessionId}&turn=${turn + 1}`;
    return xmlResponse(
      `<Response>
        <Say language="ro-RO" voice="Polly.Carmen">${escapeXml(aiReply)}</Say>
        <Gather input="speech" language="ro-RO" speechTimeout="2" timeout="5" action="${nextUrl}" method="POST">
          <Say language="ro-RO" voice="Polly.Carmen">Vă ascult.</Say>
        </Gather>
        <Redirect method="POST">${nextUrl}</Redirect>
      </Response>`
    );
  } catch (e: any) {
    console.error("voice-agent-twiml error:", e);
    return xmlResponse(`<Response><Say language="ro-RO">A apărut o eroare. La revedere.</Say><Hangup/></Response>`);
  }
});
