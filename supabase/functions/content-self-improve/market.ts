// Audit determinist al calității datelor din „Piața anunțurilor”.
const CHECKS: Record<string, { label: string; fix: string; q: (b: any) => any }> = {
  bad_price: { label: "Anunțuri active fără preț sau cu preț absurd", fix: "Verifică sursa; re-scanează sau dezactivează anunțurile cu preț lipsă/sub 5.000 €/peste 3.000.000 €.",
    q: (b) => b.or("price.is.null,price.lt.5000,price.gt.3000000") },
  bad_sqm: { label: "Preț pe m² improbabil", fix: "Prețuri pe m² sub 300 € sau peste 6.000 € indică suprafață sau chirie greșit citită (chirie lunară salvată ca vânzare).",
    q: (b) => b.or("price_per_sqm.lt.300,price_per_sqm.gt.6000") },
  no_zone: { label: "Anunțuri active fără zonă", fix: "Completează zona — fără ea nu apar în rapoartele pe cartier și în comparabile.", q: (b) => b.is("zone", null) },
  stale: { label: "Active, dar nevăzute de peste 21 de zile", fix: "Rulează verificarea de expirare; probabil au fost retrase de pe portal.",
    q: (b) => b.lt("last_seen_at", new Date(Date.now() - 21 * 86400000).toISOString()) },
  dup_active: { label: "Duplicate încă active", fix: "Dezactivează copiile marcate ca duplicat, ca să nu dubleze numărătorile.", q: (b) => b.not("duplicate_of", "is", null) },
};

export async function analyzeMarket(db: any) {
  const { data: prev } = await db.from("content_improvements").select("proposed_value").eq("kind", "insight").eq("status", "pending").limit(500);
  const open = new Set((prev ?? []).filter((r: any) => r.proposed_value?.scope === "market").map((r: any) => r.proposed_value.code));
  const rows = [];
  for (const [code, c] of Object.entries(CHECKS)) {
    if (open.has(code)) continue;
    const { count, error } = await c.q(db.from("prospect_listings").select("id", { count: "exact", head: true }).eq("is_active", true));
    if (error) { console.error("market", code, error.message); continue; }
    if (!count) continue;
    rows.push({ kind: "insight", title: `Piața anunțurilor · ${c.label}`, confidence: null,
      rationale: "Verificare automată a datelor din scraper (anunțuri active). Numărul se recalculează la fiecare analiză.",
      evidence: { text: `${count} anunțuri active afectate` },
      current_value: { affected: count }, proposed_value: { scope: "market", code, action: c.fix } });
  }
  if (rows.length) { const { error } = await db.from("content_improvements").insert(rows); if (error) throw error; }
  return { created: rows.length };
}
