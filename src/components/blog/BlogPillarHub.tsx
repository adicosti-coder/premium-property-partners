import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Stable per-tab session id used to dedupe events server-side later.
 */
const getEvaluareSessionId = (): string => {
  if (typeof window === "undefined") return "ssr";
  try {
    const KEY = "evaluare_session_id";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

/**
 * Mirrors a tracking event to the `evaluare_section_events` table so the
 * in-app admin dashboard can compute view-vs-click engagement rates without
 * depending on GA4 exports. Fire-and-forget — failures never block the UI.
 */
const logEvaluareEvent = (params: {
  event_type: "view" | "click";
  section_id: string;
  label: string;
  source?: string;
}) => {
  if (typeof window === "undefined") return;
  try {
    void supabase
      .from("evaluare_section_events")
      .insert({
        event_type: params.event_type,
        section_id: params.section_id,
        label: params.label,
        source: params.source ?? null,
        session_id: getEvaluareSessionId(),
        page_path: window.location.pathname,
      })
      .then(() => undefined, () => undefined);
  } catch {
    /* no-op */
  }
};

/**
 * Extracts the section id from a label/anchor convention used across the file.
 * Inline labels (e.g. "inline_metoda_comparativa") and toc labels
 * (e.g. "toc_evaluare-metoda-comparativa") are normalized to the canonical
 * `evaluare-*` anchor id when possible.
 */
const resolveSectionId = (label: string, hint?: string): string => {
  if (hint && hint.startsWith("evaluare-")) return hint;
  if (label.startsWith("toc_evaluare-")) return label.replace(/^toc_/, "");
  if (label.startsWith("toc_")) return label.replace(/^toc_/, "");
  if (label.startsWith("inline_")) {
    const map: Record<string, string> = {
      inline_metoda_comparativa: "evaluare-metoda-comparativa",
      inline_metoda_capitalizarii: "evaluare-metoda-capitalizarii",
      inline_factori_pret: "evaluare-factori-pret",
    };
    return map[label] ?? label;
  }
  if (label === "cta_formular_evaluare_gratuita") return "evaluare-formular";
  return label;
};

/**
 * Fires a GA4 event for evaluation-section interactions and mirrors it to
 * Supabase for the engagement dashboard.
 */
const trackEvaluationEvent = (label: string, extra: Record<string, string> = {}) => {
  const sectionId = resolveSectionId(label, extra.section_id);
  logEvaluareEvent({
    event_type: "click",
    section_id: sectionId,
    label,
    source: extra.source,
  });
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "evaluare_apartament_click", {
    event_category: "blog_pillar_hub",
    event_label: label,
    page_path: window.location.pathname,
    ...extra,
  });
};

/**
 * Fires a distinct GA4 event when an `#evaluare-*` section actually enters
 * the viewport (scroll-based view, not click). Deduped per anchor per session
 * via sessionStorage so refresh re-arms tracking but scroll up/down does not
 * spam events.
 */
const EVALUARE_VIEW_ANCHORS = [
  "evaluare-pret",
  "evaluare-metoda-comparativa",
  "evaluare-metoda-capitalizarii",
  "evaluare-factori-pret",
  "evaluare-formular",
] as const;

const useEvaluareSectionViewTracking = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    const sessionKey = "ga4_evaluare_section_viewed";
    let viewed: Set<string>;
    try {
      const raw = sessionStorage.getItem(sessionKey);
      viewed = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      viewed = new Set();
    }

    const persist = () => {
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(Array.from(viewed)));
      } catch {
        /* storage may be blocked — tracking still works in-memory */
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          if (!id || viewed.has(id)) continue;
          viewed.add(id);
          persist();
          logEvaluareEvent({
            event_type: "view",
            section_id: id,
            label: `view_${id}`,
            source: "scroll_intersection",
          });
          if (typeof window.gtag === "function") {
            window.gtag("event", "evaluare_apartament_view", {
              event_category: "blog_pillar_hub",
              event_label: `view_${id}`,
              section_id: id,
              page_path: window.location.pathname,
              source: "scroll_intersection",
            });
          }
          observer.unobserve(entry.target);
        }
      },
      { threshold: [0.5], rootMargin: "-30% 0px -30% 0px" }
    );

    const observed: Element[] = [];
    EVALUARE_VIEW_ANCHORS.forEach((id) => {
      if (viewed.has(id)) return;
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    });

    return () => observer.disconnect();
  }, []);
};
import { Link } from "react-router-dom";
import { TrendingUp, Calculator, Building2, MapPin, LineChart, Wallet, Home, Briefcase } from "lucide-react";

/**
 * BlogPillarHub
 * -------------
 * Restructures the long-form pillar content into a logical H2 → H3 hierarchy
 * and explicitly targets the missing-keyword opportunities identified in the
 * SEO audit (21.04.2026):
 *  - "evaluare apartament Timișoara preț"
 *  - "piața imobiliară Timișoara evoluție"
 *  - "randament chirie Timișoara"
 *
 * Includes a sticky Table of Contents (desktop) with active-section highlight
 * and inline ToC (mobile) for UX on long pages.
 */

type TocItem = { id: string; label: string };

const tocItems: TocItem[] = [
  { id: "piata-evolutie", label: "Evoluția pieței imobiliare Timișoara" },
  { id: "evaluare-pret", label: "Evaluare apartament Timișoara — preț corect" },
  { id: "randament-chirie", label: "Randament chirie Timișoara — clasic vs hotelier" },
  { id: "analiza-cartiere", label: "Analiza cartierelor din Timișoara" },
  { id: "ghiduri-proprietari", label: "Ghiduri pentru proprietari și investitori" },
];

/**
 * Tracks the currently visible section AND the closest sub-section by
 * comparing each observed element's distance to the top of the viewport
 * (offset by ~25% to account for the sticky header). This is more reliable
 * than picking max intersectionRatio when sections have different heights.
 */
const useActiveSection = (ids: string[]) => {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  const [manualLockId, setManualLockId] = useState<string | null>(null);

  // When the user clicks a TOC link, lock the active state briefly so it
  // doesn't flicker while the smooth scroll animation is running.
  const lockActive = useCallback((id: string) => {
    setActive(id);
    setManualLockId(id);
    window.setTimeout(() => setManualLockId(null), 800);
  }, []);

  useEffect(() => {
    const compute = () => {
      if (manualLockId) return;
      const offset = window.innerHeight * 0.25;
      let bestId = ids[0] ?? "";
      let bestDelta = Number.POSITIVE_INFINITY;
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // distance from the offset line; prefer sections whose top has crossed it
        const delta = rect.top - offset;
        // pick the section that has scrolled past the offset line and is closest to it
        if (delta <= 0 && Math.abs(delta) < bestDelta) {
          bestDelta = Math.abs(delta);
          bestId = id;
        }
      });
      setActive(bestId);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [ids, manualLockId]);

  return { active, lockActive };
};

const subAnchors: Record<string, { id: string; label: string }[]> = {
  "evaluare-pret": [
    { id: "evaluare-metoda-comparativa", label: "Metoda comparativă" },
    { id: "evaluare-metoda-capitalizarii", label: "Metoda capitalizării" },
    { id: "evaluare-factori-pret", label: "Factori care influențează prețul" },
    { id: "evaluare-formular", label: "Formular evaluare gratuită" },
  ],
};

const TocList = ({
  active,
  onJump,
}: {
  active: string;
  onJump: (id: string) => void;
}) => {
  // A section's sub-list is expanded when EITHER the section itself is active
  // OR one of its sub-anchors is the currently active id.
  const isExpanded = (sectionId: string) => {
    if (active === sectionId) return true;
    const subs = subAnchors[sectionId];
    return !!subs?.some((s) => s.id === active);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    onJump(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    // Distinct label per anchor for GA4 attribution
    if (id.startsWith("evaluare-")) {
      trackEvaluationEvent(`toc_${id}`, { source: "toc_sticky" });
    }
  };

  return (
    <ol className="space-y-1.5 text-sm">
      {tocItems.map((item, idx) => {
        const expanded = isExpanded(item.id);
        const isActive = active === item.id;
        const subs = subAnchors[item.id];
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              aria-current={isActive ? "true" : undefined}
              className={`block rounded-md border-l-2 px-3 py-1.5 transition-colors ${
                isActive
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              <span className="mr-1 text-xs opacity-60">{idx + 1}.</span>
              {item.label}
            </a>
            {expanded && subs && (
              <ul className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                {subs.map((s) => {
                  const subActive = active === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => handleClick(e, s.id)}
                        aria-current={subActive ? "true" : undefined}
                        className={`block rounded px-2 py-1 text-xs transition-colors ${
                          subActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        ↳ {s.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
};

const BlogPillarHub = () => {
  // Observe both parent sections AND their sub-anchors so the TOC reflects
  // exactly which subsection (e.g. "Formular evaluare gratuită") is in view.
  const allIds = useMemo(
    () => [
      ...tocItems.flatMap((i) => [i.id, ...(subAnchors[i.id]?.map((s) => s.id) ?? [])]),
    ],
    []
  );
  const { active, lockActive } = useActiveSection(allIds);

  // Fires GA4 view events the first time each #evaluare-* section
  // scrolls into view (separate from click tracking).
  useEvaluareSectionViewTracking();

  return (
    <section className="mb-12" aria-label="Ghid imobiliar Timișoara — hub conținut">
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Sticky ToC (desktop) */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Cuprins ghid imobiliar"
            className="sticky top-24 rounded-2xl border border-border bg-card/60 p-5 max-h-[calc(100vh-7rem)] overflow-y-auto"
          >
            <h2 className="text-base font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              Cuprins
            </h2>
            <TocList active={active} onJump={lockActive} />
          </nav>
        </aside>

        {/* Inline ToC (mobile/tablet) */}
        <nav
          aria-label="Cuprins ghid imobiliar (mobil)"
          className="mb-8 rounded-2xl border border-border bg-card/60 p-5 lg:hidden"
        >
          <h2 className="text-base font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-primary" />
            Cuprins — Ghid imobiliar Timișoara
          </h2>
          <TocList active={active} onJump={lockActive} />
        </nav>

        {/* Content sections */}
        <div className="space-y-10 min-w-0">
          {/* Section 1 — Piața imobiliară evoluție */}
          <article id="piata-evolutie" className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Evoluția pieței imobiliare Timișoara (2020–2026)
            </h2>
            <p className="text-muted-foreground mb-4">
              <strong>Piața imobiliară Timișoara</strong> a parcurs o <strong>evoluție</strong> remarcabilă în
              ultimii ani: prețurile medii pe metru pătrat au crescut cu 35–50% între 2020 și 2026,
              susținute de expansiunea hub-urilor industriale (Continental, Hella, Flex), dezvoltarea
              ansamblurilor moderne (ISHO, Openville, Atria Urban Resort) și cererea constantă pentru
              regim hotelier post-pandemic.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-1">Centru &amp; ISHO</h3>
                <p className="text-sm text-muted-foreground">
                  2.300–2.600 €/mp, apreciere 8–10% anual.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-1">Dumbrăvița &amp; Giroc</h3>
                <p className="text-sm text-muted-foreground">
                  1.800–2.100 €/mp, cerere ridicată din zona metropolitană.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-1">Mehala &amp; Ronaț</h3>
                <p className="text-sm text-muted-foreground">
                  1.300–1.500 €/mp, cele mai accesibile prețuri de intrare.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Vezi indicatorii live pe pagina{" "}
              <Link to="/piata-imobiliara-timisoara" className="text-primary hover:underline">
                Piața imobiliară Timișoara
              </Link>{" "}
              sau analiza completă în{" "}
              <Link to="/blog/ghid-investitii-imobiliare-timisoara-2026" className="text-primary hover:underline">
                Ghidul Investițiilor Imobiliare 2026
              </Link>
              .
            </p>
          </article>

          {/* Section 2 — Evaluare apartament preț */}
          <article id="evaluare-pret" className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              Evaluare apartament Timișoara — care este prețul corect?
            </h2>
            <p className="text-muted-foreground mb-4">
              <strong>Evaluarea unui apartament în Timișoara</strong> și stabilirea unui{" "}
              <strong>preț</strong> corect de vânzare sau cumpărare necesită analiza a 4 factori
              principali: zona, tipul de comfort, anul construcției și etajul. Folosim un model hibrid
              care combină prețul mediu pe mp din zonă cu ajustări pentru finisaje, vedere, dotări și
              potențialul de regim hotelier.
            </p>

            {/* Granular anchors for direct deep-linking */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div id="evaluare-metoda-comparativa" className="scroll-mt-24 rounded-xl border border-border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  <a
                    href="#evaluare-metoda-comparativa"
                    className="hover:text-primary"
                    onClick={() => trackEvaluationEvent("inline_metoda_comparativa", { source: "inline_anchor" })}
                  >
                    Metoda comparativă
                  </a>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analizăm 5–10 anunțuri active în raza de 500 m, ajustate pentru suprafață utilă,
                  etaj și finisaje. Util pentru stabilirea unui preț de listare realist.
                </p>
              </div>
              <div id="evaluare-metoda-capitalizarii" className="scroll-mt-24 rounded-xl border border-border bg-background p-4">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  <a
                    href="#evaluare-metoda-capitalizarii"
                    className="hover:text-primary"
                    onClick={() => trackEvaluationEvent("inline_metoda_capitalizarii", { source: "inline_anchor" })}
                  >
                    Metoda capitalizării
                  </a>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Calculăm valoarea pornind de la chiria potențială (clasică sau regim hotelier),
                  împărțită la rata de capitalizare a zonei (4–9%).
                </p>
              </div>
            </div>

            {/* Factors anchor */}
            <div id="evaluare-factori-pret" className="scroll-mt-24 mt-6 rounded-xl border border-border bg-card/40 p-4">
              <h3 className="text-base font-semibold text-foreground mb-2">
                <a
                  href="#evaluare-factori-pret"
                  className="hover:text-primary"
                  onClick={() => trackEvaluationEvent("inline_factori_pret", { source: "inline_anchor" })}
                >
                  Factori care influențează prețul
                </a>
              </h3>
              <ul className="grid gap-1.5 sm:grid-cols-2 text-sm text-muted-foreground list-disc list-inside">
                <li>Zona &amp; proximitate (UVT, Iulius Town, hub-uri industriale)</li>
                <li>Anul construcției &amp; clasă energetică</li>
                <li>Etaj, vedere, orientare, balcon</li>
                <li>Finisaje, mobilare, electrocasnice</li>
                <li>Parcare, lift, depozit</li>
                <li>Potențial regim hotelier (rating &amp; ocupare)</li>
              </ul>
            </div>

            {/* Direct CTA — link to free evaluation form */}
            <div
              id="evaluare-formular"
              className="scroll-mt-24 mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="text-lg font-serif font-semibold text-foreground mb-1">
                  Solicită evaluarea gratuită a apartamentului
                </h3>
                <p className="text-sm text-muted-foreground">
                  Răspuns în 24 h cu preț estimat, randament chirie și potențial regim hotelier.
                </p>
              </div>
              <Link
                to="/evaluare-gratuita#formular"
                onClick={() =>
                  trackEvaluationEvent("cta_formular_evaluare_gratuita", {
                    source: "blog_pillar_cta",
                    destination: "/evaluare-gratuita#formular",
                  })
                }
                className="shrink-0 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Completează formularul →
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Vezi și{" "}
              <Link to="/calculator-roi" className="text-primary hover:underline">
                Calculatorul ROI
              </Link>{" "}
              pentru o estimare rapidă a randamentului.
            </p>
          </article>


          {/* Section 3 — Randament chirie */}
          <article id="randament-chirie" className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" />
              Randament chirie Timișoara — clasic vs regim hotelier
            </h2>
            <p className="text-muted-foreground mb-4">
              <strong>Randamentul chiriei în Timișoara</strong> diferă semnificativ în funcție de
              modelul ales. <strong>Chiria clasică</strong> (lunară, contract pe termen lung) oferă un
              randament brut de 4–6% anual și implică risc redus, dar venit limitat.{" "}
              <strong>Regimul hotelier</strong> administrat profesional generează 9.4% net verificat,
              cu un multiplicator de 1.6–2.5x față de chiria clasică.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border bg-background">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3 font-semibold text-foreground">Model</th>
                    <th className="p-3 font-semibold text-foreground">Randament brut</th>
                    <th className="p-3 font-semibold text-foreground">Randament net</th>
                    <th className="p-3 font-semibold text-foreground">Risc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 text-muted-foreground">Chirie clasică</td>
                    <td className="p-3 text-muted-foreground">5–7%</td>
                    <td className="p-3 text-muted-foreground">4–6%</td>
                    <td className="p-3 text-muted-foreground">Scăzut</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-muted-foreground">Regim hotelier (auto-administrat)</td>
                    <td className="p-3 text-muted-foreground">10–14%</td>
                    <td className="p-3 text-muted-foreground">6–8%</td>
                    <td className="p-3 text-muted-foreground">Mediu / mare timp investit</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-foreground font-medium">Regim hotelier RealTrust</td>
                    <td className="p-3 text-foreground font-medium">12–16%</td>
                    <td className="p-3 text-primary font-semibold">9.4% verificat</td>
                    <td className="p-3 text-muted-foreground">Scăzut (full-service)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Calculează propriul randament cu{" "}
              <Link to="/calculator-roi" className="text-primary hover:underline">
                Calculatorul ROI
              </Link>{" "}
              sau citește{" "}
              <Link to="/blog/ghid-investitii-imobiliare-timisoara-2026" className="text-primary hover:underline">
                ghidul complet de investiții 2026
              </Link>
              .
            </p>
          </article>

          {/* Section 4 — Analiza cartierelor */}
          <article id="analiza-cartiere" className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              Analiza cartierelor din Timișoara
            </h2>
            <p className="text-muted-foreground mb-4">
              Fiecare cartier are propriul profil de investiție. Mai jos găsești sub-pagini dedicate
              pentru cele mai active zone, fiecare cu prețuri actualizate, randamente estimate și
              listări active.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {[
                { slug: "centru", name: "Apartamente Centru" },
                { slug: "iosefin", name: "Apartamente Iosefin" },
                { slug: "fabric", name: "Apartamente Fabric" },
                { slug: "elisabetin", name: "Apartamente Elisabetin" },
                { slug: "complex-studentesc", name: "Complex Studențesc" },
                { slug: "dumbravita", name: "Dumbrăvița" },
                { slug: "giroc", name: "Giroc" },
                { slug: "aradului", name: "Calea Aradului" },
                { slug: "lipovei", name: "Lipovei" },
              ].map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/imobiliare-timisoara/${c.slug}`}
                    className="block rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <h3 className="text-sm font-medium inline">{c.name}</h3>
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          {/* Section 5 — Ghiduri proprietari */}
          <article id="ghiduri-proprietari" className="scroll-mt-24">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              Ghiduri pentru proprietari și investitori
            </h2>
            <p className="text-muted-foreground mb-4">
              Resurse practice pentru deciziile zilnice: fiscalitate, prețuri dinamice, marketing
              listări și gestionarea oaspeților.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to="/pentru-proprietari"
                className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition-colors"
              >
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" /> Servicii pentru proprietari
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Administrare full-service, comision 2%, randament 9.4% net.
                </p>
              </Link>
              <Link
                to="/catalog-investitii"
                className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition-colors"
              >
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Catalog investiții 2026
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Proprietăți pre-evaluate cu ROI și capital necesar.
                </p>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default BlogPillarHub;
