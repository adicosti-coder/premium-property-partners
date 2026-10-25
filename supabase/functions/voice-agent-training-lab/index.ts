// Training Lab: Andrei vs un proprietar simulat de Gemini (doar text, fără apeluri reale),
// analiză post-apel și aplicarea opțională a lecțiilor în contextul lui Andrei.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listUpcomingAndreiEvents } from "../_shared/andreiCalendar.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { andreiConversationPolicy, andreiListingObjections, normalizeAndreiBranch, validateCommissionReply, isPrematureClose } from "../_shared/andreiConversationPolicy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PERSONAS: Record<string, string> = {
  sceptic: "Proprietar sceptic, crede că e o agenție care vrea comision. Pune întrebări bănuitoare, cere dovezi, nu se lasă ușor convins.",
  grabit: "Proprietar foarte grăbit, la volan sau la muncă. Răspunde monosilabic, spune des „n-am timp”, vrea doar esențialul.",
  negociator: "Proprietar care vinde un apartament de 2 camere în Iosefin la 95.000 €. Nu vrea să scadă prețul, negociază dur, întreabă ce câștigă.",
  garsoniera: "Proprietar al unei garsoniere de 28 m² în zona Aradului, la prima vânzare, nesigur, cere explicații simple despre pași și costuri.",
};
const OPENING = "Bună ziua, sunt Andrei, asistent AI RealTrust Timișoara. Vă sun despre anunțul dumneavoastră de vânzare. Aveți un minut?";

async function ai(messages: any[], key: string, opts: Record<string, unknown> = {}) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3.8-flash", messages, ...opts }),
  });
  if (!r.ok) {
    const t = await r.text();
    const err: any = new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content ?? "").trim();
}


const branchOf = (c: string | null) => c === "hotelier" ? "cazare" : c === "inchiriere" ? "inchiriere" : "vanzare";
const BANNED = /rețea privată|retea privata|preț premium|peste piață|chirie garantată|venit garantat|doi minute|doi camere|doi opțiuni/i;
// Comisioane reale pe tip de serviciu (singurele procente admise).
const COMMISSION_BY_BRANCH: Record<string, string[]> = {
  vanzare: ["2-4"],
  inchiriere: ["50-100", "15-20"], // intermediere din prima chirie sau administrare clasică
  cazare: ["15-20"],
};
const ALL_COMMISSIONS = new Set(Object.values(COMMISSION_BY_BRANCH).flat());
function pctTokens(s: string): string[] {
  return [...s.matchAll(/(\d+(?:[.,]\d+)?|X)\s*(?:-|–|la)?\s*(\d+)?\s*%/gi)]
    .filter((m) => !/6[.,]5|9[.,]4/.test(m[0]))
    .map((m) => `${m[1]}${m[2] ? "-" + m[2] : ""}`.replace(/\s/g, "").toUpperCase());
}
function badCommission(t: string, branch?: string): boolean {
  const s = String(t || "");
  if (!/comision|procent|%/i.test(s)) return false;
  if (/X\s*%/i.test(s) || /cheltuieli/i.test(s)) return true;
  const allowed = branch ? new Set(COMMISSION_BY_BRANCH[branch] ?? []) : ALL_COMMISSIONS;
  return pctTokens(s).some((p) => !allowed.has(p));
}
function commissionAnswerOk(transcript: { role: string; text: string }[], branch: string): boolean | null {
  let asked = false, ok = true;
  transcript.forEach((t, i) => {
    // doar întrebările directe despre comision, nu remarcile de tip „nu plătesc comision”
    if (t.role === "andrei" || !/\?/.test(t.text) || !/(ce|c[âa]t|care e|care este)[^?]{0,25}comision|comision[^?]{0,20}(lua[țt]i|cere[țt]i|ave[țt]i)|c[âa]t lua[țt]i|c[âa]t cere[țt]i/i.test(t.text)) return;
    asked = true;
    const r = transcript.slice(i + 1).find((x) => x.role === "andrei")?.text ?? "";
    // politețea sau repetarea numelui înainte nu contează; cerem doar: analiza/raportul gratuit + procentul corect + WhatsApp
    const pcts = pctTokens(r);
    if (!/(analiz|raport|evaluare)[^.?!]{0,40}gratuit|gratuit[^.?!]{0,40}(analiz|raport|evaluare)/i.test(r) || !pcts.length || pcts.some((p) => !(COMMISSION_BY_BRANCH[branch] ?? []).includes(p)) || !/whatsapp|analiza-gratuita/i.test(r)) ok = false;
  });
  return asked ? ok : null;
}
const norm = (x: string) => (x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
let ZONES: { name: string; words: string[] }[] = [];
async function loadZones(supabase: any) {
  const { data } = await supabase.from("timisoara_zones").select("name, aliases").eq("is_active", true);
  ZONES = (data ?? []).map((z: any) => ({ name: z.name, words: [z.name, ...(z.aliases ?? [])].map(norm).filter((w: string) => w.length >= 4) }));
}
/** Returnează zonele numite de Andrei care NU apar în anunț și nu au fost spuse de proprietar. */
function inventedZones(transcript: { role: string; text: string }[], listingZone: string): string[] {
  const known = norm(listingZone);
  const ownerSaid = norm(transcript.filter((t) => t.role !== "andrei").map((t) => t.text).join(" "));
  const a = norm(transcript.filter((t) => t.role === "andrei").map((t) => t.text).join(" "));
  return ZONES.filter((z) => z.words.some((w) => a.includes(w)) && !z.words.some((w) => known.includes(w) || ownerSaid.includes(w))).map((z) => z.name);
}
function zoneHallucination(transcript: { role: string; text: string }[], listingZone: string): boolean {
  return inventedZones(transcript, listingZone).length > 0;
}
function skepticPivotOk(transcript: { role: string; text: string }[]): boolean | null {
  let seen = false, ok = true;
  transcript.forEach((t, i) => {
    if (t.role === "andrei" || !/(agen[țt]ii|agen[țt]ie)[^.?!]{0,40}comision|doar comision/i.test(t.text)) return;
    seen = true;
    const r = transcript.slice(i + 1).find((x) => x.role === "andrei")?.text ?? "";
    if (!/(contract|angajament|obliga)/i.test(r) || !/gratuit/i.test(r) || !/whatsapp/i.test(r)) ok = false;
  });
  return seen ? ok : null;
}
function validate(transcript: { role: string; text: string }[], branch: string, listingZone = "") {
  const a = transcript.filter((t) => t.role === "andrei").map((t) => t.text).join(" ").toLowerCase();
  const wrongArg = branch === "vanzare" ? /randament|regim hotelier/.test(a) : branch === "inchiriere" ? /randament net|regim hotelier/.test(a) : false;
  return {
    banned_phrase: BANNED.test(a),
    wrong_branch_argument: wrongArg,
    wrong_commission: badCommission(a, branch),
    commission_answer_ok: commissionAnswerOk(transcript, branch),
    offered_free_analysis: /analiz/.test(a),
    mentioned_whatsapp: /whatsapp/.test(a),
    zone_hallucination: zoneHallucination(transcript, listingZone),
    invented_zones: inventedZones(transcript, listingZone),
    skeptic_pivot_ok: skepticPivotOk(transcript),
  };
}
const CATS = ["Tone of Voice", "Handling Objections", "Sales Strategy", "General"];

async function autoLoop(supabase: any, KEY: string, opts: { personas?: string[]; rejecter?: boolean; offset?: number } = {}) {
  await loadZones(supabase);
  const { data: q } = await supabase.from("wa_outbound_queue").select("prospect_listing_id").eq("status", "failed")
    .ilike("last_error", "%131026%").not("prospect_listing_id", "is", null).limit(300);
  const ids = [...new Set((q ?? []).map((r: any) => r.prospect_listing_id))];
  let rows: any[] = [];
  if (ids.length) {
    const { data } = await supabase.from("prospect_listings").select("id, category").in("id", ids).eq("is_active", true).limit(60);
    rows = data ?? [];
  }
  if (rows.length < 4) {
    const { data } = await supabase.from("prospect_listings").select("id, category").eq("is_active", true).not("price", "is", null)
      .order("created_at", { ascending: false }).limit(40);
    rows = [...rows, ...(data ?? [])];
  }
  // fiecare simulare primește alt tip de anunț (vânzare / închiriere / hotelier) și o întrebare despre comision
  const byBranch: Record<string, any[]> = {};
  for (const r of rows) (byBranch[branchOf(r.category)] ||= []).push(r);
  const BR = ["vanzare", "inchiriere", "cazare"];
  const personas = opts.personas ?? Object.keys(PERSONAS);
  const fixes: string[] = [];
  for (let i = 0; i < personas.length; i++) {
    try {
      const branch = BR[(i + (opts.offset ?? 0)) % BR.length];
      const pick = byBranch[branch]?.shift();
      const r: any = await simulate(supabase, KEY, { persona: personas[i], prospect_id: pick?.id, branch, commission_probe: true, rejecter: opts.rejecter });
      if (!r.analysis) continue;
      const v = validate(r.transcript, r.branch, r.listingZone);
      await supabase.from("voice_call_analyses").insert({
        source: "training_lab_auto", outcome: `${personas[i]} · ${r.branch} · comision ${v.commission_answer_ok === null ? "neîntrebat" : v.commission_answer_ok && !v.wrong_commission ? "OK" : "GREȘIT"}${v.zone_hallucination ? " · ZONĂ INVENTATĂ" : ""}`, score: r.analysis.score,
        strengths: r.analysis.strengths, weaknesses: [...r.analysis.weaknesses,
          ...(v.banned_phrase ? ["Validare: formulare interzisă sau acord greșit detectat"] : []),
          ...(v.wrong_branch_argument ? ["Validare: argument nepotrivit tipului de anunț"] : []),
          ...(v.wrong_commission ? ["Validare: procent de comision greșit pentru tipul de anunț"] : []),
          ...(v.commission_answer_ok === false ? ["Validare: răspunsul la comision nu conține analiza gratuită + procentul corect + propunerea pe WhatsApp"] : []),
          ...(v.zone_hallucination ? [`Validare: ZONĂ INVENTATĂ — Andrei a spus „${v.invented_zones.join(", ")}”, dar anunțul indică „${r.listingZone || "zonă necunoscută"}”`] : []),
          ...(v.skeptic_pivot_ok === false ? ["Validare: la „agențiile vor doar comision” nu a confirmat lipsa contractului + raport gratuit pe WhatsApp"] : []),
          ...(!v.offered_free_analysis ? ["Validare: nu a propus analiza gratuită /analiza-gratuita"] : [])],
        objections: r.analysis.objections, prompt_fixes: r.analysis.prompt_fixes,
        transcript: r.transcript.map((t: any) => `${t.role === "andrei" ? "Andrei" : "Proprietar"}: ${t.text}`).join("\n"),
      });
      fixes.push(...r.analysis.prompt_fixes);
    } catch (e: any) {
      console.error("sim", e?.message);
      if (e?.status === 402 || e?.status === 403 || e?.status === 429) return; // circuit breaker
    }
  }
  if (!fixes.length) return;
  const { data: active } = await supabase.from("voice_agent_playbook_addendum").select("id, lesson").eq("is_active", true).limit(50);
  const raw = await ai([
    { role: "system", content: "Curatorul regulilor lui Andrei. Răspunzi doar JSON valid." },
    { role: "user", content: `Reguli active (id: text):\n${(active ?? []).map((l: any) => `${l.id}: ${l.lesson}`).join("\n") || "-"}\n\nSugestii noi din simulări:\n${fixes.map((f) => "- " + f).join("\n")}\n\nPăstrează STRICT cele mai relevante maximum 5 reguli în total (existente păstrate + noi). Elimină redundanțele. Respinge sugestii care promit cumpărători, prețuri premium, venituri garantate sau contrazic: replici scurte, „două minute”, argumente pe tip de anunț, propunerea analizei gratuite /analiza-gratuita pe WhatsApp cu acord. Categorii: ${CATS.join(", ")}.\nJSON: {"keep_ids":["..."],"new":[{"lesson":"max 200 caractere","category":"..."}]}` },
  ], KEY, { temperature: 0.1 });
  let plan: any = null;
  try { plan = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "null"); } catch { plan = null; }
  if (!plan) return;
  const activeIds = new Set((active ?? []).map((l: any) => l.id));
  const badIds = new Set((active ?? []).filter((l: any) => BANNED.test(l.lesson) || badCommission(l.lesson)).map((l: any) => l.id));
  const keep = (Array.isArray(plan.keep_ids) ? plan.keep_ids : []).map(String).filter((id: string) => activeIds.has(id) && !badIds.has(id)).slice(0, 5);
  const fresh = (Array.isArray(plan.new) ? plan.new : []).filter((n: any) => String(n?.lesson || "").length >= 10 && !BANNED.test(n.lesson) && !badCommission(n.lesson))
    .slice(0, 5 - keep.length);
  const toArchive = [...activeIds].filter((id) => !keep.includes(id as string));
  if (toArchive.length) await supabase.from("voice_agent_playbook_addendum").update({ is_active: false }).in("id", toArchive);
  if (fresh.length) await supabase.from("voice_agent_playbook_addendum").insert(fresh.map((n: any) => ({
    lesson: String(n.lesson).slice(0, 400), severity: "warning", is_active: true, auto_applied: true, applied_at: new Date().toISOString(),
    profile_summary: `Training Lab auto · [${CATS.includes(n.category) ? n.category : "General"}]`,
  })));
}

async function simulate(supabase: any, KEY: string, body: any): Promise<any> {
    let persona = String(body.persona || "");
    let branch: "vanzare" | "inchiriere" | "cazare" = "vanzare";
    let personaText = PERSONAS[persona];
    let objections = "";
    let listingZone = "";
    if (body.prospect_id) {
      const basePersona = PERSONAS[persona] ? persona : "";
      const { data: r } = await supabase.from("prospect_listings").select("id, title, category, zone, location, price, currency, rooms, size")
        .eq("id", String(body.prospect_id)).maybeSingle();
      if (!r) return { httpError: "Anunț inexistent", status: 404 };
      branch = normalizeAndreiBranch(branchOf(r.category));
      listingZone = String(r.zone || r.location || "");
      const tip = branch === "inchiriere" ? "închiriază pe termen lung" : branch === "cazare" ? "are în regim hotelier" : "vinde";
      personaText = `Proprietar care ${tip}: „${r.title || "apartament"}”, zona ${r.zone || r.location || "nespecificată"}, ${r.rooms ?? "?"} camere, ${r.size ?? "?"} m², preț ${r.price ?? "?"} ${r.currency || "EUR"}${branch === "inchiriere" ? "/lună" : ""}. Ține la preț, întreabă ce face concret agenția pentru tipul lui de anunț și ridică obiecții legate de preț, zonă și mărimea apartamentului.`;
      if (basePersona) personaText = PERSONAS[basePersona] + " Anunțul tău real: " + personaText;
      persona = basePersona ? `${basePersona}-${branch}` : `campanie-${branch}`;
      objections = "\n\n" + andreiListingObjections({ branch, price: r.price, currency: r.currency, zone: r.zone || r.location, rooms: r.rooms, size: r.size, title: r.title });
    }
    else if (["vanzare", "inchiriere", "cazare"].includes(body.branch)) {
      branch = body.branch;
      const tip = branch === "inchiriere" ? "închiriază pe termen lung un apartament" : branch === "cazare" ? "are un apartament în regim hotelier" : "vinde un apartament";
      if (personaText) personaText += ` Tu ${tip} în Timișoara.`;
    }
    if (!personaText) return { httpError: "Profil necunoscut", status: 400 };
    if (body.commission_probe) personaText += " În prima sau a doua replică întreabă direct: „Și ce comision luați?”.";
    if (body.rejecter) personaText += " Respingi la început ideea de analiză („nu am nevoie de analize”) și spui că nu plătești comision agențiilor.";
    if (!/zona /.test(personaText) && !listingZone) objections += "\n\nZona anunțului NU este cunoscută: întreabă o singură dată cartierul; nu presupune nicio zonă.";
    if (!ZONES.length) await loadZones(supabase);
    const turns = Math.min(8, Math.max(3, Number(body.turns) || 6));

    const { data: script } = await supabase.from("voice_agent_scripts").select("system_prompt").eq("is_active", true).maybeSingle();
    const { data: lessons } = await supabase.from("voice_agent_playbook_addendum").select("lesson").eq("is_active", true)
      .order("created_at", { ascending: false }).limit(5);
    const andreiPrompt = (script?.system_prompt || "Ești Andrei, asistent AI imobiliar RealTrust Timișoara.") +
      (lessons?.length ? "\n\nLecții active:\n" + lessons.map((l: any) => `- ${l.lesson}`).join("\n") : "") +
      "\n\n" + andreiConversationPolicy(branch) + objections +
      `\n\nZONA EXACTĂ DIN ANUNȚ: ${listingZone || "necunoscută — întreabă o singură dată cartierul"}. Cartiere și repere reale din Timișoara pe care le poți folosi DOAR dacă apar în anunț sau le spune proprietarul: ${ZONES.map((z) => z.name).join(", ")}. Nu numi niciun alt cartier sau reper.` +
      "\n\nEști la telefon. Răspunzi cu O singură replică scurtă, fără etichete sau ghilimele.";
    const ownerPrompt = `Joci rolul unui proprietar din Timișoara sunat de un asistent AI imobiliar. ${personaText}
Vorbești natural, în română, ca la telefon: o replică scurtă (max 25 de cuvinte), fără etichete. Ridică obiecții realiste. Dacă ești convins, poți accepta analiza gratuită; dacă te enervează, poți spune STOP.`;

    const transcript: { role: "andrei" | "proprietar"; text: string }[] = [{ role: "andrei", text: branch === "inchiriere" ? OPENING.replace("de vânzare", "de închiriere") : branch === "cazare" ? OPENING.replace("anunțul dumneavoastră de vânzare", "apartamentul dumneavoastră în regim hotelier") : OPENING }];
    for (let i = 0; i < turns; i++) {
      const owner = await ai([{ role: "system", content: ownerPrompt },
        ...transcript.map((t) => ({ role: t.role === "andrei" ? "user" : "assistant", content: t.text }))], KEY, { temperature: 0.9 });
      transcript.push({ role: "proprietar", text: owner || "..." });
      if (/\bstop\b|nu mă mai sunați|la revedere/i.test(owner)) {
        transcript.push({ role: "andrei", text: "Am înțeles. Nu vă mai rețin. O zi bună!" });
        break;
      }
      const andrei = await ai([{ role: "system", content: andreiPrompt },
        ...transcript.map((t) => ({ role: t.role === "andrei" ? "assistant" : "user", content: t.text }))], KEY, { temperature: 0.4 });
      transcript.push({ role: "andrei", text: andrei || "..." });
      if (/o zi bună|la revedere/i.test(andrei)) break;
    }

    const convo = transcript.map((t) => `${t.role === "andrei" ? "Andrei" : "Proprietar"}: ${t.text}`).join("\n");
    const raw = await ai([
      { role: "system", content: "Ești coach sever de vânzări imobiliare telefonice. Răspunzi doar JSON valid." },
      { role: "user", content: `Analizează performanța lui Andrei (asistent AI RealTrust Timișoara) în conversația de mai jos. Criterii: replici scurte, nu se repetă, avansează (obiectiv → termen → preț → acord pentru analiză), tratează obiecțiile, transparență, fără informații inventate.
Profil proprietar: ${persona}. Tip anunț: ${branch}. Verifică și dacă Andrei a folosit DOAR argumentele potrivite tipului de anunț. Reguli stricte (penalizează sever): (1) orice mențiune a comisionului trebuie urmată imediat, în aceeași replică, de propunerea trimiterii analizei pe WhatsApp; (2) zona folosită trebuie să fie STRICT cea din anunț (${listingZone || "necunoscută — Andrei trebuie să întrebe o singură dată"}); orice cartier inventat sau presupus = greșeală gravă; (3) răspunsul la comision conține în aceeași replică: modul de lucru la rezultat/procentul, analiza gratuită și propunerea de trimitere pe WhatsApp; „Nu oferim servicii fără comision” = greșeală gravă; (4) după un PRIM refuz moale („găsesc singur chiriaș”, „nu plătesc comision”) Andrei face o pivotare de calificare (disponibilitate/termen) înainte să închidă; închiderea imediată = greșeală; (5) la „toate agențiile vor doar comision”, Andrei trebuie să confirme că nu cere contract/angajament și doar trimite gratuit raportul de evaluare pe WhatsApp. IMPORTANT: dacă proprietarul refuză de două ori, închiderea politicoasă a apelului este comportamentul CORECT și dorit — NU o penaliza ca slăbiciune și nu cere insistență.

${convo}

Răspunde STRICT JSON: {"score": 1-10, "strengths": ["..."], "weaknesses": ["..."], "objections": [{"objection": "...", "handled": true|false, "comment": "..."}], "prompt_fixes": ["regulă concretă, imperativă, max 200 caractere, pentru promptul lui Andrei"]}` },
    ], KEY, { temperature: 0.2 });
    const m = raw.match(/\{[\s\S]*\}/);
    let analysis: any = null;
    try { analysis = m ? JSON.parse(m[0]) : null; } catch { analysis = null; }
    if (!analysis) return { transcript, analysis: null, branch, persona, error: "Analiza nu a putut fi citită" };
    analysis.score = Math.max(1, Math.min(10, Math.round(Number(analysis.score) || 1)));
    for (const k of ["strengths", "weaknesses", "prompt_fixes"]) analysis[k] = (Array.isArray(analysis[k]) ? analysis[k] : []).map(String).slice(0, 6);
    analysis.objections = (Array.isArray(analysis.objections) ? analysis.objections : []).slice(0, 8);
    // penalizări automate deterministe pentru regulile stricte
    const strict = validate(transcript, branch, listingZone);
    let penalty = 0;
    if (strict.commission_answer_ok === false || (/comision/i.test(transcript.filter((t) => t.role === "andrei").map((t) => t.text).join(" ")) && !strict.mentioned_whatsapp)) penalty += 2;
    if (strict.zone_hallucination) penalty += 3;
    if (strict.skeptic_pivot_ok === false) penalty += 2;
    // regulile 3 elemente comision + fără capitulare prematură
    const commission_rule_failures: string[] = [];
    let premature_close = false;
    for (let i = 1; i < transcript.length; i++) {
      const prev = transcript[i - 1], cur = transcript[i];
      if (cur.role !== "andrei" || prev.role !== "proprietar") continue;
      if (/comision|gratis|gratuit/i.test(prev.text) && /comision|rezultat/i.test(cur.text)) {
        const v = validateCommissionReply(cur.text);
        if (!v.ok) commission_rule_failures.push(...v.missing);
      }
      if (isPrematureClose(prev.text, cur.text)) premature_close = true;
    }
    (strict as any).commission_three_elements_ok = commission_rule_failures.length === 0;
    (strict as any).commission_missing = [...new Set(commission_rule_failures)];
    (strict as any).premature_close = premature_close;
    if (commission_rule_failures.length) penalty += 2;
    if (premature_close) penalty += 2;
    if (penalty) analysis.score = Math.max(1, analysis.score - penalty);
    return { transcript, analysis, branch, persona, listingZone, strict };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "LOVABLE_API_KEY lipsește" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    if (body.action === "apply") {
      const lessons = (Array.isArray(body.lessons) ? body.lessons : [])
        .map((l: unknown) => String(l ?? "").trim()).filter((l: string) => l.length >= 10 && l.length <= 400 && !BANNED.test(l) && !badCommission(l)).slice(0, 5);
      if (!lessons.length) return json({ error: "Nicio sugestie validă de aplicat" }, 400);
      const { error } = await supabase.from("voice_agent_playbook_addendum").insert(lessons.map((lesson: string) => ({
        lesson, severity: "warning", is_active: true, auto_applied: true, applied_at: new Date().toISOString(),
        profile_summary: `Training Lab · ${String(body.persona || "").slice(0, 40)}`,
      })));
      if (error) return json({ error: error.message }, 500);
      return json({ applied: lessons.length });
    }

    if (body.action === "campaign_profiles") {
      const { data: q } = await supabase.from("wa_outbound_queue").select("prospect_listing_id").eq("status", "failed")
        .ilike("last_error", "%131026%").not("prospect_listing_id", "is", null).limit(500);
      const ids = [...new Set((q ?? []).map((r: any) => r.prospect_listing_id))];
      if (!ids.length) return json({ profiles: [] });
      const { data: rows } = await supabase.from("prospect_listings").select("id, title, category, zone, location, price, currency, rooms, size")
        .in("id", ids).eq("is_active", true).eq("do_not_call", false).order("created_at", { ascending: false }).limit(60);
      const seen = new Set<string>(); const profiles: any[] = [];
      for (const r of rows ?? []) {
        const b = branchOf(r.category);
        const key = `${b}:${r.rooms ?? "?"}`;
        if (seen.has(key) && profiles.length >= 3) continue;
        seen.add(key);
        profiles.push({ id: r.id, branch: b, title: r.title, zone: r.zone || r.location, price: r.price, currency: r.currency, rooms: r.rooms, size: r.size });
        if (profiles.length >= 6) break;
      }
      return json({ profiles });
    }

    // Cron-urile rulează la ambele ore UTC (vară/iarnă); executăm doar când ora României corespunde.
    if (body.background && typeof body.local_hour === "number") {
      const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hour12: false }).format(new Date()));
      if (h !== body.local_hour) return json({ skipped: true, reason: `ora României este ${h}, nu ${body.local_hour}` });
    }

    if (body.action === "upcoming_calls") {
      try { return json({ events: await listUpcomingAndreiEvents(supabase) }); }
      catch (e: any) { return json({ events: [], error: e?.message || "Calendar indisponibil" }); }
    }

    if (body.action === "sceptic_step") {
      // o singură simulare Sceptic, pentru afișare live pas cu pas în Training Lab
      const step = Math.max(0, Number(body.step) || 0);
      const before = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).eq("source", "training_lab_auto");
      await autoLoop(supabase, KEY, { personas: ["sceptic"], rejecter: true, offset: step });
      const { data: last } = await supabase.from("voice_call_analyses").select("id, outcome, score, weaknesses, transcript, created_at")
        .eq("source", "training_lab_auto").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const after = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).eq("source", "training_lab_auto");
      const active = await supabase.from("voice_agent_playbook_addendum").select("id", { count: "exact", head: true }).eq("is_active", true);
      return json({ finished: true, added: (after.count ?? 0) > (before.count ?? 0), last, active_lessons: active.count ?? 0 });
    }

    if (body.action === "sceptic_drill") {
      if (body.background) {
        // rulare programată (cron de noapte): răspundem imediat, simulările continuă în fundal
        // @ts-ignore EdgeRuntime
        EdgeRuntime.waitUntil(autoLoop(supabase, KEY, { personas: ["sceptic", "sceptic", "sceptic"], rejecter: true }).catch((e) => console.error("sceptic_drill", e)));
        return json({ started: true, background: true });
      }
      const before = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).eq("source", "training_lab_auto");
      await autoLoop(supabase, KEY, { personas: ["sceptic", "sceptic", "sceptic"], rejecter: true }).catch((e) => console.error("sceptic_drill", e));
      const after = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).eq("source", "training_lab_auto");
      const active = await supabase.from("voice_agent_playbook_addendum").select("id", { count: "exact", head: true }).eq("is_active", true);
      return json({ finished: true, analyses_added: Math.max(0, (after.count ?? 0) - (before.count ?? 0)), active_lessons: active.count ?? 0 });
    }

    if (body.action === "auto_loop") {
      // Rulare în timp real: așteptăm finalul și returnăm rezultatul,
      // ca istoricul din Training Lab să se actualizeze imediat.
      const before = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).eq("source", "training_lab_auto");
      if (body.background) {
        // rulare programată: răspundem imediat, simulările continuă în fundal
        // @ts-ignore EdgeRuntime
        EdgeRuntime.waitUntil(autoLoop(supabase, KEY).catch((e) => console.error("auto_loop", e)));
        return json({ started: true, background: true });
      }
      await autoLoop(supabase, KEY).catch((e) => console.error("auto_loop", e));
      const after = await supabase.from("voice_call_analyses").select("id", { count: "exact", head: true }).eq("source", "training_lab_auto");
      const active = await supabase.from("voice_agent_playbook_addendum").select("id", { count: "exact", head: true }).eq("is_active", true);
      return json({ started: true, finished: true, analyses_added: Math.max(0, (after.count ?? 0) - (before.count ?? 0)), active_lessons: active.count ?? 0 });
    }
    const r = await simulate(supabase, KEY, body);
    if ((r as any).httpError) return json({ error: (r as any).httpError }, (r as any).status);
    return json(r);

  } catch (e: any) {
    const status = e?.status === 429 || e?.status === 402 ? e.status : 500;
    const msg = status === 429 ? "Prea multe cereri AI, încearcă peste un minut." : status === 402 ? "Credite AI insuficiente." : e.message;
    return json({ error: msg }, status);
  }
});
