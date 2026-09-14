import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/automation/StatCard";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import {
  RefreshCw, Loader2, Clock, Send, CheckCircle2, XCircle, MessageSquare, Ban,
} from "lucide-react";

type Row = {
  id: string;
  phone_normalized: string;
  status: string;
  template_name: string;
  attempts: number;
  last_error: string | null;
  source: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "—";

const maskPhone = (p: string) => (p?.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : p);

/** Traduce codurile de eroare Meta cele mai frecvente în limbaj clar. */
const metaReason = (err: string | null) => {
  if (!err) return "Motiv necunoscut";
  const e = err.toLowerCase();
  if (e.includes("133010")) return "Numărul expeditor nu e înregistrat în Meta";
  if (e.includes("131047")) return "Fereastra de 24h expirată — e nevoie de șablon aprobat";
  if (e.includes("132001")) return "Șablon inexistent sau neaprobat";
  if (e.includes("131026")) return "Destinatarul nu poate primi mesaje (fără WhatsApp)";
  if (e.includes("470") || e.includes("re-engagement")) return "Necesită mesaj de re-angajare";
  if (e.includes("invalid parameter")) return "Parametru invalid trimis către Meta";
  if (e.includes("duplicat")) return "Duplicat — mesaj deja trimis recent";
  if (e.includes("excludere")) return "Număr în lista de excludere";
  return err.slice(0, 160);
};

export default function WhatsappAutomationDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wa_outbound_queue")
      .select(
        "id, phone_normalized, status, template_name, attempts, last_error, source, scheduled_at, sent_at, delivered_at, read_at, replied_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) setError(error.message);
    else {
      setError(null);
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useRealtimeChannel("wa-automation-dashboard", [
    { event: "*", schema: "public", table: "wa_outbound_queue", callback: () => void load() },
  ]);

  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    const sent = rows.filter((r) => r.sent_at);
    const delivered = sent.filter((r) => r.delivered_at).length;
    const dayAgo = Date.now() - 86_400_000;
    return {
      pending: by("pending"),
      sending: by("sending"),
      sent: by("sent"),
      replied: by("replied"),
      failed: by("failed"),
      cancelled: by("cancelled"),
      sentToday: sent.filter((r) => new Date(r.sent_at!).getTime() > dayAgo).length,
      deliveryRate: sent.length ? Math.round((delivered / sent.length) * 100) : 0,
      replyRate: sent.length
        ? Math.round((rows.filter((r) => r.replied_at).length / sent.length) * 100)
        : 0,
    };
  }, [rows]);

  const failedRows = useMemo(
    () => rows.filter((r) => r.status === "failed").slice(0, 30),
    [rows],
  );
  const upcoming = useMemo(
    () =>
      rows
        .filter((r) => r.status === "pending")
        .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
        .slice(0, 10),
    [rows],
  );

  return (
    <AdminPageShell
      title="Dashboard WhatsApp"
      description="Câte mesaje sunt în coadă, câte au plecat și câte au eșuat, cu motivul primit de la Meta."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Reîmprospătează</span>
        </Button>
      }
    >
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Nu am putut încărca datele: {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="În coadă" value={stats.pending} icon={<Clock className="w-3 h-3" />} highlight={stats.pending > 0} />
        <StatCard label="În trimitere" value={stats.sending} icon={<Send className="w-3 h-3" />} />
        <StatCard label="Trimise" value={stats.sent} icon={<CheckCircle2 className="w-3 h-3" />} />
        <StatCard label="Eșuate" value={stats.failed} icon={<XCircle className="w-3 h-3" />} warn={stats.failed > 0} />
        <StatCard label="Cu răspuns" value={stats.replied} icon={<MessageSquare className="w-3 h-3" />} highlight={stats.replied > 0} />
        <StatCard label="Anulate" value={stats.cancelled} icon={<Ban className="w-3 h-3" />} />
        <StatCard label="Trimise (24h)" value={stats.sentToday} />
        <StatCard label="Rată livrare" value={`${stats.deliveryRate}%`} warn={stats.deliveryRate < 80 && stats.sent > 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" /> Mesaje eșuate și motivul de la Meta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !rows.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă…
            </div>
          ) : failedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun mesaj eșuat. </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Destinatar</th>
                    <th className="py-2 pr-3">Șablon</th>
                    <th className="py-2 pr-3">Încercări</th>
                    <th className="py-2 pr-3">Motiv Meta</th>
                    <th className="py-2">Ultima încercare</th>
                  </tr>
                </thead>
                <tbody>
                  {failedRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3 font-mono text-xs">{maskPhone(r.phone_normalized)}</td>
                      <td className="py-2 pr-3">{r.template_name}</td>
                      <td className="py-2 pr-3">{r.attempts}</td>
                      <td className="py-2 pr-3">
                        <div>{metaReason(r.last_error)}</div>
                        {r.last_error && (
                          <div className="text-[11px] text-muted-foreground break-all">{r.last_error.slice(0, 200)}</div>
                        )}
                      </td>
                      <td className="py-2 whitespace-nowrap text-xs">{fmt(r.scheduled_at ?? r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Următoarele mesaje programate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Coada este goală.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <span className="font-mono text-xs">{maskPhone(r.phone_normalized)}</span>
                  <span className="truncate">{r.template_name}</span>
                  <Badge variant="outline" className="text-[11px]">{r.source ?? "manual"}</Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(r.scheduled_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
