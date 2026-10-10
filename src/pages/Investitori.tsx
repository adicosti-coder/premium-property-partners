import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

type Delivery = { id: string; score: number | null; status: string; sent_at: string | null; created_at: string };
type Fin = { id: string; amount: number; type: string; date: string; property_id: string };

const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest" }) : "—");
const STATUS: Record<string, string> = { sent: "Trimisă", delivered: "Livrată", read: "Citită", failed: "Eșuată", sending: "În curs" };

const Investitori = () => {
  const [user, setUser] = useState<{ email?: string } | null | undefined>(undefined);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [fin, setFin] = useState<Fin[]>([]);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (!data.user) return;
      const [{ data: subs }, { data: d }, { data: f }] = await Promise.all([
        supabase.from("investor_alert_subscribers").select("id").limit(1),
        supabase.from("investor_alert_deliveries").select("id, score, status, sent_at, created_at").order("created_at", { ascending: false }).limit(100),
        (supabase.from("financial_records") as any).select("id, amount, type, date, property_id").order("date", { ascending: false }).limit(200),
      ]);
      setSubscribed(!!subs?.length);
      setDeliveries((d as Delivery[]) ?? []);
      setFin((f as Fin[]) ?? []);
    });
  }, []);

  const income = fin.filter((r) => r.type !== "expense").reduce((s, r) => s + Number(r.amount || 0), 0);
  const expenses = fin.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Portal investitori | RealTrust Timișoara" description="Istoricul oportunităților de investiție primite și veniturile proprietăților administrate de RealTrust." url="https://realtrust.ro/investitori" />
      <Suspense fallback={null}><Header /></Suspense>
      <main className="mx-auto max-w-5xl px-4 pt-28 pb-16 space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Portalul investitorului</h1>
        {user === undefined ? null : !user ? (
          <Card><CardContent className="p-6 space-y-4">
            <p className="text-muted-foreground">Intră în cont ca să vezi oportunitățile primite și veniturile proprietăților tale administrate de RealTrust.</p>
            <Button asChild className="min-h-12"><Link to="/auth?redirect=/investitori">Intră în cont</Link></Button>
          </CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Oportunități primite</div><div className="text-2xl font-bold">{deliveries.length}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Venituri încasate</div><div className="text-2xl font-bold text-primary">{eur(income)}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Venit net</div><div className="text-2xl font-bold">{eur(income - expenses)}</div></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Istoric oportunități</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!subscribed && <p className="text-muted-foreground">Nu ești abonat încă la alerte. <Link className="text-primary underline" to="/alerte-oportunitati">Abonează-te</Link> cât ești în cont, ca să apară aici.</p>}
                {deliveries.map((d) => (
                  <div key={d.id} className="flex justify-between border-b py-2"><span>{day(d.sent_at || d.created_at)} · scor {d.score ?? "—"}/100</span><span className="text-muted-foreground">{STATUS[d.status] ?? d.status}</span></div>
                ))}
                {subscribed && !deliveries.length && <p className="text-muted-foreground">Nicio oportunitate trimisă încă.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Istoric venituri</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {fin.map((r) => (
                  <div key={r.id} className="flex justify-between border-b py-2"><span>{day(r.date)} · {r.type === "expense" ? "Cheltuială" : "Venit"}</span><span className={r.type === "expense" ? "text-destructive" : "text-primary"}>{eur(Number(r.amount))}</span></div>
                ))}
                {!fin.length && <p className="text-muted-foreground">Încă nu ai proprietăți administrate de RealTrust legate de cont.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default Investitori;
