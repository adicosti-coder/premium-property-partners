import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, FileText, Percent } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));

const FREE = [
  "Publicarea anunțului pe realtrust.ro: 0 lei",
  "Analiza de preț cu comparații din zonă: 0 lei",
  "Fără avans, fără abonament, fără costuri ascunse",
  "Fără exclusivitate: îl puteți ține și pe alte site-uri",
];

const FEES = [
  { t: "Vânzare", d: "2–4% din prețul de vânzare, plătit doar dacă apartamentul se vinde." },
  { t: "Închiriere", d: "50–100% din prima chirie, plătit doar după semnarea cu chiriașul. Opțional, administrare 15–20%." },
  { t: "Regim hotelier / Property Management", d: "15–20% doar din încasările realizate." },
];

const SAFETY = [
  "Publicăm doar după acordul dumneavoastră pe WhatsApp („DA”).",
  "Retragere imediată oricând: scrieți „RETRAG” sau „STOP”.",
  "Numărul de telefon nu apare public pe anunț.",
  "Vizionările se fac la apartament, cu programare confirmată de dumneavoastră.",
];

export default function ConditiiProprietari() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Condiții pentru proprietari: publicare gratuită | RealTrust Timișoara"
        description="Publicare și analiză gratuite, fără exclusivitate. Comision doar la rezultat: vânzare 2–4%, închiriere din prima chirie, administrare 15–20%."
        url="https://realtrust.ro/conditii-proprietari"
      />
      <Suspense fallback={null}><Header /></Suspense>
      <main className="px-4 pt-28 pb-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Condițiile, pe scurt</h1>
          <p className="mt-4 text-muted-foreground">Ce e gratuit, cât costă și cum vă protejăm. Fără litere mici.</p>
        </section>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Gratuit pentru dumneavoastră</CardTitle></CardHeader>
            <CardContent><ul className="space-y-2">{FREE.map((x) => <li key={x} className="text-foreground">• {x}</li>)}</ul></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Comision doar la rezultat</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {FEES.map((f) => <div key={f.t}><p className="font-semibold text-foreground">{f.t}</p><p className="text-muted-foreground">{f.d}</p></div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Siguranță</CardTitle></CardHeader>
            <CardContent><ul className="space-y-2">{SAFETY.map((x) => <li key={x} className="text-foreground">• {x}</li>)}</ul></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Contract</CardTitle></CardHeader>
            <CardContent className="text-muted-foreground">
              Pentru publicare nu semnați nimic. Contractul apare doar când alegeți un serviciu (vânzare, închiriere sau administrare) și îl primiți înainte, ca să-l citiți în liniște.
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="min-h-12"><Link to="/analiza-gratuita">Cere analiza gratuită</Link></Button>
            <Button asChild size="lg" variant="outline" className="min-h-12"><Link to="/pentru-proprietari">Despre administrare</Link></Button>
          </div>
        </div>
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
}
