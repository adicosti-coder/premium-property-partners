import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeLocalStorage } from "@/utils/browserStorage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, TrendingUp, AlertTriangle, PhoneCall, Filter, Sparkles, Target, RefreshCcw, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import VoiceLatencyMonitor from "./VoiceLatencyMonitor";
import LocalSeoIndexingPanel from "./LocalSeoIndexingPanel";



interface Metrics {
  // Voice / Andrei
  totalCalls7d: number;
  conversions7d: number;        // appointments or positive outcomes
  conversionRate: number;       // %
  avgCallDurationSec: number;
  avgClarityScore: number | null;
  // Sanitizer / prospect funnel
  prospectsTotal7d: number;
  prospectsRejected7d: number;
  rejectionRate: number;        // %
  ownerVsAgencyRatio: { owner: number; agency: number };
  // Edge cases
  edgeCaseOverrides: { id: string; title: string | null; category: string | null; note: string | null }[];
  openRejectionAlerts: number;
  // Local hot zones (Timișoara)
  hotZones: { zone: string; count: number }[];
}

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "seo-isho", label: "SEO local: pagini optimizate pentru ISHO / Paltim / Mara", hint: "title+H1+JSON-LD pe fiecare ansamblu major", done: false },
  { id: "seo-zone", label: "SEO zone: Cetate, Iosefin, Fabric, Dumbrăvița, Aradului", hint: "landing/cluster /zone/<slug> cu InternalLink graph", done: false },
  { id: "pms-sync", label: "Automatizare PMS: sync zilnic Smoobu → properties", hint: "edge func cron 04:00 + reconcile", done: false },
  { id: "watermark", label: "Watermark RealTrust automat la upload", hint: "edge func dewatermark.ai + overlay logo gold", done: false },
  { id: "andrei-script", label: "Andrei: script de calificare regim hotelier vs vânzare", hint: "prompt tuning + lexicon RO actualizat", done: false },
  { id: "regex-loose", label: "Praguri regex calibrate pe ultimele 14 zile", hint: "export JSON din Mod Simulare Keyword → edge func", done: false },
  { id: "gsc-indexnow", label: "IndexNow trigger pe publicare proprietăți noi", hint: "edge func indexnow-submit pe webhook DB", done: false },
  { id: "review-9-7", label: "Score reputație 9.7/10 sincronizat pe homepage + footer", hint: "Booking + Google Place ID", done: false },
];

const STORAGE_KEY = "growth-engine-checklist-v1";

export default function GrowthEngineDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  // Load checklist from storage
  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { id: string; done: boolean }[];
        setChecklist((prev) =>
          prev.map((it) => ({ ...it, done: parsed.find((p) => p.id === it.id)?.done ?? false })),
        );
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(checklist.map((c) => ({ id: c.id, done: c.done }))));
  }, [checklist]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Voice calls 7d
      const { data: calls } = await supabase
        .from("voice_call_sessions")
        .select("id, ai_outcome, appointment_scheduled_at, call_duration_seconds, clarity_score, status")
        .gte("created_at", sinceIso)
        .limit(1000);

      const total = calls?.length ?? 0;
      const conversions = (calls ?? []).filter(
        (c: any) =>
          !!c.appointment_scheduled_at ||
          (typeof c.ai_outcome === "string" && /interes|programat|callback|positive|interested/i.test(c.ai_outcome)),
      ).length;
      const durations = (calls ?? []).map((c: any) => c.call_duration_seconds).filter((n: any) => typeof n === "number" && n > 0);
      const avgDur = durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;
      const clarityVals = (calls ?? []).map((c: any) => c.clarity_score).filter((n: any) => typeof n === "number");
      const avgClarity = clarityVals.length ? Math.round(clarityVals.reduce((a: number, b: number) => a + b, 0) / clarityVals.length) : null;

      // Prospects 7d
      const { data: prospects } = await supabase
        .from("prospect_listings")
        .select("id, title, zone, status, lifecycle_status, prospect_type, admin_notes, category, tags")
        .gte("created_at", sinceIso)
        .limit(2000);

      const pTotal = prospects?.length ?? 0;
      const pRejected = (prospects ?? []).filter(
        (p: any) => p.status === "rejected" || p.lifecycle_status === "rejected",
      ).length;
      const owner = (prospects ?? []).filter((p: any) => p.prospect_type === "proprietar").length;
      const agency = (prospects ?? []).filter((p: any) => p.prospect_type !== "proprietar").length;

      // Edge cases: override or manual reclassification
      const edgeCases = (prospects ?? [])
        .filter(
          (p: any) =>
            (Array.isArray(p.tags) && p.tags.some((t: string) => t.startsWith("override:"))) ||
            (typeof p.admin_notes === "string" && /category_override|manual-confirm|reclassified/i.test(p.admin_notes)),
        )
        .slice(0, 8)
        .map((p: any) => ({
          id: p.id as string,
          title: (p.title as string | null) ?? null,
          category: (p.category as string | null) ?? null,
          note: typeof p.admin_notes === "string" ? p.admin_notes.slice(0, 140) : null,
        }));

      // Hot zones
      const zoneMap = new Map<string, number>();
      (prospects ?? []).forEach((p: any) => {
        const z = (p.zone || "").trim();
        if (!z) return;
        zoneMap.set(z, (zoneMap.get(z) ?? 0) + 1);
      });
      const hotZones = Array.from(zoneMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([zone, count]) => ({ zone, count }));

      // Open rejection alerts
      const { count: alertCount } = await supabase
        .from("prospect_rejection_alerts")
        .select("id", { head: true, count: "exact" })
        .eq("status", "open");

      setMetrics({
        totalCalls7d: total,
        conversions7d: conversions,
        conversionRate: total > 0 ? Math.round((conversions / total) * 1000) / 10 : 0,
        avgCallDurationSec: avgDur,
        avgClarityScore: avgClarity,
        prospectsTotal7d: pTotal,
        prospectsRejected7d: pRejected,
        rejectionRate: pTotal > 0 ? Math.round((pRejected / pTotal) * 1000) / 10 : 0,
        ownerVsAgencyRatio: { owner, agency },
        edgeCaseOverrides: edgeCases,
        openRejectionAlerts: alertCount ?? 0,
        hotZones,
      });
    } catch (e: any) {
      toast({ title: "Eroare la încărcarea metricilor", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetrics(); }, []);

  const generatedPrompt = useMemo(() => {
    if (!metrics) return "";
    const open = checklist.filter((c) => !c.done);
    const done = checklist.filter((c) => c.done);
    const topZones = metrics.hotZones.map((h) => `${h.zone} (${h.count})`).join(", ") || "—";
    const lines: string[] = [];
    lines.push("# Upgrade Prompt pentru Lovable — realtrust.ro (Timișoara)");
    lines.push("");
    lines.push("Context: agenție imobiliară premium + operator regim hotelier în Timișoara. Obiectiv: lider local pe segmentele vânzare premium și hotelier.");
    lines.push("");
    lines.push("## Semnale live (ultimele 7 zile)");
    lines.push(`- Andrei: ${metrics.totalCalls7d} apeluri, ${metrics.conversions7d} conversii (${metrics.conversionRate}%), durată medie ${metrics.avgCallDurationSec}s${metrics.avgClarityScore !== null ? `, clarity ${metrics.avgClarityScore}` : ""}.`);
    lines.push(`- Prospecți noi: ${metrics.prospectsTotal7d}, respinși de sanitizer/filtru: ${metrics.prospectsRejected7d} (${metrics.rejectionRate}%).`);
    lines.push(`- Mix prospect_type: proprietari=${metrics.ownerVsAgencyRatio.owner} vs agenții=${metrics.ownerVsAgencyRatio.agency}.`);
    lines.push(`- Alerte respingere deschise: ${metrics.openRejectionAlerts}.`);
    lines.push(`- Zone fierbinți TM: ${topZones}.`);
    lines.push("");
    if (metrics.edgeCaseOverrides.length > 0) {
      lines.push("## Edge cases — categoria a fost re-rutată manual (regex a greșit)");
      metrics.edgeCaseOverrides.forEach((e) => {
        lines.push(`- "${(e.title || "(fără titlu)").slice(0, 80)}" → categorie finală: ${e.category ?? "?"} | notă: ${e.note ?? "—"}`);
      });
      lines.push("");
      lines.push("→ Acțiune: deschide Mod Simulare Keyword (radar subtab), re-rulează cele 8 preseturi, recalibrează regex-urile rose/sky/violet astfel încât exemplele de mai sus să nu mai forțeze override. Exportă noua configurație JSON și înlocuiește pattern-urile din edge function `scrape-prospects` / `simulate-prospect-routing`.");
      lines.push("");
    }
    if (metrics.rejectionRate > 25) {
      lines.push(`> ⚠ Rata de respingere ${metrics.rejectionRate}% este peste 25%. Slăbește pragul "loose" pentru închiriere / hotelier și verifică blocklist-ul de agenții pe ultimele 7 zile.`);
      lines.push("");
    }
    if (metrics.conversionRate < 15 && metrics.totalCalls7d >= 5) {
      lines.push(`> ⚠ Conversia Andrei ${metrics.conversionRate}% sub țintă (15%). Rafinează scriptul de calificare în voice-agent-context: deschidere mai scurtă, întrebare ancoră despre zona+preț în primele 20s, mențiune explicită ROI 9.4% net regim hotelier.`);
      lines.push("");
    }
    lines.push("## Obiective strategice nerealizate (forțează implementarea acum)");
    if (open.length === 0) {
      lines.push("- (toate bifate — propune 3 obiective noi de growth: A/B test hero, micro-CTA pe property cards, badge \"verified by RealTrust\" pe fiecare listing)");
    } else {
      open.forEach((c) => lines.push(`- [ ] ${c.label} — ${c.hint}`));
    }
    if (done.length > 0) {
      lines.push("");
      lines.push("## Deja livrate (nu rescrie, doar conservă)");
      done.forEach((c) => lines.push(`- [x] ${c.label}`));
    }
    lines.push("");
    lines.push("## Instrucțiuni pentru Lovable");
    lines.push("1. Folosește datele de mai sus pentru a propune modificări CONCRETE de cod (fișiere + funcții).");
    lines.push("2. Prioritizează refactor-uri care reduc rata de respingere și cresc conversia Andrei.");
    lines.push("3. Orice modificare la regex sau sanitizer trebuie reflectată simultan în `QuickKeywordSimulator.tsx` (DEFAULT_*) și în edge functions backend, ca să rămână în sincron.");
    lines.push("4. Respectă regulile din memory: Timișoara only, brand RealTrust (Blue/Gold), ROI 9.4% net, fără dark patterns, no stock photos locale.");
    lines.push("5. Răspunde cu un plan scurt + diff-uri minimale pe fișierele existente, nu rescrieri complete.");
    return lines.join("\n");
  }, [metrics, checklist]);

  const copyPrompt = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      toast({ title: "Prompt copiat", description: "Lipește-l direct în chat-ul Lovable pentru optimizare." });
    } catch {
      toast({ title: "Eroare clipboard", description: "Copiază manual din consolă.", variant: "destructive" });
      console.log(generatedPrompt);
    }
  };

  const toggleItem = (id: string) =>
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  const Stat = ({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "good" | "warn" | "bad" }) => (
    <div className={`rounded-md border p-3 bg-background/60 ${
      tone === "good" ? "border-emerald-500/40" : tone === "warn" ? "border-amber-500/40" : tone === "bad" ? "border-rose-500/40" : ""
    }`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <VoiceLatencyMonitor />
      <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-primary/5 to-transparent">

      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Growth Engine Dashboard
            </CardTitle>
            <CardDescription>
              Optimizare continuă realtrust.ro — lider Timișoara pe agenție premium + regim hotelier.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadMetrics} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
            Reîncarcă
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* === Analytics Hub === */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Centralizator de Performanță & Semnale (7 zile)
          </h3>
          {loading || !metrics ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Încarc metrici…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat
                  label="Conversie Andrei"
                  value={`${metrics.conversionRate}%`}
                  hint={`${metrics.conversions7d}/${metrics.totalCalls7d} apeluri`}
                  tone={metrics.conversionRate >= 15 ? "good" : metrics.totalCalls7d >= 5 ? "warn" : undefined}
                />
                <Stat
                  label="Rată respingere"
                  value={`${metrics.rejectionRate}%`}
                  hint={`${metrics.prospectsRejected7d}/${metrics.prospectsTotal7d} prospecți`}
                  tone={metrics.rejectionRate > 25 ? "bad" : metrics.rejectionRate > 15 ? "warn" : "good"}
                />
                <Stat
                  label="Durată medie apel"
                  value={`${metrics.avgCallDurationSec}s`}
                  hint={metrics.avgClarityScore !== null ? `clarity ${metrics.avgClarityScore}/100` : "—"}
                />
                <Stat
                  label="Owner vs Agenție"
                  value={`${metrics.ownerVsAgencyRatio.owner} / ${metrics.ownerVsAgencyRatio.agency}`}
                  hint="prospect_type"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border bg-background/60 p-2.5">
                  <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1">
                    <PhoneCall className="h-3.5 w-3.5" /> Zone fierbinți (din prospecți)
                  </div>
                  {metrics.hotZones.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">Nu există zone detectate încă.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {metrics.hotZones.map((h) => (
                        <Badge key={h.zone} variant="secondary" className="text-[10px]">
                          {h.zone} <span className="ml-1 opacity-70">×{h.count}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
                  <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Edge Cases — rutare manuală post-sanitizer
                  </div>
                  {metrics.edgeCaseOverrides.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">
                      Niciun caz cu override detectat. Sanitizer-ul ține pasul.
                    </div>
                  ) : (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {metrics.edgeCaseOverrides.map((e) => (
                        <li key={e.id} className="text-[10px] font-mono leading-tight">
                          <span className="text-foreground">{(e.title || "(fără titlu)").slice(0, 60)}</span>{" "}
                          <span className="text-amber-700 dark:text-amber-400">→ {e.category ?? "?"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    Alerte respingere deschise: <strong>{metrics.openRejectionAlerts}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* === Growth Checklist === */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Target className="h-3.5 w-3.5" /> Growth Checklist — obiective Timișoara
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {checklist.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-2 rounded border p-2 transition ${
                  c.done ? "bg-emerald-500/5 border-emerald-500/30" : "bg-background/60"
                }`}
              >
                <Checkbox checked={c.done} onCheckedChange={() => toggleItem(c.id)} className="mt-0.5" />
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${c.done ? "line-through opacity-70" : ""}`}>{c.label}</div>
                  <div className="text-[10px] text-muted-foreground">{c.hint}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="text-[10px] text-muted-foreground">
            Obiectivele nebifate sunt incluse automat în promptul generat mai jos.
          </div>
        </section>

        {/* === Auto-Optimization Prompt Generator === */}
        <section className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Auto-Optimization Prompt Generator
            </h3>
            <Button onClick={copyPrompt} disabled={!generatedPrompt} size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Generează Upgrade Prompt pentru Lovable
            </Button>
          </div>
          {generatedPrompt ? (
            <pre className="rounded-md border bg-black/85 text-emerald-300 p-3 text-[10px] font-mono whitespace-pre-wrap max-h-80 overflow-y-auto">
              {generatedPrompt}
            </pre>
          ) : (
            <div className="text-[11px] text-muted-foreground italic">Așteaptă încărcarea metricilor pentru a genera promptul…</div>
          )}
        </section>
      </CardContent>
    </Card>
    </div>
  );
}

