// Centru Auto-îmbunătățire — module noi: orar social, „Proprietatea săptămânii”,
// monitorizare integrări (Make.com / WhatsApp / Voce), arhivare lead-uri reci, variante CTA.
// Toate propunerile sunt „pending”; se aplică doar la aprobarea adminului și se pot anula
// (valorile anterioare stau în current_value / baseline).
import { drainMakeRelayDlq } from "../_shared/makeRelay.ts";

const DAY = 86400000;
export const OPS_KINDS = ["social_hours", "social_featured", "integration_retry", "lead_archive", "cta_ab"];
const roHour = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Bucharest" }).format(new Date(iso)));
const SOCIAL_REF = /facebook|instagram|fb\.|l\.instagram|lm\.facebook/i;

async function pendingKinds(db: any): Promise<Set<string>> {
  const { data } = await db.from("content_improvements").select("kind").eq("status", "pending").in("kind", OPS_KINDS);
  return new Set((data ?? []).map((d: any) => d.kind));
}

function nextSlot(startHour: number): string {
  // Următoarea zi lucrătoare la ora de start (ora României ≈ UTC+3/+2; folosim +3 conservator).
  const d = new Date(Date.now() + DAY);
  while ([0, 6].includes(d.getUTCDay())) d.setTime(d.getTime() + DAY);
  d.setUTCHours(Math.max(0, startHour - 3), 0, 0, 0);
  return d.toISOString();
}

export async function analyzeOps(db: any, aiKey?: string | null): Promise<number> {
  const pend = await pendingKinds(db);
  const rows: any[] = [];
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();

  // ── 2a. Orar publicare social: orele la care vin vizitele din Facebook/Instagram ──
  const { data: job } = await db.from("automation_jobs").select("config").eq("job_key", "social.autopost_drain").maybeSingle();
  const cfg = job?.config ?? {};
  if (!pend.has("social_hours")) {
    const { data: pv } = await db.from("property_views").select("viewed_at,referrer").gte("viewed_at", since30).not("referrer", "is", null).limit(20000);
    const social = (pv ?? []).filter((v: any) => SOCIAL_REF.test(v.referrer ?? ""));
    if (social.length >= 20) {
      const h: number[] = Array(24).fill(0);
      for (const v of social) h[roHour(v.viewed_at)]++;
      let best = 9, bestSum = -1; // fereastra de 6 ore cu cele mai multe vizite, între 08 și 22
      for (let s = 8; s <= 16; s++) { const sum = h.slice(s, s + 6).reduce((a, b) => a + b, 0); if (sum > bestSum) { bestSum = sum; best = s; } }
      const proposed = { start_hour: best, end_hour: best + 6, min_interval_minutes: cfg.min_interval_minutes ?? 120 };
      if (proposed.start_hour !== cfg.start_hour || proposed.end_hour !== cfg.end_hour) {
        rows.push({ kind: "social_hours", title: `Postează pe Facebook/Instagram între ${best}:00 și ${best + 6}:00`,
          rationale: `${bestSum} din ${social.length} vizite venite din rețele sociale în ultimele 30 de zile au fost în acest interval.`,
          evidence: { text: `Vizite sociale pe oră: ${h.map((n, i) => n ? `${i}h:${n}` : "").filter(Boolean).join(", ")}` },
          current_value: { start_hour: cfg.start_hour ?? 9, end_hour: cfg.end_hour ?? 21, min_interval_minutes: cfg.min_interval_minutes ?? 120 },
          proposed_value: proposed, confidence: Math.min(0.9, 0.4 + social.length / 200) });
      }
    }
  }

  // ── 2b. „Proprietatea săptămânii”: cea mai vizitată proprietate activă (30 zile) ──
  if (!pend.has("social_featured")) {
    const { data: pv } = await db.from("property_views").select("property_id").gte("viewed_at", since30).limit(20000);
    const cnt: Record<string, number> = {};
    for (const v of pv ?? []) if (v.property_id) cnt[v.property_id] = (cnt[v.property_id] ?? 0) + 1;
    const { data: recent } = await db.from("social_posts").select("property_id").gte("created_at", new Date(Date.now() - 21 * DAY).toISOString()).not("property_id", "is", null);
    const used = new Set((recent ?? []).map((r: any) => r.property_id));
    const ids = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => !used.has(id)).slice(0, 10);
    if (ids.length) {
      const { data: props } = await db.from("properties").select("id,name,slug,location,rooms,listing_type,images,image_path,usable_area").in("id", ids).eq("is_active", true);
      const p = ids.map((id) => (props ?? []).find((x: any) => x.id === id)).find((x: any) => x?.slug);
      if (p) {
        const imgs = (Array.isArray(p.images) ? p.images : []).filter((u: any) => typeof u === "string" && /^https?:/.test(u)).slice(0, 3);
        if (!imgs.length && typeof p.image_path === "string" && /^https?:/.test(p.image_path)) imgs.push(p.image_path);
        const facts = [p.rooms ? `${p.rooms} ${Number(p.rooms) === 1 ? "cameră" : "camere"}` : null, p.usable_area ? `${p.usable_area} m² utili` : null, p.location || "Timișoara"].filter(Boolean).join(" · ");
        const link = `https://realtrust.ro/proprietate/${p.slug}`;
        const caption = `Proprietatea săptămânii: ${p.name}\n${facts}\n\nCea mai vizitată proprietate RealTrust din ultimele 30 de zile. Detalii și toate pozele: ${link}`;
        rows.push({ kind: "social_featured", target_id: p.id, title: `Proprietatea săptămânii: ${String(p.name).slice(0, 150)}`,
          rationale: `${cnt[p.id]} vizite în ultimele 30 de zile — cea mai vizitată proprietate activă nepostată în ultimele 3 săptămâni.`,
          evidence: { text: `Link: ${link}` }, current_value: null,
          proposed_value: { caption, image_urls: imgs, source_url: link, title: p.name, scheduled_at: nextSlot(cfg.start_hour ?? 10) },
          confidence: 0.8 });
      }
    }
  }

  // ── 3a. Integrări: Make.com (coadă eșuată), CRM, WhatsApp, Voce ──
  if (!pend.has("integration_retry")) {
    const since7 = new Date(Date.now() - 7 * DAY).toISOString();
    const [{ count: dlq }, { count: crm }, { data: sel }, { count: waFail }] = await Promise.all([
      db.from("make_relay_dlq").select("id", { count: "exact", head: true }).in("status", ["failed", "pending"]),
      db.from("leads").select("id", { count: "exact", head: true }).eq("crm_sync_status", "failed"),
      db.from("social_engine_logs").select("success").gte("created_at", since7).limit(1000),
      db.from("wa_outbound_queue").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since7),
    ]);
    const selFail = (sel ?? []).filter((l: any) => !l.success).length;
    const { data: calls } = await db.from("voice_call_logs").select("status").gte("created_at", since7).limit(2000).then((x: any) => x, () => ({ data: null }));
    const callFail = (calls ?? []).filter((c: any) => /fail|error/i.test(String(c.status ?? ""))).length;
    const retriable = (dlq ?? 0) + (crm ?? 0);
    if (retriable > 0 || selFail >= 3 || (waFail ?? 0) >= 3 || callFail >= 3) {
      rows.push({ kind: "integration_retry", title: retriable ? `Reîncearcă ${retriable} trimiteri eșuate (Make.com / CRM)` : "Erori repetate la integrări",
        rationale: `Ultimele 7 zile: ${dlq ?? 0} mesaje Make.com în coadă, ${crm ?? 0} lead-uri nesincronizate cu CRM, ${selFail}/${sel?.length ?? 0} trimiteri Social Engine eșuate, ${waFail ?? 0} mesaje WhatsApp eșuate, ${callFail} apeluri eșuate.`,
        evidence: { text: retriable ? "Re-încercarea retrimite coada Make.com și repune lead-urile în sincronizarea CRM." : "Nimic de retrimis automat — verifică setările integrării." },
        current_value: { make_dlq: dlq ?? 0, crm_failed: crm ?? 0, social_engine_failed_7d: selFail, wa_failed_7d: waFail ?? 0, calls_failed_7d: callFail },
        proposed_value: { retry_make: (dlq ?? 0) > 0, retry_crm: (crm ?? 0) > 0 }, confidence: retriable ? 0.85 : 0.5 });
    }
  }

  // ── 3b. Lead-uri reci inactive > 90 zile ──
  if (!pend.has("lead_archive")) {
    const { data: cold } = await db.from("leads").select("id").is("archived_at", null).eq("lead_grade", "cold")
      .in("crm_status", ["nou_necontactat", "contactat", "pierdut"]).lte("created_at", new Date(Date.now() - 90 * DAY).toISOString()).limit(500);
    if ((cold?.length ?? 0) >= 10) {
      rows.push({ kind: "lead_archive", title: `Arhivează ${cold!.length} lead-uri reci inactive`,
        rationale: `${cold!.length} lead-uri Cold mai vechi de 90 de zile, fără ofertă sau contract. Arhivarea le scoate din Lead Manager, nu le șterge.`,
        evidence: { text: "Poți readuce oricând lead-urile cu „Anulează”." }, current_value: null,
        proposed_value: { lead_ids: cold!.map((c: any) => c.id) }, confidence: 0.75 });
    }
  }

  // ── 4. Conversii pe site: variantă pentru butonul principal ──
  if (!pend.has("cta_ab") && aiKey) {
    const { data: cta } = await db.from("cta_analytics").select("cta_type,page_path").gte("created_at", since30).limit(20000);
    const byType: Record<string, number> = {};
    for (const c of cta ?? []) byType[c.cta_type] = (byType[c.cta_type] ?? 0) + 1;
    const { data: hero } = await db.from("public_site_settings").select("id,hero_cta_primary_ro,hero_cta_secondary_ro").limit(1).maybeSingle();
    if (hero && (cta?.length ?? 0) >= 20) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [
          { role: "system", content: "Ești specialist în conversii pentru RealTrust (administrare și închiriere apartamente, Timișoara). Propui UN text nou pentru butonul principal al paginii de start: max 32 caractere, română, fără promisiuni false, fără cifre inventate, fără București. Răspunde DOAR JSON: {\"field\":\"hero_cta_primary_ro\"|\"hero_cta_secondary_ro\",\"text\":\"...\",\"reason\":\"...\"}" },
          { role: "user", content: JSON.stringify({ clicks_30d_by_type: byType, current: { hero_cta_primary_ro: hero.hero_cta_primary_ro, hero_cta_secondary_ro: hero.hero_cta_secondary_ro } }) },
        ] }),
      });
      if (r.ok) {
        const t = (await r.json()).choices?.[0]?.message?.content ?? "";
        try {
          const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
          if (["hero_cta_primary_ro", "hero_cta_secondary_ro"].includes(j.field) && typeof j.text === "string" && j.text.length <= 32 && j.text !== hero[j.field] && !/bucure/i.test(j.text)) {
            rows.push({ kind: "cta_ab", target_id: null, title: `Variantă CTA: „${j.text}”`,
              rationale: String(j.reason ?? "").slice(0, 600),
              evidence: { text: `Click-uri 30 zile: ${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(", ")}` },
              current_value: { field: j.field, text: hero[j.field] ?? "", row_id: hero.id },
              proposed_value: { field: j.field, text: j.text, row_id: hero.id }, confidence: 0.6 });
          }
        } catch { /* răspuns invalid — nicio propunere */ }
      }
    }
  }

  if (rows.length) await db.from("content_improvements").insert(rows);
  return rows.length;
}

async function homeClicks(db: any, from: Date, to: Date) {
  const { count } = await db.from("cta_analytics").select("id", { count: "exact", head: true })
    .eq("page_path", "/").gte("created_at", from.toISOString()).lt("created_at", to.toISOString());
  return count ?? 0;
}

export async function applyOps(db: any, r: any): Promise<{ baseline: unknown; error: string | null }> {
  const p = r.proposed_value ?? {};
  const now = new Date();
  if (r.kind === "social_hours") {
    const { data: job } = await db.from("automation_jobs").select("config").eq("job_key", "social.autopost_drain").maybeSingle();
    const { error } = await db.from("automation_jobs").update({ config: { ...(job?.config ?? {}), start_hour: p.start_hour, end_hour: p.end_hour, min_interval_minutes: p.min_interval_minutes } }).eq("job_key", "social.autopost_drain");
    return { baseline: { previous_config: job?.config ?? {} }, error: error?.message ?? null };
  }
  if (r.kind === "social_featured") {
    const at = new Date(p.scheduled_at) > now ? p.scheduled_at : nextSlot(10);
    const { data, error } = await db.from("social_posts").insert({ type: "property", property_id: r.target_id, title: `Proprietatea săptămânii: ${p.title}`.slice(0, 200),
      caption: p.caption, source_url: p.source_url, image_url: p.image_urls?.[0] ?? null, image_urls: p.image_urls ?? [], status: "scheduled", scheduled_at: at }).select("id").maybeSingle();
    return { baseline: { social_post_id: data?.id ?? null, scheduled_at: at }, error: error?.message ?? null };
  }
  if (r.kind === "integration_retry") {
    const res: Record<string, unknown> = {};
    if (p.retry_make) {
      const nowIso = now.toISOString();
      await db.from("make_relay_dlq").update({ status: "pending", attempts: 1, next_attempt_at: nowIso, updated_at: nowIso }).in("status", ["failed", "pending"]);
      res.make = await drainMakeRelayDlq(db, 20);
    }
    if (p.retry_crm) {
      const { data } = await db.from("leads").update({ crm_next_retry_at: now.toISOString() }).eq("crm_sync_status", "failed").select("id");
      res.crm_requeued = data?.length ?? 0;
    }
    return { baseline: res, error: null };
  }
  if (r.kind === "lead_archive") {
    const ids: string[] = Array.isArray(p.lead_ids) ? p.lead_ids.slice(0, 500) : [];
    const { data, error } = await db.from("leads").update({ archived_at: now.toISOString() }).in("id", ids).is("archived_at", null).select("id");
    return { baseline: { archived_ids: (data ?? []).map((d: any) => d.id) }, error: error?.message ?? null };
  }
  if (r.kind === "cta_ab") {
    const before = await homeClicks(db, new Date(now.getTime() - 14 * DAY), now);
    const { error } = await db.from("public_site_settings").update({ [p.field]: p.text, updated_at: now.toISOString() }).eq("id", p.row_id);
    return { baseline: { home_clicks_14d: before }, error: error?.message ?? null };
  }
  return { baseline: null, error: "Tip necunoscut" };
}

export async function rollbackOps(db: any, r: any): Promise<string | null> {
  const b = r.baseline ?? {}; const c = r.current_value ?? {};
  if (r.kind === "social_hours") return (await db.from("automation_jobs").update({ config: b.previous_config ?? {} }).eq("job_key", "social.autopost_drain")).error?.message ?? null;
  if (r.kind === "social_featured") {
    if (!b.social_post_id) return "Postarea nu a fost găsită";
    const { data } = await db.from("social_posts").delete().eq("id", b.social_post_id).eq("status", "scheduled").select("id");
    return data?.length ? null : "Postarea a fost deja publicată — nu mai poate fi anulată";
  }
  if (r.kind === "lead_archive") return (await db.from("leads").update({ archived_at: null }).in("id", b.archived_ids ?? [])).error?.message ?? null;
  if (r.kind === "cta_ab") return (await db.from("public_site_settings").update({ [c.field]: c.text || null }).eq("id", c.row_id)).error?.message ?? null;
  return "Re-încercarea nu se poate anula";
}

export async function measureOps(db: any): Promise<number> {
  const cutoff = new Date(Date.now() - 14 * DAY).toISOString();
  const { data } = await db.from("content_improvements").select("id,decided_at,baseline").eq("kind", "cta_ab").eq("status", "applied").is("outcome", null).lte("decided_at", cutoff).limit(10);
  for (const r of data ?? []) {
    const d = new Date(r.decided_at);
    const after = await homeClicks(db, d, new Date(d.getTime() + 14 * DAY));
    const before = Number(r.baseline?.home_clicks_14d ?? 0);
    await db.from("content_improvements").update({ outcome: { measured_at: new Date().toISOString(), clicks_before: before, clicks_after: after, delta: after - before } }).eq("id", r.id);
  }
  return data?.length ?? 0;
}
