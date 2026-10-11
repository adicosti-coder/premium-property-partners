import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, RefreshCw, Loader2, PhoneIncoming, PhoneOutgoing, Voicemail, XCircle } from "lucide-react";

interface CallRow {
  id: string;
  to_number: string | null;
  direction: string | null;
  status: string | null;
  answered_by: string | null;
  is_voicemail: boolean | null;
  amd_hangup: boolean | null;
  call_duration_seconds: number | null;
  twilio_failure_reason: string | null;
  error_message: string | null;
  initiated_by: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

function statusBadge(row: CallRow) {
  const s = (row.status || "").toLowerCase();
  if (row.is_voicemail) return <Badge variant="outline" className="border-amber-500/50 text-amber-600"><Voicemail className="h-3 w-3 mr-1" />Voicemail</Badge>;
  if (s === "completed" || s === "in-progress") return <Badge className="bg-green-600">Răspuns</Badge>;
  if (s === "failed" || s === "busy" || s === "no-answer" || s === "canceled") return <Badge variant="destructive">{s === "no-answer" ? "Fără răspuns" : s === "busy" ? "Ocupat" : "Eșuat"}</Badge>;
  if (s === "initiated" || s === "ringing" || s === "queued") return <Badge variant="secondary">Inițiat…</Badge>;
  return <Badge variant="outline">{row.status || "—"}</Badge>;
}

function fmtDuration(sec: number | null) {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function TwilioCallsLog() {
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("voice_call_sessions")
      .select("id,to_number,direction,status,answered_by,is_voicemail,amd_hangup,call_duration_seconds,twilio_failure_reason,error_message,initiated_by,created_at,started_at,ended_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (err) setError(err.message);
    else setRows((data as CallRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-blue-500" /> Jurnal apeluri Twilio
            </CardTitle>
            <CardDescription>Ultimele 20 de apeluri: inițiat, răspuns, durată, statut. Se actualizează la 30s.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive mb-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
        {rows.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">Niciun apel înregistrat încă.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Inițiat</th>
                  <th className="py-2 pr-3 font-medium">Număr</th>
                  <th className="py-2 pr-3 font-medium">Direcție</th>
                  <th className="py-2 pr-3 font-medium">Statut</th>
                  <th className="py-2 pr-3 font-medium">Durată</th>
                  <th className="py-2 font-medium">Detalii</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(r.created_at)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.to_number || "—"}</td>
                    <td className="py-2 pr-3">
                      {r.direction === "inbound"
                        ? <PhoneIncoming className="h-3.5 w-3.5 text-green-600" aria-label="Primite" />
                        : <PhoneOutgoing className="h-3.5 w-3.5 text-blue-600" aria-label="Efectuate" />}
                    </td>
                    <td className="py-2 pr-3">{statusBadge(r)}</td>
                    <td className="py-2 pr-3">{fmtDuration(r.call_duration_seconds)}</td>
                    <td className="py-2 text-xs text-muted-foreground max-w-[220px] truncate" title={r.twilio_failure_reason || r.error_message || ""}>
                      {r.twilio_failure_reason || r.error_message || r.answered_by || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
