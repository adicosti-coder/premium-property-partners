import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, FlaskConical, Save, Settings2, ShieldAlert, ShieldCheck, AlertCircle, Archive } from "lucide-react";
import { toast } from "sonner";
import { useAgencyDetectionSettings, useAgencyKeywords } from "@/hooks/useAgencyDetectionSettings";

type KwType = "hard" | "soft" | "owner";

const TYPE_META: Record<KwType, { label: string; tone: string; desc: string; icon: any }> = {
  hard: {
    label: "Hard Keywords",
    tone: "border-red-400 text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20",
    desc: "Marchează automat lead-ul ca AGENȚIE (blocare imediată).",
    icon: ShieldAlert,
  },
  soft: {
    label: "Soft Keywords",
    tone: "border-orange-400 text-orange-700 dark:text-orange-300 bg-orange-50/50 dark:bg-orange-950/20",
    desc: "Cresc nivelul de suspiciune fără a bloca direct.",
    icon: AlertCircle,
  },
  owner: {
    label: "Owner Signals",
    tone: "border-green-400 text-green-700 dark:text-green-300 bg-green-50/50 dark:bg-green-950/20",
    desc: "Protejează lead-ul (forțează clasificarea ca proprietar).",
    icon: ShieldCheck,
  },
};

export const AgencyDetectionSettings = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading: loadingSettings } = useAgencyDetectionSettings();
  const { data: keywords = [], isLoading: loadingKw } = useAgencyKeywords();

  const [draft, setDraft] = useState<{
    suspicion_threshold: number;
    multi_listing_threshold: number;
    multi_listing_window_days: number;
    enabled: boolean;
  } | null>(null);

  const current = draft ?? settings ?? null;
  const dirty = draft !== null && settings !== undefined && (
    draft.suspicion_threshold !== settings.suspicion_threshold ||
    draft.multi_listing_threshold !== settings.multi_listing_threshold ||
    draft.multi_listing_window_days !== settings.multi_listing_window_days ||
    draft.enabled !== settings.enabled
  );

  const set = (patch: Partial<NonNullable<typeof draft>>) => {
    setDraft({ ...(draft ?? settings!), ...patch });
  };

  const saveSettings = async () => {
    if (!draft) return;
    const { error } = await supabase
      .from("agency_detection_settings" as any)
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) {
      toast.error("Salvare eșuată: " + error.message);
      return;
    }
    toast.success("Setări salvate global ✅");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["agency-detection-settings"] });
  };

  // Test mode ─────────────────────────────────────────
  const [testProspectId, setTestProspectId] = useState("");
  const [testResult, setTestResult] = useState<null | {
    title: string;
    phone: string | null;
    phoneCount: number;
    hardHits: string[];
    softHits: string[];
    ownerHits: string[];
    score: number; // 0-100
    verdict: string;
  }>(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    if (!testProspectId.trim() || !current) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { data: p, error } = await supabase
        .from("prospect_listings")
        .select("id,title,description,contact_name,phone_normalized,source_url")
        .eq("id", testProspectId.trim())
        .maybeSingle();
      if (error || !p) {
        toast.error("Prospect inexistent.");
        return;
      }

      let phoneCount = 1;
      if (p.phone_normalized) {
        const { count } = await supabase
          .from("prospect_listings")
          .select("id", { count: "exact", head: true })
          .eq("phone_normalized", p.phone_normalized)
          .gte("scraped_at", new Date(Date.now() - current.multi_listing_window_days * 86400000).toISOString());
        phoneCount = count || 1;
      }

      const blob = `${p.title || ""}  ${p.description || ""}  ${p.contact_name || ""}`.toLowerCase();
      const hardHits = keywords.filter(k => k.enabled && k.type === "hard" && blob.includes(k.keyword.toLowerCase())).map(k => k.keyword);
      const softHits = keywords.filter(k => k.enabled && k.type === "soft" && blob.includes(k.keyword.toLowerCase())).map(k => k.keyword);
      const ownerHits = keywords.filter(k => k.enabled && k.type === "owner" && blob.includes(k.keyword.toLowerCase())).map(k => k.keyword);

      // Score 0-100: hard=50, soft=15, multi-listing scaled, owner subtracts 30.
      let score = 0;
      if (hardHits.length > 0) score += 50;
      score += Math.min(30, softHits.length * 12);
      if (phoneCount >= current.multi_listing_threshold) score += 35;
      else if (phoneCount === current.multi_listing_threshold - 1) score += 15;
      score -= ownerHits.length * 30;
      score = Math.max(0, Math.min(100, score));

      const verdict = score >= current.suspicion_threshold
        ? `🏢 AGENȚIE (≥ prag ${current.suspicion_threshold})`
        : score >= current.suspicion_threshold * 0.7
        ? "⚠️ Suspect"
        : "✅ Curat (proprietar)";

      setTestResult({
        title: p.title || "—",
        phone: p.phone_normalized,
        phoneCount,
        hardHits,
        softHits,
        ownerHits,
        score,
        verdict,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loadingSettings || !current) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă setările…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" /> Configurare AI — Detecție Agenții
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Praguri și liste dinamice folosite de algoritmul care separă proprietarii de agenții/dezvoltatori.
        </p>
      </div>

      <Tabs defaultValue="thresholds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="thresholds">Praguri & Reguli</TabsTrigger>
          <TabsTrigger value="keywords">Liste Cuvinte Cheie ({keywords.length})</TabsTrigger>
          <TabsTrigger value="test">Test Mode</TabsTrigger>
        </TabsList>

        {/* ── PRAGURI ────────────────────────────────────────────── */}
        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Algoritm activ</CardTitle>
              <CardDescription>Dezactivează pentru a opri complet clasificarea automată.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Switch checked={current.enabled} onCheckedChange={(v) => set({ enabled: v })} />
              <span className="text-sm">{current.enabled ? "ON — clasificare automată activă" : "OFF — toate lead-urile rămân neclasificate"}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prag suspiciune (Probabil Agenție)</CardTitle>
              <CardDescription>
                Scor între <strong>0</strong> și <strong>100</strong>. Lead-urile cu scor ≥ acest prag sunt marcate automat ca <strong>Probabil Agenție</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[current.suspicion_threshold]}
                  onValueChange={([v]) => set({ suspicion_threshold: v })}
                  className="flex-1"
                />
                <Badge variant="outline" className="font-mono text-base px-3 py-1 min-w-[70px] justify-center">
                  {current.suspicion_threshold}
                </Badge>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>0 · permisiv</span>
                <span className="text-amber-600">50</span>
                <span className="text-orange-600">70 · default</span>
                <span className="text-red-600">100 · strict</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Multi-Listing (telefon recurent)</CardTitle>
              <CardDescription>
                După câte anunțuri pe același telefon (în fereastra de zile aleasă) lead-ul devine <strong>Agency</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Număr minim de anunțuri</Label>
                <Input
                  type="number"
                  min={2}
                  max={50}
                  value={current.multi_listing_threshold}
                  onChange={(e) => set({ multi_listing_threshold: Math.max(2, Math.min(50, Number(e.target.value) || 3)) })}
                />
                <p className="text-xs text-muted-foreground">Default: 3</p>
              </div>
              <div className="space-y-2">
                <Label>Fereastră (zile)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={current.multi_listing_window_days}
                  onChange={(e) => set({ multi_listing_window_days: Math.max(1, Math.min(90, Number(e.target.value) || 14)) })}
                />
                <p className="text-xs text-muted-foreground">Default: 14 zile</p>
              </div>
            </CardContent>
          </Card>

          {/* ── BULK ARCHIVE ─────────────────────────────────────────── */}
          <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Archive className="h-4 w-4 text-amber-600" /> Arhivare Retroactivă (Bulk)
              </CardTitle>
              <CardDescription>
                Marchează ca <strong>arhivate</strong> toate agențiile deja detectate (excepție: numerele de pe whitelist).
                Acțiunea adaugă automat numerele în blacklist și înregistrează un audit log.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkArchiveButton />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 sticky bottom-2 bg-background/80 backdrop-blur p-2 rounded-lg border">
            <Button variant="outline" disabled={!dirty} onClick={() => setDraft(null)}>
              Resetează
            </Button>
            <Button disabled={!dirty} onClick={saveSettings} className="bg-primary">
              <Save className="h-4 w-4 mr-2" /> Salvează global
            </Button>
          </div>
        </TabsContent>

        {/* ── KEYWORDS ────────────────────────────────────────────── */}
        <TabsContent value="keywords" className="space-y-4">
          {(["hard", "soft", "owner"] as KwType[]).map((t) => (
            <KeywordEditor key={t} type={t} keywords={keywords.filter(k => k.type === t)} loading={loadingKw} onChange={() => qc.invalidateQueries({ queryKey: ["agency-keywords"] })} />
          ))}
        </TabsContent>

        {/* ── TEST MODE ────────────────────────────────────────────── */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" /> Test pe lead specific
              </CardTitle>
              <CardDescription>
                Introdu ID-ul unui prospect ca să vezi ce scor și verdict ar primi cu setările din editor (înainte de a le salva).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="UUID prospect (ex: 123e4567-e89b-…)"
                  value={testProspectId}
                  onChange={(e) => setTestProspectId(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button onClick={runTest} disabled={!testProspectId.trim() || testing}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                  Testează
                </Button>
              </div>

              {testResult && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div>
                    <div className="text-xs text-muted-foreground">Titlu</div>
                    <div className="font-medium">{testResult.title}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Telefon:</span> <span className="font-mono">{testResult.phone || "—"}</span></div>
                    <div><span className="text-muted-foreground">Anunțuri pe telefon:</span> <strong>×{testResult.phoneCount}</strong> (în {current.multi_listing_window_days}z)</div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Scor calculat:</span>
                      <Badge variant="outline" className={`font-mono text-lg px-3 ${
                        testResult.score >= current.suspicion_threshold ? "border-red-400 text-red-700" :
                        testResult.score >= current.suspicion_threshold * 0.7 ? "border-orange-400 text-orange-700" :
                        "border-green-400 text-green-700"
                      }`}>
                        {testResult.score} / 100
                      </Badge>
                      <span className="text-xs text-muted-foreground">(prag: {current.suspicion_threshold})</span>
                    </div>
                    <div className="text-base font-semibold">{testResult.verdict}</div>
                  </div>
                  {(testResult.hardHits.length + testResult.softHits.length + testResult.ownerHits.length) > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {testResult.hardHits.length > 0 && (
                        <KwHits label="🚫 Hard hits" tone="red" items={testResult.hardHits} />
                      )}
                      {testResult.softHits.length > 0 && (
                        <KwHits label="⚠️ Soft hits" tone="orange" items={testResult.softHits} />
                      )}
                      {testResult.ownerHits.length > 0 && (
                        <KwHits label="✅ Owner signals" tone="green" items={testResult.ownerHits} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const KwHits = ({ label, tone, items }: { label: string; tone: "red" | "orange" | "green"; items: string[] }) => {
  const cls = tone === "red" ? "border-red-300 text-red-700 dark:text-red-300"
            : tone === "orange" ? "border-orange-300 text-orange-700 dark:text-orange-300"
            : "border-green-300 text-green-700 dark:text-green-300";
  return (
    <div>
      <div className="text-xs font-medium mb-1">{label} ({items.length})</div>
      <div className="flex flex-wrap gap-1">
        {items.map((k) => (
          <Badge key={k} variant="outline" className={`font-mono text-[11px] ${cls}`}>{k}</Badge>
        ))}
      </div>
    </div>
  );
};

const KeywordEditor = ({ type, keywords, loading, onChange }: { type: KwType; keywords: any[]; loading: boolean; onChange: () => void }) => {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const [newKw, setNewKw] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const k = newKw.trim().toLowerCase();
    if (!k) return;
    setBusy(true);
    const { error } = await supabase
      .from("agency_keywords" as any)
      .insert({ keyword: k, type, enabled: true });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Cuvântul există deja." : error.message);
      return;
    }
    setNewKw("");
    onChange();
    toast.success(`Adăugat în ${meta.label}`);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("agency_keywords" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const toggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("agency_keywords" as any).update({ enabled }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  return (
    <Card className={meta.tone}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" /> {meta.label} <Badge variant="outline">{keywords.length}</Badge>
        </CardTitle>
        <CardDescription>{meta.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={`Adaugă ${meta.label.toLowerCase()}…`}
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="font-mono text-sm"
          />
          <Button onClick={add} disabled={busy || !newKw.trim()} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adaugă
          </Button>
        </div>

        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : keywords.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Niciun cuvânt cheie. Adaugă primul mai sus.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span
                key={k.id}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono bg-background ${
                  k.enabled ? "" : "opacity-40 line-through"
                }`}
              >
                <button
                  onClick={() => toggle(k.id, !k.enabled)}
                  title={k.enabled ? "Dezactivează" : "Activează"}
                  className="hover:underline"
                >
                  {k.keyword}
                </button>
                <button
                  onClick={() => remove(k.id)}
                  className="hover:text-destructive ml-0.5"
                  title="Șterge"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BulkArchiveButton = () => {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("bulk_archive_detected_agencies" as any);
      if (error) throw error;
      const archived = (data as any)?.archived ?? 0;
      setLastResult(archived);
      toast.success(archived > 0
        ? `✅ ${archived} agenții arhivate retroactiv.`
        : "Nimic de arhivat — nu există agenții active neprotejate de whitelist.");
    } catch (e: any) {
      toast.error("Arhivare eșuată: " + (e.message || e));
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-muted-foreground">
        {lastResult !== null && (
          <span className="font-medium text-foreground">Ultima rulare: {lastResult} înregistrări arhivate.</span>
        )}
      </div>
      {confirmOpen ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={busy}>Anulează</Button>
          <Button variant="destructive" size="sm" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
            Confirmă arhivarea
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40">
          <Archive className="h-4 w-4 mr-2" /> Arhivează toate agențiile detectate
        </Button>
      )}
    </div>
  );
};

export default AgencyDetectionSettings;
