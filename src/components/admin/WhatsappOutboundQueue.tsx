import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { RevealableField } from "@/components/admin/shared/RevealableField";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Send, Ban, RefreshCw, Download, Loader2, Radio, ShieldAlert, Clock, MessageSquare,
  Pencil, RotateCcw, History,
} from "lucide-react";
import { WhatsappQueueTimeline } from "@/components/admin/whatsapp/WhatsappQueueTimeline";
import {
  WhatsappQueueEditDialog, type EditableQueueItem,
} from "@/components/admin/whatsapp/WhatsappQueueEditDialog";

type QueueRow = {
  id: string;
  phone_normalized: string;
  prospect_listing_id: string | null;
  lead_id: string | null;
  template_name: string;
  template_language: string;
  status: string;
  priority: number;
  attempts: number;
  last_error: string | null;
  source: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
  conversation_id: string | null;
  template_params: unknown;
  wa_message_id: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
};

type RateSettings = {
  outbound_max_per_hour: number;
  outbound_max_per_day: number;
  outbound_min_delay_seconds: number;
  outbound_max_delay_seconds: number;
};

const STATUSES = ["pending", "sending", "sent", "failed", "replied", "cancelled"] as const;

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "În așteptare", variant: "outline" },
  sending: { label: "Se trimite", variant: "secondary" },
  sent: { label: "Trimis", variant: "default" },
  failed: { label: "Eșuat", variant: "destructive" },
  replied: { label: "A răspuns", variant: "default" },
  cancelled: { label: "Anulat", variant: "secondary" },
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—";

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Prevent CSV formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export default function WhatsappOutboundQueue() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [workerBusy, setWorkerBusy] = useState(false);
  const [settings, setSettings] = useState<RateSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<EditableQueueItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("wa_outbound_queue")
      .select(
        "id, phone_normalized, prospect_listing_id, lead_id, template_name, template_language, template_params, status, priority, attempts, last_error, source, scheduled_at, sent_at, created_at, conversation_id, wa_message_id, delivered_at, read_at, replied_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast({ title: "Eroare la încărcarea cozii", description: error.message, variant: "destructive" });
    setRows((data ?? []) as QueueRow[]);
    setLoading(false);
  }, [statusFilter]);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("wa_agent_settings")
      .select("outbound_max_per_hour, outbound_max_per_day, outbound_min_delay_seconds, outbound_max_delay_seconds")
      .eq("id", 1)
      .maybeSingle();
    if (data) setSettings(data as RateSettings);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const { connected } = useRealtimeChannel("admin-wa-outbound-queue", [
    { event: "*", table: "wa_outbound_queue", handler: () => { void load(); } },
  ], [statusFilter]) as unknown as { connected: boolean };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.phone_normalized?.toLowerCase().includes(s) ||
        r.template_name?.toLowerCase().includes(s) ||
        (r.source ?? "").toLowerCase().includes(s),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const now = Date.now();
    const sent = rows.filter((r) => r.status === "sent" || r.status === "replied");
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      sent: sent.length,
      failed: rows.filter((r) => r.status === "failed").length,
      replied: rows.filter((r) => r.status === "replied").length,
      lastHour: rows.filter((r) => r.sent_at && now - new Date(r.sent_at).getTime() < 3_600_000).length,
      lastDay: rows.filter((r) => r.sent_at && now - new Date(r.sent_at).getTime() < 86_400_000).length,
    };
  }, [rows]);

  const replyRate = stats.sent ? Math.round((stats.replied / stats.sent) * 100) : 0;

  const delivery = useMemo(() => {
    const sent = rows.filter((r) => r.sent_at);
    const delivered = sent.filter((r) => r.delivered_at).length;
    const read = sent.filter((r) => r.read_at).length;
    const replied = sent.filter((r) => r.replied_at || r.status === "replied").length;
    const pct = (n: number) => (sent.length ? Math.round((n / sent.length) * 100) : 0);
    return {
      total: sent.length,
      delivered, read, replied,
      deliveryRate: pct(delivered),
      readRate: pct(read),
      conversionRate: pct(replied),
    };
  }, [rows]);

  const retryItem = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("wa_outbound_queue")
      .update({
        status: "pending",
        last_error: null,
        scheduled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "failed");
    setBusyId(null);
    if (error) {
      toast({ title: "Repornirea a eșuat", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mesaj repornit", description: "A fost reprogramat pentru trimitere." });
    await load();
  };

  const forceSend = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("wa-outbound-queue-worker", {
        body: { queue_id: id, force: true, batch_size: 1 },
      });
      if (error) throw error;
      toast({ title: "Trimitere forțată", description: JSON.stringify(data?.results?.[0] ?? data) });
      await load();
    } catch (e) {
      toast({ title: "Trimiterea a eșuat", description: String(e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const cancelItem = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("wa_outbound_queue")
      .update({ status: "cancelled", last_error: "Anulat manual din Admin" })
      .eq("id", id)
      .in("status", ["pending", "failed"]);
    setBusyId(null);
    if (error) {
      toast({ title: "Nu s-a putut anula", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Element anulat" });
    await load();
  };

  const runWorker = async () => {
    setWorkerBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("wa-outbound-queue-worker", {
        body: { batch_size: 10 },
      });
      if (error) throw error;
      if (data?.rate_limited) {
        toast({
          title: "Limită atinsă",
          description: `Trimise ultima oră: ${data.sent_last_hour}/${data.max_per_hour}, ultima zi: ${data.sent_last_day}/${data.max_per_day}`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Coadă procesată", description: `Procesate: ${data?.processed ?? 0}` });
      }
      await load();
    } catch (e) {
      toast({ title: "Worker eșuat", description: String(e), variant: "destructive" });
    } finally {
      setWorkerBusy(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "id", "telefon", "status", "sablon", "limba", "sursa", "prioritate",
      "incercari", "programat_la", "trimis_la", "livrat_la", "citit_la", "raspuns_la",
      "creat_la", "conversatie_id", "eroare",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push([
        r.id, r.phone_normalized, r.status, r.template_name, r.template_language, r.source,
        r.priority, r.attempts, r.scheduled_at, r.sent_at, r.delivered_at, r.read_at, r.replied_at,
        r.created_at, r.conversation_id, r.last_error,
      ].map(csvCell).join(","));
    }
    lines.push("");
    lines.push([csvCell("Total"), csvCell(filtered.length)].join(","));
    lines.push([csvCell("Rata de răspuns"), csvCell(`${replyRate}%`)].join(","));
    lines.push([csvCell("Rata de livrare"), csvCell(`${delivery.deliveryRate}%`)].join(","));
    lines.push([csvCell("Rata de citire"), csvCell(`${delivery.readRate}%`)].join(","));
    lines.push([csvCell("Rata de conversie în răspuns"), csvCell(`${delivery.conversionRate}%`)].join(","));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wa-outbound-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveSettings = async () => {
    if (!settings) return;
    if (settings.outbound_min_delay_seconds > settings.outbound_max_delay_seconds) {
      toast({ title: "Delay invalid", description: "Minimul trebuie ≤ maximul.", variant: "destructive" });
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase.from("wa_agent_settings").update(settings).eq("id", 1);
    setSavingSettings(false);
    if (error) {
      toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Setări salvate" });
  };

  const numField = (k: keyof RateSettings, label: string, hint: string) => (
    <div className="space-y-1">
      <Label htmlFor={k} className="text-xs">{label}</Label>
      <Input
        id={k}
        type="number"
        min={0}
        value={settings?.[k] ?? 0}
        onChange={(e) =>
          setSettings((s) => (s ? { ...s, [k]: Math.max(0, Number(e.target.value) || 0) } : s))
        }
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );

  return (
    <AdminPageShell
      icon={MessageSquare}
      title="Coadă Outbound WhatsApp"
      description="Mesajele template trimise proactiv de Andrei către proprietari, cu protecții anti-spam."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connected ? "default" : "outline"} className="gap-1">
            <Radio className="h-3 w-3" /> {connected ? "Live" : "Offline"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Reîncarcă coada">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> Export raport audit
          </Button>
          <Button size="sm" onClick={() => void runWorker()} disabled={workerBusy}>
            {workerBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Procesează coada
          </Button>
        </div>
      }
      stats={
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "În așteptare", value: stats.pending },
            { label: "Trimise", value: stats.sent },
            { label: "Eșuate", value: stats.failed },
            { label: "Răspunsuri", value: `${stats.replied} (${replyRate}%)` },
            { label: "Ultima oră", value: `${stats.lastHour}/${settings?.outbound_max_per_hour ?? "—"}` },
            { label: "Ultima zi", value: `${stats.lastDay}/${settings?.outbound_max_per_day ?? "—"}` },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Caută telefon, șablon sau sursă…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" aria-label="Filtrează după status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate statusurile</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Raport rate delivery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Rata de livrare", value: delivery.deliveryRate, count: delivery.delivered },
              { label: "Rata de citire", value: delivery.readRate, count: delivery.read },
              { label: "Conversie în răspuns", value: delivery.conversionRate, count: delivery.replied },
            ].map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold text-foreground">{m.value}%</p>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${m.value}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {m.count} din {delivery.total} mesaje trimise
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Protecții & Rate limiting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {numField("outbound_max_per_hour", "Max mesaje / oră", "0 = trimiterile automate sunt oprite.")}
            {numField("outbound_max_per_day", "Max mesaje / zi", "Plafon zilnic Meta.")}
            {numField("outbound_min_delay_seconds", "Delay minim (sec)", "Recomandat 30s.")}
            {numField("outbound_max_delay_seconds", "Delay maxim (sec)", "Recomandat 90s.")}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void saveSettings()} disabled={savingSettings || !settings}>
              {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvează setările
            </Button>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Între trimiteri se aplică un delay aleator în intervalul configurat.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {["Telefon", "Status", "Șablon", "Sursă", "Încercări", "Programat", "Trimis", "Acțiuni"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium text-xs text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </td></tr>
            )}
            {!loading && !filtered.length && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                Nicio intrare în coadă pentru filtrele selectate.
              </td></tr>
            )}
            {!loading && filtered.map((r) => {
              const meta = STATUS_META[r.status] ?? { label: r.status, variant: "outline" as const };
              const canAct = r.status === "pending" || r.status === "failed";
              return (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <RevealableField
                      value={r.phone_normalized}
                      kind="phone"
                      tableName="wa_outbound_queue"
                      recordId={r.id}
                      field="phone_normalized"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {r.last_error && (
                      <p className="text-[10px] text-destructive mt-1 max-w-[220px] truncate" title={r.last_error}>
                        {r.last_error}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {r.template_name} <span className="text-muted-foreground">({r.template_language})</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.source ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.attempts}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{fmt(r.scheduled_at)}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{fmt(r.sent_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Trimite acum"
                        title="Trimite acum (ignoră programarea și limitele)"
                        disabled={!canAct || busyId === r.id}
                        onClick={() => void forceSend(r.id)}
                      >
                        {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Editează mesajul"
                        title="Editează variabilele șablonului"
                        disabled={r.status !== "pending"}
                        onClick={() => setEditItem({
                          id: r.id,
                          template_name: r.template_name,
                          template_language: r.template_language,
                          template_params: r.template_params,
                          status: r.status,
                        })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Repornește mesajul eșuat"
                        title="Repornește mesajul eșuat"
                        disabled={r.status !== "failed" || busyId === r.id}
                        onClick={() => void retryItem(r.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Vezi timeline evenimente"
                        title="Vezi timeline evenimente"
                        onClick={() => setTimelineId(r.id)}
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Anulează din coadă"
                        title="Anulează din coadă"
                        disabled={!canAct || busyId === r.id}
                        onClick={() => void cancelItem(r.id)}
                      >
                        <Ban className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <WhatsappQueueTimeline queueId={timelineId} onClose={() => setTimelineId(null)} />
      <WhatsappQueueEditDialog
        item={editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => void load()}
      />
    </AdminPageShell>
  );
}
