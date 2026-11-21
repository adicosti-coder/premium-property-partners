import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, Inbox, Loader2, MessageSquare,
  PauseCircle, RefreshCw, RotateCcw, Send, ShieldAlert, Wrench, ExternalLink, UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import {
  HUB_KEYS, useHubAttention, useHubInbound, useHubQueue, useHubSettings,
  type HubAttentionRow, type HubQueueRow,
} from "@/hooks/useWhatsappHub";
import { getAdminTabComponent, prefetchAdminTab } from "./adminTabLoaders";
import { findTab, WA_HUB_TOOL_GROUPS, WA_HUB_VIEWS } from "./adminNavConfig";
import {
  ATTENTION_LABELS, BUCKET_LABELS, TEST_TEMPLATES, classifyAttention, classifyQueueItem, computeQueueMetrics,
  countBuckets, filterQueue, handoffMessage, handoffReasonLabel, isRetryEligible, isWithinSendingHours,
  maskPhone, metaErrorCode, type AttentionCategory, type QueueBucket, type QueueContext, type QueueFilter,
} from "../../../supabase/functions/_shared/waHubRules";

type Section = "coada" | "atentie" | "rapoarte" | "instrumente";
const SECTIONS: { id: Section; label: string; short: string; icon: typeof Inbox }[] = [
  { id: "coada", label: "Coadă & livrare", short: "Coadă", icon: Inbox },
  { id: "atentie", label: "Atenție manuală", short: "Atenție", icon: UserRound },
  { id: "rapoarte", label: "Rapoarte", short: "Rapoarte", icon: BarChart3 },
  { id: "instrumente", label: "Toate instrumentele", short: "Instrumente", icon: Wrench },
];

const HUB_TOOL_GROUPS = WA_HUB_TOOL_GROUPS;
const HUB_TOOL_VIEWS = WA_HUB_VIEWS;

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: "action", label: "De rezolvat" },
  { id: "critical", label: "Erori de cont" },
  { id: "retryable", label: "De reluat" },
  { id: "uncertain", label: "Posibil trimise" },
  { id: "stuck", label: "Blocate" },
  { id: "scheduled", label: "Programate" },
  { id: "waiting", label: "În așteptare" },
  { id: "benign", label: "Normale" },
  { id: "sent", label: "Trimise" },
  { id: "all", label: "Toate" },
];

const BUCKET_TONE: Record<QueueBucket, string> = {
  critical: "bg-destructive text-destructive-foreground",
  retryable: "bg-warning-soft text-foreground border border-warning/40",
  uncertain: "bg-warning-soft text-foreground border border-warning/40",
  stuck: "bg-warning text-warning-foreground",
  scheduled: "bg-muted text-foreground",
  waiting: "bg-muted text-foreground",
  benign: "bg-muted text-muted-foreground",
  sent: "bg-success-soft text-foreground border border-success/40",
};

const BUCKET_HINT: Partial<Record<QueueBucket, string>> = {
  critical: "Contul WhatsApp are o problemă de plată sau eligibilitate în Meta. Rezolv-o în WhatsApp Manager, apoi reia mesajul individual.",
  uncertain: "Mesajul poate fi deja la client. Nu se retrimite automat — verifică discuția înainte.",
  benign: "Număr fără WhatsApp, dublură refuzată sau număr exclus — nu e nevoie de nimic.",
};

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—");

async function invokeHub(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("wa-hub-actions", { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text().catch(() => error.message) : error.message;
    let msg = details;
    try { const j = JSON.parse(details); msg = j.detail ?? j.error ?? details; } catch { /* text */ }
    throw new Error(msg);
  }
  return data as Record<string, any>;
}

export default function WhatsappHub() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const raw = params.get("section") as Section | null;
  const view = params.get("view");
  const section: Section = view && HUB_TOOL_VIEWS.includes(view) ? "instrumente" : raw && SECTIONS.some((s) => s.id === raw) ? raw : "coada";

  const queue = useHubQueue();
  const settings = useHubSettings();
  const attention = useHubAttention();

  useRealtimeChannel("admin-wa-hub", [
    { event: "*", table: "wa_outbound_queue", handler: () => { void qc.invalidateQueries({ queryKey: HUB_KEYS.queue }); } },
    { event: "*", table: "wa_conversations", handler: () => { void qc.invalidateQueries({ queryKey: HUB_KEYS.attention }); } },
  ]);

  const ctx: QueueContext = useMemo(() => {
    const s = settings.data;
    return {
      paused: !!s?.outbound_paused,
      withinSendingHours: s ? isWithinSendingHours(new Date(), s.outbound_send_start_hour, s.outbound_send_end_hour, s.outbound_send_days) : true,
    };
  }, [settings.data]);
  const counts = useMemo(() => countBuckets(queue.data ?? [], ctx), [queue.data, ctx]);
  const actionCount = counts.critical + counts.retryable + counts.uncertain + counts.stuck;
  const attentionCount = attention.data?.length ?? 0;

  const setSection = (s: Section) => {
    const next = new URLSearchParams(params);
    next.set("section", s);
    next.delete("view");
    next.delete("conversation");
    setParams(next, { replace: true });
  };
  const openTool = (v: string, extra?: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.set("section", "instrumente");
    next.set("view", v);
    for (const [k, val] of Object.entries(extra ?? {})) next.set(k, val);
    setParams(next);
  };
  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ["wa-hub"] });
  };

  const [retryOpen, setRetryOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary shrink-0" /> Centru WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Coada de mesaje, cazurile care cer intervenția ta și rapoartele, într-un singur loc.
          </p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:shrink-0 sm:flex-nowrap">
          <Button className="min-h-12 gap-2 px-3" onClick={() => setRetryOpen(true)}>
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Reîncearcă</span>
            <span className="hidden sm:inline">Reîncearcă / Deblochează</span>
          </Button>
          <Button variant="outline" className="min-h-12 gap-2 px-3" onClick={() => setTestOpen(true)}>
            <Send className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Mesaj test</span>
            <span className="hidden sm:inline">Trimite mesaj test</span>
          </Button>
          <Button variant="ghost" className="min-h-12 min-w-12" onClick={refreshAll} aria-label="Reîncarcă datele">
            <RefreshCw className={`h-4 w-4 ${queue.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {settings.data?.outbound_paused && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-warning/50 bg-warning-soft p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground flex items-start gap-2">
            <PauseCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Trimiterile automate sunt oprite.</strong>{" "}
              {settings.data.outbound_pause_reason ?? "Oprite din setări."}
            </span>
          </p>
          <Button size="sm" variant="outline" className="min-h-12 sm:min-h-9" onClick={() => setRetryOpen(true)}>Deblochează</Button>
        </div>
      )}

      <nav aria-label="Secțiuni Centru WhatsApp" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const badge = s.id === "coada" ? actionCount : s.id === "atentie" ? attentionCount : 0;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:text-sm ${
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
              {badge > 0 && (
                <span className={`absolute right-1 top-1 rounded-full px-1.5 text-[10px] leading-4 sm:static ${s.id === "coada" && counts.critical ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {section === "coada" && (
        <QueueSection rows={queue.data ?? []} loading={queue.isLoading} error={queue.error as Error | null} ctx={ctx} counts={counts} onChanged={refreshAll} onOpenFull={() => openTool("whatsapp-queue")} />
      )}
      {section === "atentie" && (
        <AttentionSection rows={attention.data ?? []} loading={attention.isLoading} onOpen={(id) => openTool("whatsapp-live", { conversation: id })} onChanged={refreshAll} />
      )}
      {section === "rapoarte" && <ReportsSection rows={queue.data ?? []} loading={queue.isLoading} onOpen={openTool} />}
      {section === "instrumente" && <ToolsSection view={view} onOpen={openTool} onBack={() => setSection("instrumente")} />}

      <RetryDialog open={retryOpen} onOpenChange={setRetryOpen} counts={counts} paused={!!settings.data?.outbound_paused} onDone={refreshAll} />
      <TestSendDialog open={testOpen} onOpenChange={setTestOpen} />
    </div>
  );
}

// ── Coadă & livrare ────────────────────────────────────────────────────────
function QueueSection({
  rows, loading, error, ctx, counts, onChanged, onOpenFull,
}: {
  rows: HubQueueRow[]; loading: boolean; error: Error | null; ctx: QueueContext;
  counts: Record<QueueBucket, number>; onChanged: () => void; onOpenFull: () => void;
}) {
  const [filter, setFilter] = useState<QueueFilter>("action");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const [retryRow, setRetryRow] = useState<HubQueueRow | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => filterQueue(rows, filter, search, ctx), [rows, filter, search, ctx]);
  const countFor = (f: QueueFilter) =>
    f === "all" ? rows.length : f === "action" ? counts.critical + counts.retryable + counts.uncertain + counts.stuck : counts[f];

  const retryOne = async () => {
    if (!retryRow) return;
    setBusy(true);
    try {
      const r = await invokeHub({ action: "retry", queue_ids: [retryRow.id] });
      toast({ title: r.retried ? "Mesaj repus în coadă" : "Mesajul nu poate fi reluat", description: r.retried ? "Pleacă în orele de trimitere." : "Nu mai e eligibil pentru reluare." });
      onChanged();
    } catch (e) {
      toast({ title: "Reluarea a eșuat", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
      setRetryRow(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Erori de cont Meta" value={counts.critical} tone={counts.critical ? "red" : "neutral"} hint="131042 / 131031" />
        <Kpi label="De reluat / blocate" value={counts.retryable + counts.stuck} tone={counts.retryable + counts.stuck ? "yellow" : "neutral"} hint="se pot debloca" />
        <Kpi label="În așteptare / programate" value={counts.waiting + counts.scheduled} tone="neutral" hint={ctx.withinSendingHours ? "în orele de trimitere" : "în afara orelor de trimitere"} />
        <Kpi label="Normale, fără acțiune" value={counts.benign} tone="neutral" hint="131026, dubluri, excluderi" />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtre coadă">
        {FILTERS.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} className="h-10 shrink-0 text-xs" onClick={() => { setFilter(f.id); setLimit(50); }}>
            {f.label} <span className="ml-1 opacity-70">{countFor(f.id)}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută telefon, șablon, sursă sau eroare…" aria-label="Caută în coadă" className="h-11" />
        <Button variant="outline" className="min-h-11 shrink-0" onClick={onOpenFull}>Coada completă și setări</Button>
      </div>

      {BUCKET_HINT[filter as QueueBucket] && <p className="text-xs text-muted-foreground">{BUCKET_HINT[filter as QueueBucket]}</p>}
      {error && <p className="text-sm text-destructive">Nu am putut încărca coada: {error.message}</p>}
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : list.length === 0 ? (
        <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Nimic aici.</CardContent></Card>
      ) : (
        <ul className="space-y-2">
          {list.slice(0, limit).map((r) => {
            const b = classifyQueueItem(r, ctx);
            const code = metaErrorCode(r.last_error);
            const canRetry = isRetryEligible(r, "single", ctx);
            return (
              <li key={r.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BUCKET_TONE[b]}`}>{BUCKET_LABELS[b]}</span>
                        {code && <Badge variant="outline" className="text-[11px]">cod {code}</Badge>}
                        <span className="text-sm font-medium text-foreground">{maskPhone(r.phone_normalized)}</span>
                        <span className="text-xs text-muted-foreground truncate">{r.template_name}{r.source ? ` · ${r.source}` : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.sent_at ? `Trimis ${fmt(r.sent_at)}` : `Programat ${fmt(r.scheduled_at)}`} · încercări {r.attempts}
                        {r.delivered_at ? " · livrat" : ""}{r.read_at ? " · citit" : ""}{r.replied_at || r.status === "replied" ? " · a răspuns" : ""}
                      </p>
                      {r.last_error && <p className="text-xs text-muted-foreground break-words line-clamp-2">{r.last_error}</p>}
                    </div>
                    {canRetry && (
                      <Button size="sm" variant={b === "critical" ? "outline" : "default"} className="min-h-12 shrink-0 gap-1.5 sm:min-h-9" onClick={() => setRetryRow(r)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reîncearcă
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > limit && (
        <Button variant="outline" className="w-full min-h-12" onClick={() => setLimit((l) => l + 50)}>
          Arată încă {Math.min(50, list.length - limit)} din {list.length - limit}
        </Button>
      )}

      <AlertDialog open={!!retryRow} onOpenChange={(o) => !o && setRetryRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiei acest mesaj?</AlertDialogTitle>
            <AlertDialogDescription>
              Mesajul către {maskPhone(retryRow?.phone_normalized)} revine în coadă și pleacă în orele de trimitere, cu toate verificările anti-spam.
              {retryRow && classifyQueueItem(retryRow, ctx) === "critical" && " Atenție: eroarea este de cont Meta — reia doar după ce ai rezolvat plata sau eligibilitatea în WhatsApp Manager."}
              {" "}Acțiunea se notează în jurnalul de audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-12">Renunță</AlertDialogCancel>
            <AlertDialogAction className="min-h-12" disabled={busy} onClick={(e) => { e.preventDefault(); void retryOne(); }}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Da, reia mesajul
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone: "red" | "yellow" | "green" | "neutral" }) {
  const toneCls = tone === "red" ? "border-destructive/50 bg-destructive/5" : tone === "yellow" ? "border-warning/50 bg-warning-soft" : tone === "green" ? "border-success/40 bg-success-soft" : "";
  return (
    <Card className={toneCls}>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// ── Atenție manuală ────────────────────────────────────────────────────────
const ATTENTION_ORDER: AttentionCategory[] = ["commission", "negotiation", "owner_change", "handover"];

function AttentionSection({ rows, loading, onOpen, onChanged }: { rows: HubAttentionRow[]; loading: boolean; onOpen: (id: string) => void; onChanged: () => void }) {
  const [cat, setCat] = useState<AttentionCategory | "all">("all");
  const [resolveRow, setResolveRow] = useState<HubAttentionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const items = useMemo(() => rows.map((r) => ({ ...r, category: classifyAttention(r) })), [rows]);
  const shown = cat === "all" ? items : items.filter((i) => i.category === cat);

  const resolve = async () => {
    if (!resolveRow) return;
    setBusy(true);
    try {
      await invokeHub({ action: "resolve_attention", conversation_id: resolveRow.id });
      toast({ title: "Marcat ca rezolvat" });
      onChanged();
    } catch (e) {
      toast({ title: "Nu am putut marca", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
      setResolveRow(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Tip de caz">
        <Button size="sm" variant={cat === "all" ? "default" : "outline"} className="h-10 shrink-0 text-xs" onClick={() => setCat("all")}>Toate <span className="ml-1 opacity-70">{items.length}</span></Button>
        {ATTENTION_ORDER.map((c) => (
          <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} className="h-10 shrink-0 text-xs" onClick={() => setCat(c)}>
            {ATTENTION_LABELS[c]} <span className="ml-1 opacity-70">{items.filter((i) => i.category === c).length}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Comisionul de administrare este 15–20% din venitul net; vânzarea și închirierea au comisioanele lor. Confirmă personal orice negociere sau modificare.
      </p>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : shown.length === 0 ? (
        <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Nicio conversație nu așteaptă după tine.</CardContent></Card>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const msg = r.last_inbound_text || handoffMessage(r.handoff_reason);
            const digits = r.phone_normalized.replace(/\D/g, "");
            return (
              <li key={r.id}>
                <Card>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={r.category === "handover" ? "bg-muted text-foreground" : "bg-warning text-warning-foreground"}>{ATTENTION_LABELS[r.category]}</Badge>
                      <span className="text-xs text-muted-foreground">{handoffReasonLabel(r)}</span>
                      <span className="text-xs text-muted-foreground">· {fmt(r.last_inbound_at ?? r.updated_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {r.wa_profile_name || "Fără nume"} · {maskPhone(r.phone_normalized)}
                      {r.prospect_title && <span className="font-normal text-muted-foreground"> · {r.prospect_title}</span>}
                    </p>
                    {msg && <p className="text-sm text-muted-foreground line-clamp-3 break-words">„{msg}”</p>}
                    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                      <Button size="sm" className="min-h-12 sm:min-h-9" onClick={() => onOpen(r.id)}>Deschide discuția</Button>
                      <Button size="sm" variant="outline" className="min-h-12 sm:min-h-9 gap-1.5" asChild>
                        <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" aria-label="Scrie direct pe WhatsApp">
                          <ExternalLink className="h-3.5 w-3.5" /> WhatsApp direct
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" className="min-h-12 sm:min-h-9" onClick={() => setResolveRow(r)}>Rezolvat</Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!resolveRow} onOpenChange={(o) => !o && setResolveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marchezi cazul ca rezolvat?</AlertDialogTitle>
            <AlertDialogDescription>
              {resolveRow?.status === "awaiting_human"
                ? "Andrei preia din nou răspunsurile automate în această conversație."
                : resolveRow?.status === "escalated_to_call"
                  ? "Conversația rămâne la apel telefonic; dispare doar marcajul de atenție."
                  : "Dispare marcajul de atenție; Andrei continuă ca până acum."}
              {" "}Acțiunea se notează în jurnalul de audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-12">Renunță</AlertDialogCancel>
            <AlertDialogAction className="min-h-12" disabled={busy} onClick={(e) => { e.preventDefault(); void resolve(); }}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Da, e rezolvat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Rapoarte compacte ──────────────────────────────────────────────────────
function ReportsSection({ rows, loading, onOpen }: { rows: HubQueueRow[]; loading: boolean; onOpen: (v: string) => void }) {
  const [days, setDays] = useState<7 | 30>(7);
  const inbound = useHubInbound();
  const m = useMemo(() => computeQueueMetrics(rows, days), [rows, days]);
  if (loading) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5" role="group" aria-label="Perioadă">
        {([7, 30] as const).map((d) => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} className="h-10" onClick={() => setDays(d)}>Ultimele {d} zile</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Mesaje trimise" value={m.sent} tone="neutral" />
        <Kpi label="Rată de livrare" value={`${m.deliveryRate}%`} tone={m.sent && m.deliveryRate < 80 ? "yellow" : "neutral"} hint={`${m.delivered} livrate`} />
        <Kpi label="Rată de citire" value={`${m.readRate}%`} tone="neutral" hint={`${m.read} citite`} />
        <Kpi label="Rată de răspuns" value={`${m.replyRate}%`} tone="neutral" hint={`${m.replied} răspunsuri`} />
        <Kpi label="Rată de eroare" value={`${m.errorRate}%`} tone={m.errorRate >= 10 ? "red" : m.errorRate > 0 ? "yellow" : "green"} hint={`${m.failedReal} eșecuri reale`} />
        <Kpi label="Erori de cont Meta" value={m.critical} tone={m.critical ? "red" : "neutral"} hint="131042 / 131031" />
        <Kpi label="Normale (fără acțiune)" value={m.benign} tone="neutral" hint="nu intră în rata de eroare" />
        <Kpi label="Mesaje primite" value={inbound.data ? (days === 7 ? inbound.data.d7 : inbound.data.d30) : "…"} tone="neutral" hint="de la clienți și proprietari" />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Rapoarte detaliate</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {["whatsapp-activity-report", "whatsapp-daily-report", "whatsapp-template-efficiency", "whatsapp-funnel", "whatsapp-analytics", "whatsapp-history"].map((v) => (
            <Button key={v} variant="outline" className="min-h-12 justify-start" onMouseEnter={() => prefetchAdminTab(v)} onClick={() => onOpen(v)}>
              {findTab(v)?.label ?? v}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Toate instrumentele (paginile existente, neschimbate) ──────────────────
function ToolsSection({ view, onOpen, onBack }: { view: string | null; onOpen: (v: string) => void; onBack: () => void }) {
  if (view && HUB_TOOL_VIEWS.includes(view)) {
    const C = getAdminTabComponent(view);
    return (
      <div className="space-y-3">
        <Button variant="ghost" className="min-h-12 gap-2" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Toate instrumentele</Button>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>{C ? <C /> : null}</Suspense>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {HUB_TOOL_GROUPS.map((g) => (
        <section key={g.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.views.map((v) => (
              <Button key={v} variant="outline" className="min-h-12 justify-start" onMouseEnter={() => prefetchAdminTab(v)} onFocus={() => prefetchAdminTab(v)} onClick={() => onOpen(v)}>
                {findTab(v)?.label ?? v}
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Acțiuni rapide ─────────────────────────────────────────────────────────
function RetryDialog({ open, onOpenChange, counts, paused, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; counts: Record<QueueBucket, number>; paused: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await invokeHub({ action: "retry", unpause: true, run_worker: true });
      const w = r.worker ?? {};
      toast({
        title: "Coada a fost procesată",
        description: `Reluate: ${r.retried}${r.unpaused ? " · trimiterile au fost reactivate" : ""}${w.rate_limited ? " · limita orară e atinsă, restul pleacă mai târziu" : ""}`,
      });
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Nu am putut debloca coada", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reîncerci și deblochezi coada?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left text-sm text-muted-foreground">
              <p>Se întâmplă următoarele:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{counts.retryable} mesaje eșuate tehnic revin în coadă.</li>
                {paused && <li>Trimiterile automate, acum oprite, pornesc din nou.</li>}
                <li>Mesajele pleacă doar în orele de trimitere, cu limitele anti-spam.</li>
              </ul>
              <p>
                Nu se reiau: {counts.critical} cu eroare de cont Meta (doar individual, după rezolvare), {counts.uncertain} posibil trimise și numerele fără WhatsApp sau excluse.
              </p>
              <p>Acțiunea se notează în jurnalul de audit.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-12">Renunță</AlertDialogCancel>
          <AlertDialogAction className="min-h-12" disabled={busy} onClick={(e) => { e.preventDefault(); void run(); }}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Da, reîncearcă
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TestSendDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [targets, setTargets] = useState<{ id: number; label: string }[] | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [tpl, setTpl] = useState<string>(TEST_TEMPLATES[0].name);
  const [zone, setZone] = useState("Cetate");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open || targets !== null) return;
    let cancelled = false;
    invokeHub({ action: "test_targets" })
      .then((r) => {
        if (cancelled) return;
        setTargets(r.targets ?? []);
        if (r.targets?.length) setTarget(r.targets[0].id);
      })
      .catch((e) => { if (!cancelled) setResult({ ok: false, text: (e as Error).message }); });
    return () => { cancelled = true; };
  }, [open, targets]);

  const onOpen = (o: boolean) => {
    onOpenChange(o);
    if (!o) { setStep("form"); setResult(null); }
  };

  const send = async () => {
    if (target === null) return;
    setBusy(true);
    try {
      const r = await invokeHub({ action: "test_send", target, template: tpl, zone });
      if (r.ok) {
        setResult({ ok: true, text: `Trimis către ${r.to}. Răspunsul apare în Istoric WhatsApp.` });
        toast({ title: "Mesaj de test trimis" });
      } else {
        setResult({ ok: false, text: `Meta a refuzat mesajul${r.code ? ` (cod ${r.code})` : ""}: ${r.detail}` });
      }
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
      setStep("form");
    }
  };

  const label = targets?.find((t) => t.id === target)?.label ?? "—";
  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trimite mesaj test</DialogTitle>
          <DialogDescription>
            Doar către numerele interne RealTrust, cu un șablon aprobat de Meta. Maximum 5 teste pe oră.
          </DialogDescription>
        </DialogHeader>
        {step === "form" ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Număr de test</Label>
              <div className="flex flex-wrap gap-2">
                {targets === null ? <Skeleton className="h-10 w-full" /> : targets.map((t) => (
                  <Button key={t.id} size="sm" variant={target === t.id ? "default" : "outline"} className="min-h-12" onClick={() => setTarget(t.id)}>{t.label}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Șablon</Label>
              <div className="flex flex-wrap gap-2">
                {TEST_TEMPLATES.map((t) => (
                  <Button key={t.name} size="sm" variant={tpl === t.name ? "default" : "outline"} className="min-h-12" onClick={() => setTpl(t.name)}>{t.label}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wa-hub-test-zone">Zona din mesaj</Label>
              <Input id="wa-hub-test-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="h-11" maxLength={40} />
            </div>
            {result && (
              <p className={`text-sm flex items-start gap-2 ${result.ok ? "text-success" : "text-destructive"}`}>
                {result.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                {result.text}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-warning/50 bg-warning-soft p-3 text-sm text-foreground flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Pleacă un mesaj real de pe numărul companiei către <strong>{label}</strong>, cu șablonul „{TEST_TEMPLATES.find((t) => t.name === tpl)?.label}”. Se notează în jurnalul de audit.</span>
          </div>
        )}
        <DialogFooter className="gap-2">
          {step === "form" ? (
            <>
              <Button variant="outline" className="min-h-12" onClick={() => onOpen(false)}>Închide</Button>
              <Button className="min-h-12" disabled={target === null} onClick={() => { setResult(null); setStep("confirm"); }}>
                <Send className="h-4 w-4 mr-2" /> Continuă
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="min-h-12" onClick={() => setStep("form")}>Înapoi</Button>
              <Button className="min-h-12" disabled={busy} onClick={() => void send()}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm, trimite testul
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
