import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart3, Download, FileText, Mail, RefreshCw, TrendingDown, TrendingUp, Users, MousePointerClick, Flame,
} from "lucide-react";

interface ChannelRow {
  channel: string;
  leads: number;
  hot_leads: number;
  avg_score: number | null;
  campaigns: string[] | null;
}

interface Report {
  period_days: number;
  from: string;
  to: string;
  total_leads: number;
  hot_leads: number;
  avg_score: number | null;
  previous_period_leads: number;
  cta_sessions: number;
  conversion_rate: number | null;
  by_channel: ChannelRow[];
  by_cta_variant: Array<{ variant: string; leads: number }>;
  by_landing_path: Array<{ landing_path: string; leads: number }>;
}

const PERIODS = [
  { days: 7, label: "Săptămânal" },
  { days: 30, label: "Lunar" },
  { days: 90, label: "Trimestrial" },
] as const;

/** Groups the raw channel labels into the 4 acquisition buckets we report on. */
type Bucket = "Google Ads" | "Meta Ads" | "WhatsApp Outreach" | "Organic / Direct";

const BUCKET_COLORS: Record<Bucket, string> = {
  "Google Ads": "hsl(217 91% 60%)",
  "Meta Ads": "hsl(266 85% 62%)",
  "WhatsApp Outreach": "hsl(142 70% 45%)",
  "Organic / Direct": "hsl(43 74% 49%)",
};

const bucketOf = (channel: string): Bucket => {
  const c = channel.toLowerCase();
  if (c.includes("gclid") || c.includes("google") || c.includes("adwords")) return "Google Ads";
  if (c.includes("fbclid") || c.includes("meta") || c.includes("facebook") || c.includes("instagram")) return "Meta Ads";
  if (c.includes("outreach") || c.includes("whatsapp") || c.includes("wa_")) return "WhatsApp Outreach";
  return "Organic / Direct";
};

const bucketize = (rows: ChannelRow[]) => {
  const map = new Map<Bucket, { bucket: Bucket; leads: number; hot_leads: number }>();
  (Object.keys(BUCKET_COLORS) as Bucket[]).forEach((b) => map.set(b, { bucket: b, leads: 0, hot_leads: 0 }));
  rows.forEach((r) => {
    const entry = map.get(bucketOf(r.channel))!;
    entry.leads += r.leads;
    entry.hot_leads += r.hot_leads;
  });
  return Array.from(map.values());
};

const Stat = ({
  icon: Icon, label, value, hint,
}: { icon: typeof Users; label: string; value: string; hint?: string }) => (
  <div className="rounded-lg border bg-muted/40 p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </div>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};


const WeeklyConversionReport = () => {
  const [days, setDays] = useState<number>(7);
  const { toast } = useToast();

  const reportQuery = useQuery({
    queryKey: ["conversion-attribution-report", days],
    queryFn: async (): Promise<Report> => {
      const { data, error } = await supabase.rpc("get_conversion_attribution_report", { p_days: days });
      if (error) throw error;
      return data as unknown as Report;
    },
    staleTime: 60_000,
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("weekly-conversion-report", {
        body: { days, send_email: true },
      });
      if (error) throw error;
      return data as { emailed?: string };
    },
    onSuccess: (data) => {
      const status = data?.emailed;
      toast({
        title: status === "sent" ? "Raport trimis" : "Raport generat",
        description:
          status === "sent"
            ? "Digestul a plecat către contact@realtrust.ro."
            : status === "skipped_no_resend_key"
              ? "Emailul nu a putut fi trimis (serviciul de email nu este configurat)."
              : `Status email: ${status ?? "necunoscut"}`,
        variant: status === "sent" ? undefined : "destructive",
      });
    },
    onError: (err: unknown) => {
      toast({
        title: "Trimiterea a eșuat",
        description: err instanceof Error ? err.message : "Eroare necunoscută",
        variant: "destructive",
      });
    },
  });

  const report = reportQuery.data;
  const delta = report ? report.total_leads - report.previous_period_leads : 0;
  const buckets = report ? bucketize(report.by_channel) : [];
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? `${days} zile`;
  const stamp = new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push(["Raport conversii RealTrust", periodLabel, `${days} zile`, `generat ${stamp}`].map(csvCell).join(","));
    lines.push("");
    lines.push(["Indicator", "Valoare"].join(","));
    lines.push(["Lead-uri", report.total_leads].map(csvCell).join(","));
    lines.push(["Lead-uri fierbinți", report.hot_leads].map(csvCell).join(","));
    lines.push(["Sesiuni CTA", report.cta_sessions].map(csvCell).join(","));
    lines.push(["Rata de conversie (%)", report.conversion_rate ?? ""].map(csvCell).join(","));
    lines.push(["Perioada anterioară (lead-uri)", report.previous_period_leads].map(csvCell).join(","));
    lines.push("");
    lines.push(["Canal (grupat)", "Lead-uri", "Fierbinți"].join(","));
    buckets.forEach((b) => lines.push([b.bucket, b.leads, b.hot_leads].map(csvCell).join(",")));
    lines.push("");
    lines.push(["Sursă detaliată", "Lead-uri", "Fierbinți", "Scor mediu", "Campanii"].join(","));
    report.by_channel.forEach((c) =>
      lines.push([c.channel, c.leads, c.hot_leads, c.avg_score ?? "", (c.campaigns ?? []).join(" | ")].map(csvCell).join(",")),
    );
    lines.push("");
    lines.push(["Variantă CTA", "Lead-uri"].join(","));
    report.by_cta_variant.forEach((v) => lines.push([v.variant, v.leads].map(csvCell).join(",")));
    lines.push("");
    lines.push(["Pagină de intrare", "Lead-uri"].join(","));
    report.by_landing_path.forEach((p) => lines.push([p.landing_path, p.leads].map(csvCell).join(",")));

    downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      `raport-conversii-${days}z-${stamp}.csv`);
    toast({ title: "CSV descărcat", description: `Raport ${periodLabel.toLowerCase()} (${days} zile).` });
  };

  const exportPdf = async () => {
    if (!report) return;
    const [{ default: JsPDF }, autoTable] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable").then((m) => m.default),
    ]);
    const doc = new JsPDF();
    doc.setFontSize(15);
    doc.text("Raport conversii & atribuire — RealTrust", 14, 18);
    doc.setFontSize(10);
    doc.text(`Perioada: ${periodLabel} (${days} zile) · generat ${stamp}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [["Indicator", "Valoare"]],
      body: [
        ["Lead-uri", String(report.total_leads)],
        ["Lead-uri fierbinti (scor >= 60)", String(report.hot_leads)],
        ["Sesiuni CTA", String(report.cta_sessions)],
        ["Rata de conversie", report.conversion_rate !== null ? `${report.conversion_rate}%` : "-"],
        ["Perioada anterioara", String(report.previous_period_leads)],
      ],
      styles: { fontSize: 9 },
    });

    autoTable(doc, {
      head: [["Canal", "Lead-uri", "Fierbinti"]],
      body: buckets.map((b) => [b.bucket, String(b.leads), String(b.hot_leads)]),
      styles: { fontSize: 9 },
    });

    autoTable(doc, {
      head: [["Sursa detaliata", "Lead-uri", "Fierbinti", "Scor mediu"]],
      body: report.by_channel.map((c) => [c.channel, String(c.leads), String(c.hot_leads), String(c.avg_score ?? "-")]),
      styles: { fontSize: 9 },
    });

    doc.save(`raport-conversii-${days}z-${stamp}.pdf`);
    toast({ title: "PDF descărcat", description: `Raport ${periodLabel.toLowerCase()} (${days} zile).` });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Raport conversii & atribuire lead-uri
          </CardTitle>
          <CardDescription>
            Lead-urile grupate după sursa de achiziție (Google Ads, Meta Ads, WhatsApp outreach,
            organic/direct) și rata de conversie a formularelor. Digestul se trimite automat luni dimineață.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              aria-label={`Afișează raportul ${p.label.toLowerCase()} (${p.days} zile)`}
            >
              {p.label}
            </Button>
          ))}
          <div className="flex items-center gap-1.5">
            <Label htmlFor="report-custom-days" className="text-xs text-muted-foreground">
              Interval
            </Label>
            <Input
              id="report-custom-days"
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))}
              className="h-9 w-16"
              aria-label="Număr personalizat de zile pentru raport"
            />
            <span className="text-xs text-muted-foreground">zile</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => reportQuery.refetch()}
            disabled={reportQuery.isFetching}
            aria-label="Reîncarcă raportul"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reportQuery.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            disabled={!report}
            aria-label="Exportă raportul de conversii în format CSV"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportPdf}
            disabled={!report}
            aria-label="Exportă raportul de conversii în format PDF"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            PDF
          </Button>
          <Button
            size="sm"
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending}
            aria-label="Trimite raportul pe email acum"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {emailMutation.isPending ? "Se trimite…" : "Trimite pe email"}
          </Button>
        </div>
      </CardHeader>


      <CardContent className="space-y-6">
        {reportQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : reportQuery.isError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Raportul nu a putut fi încărcat. Verifică dacă ai rol de administrator activ.
          </p>
        ) : report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat
                icon={Users}
                label="Lead-uri"
                value={String(report.total_leads)}
                hint={`${delta >= 0 ? "+" : ""}${delta} vs perioada anterioară`}
              />
              <Stat icon={Flame} label="Lead-uri fierbinți" value={String(report.hot_leads)} hint="scor ≥ 60" />
              <Stat
                icon={delta >= 0 ? TrendingUp : TrendingDown}
                label="Rata de conversie"
                value={report.conversion_rate !== null ? `${report.conversion_rate}%` : "—"}
                hint="lead-uri / sesiuni cu interacțiune CTA"
              />
              <Stat
                icon={MousePointerClick}
                label="Sesiuni CTA"
                value={String(report.cta_sessions)}
                hint={report.avg_score !== null ? `scor mediu ${report.avg_score}` : undefined}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">Lead-uri per canal</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="bucket" fontSize={10} stroke="hsl(var(--muted-foreground))" interval={0} />
                      <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="leads" name="Lead-uri" radius={[4, 4, 0, 0]}>
                        {buckets.map((b) => (
                          <Cell key={b.bucket} fill={BUCKET_COLORS[b.bucket]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">Distribuție atribuire</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={buckets.filter((b) => b.leads > 0)}
                        dataKey="leads"
                        nameKey="bucket"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {buckets.filter((b) => b.leads > 0).map((b) => (
                          <Cell key={b.bucket} fill={BUCKET_COLORS[b.bucket]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div>

              <h3 className="mb-2 text-sm font-medium">Lead-uri după sursă</h3>
              {report.by_channel.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Nu există lead-uri în perioada selectată.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Lead-uri</TableHead>
                      <TableHead className="text-right">Fierbinți</TableHead>
                      <TableHead className="text-right">Scor mediu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_channel.map((row) => (
                      <TableRow key={row.channel}>
                        <TableCell>
                          <span className="font-medium">{row.channel}</span>
                          {row.campaigns?.length ? (
                            <span className="block text-xs text-muted-foreground">
                              {row.campaigns.join(", ")}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.hot_leads}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.avg_score ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium">Variante CTA (A/B)</h3>
                <div className="flex flex-wrap gap-2">
                  {report.by_cta_variant.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Fără date.</span>
                  ) : (
                    report.by_cta_variant.map((v) => (
                      <Badge key={v.variant} variant="outline">
                        {v.variant}: {v.leads}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Pagini de intrare</h3>
                <ul className="space-y-1 text-sm">
                  {report.by_landing_path.length === 0 ? (
                    <li className="text-muted-foreground">Fără date.</li>
                  ) : (
                    report.by_landing_path.map((p) => (
                      <li key={p.landing_path} className="flex justify-between gap-3">
                        <span className="truncate text-muted-foreground">{p.landing_path}</span>
                        <span className="tabular-nums">{p.leads}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default WeeklyConversionReport;
