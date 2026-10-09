// wa-listing-analysis — bot WhatsApp „Analizează anunțul meu”.
// Internal-only (x-internal-secret). Primește linkul trimis pe WhatsApp,
// rulează analiza + scorul de piață și trimite estimarea înapoi în conversație.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneVariants } from "../_shared/waPhone.ts";
const ADMIN_WA = "40723154520";
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
  const detailed = body?.detailed === true;
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
        "Estimare orientativă din anunțurile reale din Timișoara (ultimele 6 luni).",
      ].join("\n");
      // Proprietarul anunțului (telefon identic cu prospectul) → intră în „Anunțuri Preluate Automat”
      // prin cererea de acord standard; publicarea rămâne doar la „DA PUBLIC”.
      const sb = createClient(base, key);
      const bare = url.replace(/^https:\/\/www\./, "https://");
      const { data: pr } = await sb.from("prospect_listings").select("id, phone_normalized")
        .in("source_url", [url, bare, bare.replace("https://", "https://www.")]).limit(1).maybeSingle();
      const variants = phone ? phoneVariants(phone) : [];
      const isOwner = !!pr?.phone_normalized && variants.includes(pr.phone_normalized);
      let ownerIntake = false;
      if (isOwner) {
        const { count } = await sb.from("wa_publish_consents").select("id", { count: "exact", head: true })
          .eq("prospect_listing_id", pr!.id);
        if (!count) {
          const { error } = await sb.from("wa_publish_consents").insert({
            phone_normalized: pr!.phone_normalized, prospect_listing_id: pr!.id, status: "requested",
            requested_at: new Date().toISOString(), source: "whatsapp", notes: "question_sent",
          });
          ownerIntake = !error;
        }
      }
      text += ownerIntake
        ? "\n\nSunteți proprietarul acestui anunț. Dacă doriți să-l publicăm gratuit pe realtrust.ro, răspundeți „DA PUBLIC”."
        : detailed
          ? "\n\nAm notat cererea de evaluare detaliată — un consultant RealTrust vă scrie aici în curând. Sunteți proprietarul? Răspundeți „DA” și vă ajutăm cu vânzarea sau administrarea."
          : "\nSunteți proprietarul? Vă putem ajuta cu vânzarea sau administrarea — răspundeți „DA” și vă contactăm.";
      if (detailed && !variants.includes("+" + ADMIN_WA)) {
        const { data: adminConv } = await sb.from("wa_conversations").select("id")
          .eq("phone_normalized", "+" + ADMIN_WA).limit(1).maybeSingle();
        if (adminConv) await fetch(`${base}/functions/v1/wa-andrei-send`, {
          method: "POST", headers: { ...h, "x-internal-secret": secret },
          body: JSON.stringify({ conversation_id: adminConv.id, text: `🔔 Cerere evaluare detaliată de la ${phone}\n${url}\nScor ${m.total_score}/100 · țintă ${eur(m.target_low)}–${eur(m.target_high)}`, auto_kind: "admin_detailed_eval" }),
        }).catch(() => undefined);
        await sb.from("user_notifications").insert(
          ((await sb.from("user_roles").select("user_id").eq("role", "admin")).data ?? []).map((r: any) => ({
            user_id: r.user_id, type: "info", title: "Cerere evaluare detaliată (WhatsApp)",
            message: `${phone} · scor ${m.total_score}/100 · ${url}`.slice(0, 500),
          })),
        );
      }
    }
  } catch (e) {
    console.error("[wa-listing-analysis]", (e as Error).message);
    text = "Nu am putut citi anunțul acum. Încercați din nou peste câteva minute sau folosiți realtrust.ro/analiza-anunt.";
  }
  await send(text).catch((e) => console.error("send failed", e));
  return json({ ok: true });
});
