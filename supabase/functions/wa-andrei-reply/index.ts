// wa-andrei-reply — răspunsul AI (Gemini direct) pentru proprietarii care răspund
// la campania WhatsApp; detectează Hot Lead. Internal-only, invocat de wa-andrei-webhook.
import { createClient } from "npm:@supabase/supabase-js@2";
import { relayToMake } from "../_shared/makeRelay.ts";

const GEMINI_MODEL = "gemini-3.6-flash";

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

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    .select("id, phone_normalized, status, prospect_id, last_outbound_at, last_inbound_at, wa_profile_name")
    .eq("id", conversationId).maybeSingle();
  if (!conv) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (conv.status === "awaiting_human" || conv.status === "closed" || conv.status === "escalated_to_call") {
    console.log(`[wa-andrei-reply] status=${conv.status}, not auto-replying`);
    return new Response(JSON.stringify({ ok: true, skipped: `status_${conv.status}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 2b. Rate limit per conversație: max 1 răspuns AI / REPLY_COOLDOWN_MS.
  // Protejează atât de burst-uri (proprietar care trimite 5 mesaje rapid) cât
  // și de invocări duplicate ale webhook-ului Meta (retry la > 20s).
  const REPLY_COOLDOWN_MS = 5_000;
  if (conv.last_outbound_at) {
    const sinceLastReply = Date.now() - new Date(conv.last_outbound_at as string).getTime();
    if (sinceLastReply >= 0 && sinceLastReply < REPLY_COOLDOWN_MS) {
      console.log(`[wa-andrei-reply] rate limited (${sinceLastReply}ms since last outbound)`);
      return new Response(
        JSON.stringify({ ok: true, skipped: "rate_limited", retry_in_ms: REPLY_COOLDOWN_MS - sinceLastReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
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

  // 4. Contextul anunțului (titlu, zonă, preț, tip tranzacție) din campania de prospectare
  let listingText = "(anunț necunoscut)";
  let listingCategory = "";
  let listingId: string | null = conv.prospect_id ?? null;
  let listingInfo: any = null;
  try {
    let q = supabase.from("prospect_listings")
      .select("id, title, zone, price, currency, rooms, size, contact_name, category, source_url, published_at");
    q = listingId ? q.eq("id", listingId) : q.eq("phone_normalized", conv.phone_normalized);
    const { data: pl } = await q.limit(1).maybeSingle();
    if (pl) {
      listingId = pl.id;
      listingInfo = pl;
      listingCategory = String(pl.category ?? "").trim().toLowerCase();
      listingText = [
        pl.title, pl.zone ? `zona ${pl.zone}` : null,
        pl.price ? `${pl.price} ${pl.currency ?? "EUR"}` : null,
        pl.rooms ? `${pl.rooms} camere` : null, pl.size ? `${pl.size} mp` : null,
        pl.contact_name ? `proprietar: ${pl.contact_name}` : null,
        pl.category ? `tip anunț: ${pl.category}` : null,
      ].filter(Boolean).join(" · ");
    }
  } catch (e) {
    console.warn("[wa-andrei-reply] listing context failed:", e);
  }

  // Strategia conversației în funcție de tipul anunțului (vânzare vs închiriere)
  const isVanzare = listingCategory === "vanzare";
  const isChirie = listingCategory === "inchiriere" || listingCategory === "hotelier";
  const strategyText = isVanzare
    ? `STRATEGIE (anunț de VÂNZARE): prioritizează „Vânzare Asistată” — promovare profesională, cumpărători calificați și pre-verificați, dosare complete, negociere și acte până la semnare. Propune o evaluare GRATUITĂ a prețului de piață al proprietății ca pas concret.`
    : isChirie
      ? `STRATEGIE (anunț de ÎNCHIRIERE): prioritizează „Regim Hotelier (ApArt Hotel)” — administrare 100% pasivă, randament net estimat ~9,4%/an, cu administrarea RealTrust de 15-20%. Prezintă beneficiul fără bătăi de cap: ne ocupăm de oaspeți, curățenie, chei și taxe.`
      : `STRATEGIE: descoperă mai întâi dacă proprietarul vrea să vândă sau să închirieze, apoi aplică varianta potrivită: Vânzare Asistată cu evaluare gratuită a prețului, respectiv Regim Hotelier cu randament net estimat ~9,4%/an (administrare RealTrust 15-20%).`;

  // E-mail cunoscut pentru acest proprietar?
  let knownEmail: string | null = null;
  try {
    const { data: le } = await supabase.from("leads").select("email")
      .eq("whatsapp_number", conv.phone_normalized).not("email", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    knownEmail = le?.email ?? null;
  } catch { /* ignore */ }

  const systemPrompt = `Ești Andrei, consultant RealTrust Timișoara. Răspunzi pe WhatsApp proprietarilor care au răspuns la mesajul nostru despre anunțul lor.
STIL: scurt (max 2-3 propoziții), cald dar profesionist, consultativ, în română, fără markdown, fără presiune.
FINAL MANDATORIU: încheie fiecare mesaj cu o întrebare deschisă sau cu o invitație de a continua discuția aici, pe WhatsApp, ori la o vizionare/evaluare la apartament. NU propune apeluri telefonice — comunicarea se face prin mesaje.
${strategyText}
SERVICII (menționează-le natural, doar cât e relevant):
1) Vânzare asistată — promovare, filtrarea cumpărătorilor, negociere și acte, până la semnare.
2) Regim hotelier — administrare completă ApArt Hotel, randament net estimat ~9,4%/an; administrarea RealTrust e 15-20%.
COMISION & COSTURI: când proprietarul întreabă direct de comision sau costuri, fii transparent — administrarea RealTrust este de 15-20% din venit și în regim hotelier ea acoperă administrarea 100% pasivă (oaspeți, curățenie, chei, taxe). Explică valoarea adusă și oferă detaliile aici, pe WhatsApp. NU menționa niciodată alte procente de cheltuieli.
REGULI: nu avem birou pentru clienți — vizionările/evaluările se fac la apartament. Nu inventa prețuri sau promisiuni.
Dacă proprietarul refuză, mulțumește politicos și încheie.
E-MAIL: ${knownEmail ? "avem deja adresa de e-mail a proprietarului, nu o mai cere." : "dacă proprietarul arată interes, cere-i politicos adresa de e-mail ca să-i trimitem detaliile anunțului și analiza. Dacă o scrie, pune-o în câmpul \"email\"."}
${settings.system_prompt ? `\nINDICAȚII SUPLIMENTARE:\n${String(settings.system_prompt).slice(0, 3000)}\n` : ""}
ANUNȚUL PROPRIETARULUI: ${listingText}
MEMORIE RealTrust: ${contextText || "(primul contact)"}

Răspunde DOAR cu JSON: {"reply": "textul mesajului", "intent": "hot" | "interested" | "neutral" | "not_interested", "wants_call": true|false, "summary": "rezumat scurt", "email": "adresa dacă proprietarul a scris-o, altfel null", "outcome": "vandut" | "inchiriat" | "pierdut" | null}
"hot" = interes clar (vrea să vândă/administreze cu noi, acceptă evaluarea) sau cere să fie sunat.
"outcome" = DOAR dacă proprietarul confirmă explicit: "vandut" = a vândut proprietatea prin RealTrust; "inchiriat" = a închiriat-o / a semnat administrarea cu RealTrust; "pierdut" = a vândut/închiriat deja altfel, anunțul nu mai e disponibil sau refuză definitiv. Altfel null.`;

  const contents = (history || [])
    .filter((m) => m.content)
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] }));

  if (contents.length === 0) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_history" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 5. Gemini direct
  let replyText = "";
  let intent = "neutral";
  let wantsCall = false;
  let outcome: string | null = null;
  let summary = "";
  let tokensIn = 0;
  let tokensOut = 0;
  try {
    let resp: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      if (resp.status !== 429 && resp.status < 500) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
    if (!resp || !resp.ok) throw new Error(`gemini_${resp?.status}: ${(await resp?.text())?.slice(0, 200)}`);
    const data = await resp.json();
    const raw = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw }; }
    replyText = String(parsed.reply ?? "").trim();
    intent = String(parsed.intent ?? "neutral");
    wantsCall = parsed.wants_call === true;
    outcome = ["vandut", "inchiriat", "pierdut"].includes(parsed.outcome) ? parsed.outcome : null;
    summary = String(parsed.summary ?? "").slice(0, 300);
    tokensIn = data?.usageMetadata?.promptTokenCount ?? 0;
    tokensOut = data?.usageMetadata?.candidatesTokenCount ?? 0;
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

  // 5b. E-mail automat cu detaliile anunțului, după ce proprietarul își lasă adresa
  try {
    const lastUserText = [...contents].reverse().find((c) => c.role === "user")?.parts?.[0]?.text ?? "";
    const found = (lastUserText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "").toLowerCase();
    const email = found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found) ? found : null;
    if (email && email !== knownEmail) {
      await supabase.from("leads").update({ email }).eq("whatsapp_number", conv.phone_normalized);
      const detailUrl = listingInfo?.published_at
        ? `https://realtrust.ro/anunturi-proprietari?anunt=${listingInfo.id}`
        : (listingInfo?.source_url || "https://realtrust.ro/pentru-proprietari");
      const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "owner-listing-details",
          recipientEmail: email,
          idempotencyKey: `owner-listing-details-${conversationId}-${email}`,
          templateData: {
            name: listingInfo?.contact_name || conv.wa_profile_name || "",
            title: listingInfo?.title || "",
            zone: listingInfo?.zone || "",
            price: listingInfo?.price ? `${listingInfo.price} ${listingInfo.currency ?? "EUR"}` : "",
            rooms: listingInfo?.rooms ?? null,
            size: listingInfo?.size ?? null,
            category: listingInfo?.category || "",
            url: detailUrl,
          },
        },
      });
      if (mailErr) console.error("[wa-andrei-reply] email send failed:", mailErr);
    }
  } catch (e) {
    console.warn("[wa-andrei-reply] email step failed:", e);
  }

  const lastUserEmail = () => {
    const t = [...contents].reverse().find((c) => c.role === "user")?.parts?.[0]?.text ?? "";
    return (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "").toLowerCase();
  };
  // 6. Hot Lead → Lead Manager + alertă
  if (intent === "hot" || wantsCall) {
    try {
      const { data: lead } = await supabase.from("leads").select("id, lead_score")
        .eq("whatsapp_number", conv.phone_normalized)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      let leadId = lead?.id ?? null;
      const note = `[WhatsApp AI] ${wantsCall ? "Cere să fie sunat. " : ""}${summary}`;
      if (leadId) {
        await supabase.from("leads").update({
          lead_grade: "hot",
          lead_score: Math.max(Number(lead?.lead_score ?? 0), 90),
          engagement_status: "hot_lead",
          is_read: false,
          scored_at: new Date().toISOString(),
        }).eq("id", leadId);
      } else {
        const { data: nl } = await supabase.from("leads").insert({
          name: `Client WhatsApp ${conv.phone_normalized}`,
          whatsapp_number: conv.phone_normalized,
          source: "whatsapp_reply",
          message: `[Anunț: ${listingText}] ${note}`,
          property_area: 0,
          property_type: "necunoscut",
          lead_grade: "hot",
          lead_score: 90,
          engagement_status: "hot_lead",
        }).select("id").maybeSingle();
        leadId = nl?.id ?? null;
      }
      await supabase.from("wa_conversations")
        .update({ qualification_score: 90, handoff_reason: note, lead_id: leadId })
        .eq("id", conversationId);
      if (listingId) {
        await supabase.from("prospect_listings").update({ lifecycle_status: "interested" }).eq("id", listingId);
      }
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const rows = (admins ?? []).map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: "success",
        title: wantsCall ? "🔥 Hot Lead: proprietarul cere să fie sunat" : "🔥 Hot Lead pe WhatsApp",
        message: `${conv.phone_normalized} · ${listingText}. ${summary}`.slice(0, 500),
        action_url: "/admin?tab=leads",
        action_label: "Deschide lead-ul",
      }));
      if (rows.length) await supabase.from("user_notifications").insert(rows);
      // E-mail automat de follow-up (detalii anunț + apel 2 minute), o singură dată per lead
      const followEmail = knownEmail
        ?? (lastUserEmail() || null);
      if (followEmail && leadId) {
        const { error: fErr } = await supabase.functions.invoke("send-transactional-email", {
          headers: { "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" },
          body: {
            templateName: "hot-lead-followup",
            recipientEmail: followEmail,
            idempotencyKey: `hot-lead-followup-${leadId}`,
            templateData: {
              name: listingInfo?.contact_name || conv.wa_profile_name || "",
              title: listingInfo?.title || "",
              zone: listingInfo?.zone || "",
              price: listingInfo?.price ? `${listingInfo.price} ${listingInfo.currency ?? "EUR"}` : "",
              category: listingInfo?.category || "",
              url: listingInfo?.published_at ? `https://realtrust.ro/anunturi-proprietari?anunt=${listingInfo.id}` : (listingInfo?.source_url || ""),
            },
          },
        });
        if (fErr) console.error("[wa-andrei-reply] hot follow-up email failed:", fErr);
      }
      await relayToMake("wa_hot_lead", {
        lead_id: leadId, conversation_id: conversationId, phone: conv.phone_normalized,
        listing: listingText, wants_call: wantsCall, summary,
      });
    } catch (e) {
      console.error("[wa-andrei-reply] hot lead update failed:", e);
    }
  } else if (intent === "not_interested") {
    await supabase.from("wa_conversations")
      .update({ status: "closed", handoff_reason: summary || "not_interested" })
      .eq("id", conversationId);
  }

  // Conversie automată în Lead Manager (Vândut / Închiriat / Pierdut) din răspunsul proprietarului.
  const autoOutcome = outcome ?? (intent === "not_interested" ? "pierdut" : null);
  if (autoOutcome && conv?.phone_normalized) {
    try {
      const { data: lds } = await supabase.from("leads").select("id, crm_status")
        .eq("whatsapp_number", conv.phone_normalized).order("created_at", { ascending: false }).limit(1);
      const ld = lds?.[0];
      // Nu retrogradăm o conversie deja câștigată în „Pierdut”.
      if (ld && !(autoOutcome === "pierdut" && ["vandut", "inchiriat"].includes(String(ld.crm_status)))) {
        await supabase.from("leads").update({ crm_status: autoOutcome }).eq("id", ld.id);
      }
    } catch (e) { console.error("[wa-andrei-reply] auto conversion failed:", e); }
  }

  // Andrei trimite o ofertă concretă pe WhatsApp (preț, randament, comision, evaluare, link anunț) → „Ofertat".
  // Doar din Nou/Contactat — nu atinge Contractat, Pierdut, Vândut, Închiriat.
  const OFFER_RE = /\d[\d.\s]*\s?(€|eur\b|euro)|randament|9[,.]4\s*%|15\s*[-–]\s*20\s*%|evaluare(a)? gratuit|\/proprietate\/|\/imobiliare|\/anunt|\bofert/i;
  if (!autoOutcome && replyText && OFFER_RE.test(replyText) && conv?.phone_normalized) {
    try {
      const { data: lds } = await supabase.from("leads").select("id")
        .eq("whatsapp_number", conv.phone_normalized).order("created_at", { ascending: false }).limit(1);
      if (lds?.[0]) {
        await supabase.from("leads").update({ crm_status: "ofertat" })
          .eq("id", lds[0].id).in("crm_status", ["nou_necontactat", "contactat"]);
      }
    } catch (e) { console.error("[wa-andrei-reply] ofertat stage failed:", e); }
  }


  // Check status again (a tool may have changed it)
  const { data: convAfter } = await supabase.from("wa_conversations")
    .select("status").eq("id", conversationId).maybeSingle();

  if (!replyText) {
    console.log("[wa-andrei-reply] empty reply text (tool-only turn), skipping send");
    return new Response(JSON.stringify({ ok: true, skipped: "empty_text" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (wantsCall || convAfter?.status === "escalated_to_call") {
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
  const { data: lastOut } = await supabase.from("wa_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastOut?.id) {
    await supabase.from("wa_messages")
      .update({ ai_model: `google-direct/${GEMINI_MODEL}`, ai_tokens_in: tokensIn, ai_tokens_out: tokensOut })
      .eq("id", lastOut.id);
  }

  return new Response(JSON.stringify({ ok: true, tokens_in: tokensIn, tokens_out: tokensOut }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
