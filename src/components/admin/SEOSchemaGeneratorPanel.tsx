import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2, Layers, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, ShieldAlert,
  Eye, RefreshCw, Download, Search, Trash2, Code2, Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  language: string;
  overall_score: number | null;
}

interface OverrideRow {
  url_path: string;
  json_ld: any;
  is_active: boolean;
}

interface ValidationRow {
  url_path: string;
  status: string;
  schema_types: any;
  errors: any;
  warnings: any;
  validated_at: string;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
}

type FilterMode = "all" | "missing" | "invalid" | "stale" | "valid";

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return full.startsWith("/") ? full : "/";
  }
};

const hasSchema = (jl: any): boolean => {
  if (!jl) return false;
  if (Array.isArray(jl)) return jl.length > 0;
  if (typeof jl === "object") return Object.keys(jl).length > 0;
  return false;
};

const detectTypes = (jl: any): string[] => {
  const acc: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n === "object") {
      const t = n["@type"];
      if (t) (Array.isArray(t) ? t : [t]).forEach((x) => acc.push(String(x)));
      Object.values(n).forEach(walk);
    }
  };
  walk(jl);
  return Array.from(new Set(acc));
};

const STALE_DAYS = 14;

export const SEOSchemaGeneratorPanel = ({ history, overrides }: Props) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  // Latest validation per path
  const { data: validations = [] } = useQuery({
    queryKey: ["seo-schema-validations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_schema_validations")
        .select("url_path, status, schema_types, errors, warnings, validated_at")
        .order("validated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ValidationRow[];
    },
    staleTime: 30_000,
  });

  const validationMap = useMemo(() => {
    const m = new Map<string, ValidationRow>();
    validations.forEach((v) => {
      if (!m.has(v.url_path)) m.set(v.url_path, v);
    });
    return m;
  }, [validations]);

  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideRow>();
    overrides.forEach((o) => m.set(o.url_path, o));
    return m;
  }, [overrides]);

  // Latest audit per URL
  const latestAudits = useMemo(() => {
    const latest = new Map<string, AuditRow>();
    history.forEach((a) => {
      if (!latest.has(a.url)) latest.set(a.url, a);
    });
    return Array.from(latest.values());
  }, [history]);

  type Row = {
    audit: AuditRow;
    path: string;
    override: OverrideRow | undefined;
    hasJL: boolean;
    types: string[];
    validation: ValidationRow | undefined;
    state: "missing" | "invalid" | "warnings" | "valid" | "unknown";
    stale: boolean;
  };

  const rows: Row[] = useMemo(() => {
    return latestAudits.map((a) => {
      const path = urlToPath(a.url);
      const ov = overrideMap.get(path);
      const has = hasSchema(ov?.json_ld);
      const v = validationMap.get(path);
      const types = has ? detectTypes(ov?.json_ld) : [];
      let state: Row["state"] = "unknown";
      if (!has) state = "missing";
      else if (v?.status === "invalid" || v?.status === "error") state = "invalid";
      else if (v?.status === "warnings") state = "warnings";
      else if (v?.status === "valid") state = "valid";
      else state = "unknown";
      const stale = !!v && (Date.now() - new Date(v.validated_at).getTime()) / 86_400_000 > STALE_DAYS;
      return { audit: a, path, override: ov, hasJL: has, types, validation: v, state, stale };
    });
  }, [latestAudits, overrideMap, validationMap]);

  const stats = useMemo(() => {
    const s = { total: rows.length, missing: 0, invalid: 0, warnings: 0, valid: 0, unknown: 0, stale: 0 };
    rows.forEach((r) => {
      s[r.state] = (s[r.state] || 0) + 1;
      if (r.stale) s.stale++;
    });
    return s;
  }, [rows]);

  const typeBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => r.types.forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "missing" && r.state !== "missing") return false;
      if (filter === "invalid" && r.state !== "invalid" && r.state !== "warnings") return false;
      if (filter === "valid" && r.state !== "valid") return false;
      if (filter === "stale" && !r.stale) return false;
      if (q && !r.audit.url.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  const candidatesMissing = rows.filter((r) => r.state === "missing");
  const candidatesInvalid = rows.filter((r) => r.state === "invalid" || r.state === "warnings");

  const generateOne = async (audit: AuditRow) => {
    const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
      body: { action: "generate_fix", audit_id: audit.id, fix_type: "schema" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const proposal = data.proposal || data;
    const jsonLd = proposal?.json_ld || proposal;
    if (!jsonLd) throw new Error("Schema generată invalidă");
    const { error: applyErr } = await supabase.functions.invoke("seo-auto-fix", {
      body: {
        action: "apply_fix", audit_id: audit.id,
        url_path: urlToPath(audit.url), fix_type: "schema",
        payload: { json_ld: jsonLd },
      },
    });
    if (applyErr) throw applyErr;
  };

  const validateOne = async (path: string) => {
    const { data, error } = await supabase.functions.invoke("seo-schema-validator", {
      body: { url_path: path },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const handleGenerate = async (r: Row) => {
    setBusyPath(r.path);
    try {
      await generateOne(r.audit);
      await validateOne(r.path).catch(() => null);
      toast.success(`Schema aplicată: ${r.path}`);
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      qc.invalidateQueries({ queryKey: ["seo-schema-validations"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare schema");
    } finally {
      setBusyPath(null);
    }
  };

  const handleValidate = async (r: Row) => {
    setBusyPath(r.path);
    try {
      await validateOne(r.path);
      toast.success(`Validat: ${r.path}`);
      qc.invalidateQueries({ queryKey: ["seo-schema-validations"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare validare");
    } finally {
      setBusyPath(null);
    }
  };

  const handleRemove = async (r: Row) => {
    if (!confirm(`Șterge schema de pe ${r.path}?`)) return;
    setBusyPath(r.path);
    try {
      const { error } = await supabase
        .from("seo_overrides")
        .update({ json_ld: null })
        .eq("url_path", r.path);
      if (error) throw error;
      toast.success("Schema ștearsă");
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare ștergere");
    } finally {
      setBusyPath(null);
    }
  };

  const runBulk = async (mode: "missing" | "invalid" | "validate-all" | "regen-stale") => {
    let targets: Row[] = [];
    if (mode === "missing") targets = candidatesMissing;
    else if (mode === "invalid") targets = candidatesInvalid;
    else if (mode === "validate-all") targets = rows.filter((r) => r.hasJL);
    else if (mode === "regen-stale") targets = rows.filter((r) => r.stale && r.hasJL);
    if (targets.length === 0) {
      toast.info("Nicio pagină eligibilă");
      return;
    }
    setRunning(true);
    setProgress({ done: 0, total: targets.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        if (mode === "validate-all") await validateOne(targets[i].path);
        else {
          await generateOne(targets[i].audit);
          await validateOne(targets[i].path).catch(() => null);
        }
        ok++;
      } catch { fail++; }
      setProgress({ done: i + 1, total: targets.length });
    }
    setRunning(false);
    toast.success(`Bulk: ${ok} reușite, ${fail} eșuate`);
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    qc.invalidateQueries({ queryKey: ["seo-schema-validations"] });
  };

  const exportCsv = () => {
    const head = ["URL", "Path", "Status", "Tipuri", "Erori", "Avertismente", "Stale", "Validat la"];
    const lines = rows.map((r) => [
      r.audit.url, r.path, r.state, r.types.join("|"),
      Array.isArray(r.validation?.errors) ? (r.validation!.errors as any[]).length : 0,
      Array.isArray(r.validation?.warnings) ? (r.validation!.warnings as any[]).length : 0,
      r.stale ? "1" : "0",
      r.validation?.validated_at || "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `schema-audit-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const previewRow = previewPath ? rows.find((r) => r.path === previewPath) : null;

  const StateBadge = ({ r }: { r: Row }) => {
    if (r.state === "missing") return <Badge variant="outline" className="border-amber-500 text-amber-700">Lipsă</Badge>;
    if (r.state === "invalid") return <Badge variant="destructive">Invalid</Badge>;
    if (r.state === "warnings") return <Badge className="bg-amber-500 hover:bg-amber-500">Avertismente</Badge>;
    if (r.state === "valid") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Valid</Badge>;
    return <Badge variant="secondary">Nevalidat</Badge>;
  };

  return (
    <Card className="border-purple-200 dark:border-purple-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Layers className="w-5 h-5 text-purple-600" />
          Smart Schema Generator
          <Badge variant="outline">{stats.total - stats.missing}/{stats.total} cu schema</Badge>
          {stats.invalid > 0 && <Badge variant="destructive">{stats.invalid} invalide</Badge>}
          {stats.warnings > 0 && <Badge className="bg-amber-500 hover:bg-amber-500">{stats.warnings} avertismente</Badge>}
          {stats.stale > 0 && <Badge variant="outline" className="border-blue-500 text-blue-700">{stats.stale} vechi</Badge>}
        </CardTitle>
        <CardDescription>
          Generează, validează și monitorizează JSON-LD (Property / FAQ / LocalBusiness / Article) cu validare schema.org în timp real.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <Stat label="Cu schema" value={stats.total - stats.missing} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} />
          <Stat label="Lipsă" value={stats.missing} icon={<AlertCircle className="w-4 h-4 text-amber-600" />} />
          <Stat label="Valide" value={stats.valid} icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />} />
          <Stat label="Cu probleme" value={stats.invalid + stats.warnings} icon={<ShieldAlert className="w-4 h-4 text-red-600" />} />
          <Stat label="Validări vechi" value={stats.stale} icon={<RefreshCw className="w-4 h-4 text-blue-600" />} />
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runBulk("missing")} disabled={running || candidatesMissing.length === 0} size="sm" className="gap-1.5">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generează lipsă ({candidatesMissing.length})
          </Button>
          <Button onClick={() => runBulk("invalid")} disabled={running || candidatesInvalid.length === 0} size="sm" variant="outline" className="gap-1.5">
            <Wand2 className="w-3.5 h-3.5" />
            Reparare invalide ({candidatesInvalid.length})
          </Button>
          <Button onClick={() => runBulk("validate-all")} disabled={running} size="sm" variant="outline" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Validează tot
          </Button>
          <Button onClick={() => runBulk("regen-stale")} disabled={running || stats.stale === 0} size="sm" variant="outline" className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerare vechi ({stats.stale})
          </Button>
          <Button onClick={exportCsv} size="sm" variant="ghost" className="gap-1.5 ml-auto">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        {running && (
          <div className="space-y-1">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
            <p className="text-xs text-muted-foreground">Procesat {progress.done} / {progress.total}</p>
          </div>
        )}

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Toate ({stats.total})</TabsTrigger>
              <TabsTrigger value="missing">Lipsă ({stats.missing})</TabsTrigger>
              <TabsTrigger value="invalid">Cu probleme ({stats.invalid + stats.warnings})</TabsTrigger>
              <TabsTrigger value="valid">Valide ({stats.valid})</TabsTrigger>
              <TabsTrigger value="stale">Vechi ({stats.stale})</TabsTrigger>
            </TabsList>
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută URL..."
                className="pl-8 h-9"
              />
            </div>
          </div>
          <TabsContent value={filter} className="mt-3">
            <ScrollArea className="h-72 rounded-md border">
              <ul className="divide-y text-sm">
                {filtered.length === 0 && (
                  <li className="px-3 py-6 text-center text-muted-foreground">Niciun rezultat</li>
                )}
                {filtered.map((r) => (
                  <li key={r.audit.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StateBadge r={r} />
                        {r.stale && <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">Vechi</Badge>}
                        <span className="truncate font-medium">{r.path}</span>
                      </div>
                      {r.types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.types.slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                          {r.types.length > 4 && <span className="text-[10px] text-muted-foreground">+{r.types.length - 4}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.hasJL && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewPath(r.path)} title="Preview">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {r.hasJL && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busyPath === r.path} onClick={() => handleValidate(r)} title="Validează">
                          {busyPath === r.path ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7" disabled={busyPath === r.path || running} onClick={() => handleGenerate(r)}>
                        {busyPath === r.path ? <Loader2 className="w-3 h-3 animate-spin" /> : (r.hasJL ? "Regenerează" : "Generează")}
                      </Button>
                      {r.hasJL && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={busyPath === r.path} onClick={() => handleRemove(r)} title="Șterge">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Type breakdown */}
        {typeBreakdown.length > 0 && (
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
              <Code2 className="w-3.5 h-3.5" /> Distribuție tipuri schema.org
            </div>
            <div className="flex flex-wrap gap-1.5">
              {typeBreakdown.map(([t, n]) => (
                <Badge key={t} variant="outline" className="text-xs">
                  {t} <span className="ml-1 text-muted-foreground">×{n}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Preview dialog */}
      <Dialog open={!!previewPath} onOpenChange={(o) => !o && setPreviewPath(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-4 h-4" /> JSON-LD: {previewPath}
            </DialogTitle>
            <DialogDescription>
              {previewRow?.validation
                ? `Ultima validare: ${previewRow.validation.status} • ${new Date(previewRow.validation.validated_at).toLocaleString("ro-RO")}`
                : "Schema nu a fost încă validată"}
            </DialogDescription>
          </DialogHeader>
          {previewRow && (
            <div className="space-y-3">
              {Array.isArray(previewRow.validation?.errors) && (previewRow.validation!.errors as any[]).length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
                  <div className="font-medium text-destructive mb-1">Erori</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(previewRow.validation!.errors as any[]).slice(0, 8).map((e, i) => (
                      <li key={i}>{typeof e === "string" ? e : JSON.stringify(e)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <ScrollArea className="h-80 rounded border bg-muted/30">
                <pre className="text-xs p-3 whitespace-pre-wrap break-all">
                  {JSON.stringify(previewRow.override?.json_ld, null, 2)}
                </pre>
              </ScrollArea>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(previewRow.override?.json_ld, null, 2));
                  toast.success("Copiat");
                }}>Copiază JSON</Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent("https://www.realtrust.ro" + previewRow.path)}`} target="_blank" rel="noopener noreferrer">
                    Test Google
                  </a>
                </Button>
                <Button size="sm" onClick={() => { handleGenerate(previewRow); setPreviewPath(null); }}>
                  <Wand2 className="w-3.5 h-3.5 mr-1" /> Regenerează
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-md border p-2 bg-card">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
    <div className="text-xl font-bold mt-0.5">{value}</div>
  </div>
);
