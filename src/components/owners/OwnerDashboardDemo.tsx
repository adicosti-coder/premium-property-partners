import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  Wallet,
  CalendarCheck,
  Star,
  TrendingUp,
  Wrench,
  FileText,
  ArrowRight,
  MessageCircle,
  BedDouble,
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerDashboardDemo — arată *ce primești după semnare*: portalul proprietarului.
 * Date 100% ilustrative (demo), fără backend, bilingv RO/EN.
 */
const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent("Bună! Vreau un tur demo al portalului de proprietar.");

type TabId = "overview" | "bookings" | "payouts" | "maintenance";

const OwnerDashboardDemo = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";
  const [tab, setTab] = useState<TabId>("overview");

  const t = isRo
    ? {
        badge: "Portalul proprietarului",
        title: "Vezi exact ce urmărești în fiecare zi, din telefon",
        subtitle:
          "După semnare primești acces la portal: rezervări, încasări, ocupare, recenzii și intervenții. Mai jos e un exemplu demo, cu cifre ilustrative.",
        demoNote: "Date demonstrative — apartament cu 2 camere, Cetate, luna precedentă.",
        tabs: {
          overview: "Sumar",
          bookings: "Rezervări",
          payouts: "Încasări",
          maintenance: "Intervenții",
        },
        kpis: [
          { icon: Wallet, label: "Încasare netă (luna trecută)", value: "1.130 €", delta: "+18% vs. luna anterioară" },
          { icon: BedDouble, label: "Nopți vândute", value: "23 / 30", delta: "Ocupare 77%" },
          { icon: TrendingUp, label: "Tarif mediu / noapte", value: "78 €", delta: "+6 € vs. luna anterioară" },
          { icon: Star, label: "Scor oaspeți", value: "9,7 / 10", delta: "4 recenzii noi" },
        ],
        occupancyLabel: "Ocupare luna în curs",
        occupancyValue: 81,
        bookingsTitle: "Rezervări confirmate",
        bookings: [
          { guest: "Oaspete • Booking", dates: "3–6 sept.", nights: "3 nopți", amount: "246 €", status: "Confirmată" },
          { guest: "Oaspete • Airbnb", dates: "8–12 sept.", nights: "4 nopți", amount: "312 €", status: "Confirmată" },
          { guest: "Oaspete • Direct", dates: "15–20 sept.", nights: "5 nopți", amount: "375 €", status: "Plătită" },
          { guest: "Oaspete • Booking", dates: "24–27 sept.", nights: "3 nopți", amount: "234 €", status: "Confirmată" },
        ],
        payoutsTitle: "Istoric încasări",
        payouts: [
          { month: "Iunie", gross: "1.640 €", net: "1.010 €", status: "Plătit" },
          { month: "Iulie", gross: "1.910 €", net: "1.205 €", status: "Plătit" },
          { month: "August", gross: "1.800 €", net: "1.130 €", status: "Plătit" },
        ],
        payoutsCols: { month: "Luna", gross: "Brut", net: "Net proprietar", status: "Status" },
        payoutsNote:
          "Plata ajunge în cont până în data de 10 a lunii următoare, împreună cu raportul detaliat în PDF.",
        maintenanceTitle: "Intervenții și mentenanță",
        maintenance: [
          { task: "Înlocuit baterie duș", date: "12 aug.", cost: "0 € (garanție)", status: "Rezolvat" },
          { task: "Curățenie profundă sezonieră", date: "20 aug.", cost: "45 €", status: "Rezolvat" },
          { task: "Verificare centrală termică", date: "2 sept.", cost: "programat", status: "În lucru" },
        ],
        maintenanceNote:
          "Orice cheltuială peste 100 € se aprobă de tine, din portal, înainte de execuție.",
        ctaPrimary: "Cere un tur demo al portalului",
        ctaSecondary: "Vezi pachetele de administrare",
      }
    : {
        badge: "Owner portal",
        title: "See exactly what you track every day, from your phone",
        subtitle:
          "After signing you get portal access: bookings, payouts, occupancy, reviews and maintenance. Below is a demo example with illustrative numbers.",
        demoNote: "Demo data — 2-room apartment, Cetate, previous month.",
        tabs: {
          overview: "Overview",
          bookings: "Bookings",
          payouts: "Payouts",
          maintenance: "Maintenance",
        },
        kpis: [
          { icon: Wallet, label: "Net payout (last month)", value: "€1,130", delta: "+18% vs. previous month" },
          { icon: BedDouble, label: "Nights sold", value: "23 / 30", delta: "77% occupancy" },
          { icon: TrendingUp, label: "Average nightly rate", value: "€78", delta: "+€6 vs. previous month" },
          { icon: Star, label: "Guest score", value: "9.7 / 10", delta: "4 new reviews" },
        ],
        occupancyLabel: "Current month occupancy",
        occupancyValue: 81,
        bookingsTitle: "Confirmed bookings",
        bookings: [
          { guest: "Guest • Booking", dates: "Sep 3–6", nights: "3 nights", amount: "€246", status: "Confirmed" },
          { guest: "Guest • Airbnb", dates: "Sep 8–12", nights: "4 nights", amount: "€312", status: "Confirmed" },
          { guest: "Guest • Direct", dates: "Sep 15–20", nights: "5 nights", amount: "€375", status: "Paid" },
          { guest: "Guest • Booking", dates: "Sep 24–27", nights: "3 nights", amount: "€234", status: "Confirmed" },
        ],
        payoutsTitle: "Payout history",
        payouts: [
          { month: "June", gross: "€1,640", net: "€1,010", status: "Paid" },
          { month: "July", gross: "€1,910", net: "€1,205", status: "Paid" },
          { month: "August", gross: "€1,800", net: "€1,130", status: "Paid" },
        ],
        payoutsCols: { month: "Month", gross: "Gross", net: "Owner net", status: "Status" },
        payoutsNote:
          "Money reaches your account by the 10th of the following month, together with the detailed PDF report.",
        maintenanceTitle: "Maintenance and interventions",
        maintenance: [
          { task: "Shower mixer replaced", date: "Aug 12", cost: "€0 (warranty)", status: "Resolved" },
          { task: "Seasonal deep cleaning", date: "Aug 20", cost: "€45", status: "Resolved" },
          { task: "Boiler service check", date: "Sep 2", cost: "scheduled", status: "In progress" },
        ],
        maintenanceNote:
          "Any expense above €100 is approved by you, from the portal, before the work starts.",
        ctaPrimary: "Request a portal demo tour",
        ctaSecondary: "See management packages",
      };

  const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: t.tabs.overview, icon: LayoutDashboard },
    { id: "bookings", label: t.tabs.bookings, icon: CalendarCheck },
    { id: "payouts", label: t.tabs.payouts, icon: Wallet },
    { id: "maintenance", label: t.tabs.maintenance, icon: Wrench },
  ];

  const handleRequest = () => {
    trackConversion({ event: "whatsapp_click", source: "owners_dashboard_demo" });
  };

  return (
    <section className="py-20 bg-secondary" aria-labelledby="owner-dashboard-demo-title">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 bg-background">
            <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2
            id="owner-dashboard-demo-title"
            className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Card className="max-w-5xl mx-auto border-border shadow-elegant">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg">ApArt Hotel • Owner Portal</CardTitle>
                <Badge variant="outline">DEMO</Badge>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label={t.badge}
              >
                {tabs.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={tab === id ? "default" : "outline"}
                    role="tab"
                    aria-selected={tab === id}
                    aria-label={label}
                    onClick={() => setTab(id)}
                    className="min-h-11"
                  >
                    <Icon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {t.kpis.map(({ icon: Icon, label, value, delta }) => (
                    <div key={label} className="rounded-xl border border-border p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-3">
                        <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="text-2xl font-serif font-semibold text-foreground">{value}</p>
                      <p className="text-xs text-primary mt-1">{delta}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{t.occupancyLabel}</p>
                    <span className="text-sm font-semibold text-primary">
                      {t.occupancyValue}%
                    </span>
                  </div>
                  <Progress value={t.occupancyValue} aria-label={t.occupancyLabel} />
                </div>
              </div>
            )}

            {tab === "bookings" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{t.bookingsTitle}</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {t.bookings.map((b) => (
                    <li
                      key={b.dates}
                      className="flex flex-wrap items-center justify-between gap-2 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.guest}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.dates} • {b.nights}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">{b.amount}</span>
                        <Badge variant="outline">{b.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "payouts" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{t.payoutsTitle}</p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t.payoutsTitle}</caption>
                    <thead className="bg-secondary">
                      <tr>
                        <th scope="col" className="text-left p-3 font-medium">
                          {t.payoutsCols.month}
                        </th>
                        <th scope="col" className="text-right p-3 font-medium">
                          {t.payoutsCols.gross}
                        </th>
                        <th scope="col" className="text-right p-3 font-medium">
                          {t.payoutsCols.net}
                        </th>
                        <th scope="col" className="text-right p-3 font-medium">
                          {t.payoutsCols.status}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.payouts.map((p) => (
                        <tr key={p.month} className="border-t border-border">
                          <td className="p-3 text-foreground">{p.month}</td>
                          <td className="p-3 text-right text-muted-foreground">{p.gross}</td>
                          <td className="p-3 text-right font-semibold text-foreground">{p.net}</td>
                          <td className="p-3 text-right">
                            <Badge variant="outline">{p.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  {t.payoutsNote}
                </p>
              </div>
            )}

            {tab === "maintenance" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{t.maintenanceTitle}</p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {t.maintenance.map((m) => (
                    <li
                      key={m.task}
                      className="flex flex-wrap items-center justify-between gap-2 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.task}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.date} • {m.cost}
                        </p>
                      </div>
                      <Badge variant="outline">{m.status}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">{t.maintenanceNote}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground italic border-t border-border pt-4">
              {t.demoNote}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1" onClick={handleRequest}>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.ctaPrimary}
                >
                  <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t.ctaPrimary}
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/preturi" aria-label={t.ctaSecondary}>
                  {t.ctaSecondary}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default OwnerDashboardDemo;
