// wa-listing-analysis — bot WhatsApp „Analizează anunțul meu”.
// Internal-only (x-internal-secret). Primește linkul trimis pe WhatsApp,
// rulează analiza + scorul de piață și trimite estimarea înapoi în conversație.
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const secret = Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "";
  if (!secret || req.headers.get("x-internal-secret") !== secret) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const convId = String(body?.conversation_id || "");
  const url = String(body?.url || "");
  const phone = String(body?.phone || "");
  if (!convId || !/^https:\/\/(www\.)?[^/\s]*(storia|olx|publi24|imobiliare)\.ro\//i.test(url)) {
    return json({ error: "invalid_input" }, 400);
  }

  const base = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key };
  const send = (text: string) =>
    fetch(`${base}/functions/v1/wa-andrei-send`, {
      method: "POST",
      headers: { ...h, "x-internal-secret": secret },
      body: JSON.stringify({ conversation_id: convId, text, auto_kind: "listing_analysis_result" }),
    });

  let text: string;
  try {
    const aRes = await fetch(`${base}/functions/v1/public-listing-analysis`, {
      method: "POST", headers: h, body: JSON.stringify({ mode: "url", url }),
    });
    const a = (await aRes.json().catch(() => ({})))?.analysis;
    if (!a) throw new Error("analysis_failed");
    const mRes = await fetch(`${base}/functions/v1/listing-market-score`, {
      method: "POST", headers: h,
      body: JSON.stringify({
        zone: [a.zona, a.titlu].filter(Boolean).join(" "), rooms: a.camere, size: a.suprafata, price: a.pret_listare,
        channel: "whatsapp", phone, source_url: url, title: a.titlu,
      }),
    });
    const m = await mRes.json().catch(() => ({}));
    await fetch(`${base}/functions/v1/analyzed-listing`, {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "save", channel: "whatsapp", url, phone, analysis: a, market: m?.ok ? m : null }),
    }).catch(() => undefined);
    if (!m?.ok) {
      text = "Am citit anunțul, dar lipsesc prețul sau suprafața, așa că nu pot calcula estimarea. Ne puteți scrie prețul și suprafața aici?";
    } else {
      text = [
        `📊 Analiza anunțului${a.zona ? ` din ${a.zona}` : ""}:`,
        `• Scor general: ${m.total_score}/100`,
        `• Preț cerut: ${eur(a.pret_listare)} (${m.asking_ppm} €/m², mediana zonei ${m.median_ppm} €/m²)`,
        `• Spațiu de negociere: ~${eur(m.negotiation_eur)}`,
        `• Preț țintă: ${eur(m.target_low)} – ${eur(m.target_high)}`,
        `• Chirie clasică ≈ ${eur(m.classic_rent_month)}/lună vs. regim hotelier RealTrust ≈ ${eur(m.hotel_net_month)}/lună net`,
        "",
        "Estimare orientativă din anunțurile reale din Timișoara (ultimele 6 luni). Sunteți proprietarul? Vă putem ajuta cu vânzarea sau administrarea — răspundeți „DA” și vă contactăm.",
      ].join("\n");
    }
  } catch (e) {
    console.error("[wa-listing-analysis]", (e as Error).message);
    text = "Nu am putut citi anunțul acum. Încercați din nou peste câteva minute sau folosiți realtrust.ro/analiza-anunt.";
  }
  await send(text).catch((e) => console.error("send failed", e));
  return json({ ok: true });
});
