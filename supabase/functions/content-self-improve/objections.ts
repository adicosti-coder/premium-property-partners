// Antrenor conversații WhatsApp: grupează obiecțiile repetate ale proprietarilor
// și propune replici scurte pentru Andrei (aprobare Admin, rollback).
export const OBJECTIONS: Record<string, { label: string; re: RegExp; fallback: string }> = {
  commission: { label: "Întreabă de comision / costuri", re: /\b(comision\w*|cat (ma )?costa|cat luati|procent\w*|taxa)\b/,
    fallback: "Analiza de piață e gratuită. Comisionul îl discutăm transparent după evaluare — vreți să o programăm la apartament?" },
  agency: { label: "Nu vrea agenții / intermediari", re: /\b(fara agenti\w*|nu (lucrez|colaborez|vreau) cu agenti\w*|agentii|intermediar\w*|doar persoane fizice)\b/,
    fallback: "Înțeleg, mulți proprietari au avut experiențe neplăcute. Vă pot trimite doar analiza gratuită de preț, fără obligații — vă ajută?" },
  alone: { label: "Vinde / închiriază singur", re: /\b(vand singur|ma descurc singur|singur\w*|direct de la proprietar)\b/,
    fallback: "Perfect, respect asta. Dacă vreți, vă trimit gratuit o analiză a prețului din zonă ca reper — o doriți?" },
  price: { label: "Preț ferm / nu negociază", re: /\b(pretul (e|este) fix|nu (scad|negociez)|pret ferm|nu e negociabil)\b/,
    fallback: "Am notat, respectăm prețul dumneavoastră. Vreți să vedem împreună ce cer anunțurile similare din zonă?" },
  later: { label: "Nu acum / mai târziu", re: /\b(nu acum|mai tarziu|poate (mai )?incolo|reveniti|ma mai gandesc|nu (sunt )?grabit)\b/,
    fallback: "Sigur, nicio grabă. Vă scriu peste câteva săptămâni sau preferați să mă contactați dumneavoastră?" },
  trust: { label: "Neîncredere / cine sunteți", re: /\b(de unde aveti|cine sunteti|teapa|ce firma|cum ati gasit)\b/,
    fallback: "Am văzut anunțul public. Suntem RealTrust Timișoara (realtrust.ro), 9.7/10 pe Booking. Vă pot trimite detalii despre noi?" },
  rented: { label: "Deja vândut / închiriat", re: /\b(s-?a (vandut|inchiriat)|deja (vandut|inchiriat)|nu mai e disponibil)\b/,
    fallback: "Felicitări! Dacă mai aveți alte proprietăți sau planuri, vă stăm la dispoziție. O zi bună!" },
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Replica e respinsă dacă încalcă regulile de business (fără procente, garanții, cumpărători inventați, birou).
export const unsafeReply = (t: string) => !t || t.length > 280 || /\d+\s?%|garant|cumparator\w* (calificat|deja)|avem (deja )?(clienti|cumparatori)|birou|0 ?lei|gratuit 100/.test(norm(t));

export async function analyzeObjections(db: any) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await db.from("wa_messages").select("conversation_id,content")
    .eq("direction", "inbound").gte("created_at", since).order("created_at", { ascending: false }).limit(2000);
  if (error) throw error;
  const groups: Record<string, { convs: Set<string>; samples: string[] }> = {};
  for (const m of data ?? []) {
    const t = norm(String(m.content ?? "")); if (!t || t.length > 400) continue;
    for (const [code, o] of Object.entries(OBJECTIONS)) if (o.re.test(t)) {
      const g = groups[code] ??= { convs: new Set(), samples: [] };
      g.convs.add(m.conversation_id);
      if (g.samples.length < 6) g.samples.push(String(m.content).replace(/\+?\d[\d\s]{7,}/g, "[tel]").slice(0, 200));
    }
  }
  const { data: prev } = await db.from("content_improvements").select("proposed_value,status").eq("kind", "insight").in("status", ["pending", "applied"]).limit(500);
  const seen = new Set((prev ?? []).filter((r: any) => r.proposed_value?.scope === "wa_objection").map((r: any) => r.proposed_value.code));
  const key = Deno.env.get("LOVABLE_API_KEY");
  const rows = [];
  for (const [code, g] of Object.entries(groups)) {
    if (g.convs.size < 2 || seen.has(code)) continue;
    const o = OBJECTIONS[code];
    let reply = o.fallback, source = "șablon sigur";
    if (key) try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [
          { role: "system", content: "Ești antrenor pentru Andrei, consultant RealTrust Timișoara pe WhatsApp. Scrie O SINGURĂ replică în română, max 220 caractere, caldă, fără presiune, cu o singură întrebare. Interzis: procente, garanții, cumpărători inventați, întâlniri la birou (nu avem birou; vizionări la apartament). Dacă e despre comision, începe cu „Analiza de piață e gratuită.”. Răspunde doar cu textul replicii." },
          { role: "user", content: `Obiecție repetată: ${o.label}\nExemple reale:\n- ${g.samples.join("\n- ")}` }] }) });
      const t = r.ok ? String((await r.json()).choices?.[0]?.message?.content ?? "").trim().replace(/^["„]|["”]$/g, "") : "";
      if (!unsafeReply(t)) { reply = t; source = "AI, validat"; }
    } catch { /* fallback */ }
    rows.push({ kind: "insight", title: `Conversații · ${o.label}`, confidence: null,
      rationale: `Obiecție apărută în ${g.convs.size} conversații WhatsApp (30 zile). Replica (${source}) va fi folosită de Andrei ca model la obiecții similare.`,
      evidence: { text: `${g.samples.length} exemple, ${g.convs.size} conversații`, examples: g.samples.slice(0, 3), conversation_ids: [...g.convs].slice(0, 5) },
      current_value: { conversations_30d: g.convs.size },
      proposed_value: { scope: "wa_objection", code, objection: o.label, reply },
    });
  }
  if (rows.length) { const { error: e } = await db.from("content_improvements").insert(rows); if (e) throw e; }
  return { created: rows.length, objections: Object.keys(groups).length };
}
