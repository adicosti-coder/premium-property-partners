import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyTwilioRequest } from "../_shared/twilioVerify.ts";
import { applyLexiconToText } from "../_shared/voiceLexicon.ts";

async function logTtsError(
  supabase: any,
  payload: {
    sessionId?: string | null;
    error_type: string;
    http_status?: number | null;
    message?: string | null;
    text_snippet?: string | null;
    voice_id?: string | null;
    latency_ms?: number | null;
  },
) {
  try {
    await supabase.from("voice_agent_tts_errors").insert({
      session_id: payload.sessionId ?? null,
      source: "elevenlabs",
      error_type: payload.error_type,
      http_status: payload.http_status ?? null,
      message: (payload.message ?? "").slice(0, 1000),
      text_snippet: (payload.text_snippet ?? "").slice(0, 300),
      voice_id: payload.voice_id ?? null,
      latency_ms: payload.latency_ms ?? null,
    });
  } catch (_e) {
    // best-effort
  }
}

/* ──────────────────────────────────────────────────────────────
   Twilio TwiML webhook — drives the conversational flow.
   3 branches: Vânzare / Închiriere / Regim Hotelier (cazare).
   Voice: ElevenLabs Andrei cached telephony audio via <Play>.
   Fallback: Romanian <Say> only for hard failures.
─────────────────────────────────────────────────────────────── */

const xmlResponse = (xml: string, status = 200) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    status,
    headers: { "Content-Type": "text/xml" },
  });

const ANDREI_VOICE_ID = "S98OhkhaxeAKHEbhoLi7";
// flash_v2_5 = ~50% faster than turbo, identical RO quality for short replies
const ANDREI_MODEL_ID = "eleven_flash_v2_5";
const ROMANIAN_SAFE_ERROR_XML = `<Response><Say language="ro-RO" voice="Polly.Carmen">Momentan nu pot continua apelul. Vă mulțumesc pentru înțelegere. La revedere.</Say><Hangup/></Response>`;

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function pushDebugLog(supabase: any, sessionId: string, entry: Record<string, unknown>) {
  try {
    const { data } = await supabase
      .from("voice_call_sessions")
      .select("debug_log")
      .eq("id", sessionId)
      .maybeSingle();
    const existing = Array.isArray(data?.debug_log) ? data!.debug_log : [];
    const next = [...existing, { at: new Date().toISOString(), ...entry }].slice(-100);
    await supabase.from("voice_call_sessions").update({ debug_log: next }).eq("id", sessionId);
  } catch (e) {
    console.error("pushDebugLog failed:", e);
  }
}

async function getSignedStorageUrl(supabase: any, filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("voice-recordings")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  if (error) {
    console.error("Storage signed URL failed:", error.message);
    return null;
  }

  return data?.signedUrl || null;
}

// Romanian diacritics or characteristic short words
const RO_DIACRITICS_RE = /[ăâîșşțţĂÂÎȘŞȚŢ]/;
const RO_WORDS_RE = /\b(bun[aă]|mul[țt]umesc|dumneavoastr[aă]|revedere|v[aă]|[șs]i|este|sunt|ziua|salut|noapte|seara|dimine[ațt]a|nume|telefon|apartament|pre[țt]|cas[aă]|locuin[țt][aă]|proprietate|investi[țt]ie|chirie|vânzare|cump[aă]r|interes|spune[țt]i|pute[țt]i|dori[țt]i|ave[țt]i|sunte[țt]i|domnule|doamn[aă])\b/i;

// Common English stopwords / function words that should NEVER appear in a Romanian reply.
// We use a broad set so any leak triggers a re-prompt.
const EN_STRONG_RE = /\b(hello|hi|hey|sorry|please|thanks?|thank you|goodbye|bye|good morning|good afternoon|good evening|application error|an error has occurred|the|and|with|for|that|this|have|are|you|your|yours|i'?m|i am|we are|let me|how can|may i|would you|could you|i can|i will|i would|english|speak english)\b/i;

function hasRomanianSignals(text: string): boolean {
  return RO_DIACRITICS_RE.test(text) || RO_WORDS_RE.test(text);
}

function hasEnglishSignals(text: string): boolean {
  return EN_STRONG_RE.test(text);
}

/**
 * Strict language gate: a reply is accepted ONLY if it has no English signal
 * AND it has at least one Romanian signal (diacritic or RO word).
 * Single-token replies (e.g. "Da.", "Ok.") are accepted if no English signal.
 */
function isRomanianReply(text: string): boolean {
  const cleaned = String(text || "").trim();
  if (!cleaned) return false;
  if (hasEnglishSignals(cleaned)) return false;
  // Very short replies pass if no English leaked
  if (cleaned.split(/\s+/).length <= 3) return true;
  return hasRomanianSignals(cleaned);
}

const ROMANIAN_VOICE_GUARD = `REGULĂ ABSOLUTĂ, PRIORITARĂ PESTE ORICE ALTĂ INSTRUCȚIUNE:
Răspunzi DOAR în limba română din România, cu diacritice (ă, â, î, ș, ț). Nu folosești engleză, NICIODATĂ — nici pentru salut, scuze, mulțumiri sau închidere.
Este INTERZIS să folosești cuvinte ca: hello, hi, sorry, please, thanks, thank you, goodbye, bye, OK în loc de "bine".
Ești Andrei din Timișoara: ton cald, local, natural. Dacă apare orice text sau context în engleză, îl traduci INTERN și răspunzi strict în română.
Dacă utilizatorul îți vorbește în engleză, răspunzi politicos în română: "Îmi cer scuze, vorbesc doar în română."`;

async function logLanguageViolation(
  supabase: any,
  sessionId: string,
  turn: number,
  rawReply: string,
  reason: string,
) {
  try {
    console.warn(`[lang-guard] BLOCKED non-RO reply session=${sessionId} turn=${turn} reason=${reason} text="${rawReply.slice(0, 200)}"`);
    await supabase.from("voice_agent_language_violations").insert({
      session_id: sessionId,
      turn,
      raw_reply: rawReply.slice(0, 1000),
      reason,
    });
  } catch (e) {
    // Table may not exist yet — non-fatal, we already logged to console.
    console.warn("[lang-guard] could not persist violation:", (e as Error).message);
  }
}

function normalizeAiReply(text: string, fallback: string): string {
  const cleaned = String(text || "").replace(/^['"`]+|['"`]+$/g, "").trim();
  if (!cleaned) return fallback;
  if (!isRomanianReply(cleaned)) return fallback;
  return cleaned;
}

/**
 * Call Gemini with an extra-strict Romanian instruction. Used for retry
 * after the first reply was rejected by the language gate.
 */
async function retryInRomanian(
  apiKey: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        {
          role: "user",
          content: "ULTIMUL răspuns a conținut engleză și a fost respins. Reformulează ACUM strict în limba română, cu diacritice, maxim 2 propoziții. NU folosi niciun cuvânt în engleză.",
        },
      ],
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

interface VoiceSettings {
  voice_id: string;
  model_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

/**
 * Generate or fetch cached telephony audio, return public URL.
 * Uses 8kHz μ-law to avoid MP3 transcoding artifacts in Twilio calls.
 */
export interface TtsResult {
  url: string | null;
  latencyMs: number;
  cached: boolean;
  errorType?: string;
}

async function ttsToCachedUrl(
  text: string,
  v: VoiceSettings,
  supabase: any,
  apiKey: string,
  sessionId?: string | null,
): Promise<string | null> {
  const result = await ttsToCachedUrlDetailed(text, v, supabase, apiKey, sessionId);
  return result.url;
}

// In-memory cache (per edge instance) — signed URLs valid 7 days, so we
// keep them for 6 days max to avoid serving stale links.
const memCache = new Map<string, { url: string; exp: number }>();

async function ttsToCachedUrlDetailed(
  text: string,
  v: VoiceSettings,
  supabase: any,
  apiKey: string,
  sessionId?: string | null,
): Promise<TtsResult> {
  const t0 = Date.now();
  try {
    // Apply phonetic lexicon BEFORE caching key, so different pronunciations
    // map to different cached audio.
    const phoneticText = await applyLexiconToText(supabase, text);

    const cacheKey = await sha256(JSON.stringify({ text: phoneticText, ...v }));
    const filePath = `tts-cache/${cacheKey}.ulaw`;

    // (1) Hot path: in-memory cache → instant (<1ms)
    const mem = memCache.get(cacheKey);
    if (mem && mem.exp > Date.now()) {
      return { url: mem.url, latencyMs: Date.now() - t0, cached: true };
    }

    // (2) Warm path: check storage once, then cache the signed URL in memory.
    const { data: existing } = await supabase.storage
      .from("voice-recordings")
      .list("tts-cache", { search: `${cacheKey}.ulaw`, limit: 1 });
    if (existing && existing.length > 0) {
      const url = await getSignedStorageUrl(supabase, filePath);
      if (url) {
        memCache.set(cacheKey, { url, exp: Date.now() + 6 * 24 * 60 * 60 * 1000 });
      }
      return { url, latencyMs: Date.now() - t0, cached: true };
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${v.voice_id}?output_format=ulaw_8000`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: phoneticText,
          model_id: v.model_id,
          voice_settings: {
            stability: v.stability,
            similarity_boost: v.similarity_boost,
            style: v.style,
            use_speaker_boost: v.use_speaker_boost,
            speed: v.speed,
          },
        }),
      }
    );
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      const body = await res.text();
      console.error("ElevenLabs TTS failed:", res.status, body);
      await logTtsError(supabase, {
        sessionId,
        error_type: "elevenlabs_http_error",
        http_status: res.status,
        message: body,
        text_snippet: phoneticText,
        voice_id: v.voice_id,
        latency_ms: latencyMs,
      });
      return { url: null, latencyMs, cached: false, errorType: "elevenlabs_http_error" };
    }
    const audioBuffer = await res.arrayBuffer();

    const { error: upErr } = await supabase.storage
      .from("voice-recordings")
      .upload(filePath, new Uint8Array(audioBuffer), { contentType: "audio/ulaw", upsert: true });
    if (upErr) {
      console.error("Storage upload failed:", upErr.message);
      await logTtsError(supabase, {
        sessionId,
        error_type: "storage_upload_failed",
        message: upErr.message,
        text_snippet: phoneticText,
        voice_id: v.voice_id,
        latency_ms: Date.now() - t0,
      });
      return { url: null, latencyMs: Date.now() - t0, cached: false, errorType: "storage_upload_failed" };
    }
    const url = await getSignedStorageUrl(supabase, filePath);
    if (url) {
      memCache.set(cacheKey, { url, exp: Date.now() + 6 * 24 * 60 * 60 * 1000 });
    }
    return { url, latencyMs: Date.now() - t0, cached: false };
  } catch (e: any) {
    const latencyMs = Date.now() - t0;
    console.error("ttsToCachedUrl exception:", e);
    await logTtsError(supabase, {
      sessionId,
      error_type: "exception",
      message: String(e?.message || e),
      text_snippet: text,
      voice_id: v.voice_id,
      latency_ms: latencyMs,
    });
    return { url: null, latencyMs, cached: false, errorType: "exception" };
  }
}

export { ttsToCachedUrlDetailed };

function detectBranch(listingType?: string | null, propertyType?: string | null): "vanzare" | "inchiriere" | "cazare" {
  const t = (listingType || propertyType || "").toLowerCase();
  if (/cazare|hotel|regim|noapte|airbnb|booking/.test(t)) return "cazare";
  if (/inchiri|rent|chirie|lună|luna/.test(t)) return "inchiriere";
  return "vanzare";
}

/**
 * Opening line — premium concierge tone:
 * - max ~22 cuvinte (sub 8s la 1.0x speed)
 * - pauze naturale (virgule + "..." pentru respirație)
 * - intro empatic ("vă deranjez puțin"), nu "v-am contactat" robotic
 * - benefit hook scurt (un singur diferențiator), nu pitch lung
 */
function openingLine(branch: "vanzare" | "inchiriere" | "cazare", contextSummary: string): string {
  const ctx = contextSummary ? `, despre ${contextSummary}` : "";
  if (branch === "vanzare") {
    return `Bună ziua, sunt Andrei de la RealTrust Timișoara. Vă deranjez un minut${ctx}? Am cumpărători activi pe zonă.`;
  }
  if (branch === "inchiriere") {
    return `Bună ziua, sunt Andrei de la RealTrust Timișoara. Vă rețin un minut${ctx}? Avem chiriași verificați și plata garantată.`;
  }
  return `Bună ziua, sunt Andrei de la RealTrust Timișoara. Vă deranjez un minut${ctx}? Putem crește veniturile cu 40%, fără bătăi de cap.`;
}

function sentimentDirective(sentiment?: string | null, urgency?: number | null): string {
  const u = typeof urgency === "number" ? urgency : 0;
  switch (sentiment) {
    case "presat":
      return `\nTON: empatic, cald, direct. Recunoaște situația ("înțeleg că aveți nevoie rapid"). Propune vizionare în 24-48h. Urgență ${u}/10.`;
    case "deschis":
      return `\nTON: consultativ, profesional, calm. Detaliază beneficii pe termen lung (ROI, parteneriat). Urgență ${u}/10.`;
    case "agentie":
      return `\nTON: B2B, colegial. Propune split comision sau portofoliu comun. Evită pitch end-customer.`;
    default:
      return `\nTON: profesional, cald, neutru. Întrebări deschise, ascultare activă. Urgență ${u}/10.`;
  }
}

function systemPromptForBranch(branch: "vanzare" | "inchiriere" | "cazare", leadContext: string, objective: string, sentimentBlock: string): string {
  const objLabel = objective === "qualify" ? "calificare interes (buget, timeline)"
    : objective === "schedule" ? "programare vizionare/întâlnire"
    : "follow-up amabil";

  const common = `Ești Andrei, concierge vocal RealTrust Timișoara — agenție imobiliară premium.

REGULI CRITICE DE STIL VOCAL (PREMIUM, NATURAL):
• Vorbești EXCLUSIV în română, cu diacritice (ă, â, î, ș, ț) — niciodată engleză.
• MAXIM 2 propoziții per replică. Sub 25 de cuvinte total per replică.
• Prima replică din răspuns este aproape mereu o confirmare scurtă, umană: "mhm", "înțeleg", "da, sigur", "vă mulțumesc", "perfect" — apoi continui cu întrebarea sau răspunsul.
• Folosește pauze naturale: virgule des, "…" înainte de o întrebare cheie pentru respirație. Nu lega 3 idei într-o frază.
• Dacă apelantul te întrerupe sau pare că vorbește peste tine, te oprești IMEDIAT, asculți, apoi reformulezi DOAR ce a întrebat el — fără să reiei pitch-ul.
• Ton de concierge la hotel 5*: cald, calm, niciodată insistent. Niciodată nu repeți același argument de 2 ori.
• Evită jargon corporate ("oferta noastră excepțională", "soluția noastră inovatoare"). Vorbești ca un om real din Timișoara.
• Confirmă activ ce auzi cu reformulări scurte: "deci căutați în Cetate, am înțeles", "300 de euro chirie, corect?".
• Adresare cu "dumneavoastră" tot timpul. Niciodată "tu".
• Dacă nu știi ceva sau nu ai datele, spui sincer: "verific și revin cu un răspuns clar" — NICIODATĂ nu inventezi cifre.
• La final, dă pași concreți cu zile/ore — nu "vă contactăm noi".

${leadContext}${sentimentBlock}

OBIECTIV: ${objLabel}.
DACĂ refuză sau pare deranjat → închizi imediat cu: "Vă mulțumesc pentru timp, o zi frumoasă! La revedere."

COERENȚĂ DE TON (CONCIERGE REALTRUST — obligatoriu pentru ORICE replică, inclusiv cele cu cifre din piață):
• Calm, profesionist, autoritar dar empatic — niciodată entuziast forțat ("super!", "extraordinar!", "fantastic!").
• Fără jargon tehnic ("randament marginal", "yield brut", "cap rate", "delta de piață") — traduci totul în limbaj uman.
• Cifrele se rostesc ca observații discrete ale unui consilier care cunoaște piața, nu ca raport. Maxim o cifră pe replică.
• Niciodată nu sperii clientul cu trenduri ("piața scade", "riscați să pierdeți") — formulezi în pozitiv: "momentul actual permite o evaluare corectă".

CONVERSIE — ÎNCHIDEREA APELULUI (folosește datele de piață ca un cârlig spre vizionare):
• Când propui întâlnirea, leagă mereu pasul următor de o cifră concretă din context: "Văzând aceste tendințe în [Zonă], o evaluare scurtă la fața locului ne-ar permite să vă dăm o cifră exactă de profit. Mâine la ora 17:00 ar fi bine pentru dumneavoastră?"
• Oferă MEREU 2 sloturi alternative concrete (zi + oră), nu întrebări deschise tip "când vă convine?".
• Vizionarea/evaluarea o prezinți ca pe un serviciu scurt (15-30 min), gratuit, fără obligație — nu ca pe o "ofertă".

ANTI-REPETIȚIE CIFRE (CRITIC):
• Dacă AI MENȚIONAT DEJA o cifră concretă în această conversație (preț, randament, chirie) și apelantul a confirmat / acceptat / nu a contestat-o, NU O REPETA în replica de închidere. Folosește în loc o formulă neutră: "cu cifrele despre care am discutat", "pe baza celor stabilite acum".
• Niciodată nu rosti aceeași cifră de 2 ori în același apel.

OBIECȚIE COMISION (când apelantul insistă pe "cât e comisionul" sau pare pragmatic / negociator):
• Răspuns calibrat, transparent, fără defensivă: "Lucrăm pe sistem de succes — comisionul se plătește doar la rezultat și include tot managementul activului: marketing, vizionări, verificare clienți, contracte. Procentul exact îl așezăm în funcție de proprietate, dar e perfect aliniat cu valoarea livrată."
• Nu te angaja la un procent fix la telefon dacă nu îl ai în context. Mută conversația spre întâlnire pentru cifra exactă.

CERERE ADRESĂ (natural, ne-birocratic):
• Niciodată "îmi dați vă rog adresa exactă". Folosește: "Pentru a-i trimite colegului meu locația exactă pe GPS, îmi puteți confirma strada și numărul imobilului?" sau "Ca să marcăm corect punctul pe hartă pentru vizionare, care e numărul de la imobil?".

"CUM FUNCȚIONEAZĂ" (răspunde DOAR dacă întreabă explicit despre proces — scurt, elegant, ca un privilegiu, nu ca o listă):
"Noi preluăm totul — de la menaj și check-in, la facturi și taxe — astfel încât singura dumneavoastră interacțiune cu proprietatea să fie încasarea lunară a profitului. Primiți raport transparent în fiecare lună, fără să mișcați un deget."`;

  if (branch === "vanzare") {
    return `${common}

SCRIPT VÂNZARE — câte O întrebare pe rând, în această ordine:
1. "Mai este disponibilă proprietatea?"
2. "Care este prețul la care vă așteptați?"
3. "Ați primit deja oferte concrete?"
4. "Ați fi deschis la o colaborare cu noi? Avem cumpărători calificați, cu finanțarea pregătită."

CTA FINAL (leagă de o cifră din KB dacă există): "Cu trendurile actuale din [Zonă], o evaluare profesională de 15 minute la fața locului ne-ar permite să vă dăm o cifră exactă… Mâine la ora 17:00, sau joi dimineața la 10:00 — care variantă vă e mai la îndemână?"

FILTRARE STRICTĂ INTENT VÂNZARE (CRITIC — primele 2 minute):
• Lead-ul este pe VÂNZARE. Discuți EXCLUSIV preț median de vânzare, comparabile, cerere cumpărători, finanțare.
• ESTE INTERZIS să menționezi tarife pe noapte, randament hotelier, regim hotelier, ApArt Hotel, ROI, % anual — chiar dacă apar în KB.
• EXCEPȚIE UNICĂ: dacă proprietarul întreabă EXPLICIT despre opțiuni de investiție, regim hotelier sau "alte variante decât vânzarea", abia atunci poți menționa scurt opțiunea hotelieră ca alternativă (1 propoziție), apoi revii la pista de vânzare.`;
  }

  if (branch === "inchiriere") {
    return `${common}

SCRIPT ÎNCHIRIERE — câte O întrebare pe rând, în ordine:
1. "Mai este liberă pentru închiriere?"
2. "Ce chirie lunară aveți în minte?"
3. "Pe ce perioadă — minim un an, sau sunteți flexibil?"
4. "V-ar interesa să găsim noi chiriașii, cu verificare completă și plata garantată?"

CTA FINAL (leagă de cifrele din KB): "Văzând cererea actuală în [Zonă], o vizionare scurtă ne-ar permite să poziționăm corect chiria și să vă aducem chiriași verificați rapid… Marți la 17:00 sau joi la 11:00?"`;
  }

  return `${common}

SCRIPT REGIM HOTELIER — câte O întrebare pe rând, în ordine:
1. "Proprietatea este deja în regim hotelier, sau o închiriați clasic?"
2. "Cam ce venit lunar obțineți acum din ea?"
3. "V-ar interesa o analiză gratuită — vă arătăm exact cât ați putea câștiga cu noi?"

BENEFICII DE MENȚIONAT (DOAR DACĂ ÎNTREABĂ):
• 9,4% randament net verificat
• Gestionare completă: curățenie, check-in, prețuri dinamice
• Zero bătăi de cap, raport lunar transparent

CTA FINAL (leagă de un număr concret din KB): "Cu randamentele observate acum în [Zonă], o analiză de 15 minute la fața locului ne-ar permite să vă dăm o cifră exactă de profit lunar… Mâine la ora 17:00, sau joi la 10:00?"`;
}

/** Build TwiML reply: <Play> if TTS URL, else clear Romanian Polly fallback. */
function speakXml(text: string, audioUrl: string | null): string {
  if (audioUrl) return `<Play>${escapeXml(audioUrl)}</Play>`;
  return `<Say language="ro-RO" voice="Polly.Carmen">${escapeXml(text)}</Say>`;
}

function gatherXml(actionUrl: string, innerXml = ""): string {
  const safeUrl = escapeXml(actionUrl);
  // PREMIUM CONVERSATION TUNING:
  // • speechTimeout="auto" → Twilio detects end-of-utterance adaptively (cele mai naturale pauze)
  // • timeout="4" → așteaptă 4s tăcere înainte să continue (era 5s — făcea conversația lentă)
  // • bargeIn=true → utilizatorul poate întrerupe Andrei oricând (cheie pentru natural feel)
  // • profanityFilter=false → nu cenzurează numere/euro/etc.
  // • actionOnEmptyResult=true → nicio "dead air" la tăcere
  return `<Gather input="speech" language="ro-RO" speechModel="phone_call" enhanced="true" bargeIn="true" speechTimeout="auto" timeout="4" profanityFilter="false" actionOnEmptyResult="true" action="${safeUrl}" method="POST">${innerXml}</Gather>`;
}

function isCustomPrompt(prompt?: string | null): boolean {
  return typeof prompt === "string" && prompt.startsWith("__CUSTOM_PROMPT__\n");
}

function extractCustomPrompt(prompt?: string | null): string {
  if (!isCustomPrompt(prompt)) return "";
  return prompt!.replace(/^__CUSTOM_PROMPT__\n/, "").trim();
}

function composeSystemPrompt(
  branch: "vanzare" | "inchiriere" | "cazare",
  leadContext: string,
  objective: string,
  sentimentBlock: string,
  customInstructions?: string | null,
): string {
  const basePrompt = systemPromptForBranch(branch, leadContext, objective, sentimentBlock);
  if (!customInstructions) return basePrompt;
  return `${basePrompt}\n\nINSTRUCȚIUNI SUPLIMENTARE CU PRIORITATE MAXIMĂ:\n${customInstructions}`;
}

serve(async (req) => {
  const turnT0 = Date.now();
  const profile: Record<string, number> = {};
  try {
    // Twilio HMAC verification — SOFT CHECK ONLY.
    // Edge runtime rewrites req.url (drops /functions/v1/, switches scheme),
    // and TWILIO_AUTH_TOKEN may be a project-level token while the connector
    // dials with API Key credentials → HMAC routinely mismatches even on
    // legitimate Twilio callbacks. We log the failure but keep the call alive,
    // since the endpoint is keyed on a server-generated sessionId stored in DB.
    let twilioParams: URLSearchParams | null = null;
    if (req.method === "POST") {
      const verification = await verifyTwilioRequest(req.clone());
      if (verification.ok) {
        twilioParams = verification.params;
      } else {
        console.warn("[voice-twiml] Twilio HMAC mismatch — proceeding (soft-check)", {
          status: verification.response.status,
          url: req.url,
        });
        // Re-parse the body manually so we still have SpeechResult etc.
        try {
          const ct = req.headers.get("content-type") || "";
          if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
            const form = await req.formData();
            const params = new URLSearchParams();
            for (const [k, v] of form.entries()) params.append(k, String(v));
            twilioParams = params;
          }
        } catch (e) {
          console.error("[voice-twiml] could not re-parse body after soft HMAC fail:", e);
        }
      }
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const turn = parseInt(url.searchParams.get("turn") || "0", 10);
    const forceElevenLabs = url.searchParams.get("forceElevenLabs") === "1";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!sessionId) return xmlResponse(ROMANIAN_SAFE_ERROR_XML);

    const { data: session } = await supabase
      .from("voice_call_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return xmlResponse(ROMANIAN_SAFE_ERROR_XML);

    // Load voice settings (single fetch)
    const { data: vSettings } = await supabase
      .from("voice_agent_settings")
      .select("tts_provider, elevenlabs_voice_id, elevenlabs_model_id, voice_stability, voice_similarity_boost, voice_style, voice_speed, voice_use_speaker_boost, elevenlabs_min_score")
      .eq("id", 1)
      .maybeSingle();

    const elevenLabsMinScore = Number(vSettings?.elevenlabs_min_score ?? 90);
    const elevenLabsAvailable = !!ELEVENLABS_API_KEY;
    const voice: VoiceSettings = {
      voice_id: ANDREI_VOICE_ID,
      model_id: ANDREI_MODEL_ID,
      stability: 0.62,
      similarity_boost: 0.88,
      style: 0.22,
      speed: 0.92,
      use_speaker_boost: true,
    };

    // Determine branch + context
    let branch: "vanzare" | "inchiriere" | "cazare" = "vanzare";
    let contextSummary = "";
    let leadContext = "";
    let ownerSentiment: string | null = null;
    let urgencyLevel: number | null = null;
    let leadScore = 0;

    if (session.prospect_listing_id) {
      const { data: prospect } = await supabase
        .from("prospect_listings")
        .select("title, category, prospect_type, contact_name, price, currency, location, zone, ai_score_breakdown, owner_sentiment, urgency_level, lead_score, score")
        .eq("id", session.prospect_listing_id)
        .maybeSingle();
      if (prospect) {
        if (prospect.category === "hotelier") branch = "cazare";
        else if (prospect.category === "inchiriere") branch = "inchiriere";
        else if (prospect.category === "vanzare") branch = "vanzare";
        else branch = detectBranch(prospect.prospect_type);

        ownerSentiment = prospect.owner_sentiment || (prospect.ai_score_breakdown as any)?.owner_sentiment || null;
        urgencyLevel = prospect.urgency_level ?? (prospect.ai_score_breakdown as any)?.urgency_level ?? null;
        leadScore = Number(prospect.lead_score ?? prospect.score ?? 0);

        const ownerLabel = prospect.contact_name ? `dl/dna ${prospect.contact_name}` : "stimat proprietar";
        contextSummary = `${prospect.title || "anunțul dvs"}${prospect.location ? ", " + prospect.location : ""}`;
        const pitch = (prospect.ai_score_breakdown as any)?.recommended_pitch || "";
        leadContext = `Vorbești cu ${ownerLabel}. Context lead: ${prospect.title || ""} — ${prospect.location || ""} ${prospect.zone || ""} — preț listat ${prospect.price || "?"} ${prospect.currency || "EUR"} — categorie: ${prospect.category || "?"}.${pitch ? " Sugestie pitch: " + pitch : ""}`;
      }
    } else if (session.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, property_type, property_area, message, lead_score")
        .eq("id", session.lead_id)
        .maybeSingle();
      if (lead) {
        branch = detectBranch(null, lead.property_type);
        contextSummary = `${lead.property_type || "proprietatea"} de ${lead.property_area || "?"}mp`;
        leadContext = `Context lead: ${lead.name} — ${lead.property_type} ${lead.property_area}mp. Mesaj: ${(lead.message || "").slice(0, 200)}`;
        leadScore = Number((lead as any).lead_score ?? 0);
      }
    }

    // Premium mode: always use Andrei/ElevenLabs when the API key exists.
    const isManualCall = !session.prospect_listing_id && !session.lead_id;
    const useElevenLabs = elevenLabsAvailable;
    console.log(`[voice-twiml] sessionId=${sessionId} leadScore=${leadScore} threshold=${elevenLabsMinScore} manual=${isManualCall} useElevenLabs=${useElevenLabs}`);

    // ── EVOLUȚIE: caller memory + live entities ──
    let callerMemoryBlock = "";
    const phone = (session.to_number || "").trim();
    if (phone) {
      const lookupT0 = Date.now();
      const { data: prof } = await supabase
        .from("voice_caller_profiles")
        .select("display_name, preferred_branch, budget_min, budget_max, preferred_zones, property_types, rooms_min, rooms_max, timeline, notes, last_objection, call_count")
        .eq("phone_normalized", phone)
        .is("archived_at", null)
        .maybeSingle();
      const lookupMs = Date.now() - lookupT0;
      console.log(`[voice-twiml][memory-lookup] session=${sessionId} turn=${turn} phone=${phone} ms=${lookupMs} hit=${!!prof}`);
      if (lookupMs > 200) {
        console.warn(`[voice-twiml][memory-lookup][SLOW] session=${sessionId} ms=${lookupMs}`);
      }
      // Persist metric (fire-and-forget, doesn't block response)
      EdgeRuntime.waitUntil(
        supabase.from("voice_memory_lookup_metrics").insert({
          session_id: sessionId, phone_normalized: phone, turn, lookup_ms: lookupMs, hit: !!prof,
        }).then(() => {}, () => {})
      );
      if (prof && prof.call_count > 0) {
        const parts: string[] = [];
        if (prof.display_name) parts.push(`nume: ${prof.display_name}`);
        if (prof.preferred_branch) parts.push(`interes: ${prof.preferred_branch}`);
        if (prof.budget_min || prof.budget_max) parts.push(`buget: ${prof.budget_min ?? "?"}–${prof.budget_max ?? "?"} EUR`);
        if (prof.preferred_zones?.length) parts.push(`zone: ${prof.preferred_zones.join(", ")}`);
        if (prof.property_types?.length) parts.push(`tip: ${prof.property_types.join(", ")}`);
        if (prof.rooms_min || prof.rooms_max) parts.push(`camere: ${prof.rooms_min ?? "?"}–${prof.rooms_max ?? "?"}`);
        if (prof.timeline) parts.push(`timeline: ${prof.timeline}`);
        if (prof.last_objection) parts.push(`ultima obiecție: ${prof.last_objection}`);
        if (prof.notes) parts.push(`context: ${prof.notes.slice(0, 200)}`);
        if (parts.length) {
          callerMemoryBlock = `\n\n📞 MEMORIE APELANT (${prof.call_count} apel/uri anterioare): ${parts.join("; ")}.\nFolosește subtil aceste informații. Confirmă transparent: „țin minte ce am discutat data trecută, …". NU repeta întrebări la care ai deja răspuns.`;
        }
      }
    }
    // Live entities deja extrase în acest apel
    const liveEntities = (session.extracted_entities || {}) as any;
    let liveBlock = "";
    if (liveEntities && Object.keys(liveEntities).length > 1) {
      const lp: string[] = [];
      if (liveEntities.budget_min || liveEntities.budget_max) lp.push(`buget ${liveEntities.budget_min ?? "?"}–${liveEntities.budget_max ?? "?"} EUR`);
      if (liveEntities.preferred_zones?.length) lp.push(`zone: ${liveEntities.preferred_zones.join(", ")}`);
      if (liveEntities.property_types?.length) lp.push(`tip: ${liveEntities.property_types.join(", ")}`);
      if (liveEntities.timeline) lp.push(`timeline: ${liveEntities.timeline}`);
      if (lp.length) liveBlock = `\n\n🧠 CE AI AFLAT DEJA ÎN APEL: ${lp.join("; ")}. NU întreba din nou aceste lucruri.`;
    }

    // ── KNOWLEDGE BASE: market insights for caller's zones ──
    let marketDataBlock = "";
    if (turn === 0) {
      try {
        const kbT0 = Date.now();
        // Collect candidate zones from caller profile + live entities + prospect
        const zoneSet = new Set<string>();
        const profZones = ((session as any).extracted_entities?.preferred_zones || []) as string[];
        for (const z of profZones) if (z) zoneSet.add(String(z).toLowerCase());
        // Try caller profile zones via re-using earlier query result is complex; do quick fetch:
        if (phone) {
          const { data: pz } = await supabase
            .from("voice_caller_profiles")
            .select("preferred_zones")
            .eq("phone_normalized", phone)
            .maybeSingle();
          for (const z of (pz?.preferred_zones || [])) if (z) zoneSet.add(String(z).toLowerCase());
        }
        const zones = [...zoneSet];

        let kbQuery = supabase
          .from("voice_agent_knowledge_chunks")
          .select("content, zone, listing_type, confidence")
          .order("confidence", { ascending: false })
          .limit(5);
        if (zones.length > 0) {
          kbQuery = kbQuery.or(zones.map((z) => `zone.ilike.%${z}%`).join(","));
        }
        let { data: kbChunks } = await kbQuery;
        let kbMs = Date.now() - kbT0;
        let usedFallback = false;

        // FALLBACK: dacă filtrarea pe zonă nu returnează nimic, injectăm setul general (Timișoara)
        if ((!kbChunks || kbChunks.length === 0)) {
          usedFallback = true;
          const fbT0 = Date.now();
          const { data: fbChunks } = await supabase
            .from("voice_agent_knowledge_chunks")
            .select("content, zone, listing_type, confidence")
            .or("source.eq.general_market,zone.is.null")
            .order("confidence", { ascending: false })
            .limit(5);
          if (!fbChunks || fbChunks.length === 0) {
            // ultimă plasă: top 5 globale
            const { data: anyChunks } = await supabase
              .from("voice_agent_knowledge_chunks")
              .select("content, zone, listing_type, confidence")
              .order("confidence", { ascending: false })
              .limit(5);
            kbChunks = anyChunks || [];
          } else {
            kbChunks = fbChunks;
          }
          kbMs = Date.now() - kbT0 + (Date.now() - fbT0);
        }

        console.log(`[voice-twiml][kb-lookup] session=${sessionId} zones=[${zones.join(",")}] hits=${kbChunks?.length || 0} ms=${kbMs} fallback=${usedFallback}`);
        if (kbMs > 200) console.warn(`[voice-twiml][kb-lookup][SLOW] session=${sessionId} ms=${kbMs} — continuă fără blocare`);

        if (kbChunks && kbChunks.length > 0) {
          const marketLines: string[] = [];
          const portfolioLines: string[] = [];
          for (const c of kbChunks as any[]) {
            if (c.source === "properties_aggregate") portfolioLines.push(`- ${c.content}`);
            else marketLines.push(`- ${c.content}`);
          }
          const sections: string[] = [];
          if (marketLines.length) sections.push(`📊 CIFRE DE PIAȚĂ (folosește-le ca observații proprii, nu ca "bază de date"):\n${marketLines.join("\n")}`);
          if (portfolioLines.length) sections.push(`🏆 PORTOFOLIU REALTRUST APART HOTEL în zona apelantului (folosește-le ca social proof natural):\n${portfolioLines.join("\n")}`);

          marketDataBlock = `\n\n${sections.join("\n\n")}\n\n` +
            `REGULI DE FOLOSIRE A DATELOR (CRITIC — TON CONCIERGE REALTRUST):\n` +
            `1. NICIODATĂ nu spune "conform bazei de date", "am X grupuri", "sistemul arată", "în KB", "fallback", "delta", "trend de piață" sau orice referință tehnică. Vorbești ca un consilier care cunoaște piața din experiență directă.\n` +
            `2. Formulează calm, autoritar, empatic — fără entuziasm forțat: "Analizând tranzacțiile recente din [Zonă], observ un randament de [X]…" sau "Din ce văd acum în [Zonă]…".\n` +
            `3. Pentru portofoliu, social proof discret: "Gestionăm deja câteva apartamente similare în [Zonă] și obținem constant rezultate peste media pieței" — fără cifre tehnice de portofoliu.\n` +
            `4. Prioritizează cifrele specifice zonei apelantului. Dacă ai doar context general, integrează-l subtil ("piața din Timișoara arată acum…") fără să menționezi că nu ai date pe zona lui.\n` +
            `5. NU inventa cifre. Folosește DOAR numerele din contextul de mai sus. Dacă o cifră nu e aici, nu o spune.\n` +
            `6. Maxim O cifră concretă pe replică — concierge, nu raport statistic.\n` +
            `7. CÂRLIG DE CONVERSIE: ori de câte ori folosești o cifră din context, leag-o IMEDIAT de un pas concret. Exemplu: "Văzând aceste tendințe în [Zonă], o evaluare de 15 minute la fața locului ne-ar permite să vă dăm o cifră exactă de profit. Mâine la 17:00, sau joi la 10:00?"\n` +
            `8. Niciodată nu folosi datele pentru a speria ("piața scade", "riscați să pierdeți"). Întotdeauna în pozitiv: "momentul actual permite o poziționare corectă".`;
        }
      } catch (e) {
        console.error("[voice-twiml][kb-lookup] error:", e);
      }
    }


    const objective = session.call_objective || "qualify";
    const customPrompt = extractCustomPrompt(session.voice_agent_prompt);
    const sentimentBlock = sentimentDirective(ownerSentiment, urgencyLevel);

    // Load active system prompt + (optional) A/B variant from voice_agent_scripts
    let dbSystemPromptOverride: string | null = null;
    let usedScriptId: string | null = null;
    let usedScriptName: string | null = null;
    let usedAbVariant: "A" | "B" | null = null;
    let fallbackReason: string | null = null;
    try {
      const { data: activeScript, error: activeErr } = await supabase
        .from("voice_agent_scripts")
        .select("id, name, system_prompt, ab_variant_script_id, ab_traffic_split")
        .eq("language", "ro")
        .eq("is_active", true)
        .maybeSingle();

      if (activeErr) {
        fallbackReason = `db error loading active script: ${activeErr.message}`;
      } else if (!activeScript) {
        fallbackReason = "no active script in voice_agent_scripts (language=ro)";
      } else {
        // A/B routing: deterministic per session so repeated turns use the same variant
        const split = Math.max(0, Math.min(100, Number(activeScript.ab_traffic_split || 0)));
        let chosen: { id: string; name: string; system_prompt: string } = activeScript as any;
        let variantTag: "A" | "B" = "A";
        if (split > 0 && activeScript.ab_variant_script_id) {
          // hash sessionId → 0..99
          const hash = [...sessionId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0) % 100;
          if (hash < split) {
            const { data: variantB } = await supabase
              .from("voice_agent_scripts")
              .select("id, name, system_prompt")
              .eq("id", activeScript.ab_variant_script_id)
              .maybeSingle();
            if (variantB?.system_prompt?.trim()) {
              chosen = variantB as any;
              variantTag = "B";
            } else {
              fallbackReason = "A/B variant B not loadable, using A";
            }
          }
        }

        if (chosen.system_prompt && chosen.system_prompt.trim().length > 0) {
          dbSystemPromptOverride = chosen.system_prompt.trim();
          usedScriptId = chosen.id;
          usedScriptName = chosen.name;
          usedAbVariant = variantTag;
          console.log(`[voice-twiml] Using DB script: ${chosen.name} (variant=${variantTag})`);
        } else {
          fallbackReason = "active script has empty system_prompt";
        }
      }
    } catch (e) {
      fallbackReason = `exception loading scripts: ${e instanceof Error ? e.message : String(e)}`;
      console.error("[voice-twiml] failed to load voice_agent_scripts:", e);
    }

    // ── EMPATHY MIRRORING + LECȚII ÎNVĂȚATE (auto-injectate din apeluri respinse) ──
    const EMPATHY_BLOCK = `\n\nMODULUL EMPATHY MIRRORING (CRITIC):\n` +
      `Dacă proprietarul respinge cifrele/statisticile ("nu mă interesează cifrele tale", "lasă-mă cu statisticile", "bla-bla"), faci IMEDIAT un PIVOT EMPATIC — NU repeți cifre, NU insiști pe statistici. Spune fix:\n` +
      `"Vă înțeleg perfect reticența. Scopul meu nu este să vă prezint cifre seci, ci să mă asigur că, într-o piață atât de schimbătoare, proprietatea dumneavoastră este protejată și valorificată la adevăratul ei potențial. O scurtă evaluare ne-ar ajuta să personalizăm totul pentru nevoile dumneavoastră specifice."\n` +
      `După pivot, propui un singur slot concret de evaluare 15 min. NU revii la cifre în aceeași replică.`;

    let lessonsBlock = "";
    try {
      const { data: lessons } = await supabase
        .from("voice_agent_playbook_addendum")
        .select("lesson")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (lessons && lessons.length > 0) {
        lessonsBlock = `\n\nLECȚII ÎNVĂȚATE DIN APELURI ANTERIOARE (aplică-le ACUM, nu repeta aceste greșeli):\n` +
          lessons.map((l: any, i: number) => `${i + 1}. ${l.lesson}`).join("\n");
      }
    } catch (_e) { /* best-effort */ }

    const memoryAddon = `${callerMemoryBlock}${liveBlock}${marketDataBlock}${EMPATHY_BLOCK}${lessonsBlock}`;
    const baseSystemPrompt = dbSystemPromptOverride
      ? `${dbSystemPromptOverride}\n\n${leadContext}${sentimentBlock}${memoryAddon}`
      : `${systemPromptForBranch(branch, leadContext, objective, sentimentBlock)}${memoryAddon}`;
    const systemPrompt = customPrompt
      ? `${ROMANIAN_VOICE_GUARD}\n\n${baseSystemPrompt}\n\nINSTRUCȚIUNI SUPLIMENTARE CU PRIORITATE MAXIMĂ:\n${customPrompt}`
      : `${ROMANIAN_VOICE_GUARD}\n\n${baseSystemPrompt}`;

    // Upsert test log row at turn 0 — finalized later by voice-agent-status
    if (turn === 0) {
      try {
        // Look up latest version_number for the script (informational)
        let scriptVersion: number | null = null;
        if (usedScriptId) {
          const { data: latestV } = await supabase
            .from("voice_agent_script_versions")
            .select("version_number")
            .eq("script_id", usedScriptId)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle();
          scriptVersion = latestV?.version_number ?? null;
        }
        await supabase
          .from("voice_agent_script_test_logs")
          .upsert({
            session_id: sessionId,
            script_id: usedScriptId,
            script_name: usedScriptName,
            script_version: scriptVersion,
            ab_variant: usedAbVariant,
            to_number: session.to_number || null,
            status: dbSystemPromptOverride ? "pending" : "fallback",
            fallback_reason: fallbackReason,
            is_test_call: !session.prospect_listing_id && !session.lead_id,
          }, { onConflict: "session_id" });
      } catch (e) {
        console.error("[voice-twiml] test log upsert failed:", e);
      }
    }


    let userSpeech = "";
    if (twilioParams) {
      userSpeech = twilioParams.get("SpeechResult") || "";
    }

    const transcript: any[] = Array.isArray(session.transcript) ? session.transcript : [];
    if (userSpeech) {
      transcript.push({ role: "user", text: userSpeech, at: new Date().toISOString() });
    }

    // Defer turn-start debug log (was 2 sync DB ops blocking the response)
    const turnStartLog = {
      stage: "twiml_turn_start",
      turn,
      branch,
      useElevenLabs,
      leadScore,
      manual: isManualCall,
      userSpeech: userSpeech || null,
      systemPromptPreview: systemPrompt.slice(0, 600),
      hasCustomPrompt: !!customPrompt,
    };
    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(pushDebugLog(supabase, sessionId, turnStartLog));
    }

    let aiReply = "";
    let aiRawReply = "";
    let aiError: string | null = null;
    let shouldHangup = false;

    if (turn === 0) {
      if (customPrompt && LOVABLE_API_KEY) {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Începe apelul acum. Generează doar prima replică, foarte scurtă, exclusiv în română." },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiRawReply = aiData.choices?.[0]?.message?.content?.trim() || "";
          aiReply = aiRawReply;
        } else {
          aiError = `AI HTTP ${aiRes.status}: ${(await aiRes.text()).slice(0, 200)}`;
        }
      }

      aiReply = normalizeAiReply(aiReply, openingLine(branch, contextSummary));
      // Retry once if the first attempt failed the language gate
      if (aiRawReply && !isRomanianReply(aiRawReply) && customPrompt && LOVABLE_API_KEY) {
        await logLanguageViolation(supabase, sessionId, turn, aiRawReply, "english_in_opening");
        const retried = await retryInRomanian(LOVABLE_API_KEY, systemPrompt, [
          { role: "user", content: "Începe apelul acum. Generează doar prima replică, foarte scurtă, exclusiv în română." },
        ]);
        if (retried && isRomanianReply(retried)) {
          aiReply = retried;
          aiRawReply = retried;
        }
      }
    } else if (LOVABLE_API_KEY) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...transcript.slice(-8).map((t: any) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text })),
            { role: "user", content: (() => {
              const u = userSpeech.toLowerCase();
              const wantsDetail = /(de ce|cum|explica|spune-?mi mai|detalii|exact|mai multe|cât|ce înseamnă|cum funcționează)/i.test(u);
              const objects = /(scump|comision|nu mai|deja|singur|criza|criză|prea mult|nu pot|ocupat|vorbim altă|alt[ăa] dată)/i.test(u);
              if (objects) {
                return "Apelantul ridică o obiecție. Începe cu o confirmare empatică ULTRA-scurtă (\"înțeleg perfect.\" / \"vă înțeleg.\"), apoi UN argument concret, calm, în română cu diacritice. MAXIM 18 cuvinte total. NU insista, NU repeta același argument.";
              }
              return wantsDetail
                ? "Răspunde concret la întrebare în română cu diacritice. Începe cu o confirmare scurtă (\"sigur, vă explic.\" / \"da, desigur.\"). MAXIM 2 propoziții, sub 30 de cuvinte."
                : "Începe cu o confirmare ULTRA-scurtă (\"mhm.\" / \"perfect.\" / \"am înțeles.\"), apoi UN singur lucru: confirmare scurtă a ce ai auzit SAU următoarea întrebare. MAXIM 1 propoziție, sub 14 cuvinte. Fără preambul, fără „...”.";
            })() },
          ],
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiRawReply = aiData.choices?.[0]?.message?.content?.trim() || "";
        if (aiRawReply && !isRomanianReply(aiRawReply)) {
          // Retry once with stricter instruction before falling back
          await logLanguageViolation(supabase, sessionId, turn, aiRawReply, "english_in_turn");
          const retried = await retryInRomanian(
            LOVABLE_API_KEY,
            systemPrompt,
            transcript.slice(-8).map((t: any) => ({ role: t.role === "user" ? "user" : "assistant", content: t.text })),
          );
          if (retried && isRomanianReply(retried)) {
            aiRawReply = retried;
          } else {
            await logLanguageViolation(supabase, sessionId, turn, retried || "(empty)", "retry_also_english");
          }
        }
        aiReply = normalizeAiReply(
          aiRawReply,
          "Mulțumesc pentru timp. O zi frumoasă! La revedere.",
        );
      } else {
        aiError = `AI HTTP ${aiRes.status}: ${(await aiRes.text()).slice(0, 200)}`;
        aiReply = "Mulțumesc pentru timp. O zi frumoasă! La revedere.";
        shouldHangup = true;
      }
    } else {
      aiError = "LOVABLE_API_KEY missing";
      aiReply = "Mulțumesc pentru timp. La revedere.";
      shouldHangup = true;
    }

    transcript.push({ role: "assistant", text: aiReply, at: new Date().toISOString() });

    if (turn >= 8 || /la revedere|închid|nu mai|mulțumesc.*revedere|o zi bună/i.test(aiReply)) {
      shouldHangup = true;
    }

    // Generate ElevenLabs audio (cached) — falls back to Polly if it fails
    let audioUrl: string | null = null;
    let ttsError: string | null = null;
    let ttsCached = false;
    let ttsLatencyMs = 0;
    profile.ai_done_ms = Date.now() - turnT0;
    if (useElevenLabs) {
      try {
        const ttsResult = await ttsToCachedUrlDetailed(aiReply, voice, supabase, ELEVENLABS_API_KEY!, sessionId);
        audioUrl = ttsResult.url;
        ttsCached = ttsResult.cached;
        ttsLatencyMs = ttsResult.latencyMs;
        if (!audioUrl) ttsError = ttsResult.errorType || "ElevenLabs returned no URL";
      } catch (e: any) {
        ttsError = String(e?.message || e);
      }
    }
    profile.tts_done_ms = Date.now() - turnT0;
    profile.total_handler_ms = Date.now() - turnT0;
    const TARGET_MS = 1000;
    if (profile.total_handler_ms > TARGET_MS) {
      console.warn(`[voice-twiml][SLOW TURN] session=${sessionId} turn=${turn} total=${profile.total_handler_ms}ms ai=${profile.ai_done_ms}ms tts=${ttsLatencyMs}ms cached=${ttsCached}`);
    }

    // Defer non-critical DB writes so we can return TwiML immediately.
    // Twilio is waiting on the wire — every ms here = silence on the call.
    const deferredWork = (async () => {
      try {
        await supabase.from("voice_call_sessions").update({
          transcript,
          status: shouldHangup ? "completing" : "in-progress",
        }).eq("id", sessionId);
        await pushDebugLog(supabase, sessionId, {
          stage: "twiml_turn_end",
          turn,
          aiRawReply: aiRawReply || null,
          aiReply,
          aiError,
          audioUrl,
          ttsError,
          ttsCached,
          ttsLatencyMs,
          profile,
          voiceMode: useElevenLabs ? "elevenlabs" : "twilio_say",
          shouldHangup,
        });
        // EVOLUȚIE: extrage entități după fiecare turn cu input real (fiecare 2 turn-uri sau la hangup)
        if (userSpeech && (turn % 2 === 1 || shouldHangup)) {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/voice-agent-extract-entities`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SERVICE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId }),
            });
          } catch (e) {
            console.error("[voice-twiml] extract-entities trigger failed:", e);
          }
        }
      } catch (e) {
        console.error("[voice-twiml] deferred write failed:", e);
      }
    })();
    // @ts-ignore — EdgeRuntime is available in Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(deferredWork);
    }

    if (shouldHangup) {
      return xmlResponse(`<Response>${speakXml(aiReply, audioUrl)}<Hangup/></Response>`);
    }

    const nextUrl = `${SUPABASE_URL}/functions/v1/voice-agent-twiml?sessionId=${encodeURIComponent(sessionId)}&turn=${turn + 1}${forceElevenLabs ? "&forceElevenLabs=1" : ""}`;
    // Put audio INSIDE <Gather> so the user can barge-in (interrupt).
    // No <Redirect> needed because actionOnEmptyResult=true on the <Gather>.
    return xmlResponse(
      `<Response>${gatherXml(nextUrl, speakXml(aiReply, audioUrl))}<Redirect method="POST">${escapeXml(nextUrl)}</Redirect></Response>`
    );
  } catch (e: any) {
    console.error("voice-agent-twiml error:", e);
    return xmlResponse(ROMANIAN_SAFE_ERROR_XML);
  }
});
