/**
 * Generează textele finale de remediere afișate în modalul de detalii al
 * alertelor SEO, plus lista de URL-uri afectate (folosită pentru reindexare).
 */

export interface SeoAlertLike {
  alert_type: string;
  alert_key: string;
  title: string;
  severity: string;
  details: Record<string, unknown> | null;
}

const SITE = "https://realtrust.ro";

/** Extrage URL-urile afectate de o alertă, canonicalizate pe domeniul principal. */
export const extractAlertUrls = (alert: SeoAlertLike | null): string[] => {
  if (!alert) return [];
  const out = new Set<string>();
  const push = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    const v = value.trim();
    if (v.startsWith("/")) out.add(`${SITE}${v}`);
    else if (v.startsWith(`${SITE}`)) out.add(v.split("#")[0]);
  };

  const d = alert.details ?? {};
  push(d.path);
  push(d.url);
  const issues = d.issues;
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (typeof issue === "string") push(issue);
      else if (issue && typeof issue === "object") {
        const rec = issue as Record<string, unknown>;
        push(rec.url ?? rec.path ?? rec.loc);
      }
    }
  }
  if (alert.alert_key.startsWith("404:")) push(alert.alert_key.slice(4));
  return [...out];
};

export interface RemediationPlan {
  summary: string;
  cause: string;
  steps: string[];
  impact: string;
}

/** Recomandări concrete de remediere, în română, per tip de alertă. */
export const buildRemediationPlan = (alert: SeoAlertLike): RemediationPlan => {
  const d = alert.details ?? {};

  if (alert.alert_type === "not_found") {
    const path = typeof d.path === "string" ? d.path : "URL-ul raportat";
    const hits = Number(d.hits ?? 0);
    const referrer = typeof d.referrer === "string" && d.referrer ? d.referrer : null;
    return {
      summary: `Ruta ${path} a returnat 404 de ${hits || "mai multe"} ori în ultimele 24h.`,
      cause: referrer
        ? `Traficul vine preponderent din ${referrer} — probabil un link intern sau extern rămas către o rută veche.`
        : "Cel mai probabil un link vechi indexat de Google sau o rută redenumită fără redirect.",
      steps: [
        `Verifică dacă există o pagină echivalentă activă pentru ${path}.`,
        `Adaugă o redirecționare 301 în App.tsx (secțiunea de redirect-uri legacy) către noua rută.`,
        referrer
          ? `Actualizează linkul din sursa ${referrer} (dacă este pe site-ul propriu).`
          : "Caută linkuri interne rupte către această rută și corectează-le.",
        "Trimite URL-ul corect la reindexare (butonul „Reindexează URL-urile” de mai jos).",
        "Marchează alerta ca rezolvată după ce ruta răspunde 200 sau 301.",
      ],
      impact:
        hits >= 20
          ? "Impact ridicat: pierdere de trafic organic și semnal negativ de calitate pentru Google."
          : "Impact mediu: risc de crawl budget irosit și experiență proastă pentru vizitatori.",
    };
  }

  if (alert.alert_type === "indexing") {
    const issues = Number(d.issues_count ?? 0);
    const checked = Number(d.checked_pages ?? 0);
    return {
      summary: `${issues} din ${checked || "N/A"} pagini verificate au probleme de indexare în Google.`,
      cause:
        "Cauze frecvente: pagini blocate în robots.txt, canonical greșit, noindex rămas activ, conținut duplicat sau pagini prea noi (descoperite dar neindexate).",
      steps: [
        "Verifică în /admin → SEO → Indexare ce status raportează fiecare URL.",
        "Confirmă că paginile afectate nu sunt blocate în robots.txt și nu au meta noindex.",
        "Verifică tagul canonical: trebuie să indice URL-ul propriu, pe https://realtrust.ro.",
        "Asigură-te că URL-urile apar în sitemap.xml (Purge Sitemap Cache dacă sitemap-ul e vechi).",
        "Trimite URL-urile afectate la reindexare (IndexNow + resubmit sitemap).",
        "Reverifică statusul după 48–72h; Google are nevoie de timp pentru recrawl.",
      ],
      impact:
        "Impact ridicat: paginile neindexate nu pot genera trafic organic, indiferent de calitatea conținutului.",
    };
  }

  return {
    summary: alert.title,
    cause: "Tip de alertă necunoscut — verifică datele tehnice de mai jos.",
    steps: [
      "Analizează câmpurile din secțiunea „Detalii tehnice”.",
      "Rulează o reverificare din butonul „Verifică acum”.",
    ],
    impact: "Impact necunoscut.",
  };
};
