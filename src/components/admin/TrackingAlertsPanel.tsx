import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, BellRing, PlayCircle, Save } from "lucide-react";

interface DayRow { day: string; sessions: number; conversions: number }

interface Settings {
  enabled: boolean;
  threshold_pct: number;
  min_sessions: number;
  notify_emails: string[];
}

interface LogRow {
  id: string;
  checked_on: string;
  current_day: string | null;
  previous_day: string | null;
  current_sessions: number;
  previous_sessions: number;
  drop_pct: number | null;
  alerted: boolean;
  note: string | null;
}

const shortDay = (iso: string) => iso.slice(5).replace("-", "/");

const TrackingAlertsPanel = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Settings | null>(null);

  const seriesQuery = useQuery({
    queryKey: ["ga4-daily-sessions"],
    queryFn: async (): Promise<DayRow[]> => {
      const { data, error } = await supabase.rpc("get_ga4_daily_sessions", { p_days: 21 });
      if (error) throw error;
      return (data as unknown as DayRow[]) ?? [];
    },
    staleTime: 300_000,
  });

  const settingsQuery = useQuery({
    queryKey: ["tracking-alert-settings"],
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase
        .from("tracking_alert_settings")
        .select("enabled, threshold_pct, min_sessions, notify_emails")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return (data as Settings) ?? { enabled: true, threshold_pct: 50, min_sessions: 20, notify_emails: [] };
    },
  });

  const logQuery = useQuery({
    queryKey: ["tracking-alert-log"],
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from("tracking_alert_log")
        .select("id, checked_on, current_day, previous_day, current_sessions, previous_sessions, drop_pct, alerted, note")
        .order("checked_on", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data as LogRow[]) ?? [];
    },
  });

  const settings = draft ?? settingsQuery.data ?? null;

  const saveMutation = useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase
        .from("tracking_alert_settings")
        .update({
          enabled: next.enabled,
          threshold_pct: next.threshold_pct,
          min_sessions: next.min_sessions,
          notify_emails: next.notify_emails,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["tracking-alert-settings"] });
      toast({ title: "Setări salvate", description: "Pragul de alertă a fost actualizat." });
    },
    onError: (e: unknown) =>
      toast({
        title: "Salvarea a eșuat",
        description: e instanceof Error ? e.message : "Eroare necunoscută",
        variant: "destructive",
      }),
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ga4-tracking-alert", { body: {} });
      if (error) throw error;
      return data as { alerted?: boolean; drop_pct?: number; note?: string; status?: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tracking-alert-log"] });
      toast({
        title: data?.alerted ? "Alertă trimisă" : "Verificare finalizată",
        description: data?.status === "insufficient_data"
          ? "Nu există suficiente zile cu date GA4 pentru comparație."
          : data?.note ?? "Fără anomalii detectate.",
        variant: data?.alerted ? "destructive" : undefined,
      });
    },
    onError: (e: unknown) =>
      toast({
        title: "Verificarea a eșuat",
        description: e instanceof Error ? e.message : "Eroare necunoscută",
        variant: "destructive",
      }),
  });

  const series = seriesQuery.data ?? [];
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const currentDrop = prev && prev.sessions > 0 && last
    ? Math.round(((prev.sessions - last.sessions) / prev.sessions) * 1000) / 10
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              Alerte tracking GA4
            </CardTitle>
            <CardDescription>
              Compară zilnic sesiunile GA4 și trimite email dacă apare o scădere bruscă (semn de tag rupt,
              consimțământ blocat sau script blocat de AdBlocker).
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            aria-label="Rulează acum verificarea de tracking"
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {runMutation.isPending ? "Se verifică…" : "Verifică acum"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {seriesQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : series.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Nu există încă date GA4 importate.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">Ultima zi: {last?.day} · {last?.sessions} sesiuni</Badge>
                {currentDrop !== null && (
                  <Badge variant={currentDrop > (settings?.threshold_pct ?? 50) ? "destructive" : "secondary"}>
                    {currentDrop > 0 ? `−${currentDrop}%` : `+${Math.abs(currentDrop)}%`} vs ziua anterioară
                  </Badge>
                )}
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tickFormatter={shortDay} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      name="Sesiuni"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.18)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {settings && (
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <Label htmlFor="tracking-alert-enabled" className="text-sm">
                  Alerte active
                  <span className="block text-xs font-normal text-muted-foreground">
                    Verificare automată zilnică, după importul GA4.
                  </span>
                </Label>
                <Switch
                  id="tracking-alert-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(v) => setDraft({ ...settings, enabled: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tracking-threshold" className="text-xs">Prag scădere (%)</Label>
                <Input
                  id="tracking-threshold"
                  type="number"
                  min={5}
                  max={95}
                  value={settings.threshold_pct}
                  onChange={(e) => setDraft({ ...settings, threshold_pct: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tracking-min-sessions" className="text-xs">Minim sesiuni pentru alertă</Label>
                <Input
                  id="tracking-min-sessions"
                  type="number"
                  min={0}
                  value={settings.min_sessions}
                  onChange={(e) => setDraft({ ...settings, min_sessions: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tracking-emails" className="text-xs">Emailuri notificate (separate prin virgulă)</Label>
                <Input
                  id="tracking-emails"
                  value={settings.notify_emails.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...settings,
                      notify_emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate(settings)}
                  disabled={!draft || saveMutation.isPending}
                  aria-label="Salvează setările de alertă"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {saveMutation.isPending ? "Se salvează…" : "Salvează setările"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Istoric verificări
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (logQuery.data?.length ?? 0) === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Nicio verificare înregistrată încă.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Anterior</TableHead>
                  <TableHead className="text-right">Curent</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logQuery.data!.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{row.checked_on}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.previous_sessions}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.current_sessions}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.drop_pct !== null ? `${row.drop_pct}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {row.alerted ? (
                        <Badge variant="destructive">Alertă</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.note ?? "OK"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackingAlertsPanel;
