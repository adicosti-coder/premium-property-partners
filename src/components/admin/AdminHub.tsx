import { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminTabComponent, prefetchAdminTab } from "./adminTabLoaders";
import { findTab } from "./adminNavConfig";

/** Pagină combinată: afișează mai multe pagini Admin existente ca taburi (?view=). */
export function AdminHub({ title, description, views }: { title: string; description: string; views: string[] }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("view");
  const active = raw && views.includes(raw) ? raw : views[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Tabs
        value={active}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set("view", v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          {views.map((v) => (
            <TabsTrigger key={v} value={v} onMouseEnter={() => prefetchAdminTab(v)}>
              {findTab(v)?.label ?? v}
            </TabsTrigger>
          ))}
        </TabsList>
        {views.map((v) => {
          if (v !== active) return null;
          const C = getAdminTabComponent(v);
          return (
            <TabsContent key={v} value={v} className="mt-4">
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>{C ? <C /> : null}</Suspense>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export const HUBS: Record<string, { title: string; description: string; views: string[] }> = {
  "hub-wa-conversations": {
    title: "Conversații WhatsApp",
    description: "Toate discuțiile cu clienții și proprietarii, într-un singur loc.",
    views: ["whatsapp-andrei", "whatsapp-live", "whatsapp-chat", "whatsapp-threads"],
  },
  "hub-wa-sending": {
    title: "Trimiteri WhatsApp",
    description: "Coada de mesaje, istoricul trimiterilor, testele și rezumatele pe e-mail.",
    views: ["whatsapp-queue", "whatsapp-history", "whatsapp-test", "whatsapp-daily-emails"],
  },
  "hub-wa-reports": {
    title: "Rapoarte WhatsApp",
    description: "Eficiența mesajelor, activitatea zilnică, surse, oferte și tranzacții.",
    views: [
      "whatsapp-template-efficiency", "whatsapp-activity-report", "whatsapp-daily-report",
      "whatsapp-dashboard", "whatsapp-live-dashboard", "whatsapp-analytics",
      "whatsapp-sources", "whatsapp-offers", "whatsapp-transactions",
    ],
  },
  "hub-make": {
    title: "Make.com",
    description: "Coada, starea scenariului și leadurile venite prin Make.",
    views: ["make-queue", "make-status", "make-leads"],
  },
  "hub-market-listings": {
    title: "Piața anunțurilor",
    description: "Anunțuri salvate, publicate extern, expirate, scăderi și evoluția prețurilor.",
    views: ["saved-listings", "external-published", "price-drops", "daily-price-trends", "platform-daily", "expired-listings"],
  },
  "hub-bookings": {
    title: "Rezervări",
    description: "Rezervări, cereri de pe site și sincronizarea calendarelor.",
    views: ["bookings", "booking-requests", "ical-sync"],
  },
  "hub-reviews": {
    title: "Recenzii",
    description: "Recenzii apartamente, Booking și Ghidul local, plus moderarea lor.",
    views: ["reviews", "booking-reviews", "booking-scrape", "poi-reviews", "poi-review-notifications"],
  },
  "hub-conversions": {
    title: "Conversii & Funnel",
    description: "De unde vin cererile și câte vizite devin contact.",
    views: ["conversion-report", "listing-conversions", "leads-analytics", "funnel-analytics", "cta-analytics", "property-views", "evaluare-engagement"],
  },
  "hub-tracking": {
    title: "Tracking",
    description: "Verificarea măsurătorilor GA4/Meta și alertele de scădere.",
    views: ["tracking-qa", "tracking-alerts"],
  },
};

export function makeHub(key: string) {
  const h = HUBS[key];
  return function Hub() {
    return <AdminHub {...h} />;
  };
}
