import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Twilio TwiML webhook — drives the conversational flow.
   Twilio fetches this URL when call is answered.
   We use <Gather input="speech"> + AI for each turn.
─────────────────────────────────────────────────────────────── */

const xmlResponse = (xml: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    headers: { "Content-Type": "text/xml" },
  });

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

    if (!session) {
      return xmlResponse(`<Response><Hangup/></Response>`);
    }

    // Parse user speech from Twilio POST
    let userSpeech = "";
    if (req.method === "POST") {
      const form = await req.formData();
      userSpeech = (form.get("SpeechResult") as string) || "";
    }

    const transcript: any[] = Array.isArray(session.transcript) ? session.transcript : [];

    // Append user turn
    if (userSpeech) {
      transcript.push({ role: "user", text: userSpeech, at: new Date().toISOString() });
    }

    // Decide AI reply
    let aiReply = "";
    let shouldHangup = false;

    if (turn === 0) {
      aiReply = "Bună ziua, sunt Ana de la RealTrust Timișoara. Aveți un moment să vorbim despre proprietatea pe care am văzut-o pe anunț?";
    } else if (LOVABLE_API_KEY) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: session.voice_agent_prompt || "Ești Ana de la RealTrust. Răspunsuri scurte, naturale, în română. Maxim 2-3 propoziții." },
            ...transcript.slice(-8).map((t: any) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text })),
          ],
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiReply = aiData.choices?.[0]?.message?.content?.trim() || "Mulțumesc pentru timp. La revedere.";
      } else {
        aiReply = "Mulțumesc pentru timp. Vă voi contacta în curând. La revedere.";
        shouldHangup = true;
      }
    } else {
      aiReply = "Mulțumesc pentru timp. La revedere.";
      shouldHangup = true;
    }

    transcript.push({ role: "assistant", text: aiReply, at: new Date().toISOString() });

    // Heuristic hangup
    if (turn >= 8 || /la revedere|închid|nu mai|mulțumesc.*revedere/i.test(aiReply)) {
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

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}
