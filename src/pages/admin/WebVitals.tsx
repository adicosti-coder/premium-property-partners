import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { Activity, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BASELINE_WINDOW_DAYS,
  CURRENT_WINDOW_DAYS,
  CWV_THRESHOLDS,
  DEVICE_CLASSES,
  MIN_SAMPLES,
  MONITORED_METRICS,
  evaluateRegression,
  formatVital,
  rateVital,
  type DeviceClass,
  type MonitoredMetric,
  type VitalRating,
} from "../../../supabase/functions/_shared/webVitalsRegression";

type Stat = { metric: string; device: string; samples: number; p75: number; good_rate: number };
type Release = { release: string; first_seen: string; stats: Array<{ metric: string; device: string; samples: number; p75: number }> };
type PageRow = { page_group: string; samples: number; lcp_p75: number | null; cls_p75: number | null; inp_p75: number | null };
type Alert = { id: string; created_at: string; metric: MonitoredMetric; device: DeviceClass; severity: string; reason: string; releases: string[]; email_sent: boolean; whatsapp_sent: boolean };
type Summary = { generated_at: string; current: Stat[]; baseline: Stat[]; releases: Release[]; pages: PageRow[]; alerts: Alert[] };

const METRIC_LABEL: Record<MonitoredMetric, { title: string; hint: string }> = {
  LCP: { title: "Încărcare (LCP)", hint: "Cât durează până apare conținutul principal" },
  CLS: { title: "Stabilitate (CLS)", hint: "Cât de mult se mișcă pagina în timpul încărcării" },
  INP: { title: "Reacție la clic (INP)", hint: "Cât de repede răspunde pagina la atingeri și clicuri" },
};
const DEVICE_LABEL: Record<DeviceClass, string> = { mobile: "Telefon", desktop: "Calculator" };

const RATING_BADGE: Record<VitalRating, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  good: { label: "Bun", variant: "secondary" },
  "needs-improvement": { label: "De îmbunătățit", variant: "outline" },
  poor: { label: "Slab", variant: "destructive" },
};

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date(d));
const nf = new Intl.NumberFormat("ro-RO");

const pick = (rows: Stat[] | undefined, metric: string, device: string) => {
  const r = rows?.find((x) => x.metric === metric && x.device === device);
  return r ? { samples: Number(r.samples), p75: Number(r.p75) } : null;
};

const cell = (metric: MonitoredMetric, value: number | null | undefined) =>
  value == null ? "—" : formatVital(metric, Number(value));

const WebVitals = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(false);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const q = useQuery({
    queryKey: ["admin_web_vitals_summary"],
    enabled: isAdmin,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_web_vitals_summary");
      if (error) throw error;
      return data as unknown as Summary;
    },
  });

  const runCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("web-vitals-regression-check", { body: {} });
      if (error) throw error;
      const created = Number((data as { alerts_created?: number })?.alerts_created ?? 0);
      toast.success(created > 0 ? `${created} alertă(e) noi trimise pe e-mail și WhatsApp` : "Nicio înrăutățire nouă găsită");
      await q.refetch();
    } catch (e) {
      toast.error(`Verificarea nu a reușit: ${(e as Error).message}`);
    } finally {
      setChecking(false);
    }
  };

  if (roleLoading) return <div className="container py-16"><Skeleton className="h-40 w-full" /></div>;
  if (!isAdmin) {
    return (
      <div className="container py-16 text-center">
        <p className="mb-4">Pagina este disponibilă doar pentru administratori.</p>
        <Button asChild><Link to="/auth">Autentificare</Link></Button>
      </div>
    );
  }

  const s = q.data;

  return (
    <div className="container max-w-6xl py-24">
      <Helmet><title>Viteză site | Admin RealTrust</title><meta name="robots" content="noindex" /></Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-3xl font-serif flex items-center gap-2"><Activity className="w-7 h-7 text-primary" aria-hidden /> Viteză site — vizitatori reali</h1>
          <p className="text-muted-foreground">
            {s ? `Actualizat ${fmtDate(s.generated_at)}` : "Se încarcă…"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching} className="min-h-12">
            <RefreshCw className={`w-4 h-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} aria-hidden /> Reîmprospătează
          </Button>
          <Button onClick={runCheck} disabled={checking} className="min-h-12">
            {checking ? "Se verifică…" : "Verifică acum"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
        Valorile arată pragul sub care se încadrează 75% dintre vizite (metoda Google), pentru ultimele {CURRENT_WINDOW_DAYS} zile față de
        cele {BASELINE_WINDOW_DAYS} zile dinainte. Verificarea automată rulează la fiecare 6 ore și trimite alertă pe e-mail și WhatsApp
        când un indicator se înrăutățește cu cel puțin 20% sau devine slab. Sub {MIN_SAMPLES} vizite, datele sunt prea puține pentru o concluzie.
      </p>

      {q.error && <p className="text-destructive mb-4">Nu am putut citi datele: {(q.error as Error).message}</p>}

      {!s ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {MONITORED_METRICS.map((metric) => (
              <Card key={metric}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{METRIC_LABEL[metric].title}</CardTitle>
                  <CardDescription>
                    {METRIC_LABEL[metric].hint}. Bun: până la {formatVital(metric, CWV_THRESHOLDS[metric].good)}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {DEVICE_CLASSES.map((device) => {
                    const cur = pick(s.current, metric, device);
                    const base = pick(s.baseline, metric, device);
                    const enough = !!cur && cur.samples >= MIN_SAMPLES;
                    const rating = cur ? rateVital(metric, cur.p75) : null;
                    const regression = evaluateRegression(metric, device, cur, base);
                    return (
                      <div key={device} className="border-t border-border pt-3 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{DEVICE_LABEL[device]}</span>
                          {regression ? (
                            <Badge variant="destructive">Înrăutățire</Badge>
                          ) : enough && rating ? (
                            <Badge variant={RATING_BADGE[rating].variant}>{RATING_BADGE[rating].label}</Badge>
                          ) : (
                            <Badge variant="outline">Prea puține date</Badge>
                          )}
                        </div>
                        <p className="text-2xl font-semibold mt-1">{cur ? formatVital(metric, cur.p75) : "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {nf.format(cur?.samples ?? 0)} vizite · înainte: {base ? `${formatVital(metric, base.p75)} (${nf.format(base.samples)})` : "—"}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Pe publicări</CardTitle>
              <CardDescription>Fiecare rând este o versiune publicată (ora publicării, UTC). Telefon / calculator.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {s.releases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Încă nu există măsurători. Primele apar după următoarea publicare, când vizitatorii navighează pe site.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Publicare</th><th className="pr-4">Prima vizită</th>
                    {MONITORED_METRICS.map((m) => <th key={m} className="pr-4">{m}</th>)}
                  </tr></thead>
                  <tbody>
                    {s.releases.map((r) => (
                      <tr key={r.release} className="border-t border-border">
                        <td className="py-2 pr-4 whitespace-nowrap">{r.release}</td>
                        <td className="pr-4 whitespace-nowrap">{fmtDate(r.first_seen)}</td>
                        {MONITORED_METRICS.map((m) => (
                          <td key={m} className="pr-4 whitespace-nowrap">
                            {DEVICE_CLASSES.map((d) => {
                              const st = r.stats.find((x) => x.metric === m && x.device === d);
                              return st ? `${formatVital(m, Number(st.p75))} (${st.samples})` : "—";
                            }).join(" / ")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Pagini pe telefon (ultimele 7 zile)</CardTitle>
              <CardDescription>Ordonate după încărcare; paginile de anunț și articol sunt grupate.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {s.pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Prea puține vizite pe telefon până acum.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Pagină</th><th className="pr-4">Vizite</th><th className="pr-4">LCP</th><th className="pr-4">CLS</th><th>INP</th>
                  </tr></thead>
                  <tbody>
                    {s.pages.map((p) => (
                      <tr key={p.page_group} className="border-t border-border">
                        <td className="py-2 pr-4">{p.page_group}</td>
                        <td className="pr-4">{nf.format(p.samples)}</td>
                        <td className="pr-4">{cell("LCP", p.lcp_p75)}</td>
                        <td className="pr-4">{cell("CLS", p.cls_p75)}</td>
                        <td>{cell("INP", p.inp_p75)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg">Alerte trimise</CardTitle></CardHeader>
            <CardContent>
              {s.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nicio alertă până acum.</p>
              ) : (
                <ul className="space-y-3">
                  {s.alerts.map((a) => (
                    <li key={a.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={a.severity === "error" ? "destructive" : "outline"}>{a.severity === "error" ? "Slab" : "Înrăutățire"}</Badge>
                        <span className="text-sm text-muted-foreground">{fmtDate(a.created_at)}</span>
                      </div>
                      <p className="mt-1">{a.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Publicări în perioadă: {a.releases.join(", ") || "—"} · e-mail {a.email_sent ? "trimis" : "netrimis"} · WhatsApp {a.whatsapp_sent ? "trimis" : "netrimis"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WebVitals;
