// wa-andrei-reply — generează răspunsul AI (GPT-5.4-mini) și îl trimite via wa-andrei-send.
// Internal-only, invocat de wa-andrei-webhook.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@1";
import { generateText, tool, stepCountIs } from "npm:ai@5";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function timingSafeEq(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function isOfficeHoursBucharest(): boolean {
  const nowUTC = new Date();
  // Romania UTC+2 winter / +3 summer — approximate with +2 for gate purposes.
  const buchHour = (nowUTC.getUTCHours() + 2) % 24;
  const day = nowUTC.getUTCDay(); // 0=Sun
  return day >= 1 && day <= 5 && buchHour >= 10 && buchHour < 18;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const internalSecret = Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "";
  const provided = req.headers.get("x-internal-secret") || "";
  if (!internalSecret || !timingSafeEq(internalSecret, provided)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let payload: { conversation_id?: string } = {};
  try { payload = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const conversationId = (payload.conversation_id || "").trim();
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "conversation_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Settings + kill switch
  const { data: settings } = await supabase.from("wa_agent_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings || !settings.enabled) {
    console.log("[wa-andrei-reply] agent disabled, skipping");
    return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (settings.office_hours_only && !isOfficeHoursBucharest()) {
    await supabase.from("wa_conversations")
      .update({ status: "awaiting_human", handoff_reason: "outside_office_hours" })
      .eq("id", conversationId);
    return new Response(JSON.stringify({ ok: true, skipped: "outside_hours" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 2. Conversation + history
  const { data: conv } = await supabase.from("wa_conversations")
    .select("id, phone_normalized, status, prospect_id")
    .eq("id", conversationId).maybeSingle();
  if (!conv) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (conv.status === "awaiting_human" || conv.status === "closed" || conv.status === "escalated_to_call") {
    console.log(`[wa-andrei-reply] status=${conv.status}, not auto-replying`);
    return new Response(JSON.stringify({ ok: true, skipped: `status_${conv.status}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: history } = await supabase.from("wa_messages")
    .select("role, content, direction, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(20);

  // 3. Prospect context (best-effort)
  let contextText = "";
  try {
    const ctxResp = await fetch(`${supabaseUrl}/functions/v1/voice-agent-context-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ phone: conv.phone_normalized }),
    });
    if (ctxResp.ok) {
      const ctx = await ctxResp.json();
      contextText = ctx?.agent_memory_context || ctx?.fallback_template || "";
    }
  } catch (e) {
    console.warn("[wa-andrei-reply] context fetch failed:", e);
  }

  // 4. AI SDK provider + tools
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: false,
    headers: {
      "Lovable-API-Key": lovableKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
  const model = provider("openai/gpt-5.4-mini");

  const tools = {
    escalate_to_call: tool({
      description: "Cere ca Andrei să sune proprietarul acum (când lead-ul e cald și clar). Folosește DOAR când proprietarul a răspuns clar la calificare și e deschis să continue conversația la telefon.",
      inputSchema: z.object({
        reason: z.string().describe("De ce e escaladat: rezumat scurt lead + interes"),
        qualification_score: z.number().min(0).max(100).describe("Scor calificare 0-100"),
      }),
      execute: async ({ reason, qualification_score }) => {
        await supabase.from("wa_conversations")
          .update({
            status: "escalated_to_call",
            handoff_reason: reason,
            qualification_score,
            assigned_channel: "voice",
          })
          .eq("id", conversationId);
        // Best-effort: kick off voice call (stack-ul vechi)
        try {
          await fetch(`${supabaseUrl}/functions/v1/voice-agent-initiate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({ phone: conv.phone_normalized, source: "wa_escalation" }),
          }).catch(() => {});
        } catch {}
        return { ok: true };
      },
    }),
    mark_qualified: tool({
      description: "Marchează lead-ul cu un scor de calificare (0-100) fără a escalada. Folosește la finalul unei conversații informative.",
      inputSchema: z.object({
        score: z.number().min(0).max(100),
        notes: z.string(),
      }),
      execute: async ({ score, notes }) => {
        await supabase.from("wa_conversations")
          .update({ qualification_score: score, handoff_reason: notes })
          .eq("id", conversationId);
        return { ok: true };
      },
    }),
    handoff_human: tool({
      description: "Predă conversația unui operator uman (când proprietarul cere detalii tehnice / contract / plată sau e nemulțumit). Oprește răspunsurile AI pe această conversație.",
      inputSchema: z.object({ reason: z.string() }),
      execute: async ({ reason }) => {
        await supabase.from("wa_conversations")
          .update({ status: "awaiting_human", handoff_reason: reason })
          .eq("id", conversationId);
        return { ok: true };
      },
    }),
  };

  // 5. Build messages
  const systemPrompt = `${settings.system_prompt}

CANAL: WhatsApp text. Mesaj MAX 2-3 propoziții. Nu formatări markdown.

CONTEXT PROPRIETAR (din memoria RealTrust):
${contextText || "(fără istoric anterior — primul contact)"}`;

  const messages = (history || []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (messages.length === 0) {
    // no inbound yet? safety
    return new Response(JSON.stringify({ ok: true, skipped: "no_history" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 6. Generate
  let replyText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(5),
      providerOptions: { lovable: { service_tier: "priority" } },
    });
    replyText = (result.text || "").trim();
    tokensIn = result.usage?.inputTokens ?? 0;
    tokensOut = result.usage?.outputTokens ?? 0;
  } catch (e) {
    console.error("[wa-andrei-reply] AI call failed:", e);
    await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      role: "system",
      content: "",
      error: `ai_error: ${String(e).slice(0, 300)}`,
    });
    return new Response(JSON.stringify({ error: "AI generation failed", details: String(e) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check status again (a tool may have changed it)
  const { data: convAfter } = await supabase.from("wa_conversations")
    .select("status").eq("id", conversationId).maybeSingle();

  if (!replyText) {
    console.log("[wa-andrei-reply] empty reply text (tool-only turn), skipping send");
    return new Response(JSON.stringify({ ok: true, skipped: "empty_text" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (convAfter?.status === "escalated_to_call") {
    // Add a courtesy heads-up before Andrei calls
    if (!replyText.toLowerCase().includes("sun")) {
      replyText = `${replyText}\n\nVă sun eu acum să discutăm direct.`;
    }
  }

  // 7. Send via wa-andrei-send
  const sendResp = await fetch(`${supabaseUrl}/functions/v1/wa-andrei-send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({ conversation_id: conversationId, text: replyText }),
  });

  if (!sendResp.ok) {
    const errBody = await sendResp.text().catch(() => "");
    console.error(`[wa-andrei-reply] send failed [${sendResp.status}]: ${errBody}`);
    return new Response(JSON.stringify({ error: "send_failed", details: errBody }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Update the outbound message with model + tokens (last inserted by wa-andrei-send)
  await supabase.from("wa_messages")
    .update({ ai_model: "openai/gpt-5.4-mini", ai_tokens_in: tokensIn, ai_tokens_out: tokensOut })
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1);

  return new Response(JSON.stringify({ ok: true, tokens_in: tokensIn, tokens_out: tokensOut }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
