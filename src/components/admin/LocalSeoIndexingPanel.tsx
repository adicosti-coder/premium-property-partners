import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { safeLocalStorage } from "@/utils/browserStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Search, Radio, MapPin, RefreshCcw, Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";

interface PingRow {
  id: string;
  created_at: string;
  url: string;
  http_status: number | null;
  success: boolean;
  triggered_by: string | null;
  batch_size: number;
  error: string | null;
  actual_indexing_status?: "pending" | "indexed" | "missing" | null;
  last_verified_at?: string | null;
}

interface KeywordRow {
  zone: string;
  keywords: string[];
}

const NEIGHBORHOODS: KeywordRow[] = [
  // Cartiere centrale & istorice
  { zone: "Cetate / Centru", keywords: ["cetate", "centru istoric", "piata unirii", "piața unirii", "paltim", "fructus"] },
  { zone: "Iosefin", keywords: ["iosefin", "isho", "sinagoga"] },
  { zone: "Fabric", keywords: ["fabric", "piata traian", "millennium"] },
  { zone: "Elisabetin", keywords: ["elisabetin"] },
  { zone: "Take Ionescu", keywords: ["take ionescu", "take-ionescu", "helios"] },
  { zone: "Tipografilor", keywords: ["tipografilor"] },
  // Cartiere periferice nord
  { zone: "Dumbrăvița", keywords: ["dumbravita", "dumbrăvița", "vivalia"] },
  { zone: "Aradului", keywords: ["aradului", "calea aradului", "xcity", "nord one"] },
  { zone: "Mehala", keywords: ["mehala"] },
  { zone: "Lipovei", keywords: ["lipovei", "calea lipovei"] },
  { zone: "Torontalului", keywords: ["torontalului", "calea torontalului"] },
  { zone: "Ronat", keywords: ["ronat"] },
  { zone: "Bucovina", keywords: ["bucovina"] },
  // Cartiere sud & est
  { zone: "Girocului", keywords: ["girocului", "calea girocului"] },
  { zone: "Șagului", keywords: ["sagului", "șagului", "calea sagului"] },
  { zone: "Soarelui", keywords: ["soarelui"] },
  { zone: "Circumvalațiunii / Mara", keywords: ["circumvalatiunii", "circumvalațiunii", "city of mara", "mara"] },
  { zone: "Complex Studențesc", keywords: ["complex studentesc", "complex studențesc"] },
  { zone: "Olimpia / Stadion", keywords: ["olimpia", "stadion"] },
  { zone: "Plopi", keywords: ["plopi"] },
  { zone: "Blașcovici", keywords: ["blascovici", "blașcovici"] },
  { zone: "Freidorf", keywords: ["freidorf"] },
  // Zone periurbane
  { zone: "Ghiroda", keywords: ["ghiroda", "denya"] },
  { zone: "Moșnița Nouă", keywords: ["mosnita", "moșnița"] },
  { zone: "Remetea Mare", keywords: ["remetea"] },
  { zone: "Chișoda", keywords: ["chisoda", "chișoda"] },
  { zone: "Săcălaz", keywords: ["sacalaz", "săcălaz"] },
  // Complexe rezidențiale noi (cross-listed)
  { zone: "Complex: ISHO", keywords: ["isho"] },
  { zone: "Complex: Paltim", keywords: ["paltim"] },
  { zone: "Complex: City of Mara", keywords: ["city of mara", "city-of-mara"] },
  { zone: "Complex: Fructus Plaza", keywords: ["fructus", "fructus plaza"] },
  { zone: "Complex: Vivalia", keywords: ["vivalia"] },
  { zone: "Complex: Ateneo", keywords: ["ateneo"] },
  { zone: "Complex: Iris", keywords: ["iris"] },
  { zone: "Complex: Adora Forest", keywords: ["adora forest", "adora"] },
  { zone: "Complex: Nord One", keywords: ["nord one"] },
  { zone: "Complex: Monarch", keywords: ["monarch"] },
  { zone: "Complex: Vox Vertical Village", keywords: ["vox vertical", "vox vertical village"] },
  { zone: "Complex: Uranus Plaza", keywords: ["uranus plaza", "uranus"] },
  { zone: "Complex: X City Oasis", keywords: ["x city", "xcity", "x-city oasis"] },
];

const STORAGE_KEY = "local-seo-keyword-checklist-v1";

export default function LocalSeoIndexingPanel() {
  const [pings, setPings] = useState<PingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordCoverage, setKeywordCoverage] = useState<Record<string, { count: number; sample: string[] }>>({});
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [doneChecklist, setDoneChecklist] = useState<Record<string, boolean>>({});
  const [resubmitting, setResubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setDoneChecklist(JSON.parse(saved)); } catch { /* noop */ }
    }
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(doneChecklist));
  }, [doneChecklist]);

  const loadPings = useCallback(async () => {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("indexnow_pings")
      .select("id,created_at,url,http_status,success,triggered_by,batch_size,error,actual_indexing_status,last_verified_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50);
    setPings((data as PingRow[]) || []);
    setLoading(false);
  }, []);

  const loadKeywordCoverage = useCallback(async () => {
    setCoverageLoading(true);
    // Pull recent active properties' locations and titles, then score each zone.
    const { data } = await supabase
      .from("properties")
      .select("name,location,description_ro")
      .eq("is_active", true)
      .order("imported_at", { ascending: false, nullsFirst: false })
      .limit(300);
    const all = (data as any[]) || [];
    const cov: Record<string, { count: number; sample: string[] }> = {};
    for (const row of NEIGHBORHOODS) {
      const matches = all.filter((p) => {
        const hay = `${p.location || ""} ${p.name || ""} ${p.description_ro || ""}`.toLowerCase();
        return row.keywords.some((k) => hay.includes(k.toLowerCase()));
      });
      cov[row.zone] = {
        count: matches.length,
        sample: matches.slice(0, 3).map((m) => m.name || m.location || "—"),
      };
    }
    setKeywordCoverage(cov);
    setCoverageLoading(false);
  }, []);

  useEffect(() => {
    loadPings();
    loadKeywordCoverage();
    const channel = supabase
      .channel("rt-indexnow")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "indexnow_pings" },
        (payload) => {
          setPings((prev) => [payload.new as PingRow, ...prev].slice(0, 50));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPings, loadKeywordCoverage]);

  const stats = useMemo(() => {
    const total = pings.length;
    const successful = pings.filter((p) => p.success).length;
    const failed = total - successful;
    const uniqueUrls = new Set(pings.filter((p) => p.success).map((p) => p.url)).size;
    return { total, successful, failed, uniqueUrls };
  }, [pings]);

  // AUDIT: complexes with 0 listings OR a failed IndexNow ping in the last 7 days.
  const auditAlerts = useMemo(() => {
    const failedUrlSlugs = new Set(
      pings.filter((p) => !p.success).map((p) => {
        const m = p.url.match(/\/complexe\/([a-z0-9-]+)/i);
        return m ? m[1].toLowerCase() : "";
      }).filter(Boolean),
    );
    return NEIGHBORHOODS
      .filter((row) => row.zone.startsWith("Complex:"))
      .map((row) => {
        const count = keywordCoverage[row.zone]?.count ?? 0;
        const slug = row.zone.replace("Complex:", "").trim().toLowerCase()
          .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const pingFailed = failedUrlSlugs.has(slug);
        const zeroListings = !coverageLoading && count === 0;
        return { zone: row.zone, count, pingFailed, zeroListings };
      })
      .filter((a) => a.zeroListings || a.pingFailed);
  }, [keywordCoverage, coverageLoading, pings]);


  const resubmitHubs = useCallback(async () => {
    setResubmitting(true);
    const urls = [
      "/",
      "/ansambluri-rezidentiale",
      "/complexe/isho",
      "/complexe/paltim",
      "/complexe/fructus-plaza",
      "/complexe/city-of-mara",
      "/proprietati",
    ];
    try {
      await supabase.functions.invoke("indexnow-notify", {
        body: { urls, triggered_by: "growth_dashboard_manual" },
      });
      toast.success("Hub-urile premium au fost re-trimise");
    } finally {
      setResubmitting(false);
      loadPings();
    }
  }, [loadPings]);

  const verifyIndexing = useCallback(async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("indexnow-verify-and-reindex", {
        body: { action: "verify", limit: 25 },
      });
      if (error) throw error;
      const indexed = (data as any)?.results?.filter((r: any) => r.status === "indexed").length ?? 0;
      const missing = (data as any)?.results?.filter((r: any) => r.status === "missing").length ?? 0;
      toast.success(`Verificare completă: ${indexed} indexate, ${missing} lipsă`);
    } catch (e) {
      toast.error("Eroare la verificare: " + (e as Error).message);
    } finally {
      setVerifying(false);
      loadPings();
    }
  }, [loadPings]);

  const resubmitSingle = useCallback(async (ping: PingRow) => {
    setResubmittingId(ping.id);
    try {
      await supabase.functions.invoke("indexnow-notify", {
        body: { urls: [ping.url], triggered_by: "admin_retry_failed" },
      });
      toast.success("URL re-trimis la IndexNow");
    } finally {
      setResubmittingId(null);
      loadPings();
    }
  }, [loadPings]);

  // Failed pings on hot zones (premium hubs) in the last 7 days — require attention.
  const failedHotZonePings = useMemo(() => {
    const hotKeywords = ["isho", "paltim", "city-of-mara", "fructus", "vivalia", "monarch", "vox-vertical", "ateneo"];
    return pings.filter((p) =>
      !p.success && hotKeywords.some((k) => p.url.toLowerCase().includes(k)),
    ).slice(0, 8);
  }, [pings]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Local SEO Traffic &amp; Indexing
            </CardTitle>
            <CardDescription>
              IndexNow ping live către Bing, Yandex și Seznam la fiecare aprobare de anunț + densitate de cuvinte cheie pe zonele Timișoarei.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={verifyIndexing} disabled={verifying} className="gap-1">
              {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
              Verifică indexare reală
            </Button>
            <Button size="sm" variant="outline" onClick={resubmitHubs} disabled={resubmitting} className="gap-1">
              {resubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
              Re-trimite hub-urile premium
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Pings 7 zile</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-md border p-3 border-emerald-500/30">
            <div className="text-xs text-muted-foreground">Reușite</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.successful}</div>
          </div>
          <div className="rounded-md border p-3 border-rose-500/30">
            <div className="text-xs text-muted-foreground">Eșuate</div>
            <div className="text-2xl font-bold text-rose-600">{stats.failed}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">URL-uri unice indexate</div>
            <div className="text-2xl font-bold">{stats.uniqueUrls}</div>
          </div>
        </div>

        {/* Atenție necesară — failed pings on hot zones */}
        {failedHotZonePings.length > 0 && (
          <div className="rounded-md border-2 border-rose-500/50 bg-rose-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              Atenție necesară — {failedHotZonePings.length} ping eșuat pe zone fierbinți
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {failedHotZonePings.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span className="font-mono truncate flex-1" title={p.url}>
                    {p.url.replace("https://www.realtrust.ro", "")}
                  </span>
                  {p.http_status && <Badge variant="destructive">HTTP {p.http_status}</Badge>}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 gap-1"
                    onClick={() => resubmitSingle(p)}
                    disabled={resubmittingId === p.id}
                  >
                    {resubmittingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Retry
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audit alerts */}
        {auditAlerts.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Audit acoperire complexe — {auditAlerts.length} {auditAlerts.length === 1 ? "alertă" : "alerte"}
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {auditAlerts.map((a) => (
                <li key={a.zone} className="flex items-center gap-2">
                  <span className="font-medium">{a.zone.replace("Complex: ", "")}</span>
                  {a.zeroListings && <Badge variant="destructive">0 anunțuri</Badge>}
                  {a.pingFailed && <Badge variant="outline" className="border-rose-500/40 text-rose-600">IndexNow eșuat</Badge>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Acțiune recomandată: rulează scraping țintit pe complexele cu 0 anunțuri și re-trimite hub-urile premium pentru ping-urile eșuate.
            </p>
          </div>
        )}

        {/* Recent pings list */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Search className="h-4 w-4" /> Ultimele ping-uri IndexNow
          </h4>
          <div className="border rounded max-h-56 overflow-auto divide-y text-xs">
            {loading ? (
              <div className="p-3 text-muted-foreground">Se încarcă…</div>
            ) : pings.length === 0 ? (
              <div className="p-3 text-muted-foreground">
                Niciun ping în ultimele 7 zile. Aprobă un anunț din Fast Review sau folosește butonul „Re-trimite hub-urile premium”.
              </div>
            ) : (
              pings.slice(0, 20).map((p) => (
                <div key={p.id} className="p-2 flex items-center gap-2">
                  {p.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  )}
                  <span className="font-mono truncate max-w-[260px]" title={p.url}>{p.url.replace("https://www.realtrust.ro", "")}</span>
                  {p.http_status && <Badge variant="outline">HTTP {p.http_status}</Badge>}
                  {p.triggered_by && <Badge variant="secondary">{p.triggered_by}</Badge>}
                  {p.actual_indexing_status === "indexed" && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700">indexat</Badge>
                  )}
                  {p.actual_indexing_status === "missing" && (
                    <Badge variant="destructive">lipsă</Badge>
                  )}
                  {p.actual_indexing_status === "pending" && (
                    <Badge variant="outline" className="text-muted-foreground">neverificat</Badge>
                  )}
                  <span className="ml-auto text-muted-foreground">{new Date(p.created_at).toLocaleString("ro-RO")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Keyword coverage by neighborhood */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <MapPin className="h-4 w-4" /> Densitate cuvinte cheie pe zone (anunțuri active)
          </h4>
          <div className="grid md:grid-cols-2 gap-2">
            {NEIGHBORHOODS.map((row) => {
              const c = keywordCoverage[row.zone];
              const count = c?.count ?? 0;
              const tone = count >= 5 ? "emerald" : count >= 2 ? "amber" : "rose";
              const checked = !!doneChecklist[row.zone];
              return (
                <div
                  key={row.zone}
                  className={`rounded-md border p-3 flex items-start gap-3 ${
                    tone === "emerald" ? "border-emerald-500/30" :
                    tone === "amber" ? "border-amber-500/30" :
                    "border-rose-500/30"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setDoneChecklist((prev) => ({ ...prev, [row.zone]: !!v }))}
                    aria-label={`Marcheaza ${row.zone} ca verificat`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.zone}</span>
                      <Badge variant={tone === "emerald" ? "default" : tone === "amber" ? "secondary" : "destructive"}>
                        {coverageLoading ? "…" : `${count} anunțuri`}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Cuvinte: <span className="font-mono">{row.keywords.join(", ")}</span>
                    </div>
                    {c && c.sample.length > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-1 italic line-clamp-2">
                        Ex: {c.sample.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Zonele cu &lt; 2 anunțuri au densitate redusă — prioritizează scraping/scoring pentru ele.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
