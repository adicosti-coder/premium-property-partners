import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Phone, RotateCcw, Archive, Search, Brain, Clock, MessageSquareWarning, Download, Trash2, Activity, ScrollText } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ro } from "date-fns/locale";

interface CallerProfile {
  id: string;
  phone_normalized: string;
  display_name: string | null;
  preferred_branch: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_zones: string[] | null;
  property_types: string[] | null;
  rooms_min: number | null;
  rooms_max: number | null;
  timeline: string | null;
  notes: string | null;
  last_objection: string | null;
  call_count: number;
  last_call_at: string | null;
  archived_at: string | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  profile_id: string | null;
  phone_normalized: string | null;
  action: string;
  actor_label: string | null;
  details: any;
  created_at: string;
}

interface LatencyMetric {
  id: number;
  lookup_ms: number;
  hit: boolean;
  is_slow: boolean;
  created_at: string;
}

type FilterMode = "active" | "archived" | "all";

async function logAudit(profile: CallerProfile, action: string, details: any = {}) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("voice_caller_audit_log").insert({
    profile_id: profile.id,
    phone_normalized: profile.phone_normalized,
    action,
    actor_user_id: auth?.user?.id ?? null,
    actor_label: "admin",
    details,
  });
}

export default function VoiceCallerProfilesManager() {
  const [profiles, setProfiles] = useState<CallerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [metrics, setMetrics] = useState<LatencyMetric[]>([]);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("voice_caller_profiles")
      .select("*")
      .order("last_call_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (filterMode === "active") q = q.is("archived_at", null);
    else if (filterMode === "archived") q = q.not("archived_at", "is", null);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
    } else {
      setProfiles((data || []) as CallerProfile[]);
    }
    setLoading(false);
  };

  const loadAuxiliary = async () => {
    const [auditRes, metricsRes] = await Promise.all([
      supabase.from("voice_caller_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("voice_memory_lookup_metrics").select("id, lookup_ms, hit, is_slow, created_at")
        .order("created_at", { ascending: false }).limit(100),
    ]);
    if (auditRes.data) setAuditLog(auditRes.data as AuditEntry[]);
    if (metricsRes.data) setMetrics(metricsRes.data as LatencyMetric[]);
  };

  useEffect(() => { load(); }, [filterMode]);
  useEffect(() => { loadAuxiliary(); }, []);

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.phone_normalized?.toLowerCase().includes(s) ||
      p.display_name?.toLowerCase().includes(s) ||
      p.notes?.toLowerCase().includes(s) ||
      p.preferred_zones?.some(z => z.toLowerCase().includes(s))
    );
  });

  const resetProfile = async (p: CallerProfile) => {
    const { error } = await supabase
      .from("voice_caller_profiles")
      .update({
        preferred_branch: null, budget_min: null, budget_max: null,
        preferred_zones: [], property_types: [],
        rooms_min: null, rooms_max: null, timeline: null,
        notes: null, last_objection: null, mentioned_property_ids: [],
        call_count: 0, last_call_at: null, last_session_id: null,
      })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Reset eșuat", description: error.message, variant: "destructive" });
    } else {
      await logAudit(p, "reset", { previous_call_count: p.call_count });
      toast({ title: "Memorie ștearsă", description: `Andrei nu mai ține minte ${p.phone_normalized}.` });
      load(); loadAuxiliary();
    }
  };

  const gdprDelete = async (p: CallerProfile) => {
    // Audit BEFORE delete (FK ON DELETE SET NULL keeps the log readable)
    await logAudit(p, "gdpr_delete", { phone: p.phone_normalized, call_count: p.call_count });
    const { error } = await supabase.from("voice_caller_profiles").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Ștergere GDPR eșuată", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil șters complet", description: `Toate datele pentru ${p.phone_normalized} au fost șterse (GDPR).` });
      load(); loadAuxiliary();
    }
  };

  const archiveProfile = async (p: CallerProfile) => {
    const newArchived = p.archived_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from("voice_caller_profiles")
      .update({ archived_at: newArchived })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      await logAudit(p, newArchived ? "archive" : "reactivate");
      load(); loadAuxiliary();
    }
  };

  const exportCSV = async () => {
    toast({ title: "Se exportă…", description: "Se generează CSV-ul cu toate profilurile." });
    const { data, error } = await supabase
      .from("voice_caller_profiles")
      .select("*")
      .order("last_call_at", { ascending: false, nullsFirst: false });
    if (error || !data) {
      toast({ title: "Export eșuat", description: error?.message || "Fără date", variant: "destructive" });
      return;
    }
    const headers = Object.keys(data[0] || {});
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => escape((row as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice_caller_profiles_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export gata", description: `${data.length} profiluri exportate.` });
  };

  const stats = {
    total: profiles.length,
    active: profiles.filter(p => !p.archived_at).length,
    multiCall: profiles.filter(p => p.call_count > 1).length,
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Memoria lui Andrei — Profiluri Apelanți
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ce „știe" agentul vocal despre fiecare număr de telefon. Datele se actualizează automat după fiecare apel.
          Profilurile fără apel în ultimele 6 luni sunt arhivate automat zilnic la 03:17.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs">
          <Badge variant="outline">Total: {stats.total}</Badge>
          <Badge variant="outline">Active: {stats.active}</Badge>
          <Badge variant="outline">Cu &gt;1 apel: {stats.multiCall}</Badge>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Caută telefon, nume, zonă, notă…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 border rounded-md p-0.5">
            {(["active", "archived", "all"] as FilterMode[]).map(m => (
              <Button
                key={m}
                size="sm"
                variant={filterMode === m ? "default" : "ghost"}
                onClick={() => setFilterMode(m)}
                className="h-7 px-2 text-xs"
              >
                {m === "active" ? "Active" : m === "archived" ? "Arhivate" : "Toate"}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { load(); loadAuxiliary(); }} disabled={loading}>
            Reîncarcă
          </Button>
        </div>

        {/* Dashboard latență */}
        <LatencyDashboard metrics={metrics} />

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Se încarcă…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Niciun profil încă. Andrei va începe să țină minte după primul apel real.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className={`border rounded-lg p-4 space-y-2 ${p.archived_at ? "bg-muted/40 opacity-70" : "bg-card"}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="font-mono">{p.phone_normalized}</span>
                      {p.display_name && <span className="text-muted-foreground text-sm">— {p.display_name}</span>}
                      {p.archived_at && <Badge variant="secondary" className="text-xs">arhivat</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span><Clock className="w-3 h-3 inline mr-1" />
                        {p.last_call_at
                          ? `acum ${formatDistanceToNow(new Date(p.last_call_at), { locale: ro })}`
                          : "fără apeluri"}
                      </span>
                      <span>{p.call_count} apel/uri</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                          <RotateCcw className="w-4 h-4 mr-1" /> Reset Context
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Șterge memoria lui Andrei?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Toate preferințele extrase pentru <strong>{p.phone_normalized}</strong> vor fi șterse.
                            La următorul apel, Andrei va trata acest număr ca pe un apelant nou.
                            Acțiunea nu poate fi anulată.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction onClick={() => resetProfile(p)}>
                            Da, șterge memoria
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" variant="ghost" onClick={() => archiveProfile(p)}>
                      <Archive className="w-4 h-4 mr-1" />
                      {p.archived_at ? "Reactivează" : "Arhivează"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4 mr-1" /> GDPR
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ștergere completă (GDPR)?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se va șterge <strong>definitiv</strong> profilul pentru <strong>{p.phone_normalized}</strong>,
                            inclusiv toate preferințele și istoricul. Această acțiune este folosită pentru
                            <em> dreptul de a fi uitat</em> și nu poate fi anulată. Acțiunea va fi înregistrată în jurnal.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => gdprDelete(p)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Da, șterge tot
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Preferințe */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Field label="Interes" value={p.preferred_branch} />
                  <Field
                    label="Buget"
                    value={p.budget_min || p.budget_max ? `${p.budget_min ?? "?"}–${p.budget_max ?? "?"} €` : null}
                  />
                  <Field
                    label="Camere"
                    value={p.rooms_min || p.rooms_max ? `${p.rooms_min ?? "?"}–${p.rooms_max ?? "?"}` : null}
                  />
                  <Field label="Timeline" value={p.timeline} />
                </div>

                {(p.preferred_zones?.length || p.property_types?.length) && (
                  <div className="flex flex-wrap gap-1 text-xs">
                    {p.preferred_zones?.map(z => <Badge key={z} variant="secondary">{z}</Badge>)}
                    {p.property_types?.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
                  </div>
                )}

                {p.notes && (
                  <div className="text-xs bg-muted/50 rounded p-2 border-l-2 border-primary">
                    <span className="font-medium text-primary">Rezumat:</span> {p.notes}
                  </div>
                )}

                {p.last_objection && (
                  <div className="text-xs bg-destructive/5 rounded p-2 border-l-2 border-destructive flex gap-2 items-start">
                    <MessageSquareWarning className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div><span className="font-medium text-destructive">Ultima obiecție:</span> {p.last_objection}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

          </div>
        )}

        <AuditLogPanel entries={auditLog} />
      </CardContent>
    </Card>
  );
}

function LatencyDashboard({ metrics }: { metrics: LatencyMetric[] }) {
  if (metrics.length === 0) {
    return (
      <div className="text-xs text-muted-foreground border rounded p-3 bg-muted/20">
        <Activity className="w-4 h-4 inline mr-1" />
        Niciun lookup măsurat încă. Latența va apărea după primul apel real.
      </div>
    );
  }
  const avg = Math.round(metrics.reduce((s, m) => s + m.lookup_ms, 0) / metrics.length);
  const max = Math.max(...metrics.map(m => m.lookup_ms));
  const slowCount = metrics.filter(m => m.is_slow).length;
  const slowPct = Math.round((slowCount / metrics.length) * 100);
  const maxBar = Math.max(max, 250);

  return (
    <div className="border rounded-lg p-3 bg-muted/10 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1">
          <Activity className="w-4 h-4 text-primary" />
          Memory-Lookup Latency (ultimele {metrics.length})
        </h4>
        <div className="flex gap-2 text-xs">
          <Badge variant="outline">avg {avg}ms</Badge>
          <Badge variant="outline">max {max}ms</Badge>
          <Badge variant={slowCount > 0 ? "destructive" : "secondary"}>
            slow &gt;200ms: {slowCount} ({slowPct}%)
          </Badge>
        </div>
      </div>
      <div className="flex items-end gap-px h-16 bg-background rounded p-1 overflow-hidden">
        {metrics.slice().reverse().map(m => {
          const h = Math.min(100, (m.lookup_ms / maxBar) * 100);
          return (
            <div
              key={m.id}
              className={`flex-1 min-w-[2px] ${m.is_slow ? "bg-destructive" : "bg-primary/60"}`}
              style={{ height: `${h}%` }}
              title={`${m.lookup_ms}ms · ${m.hit ? "hit" : "miss"} · ${format(new Date(m.created_at), "HH:mm")}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>vechi</span>
        <span className="border-t border-dashed border-destructive/50 flex-1 mx-2" />
        <span>prag 200ms · recent</span>
      </div>
    </div>
  );
}

function AuditLogPanel({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return null;
  const actionLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    reset: { label: "Reset", variant: "outline" },
    archive: { label: "Arhivat", variant: "secondary" },
    reactivate: { label: "Reactivat", variant: "secondary" },
    gdpr_delete: { label: "GDPR Delete", variant: "destructive" },
    auto_archive: { label: "Auto-arhivat", variant: "outline" },
    manual_edit: { label: "Editat", variant: "outline" },
  };
  return (
    <div className="border rounded-lg p-3 bg-muted/10 space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1">
        <ScrollText className="w-4 h-4 text-primary" />
        Jurnal activitate (ultimele {entries.length})
      </h4>
      <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
        {entries.map(e => {
          const meta = actionLabel[e.action] || { label: e.action, variant: "outline" as const };
          return (
            <div key={e.id} className="flex items-start gap-2 py-1 border-b border-border/40 last:border-0">
              <Badge variant={meta.variant} className="text-[10px] shrink-0">{meta.label}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-mono truncate">{e.phone_normalized || "—"}</div>
                <div className="text-muted-foreground text-[10px]">
                  {format(new Date(e.created_at), "dd MMM HH:mm", { locale: ro })}
                  {" · "}
                  {e.actor_label || "system"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</div>
      <div className="font-medium">{value || <span className="text-muted-foreground/60">—</span>}</div>
    </div>
  );
}
