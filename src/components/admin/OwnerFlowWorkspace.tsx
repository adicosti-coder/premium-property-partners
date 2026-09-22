import { lazy, Suspense, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2, MessageSquare, TrendingDown } from "lucide-react";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";

const OwnerListingSearch = lazy(() => import("@/components/admin/OwnerListingSearch"));
const ProspectTriageQueue = lazy(() => import("@/components/admin/ProspectTriageQueue"));
const WhatsappOutboundQueue = lazy(() => import("@/components/admin/WhatsappOutboundQueue"));
const PriceDropAlertsPanel = lazy(() => import("@/components/admin/PriceDropAlertsPanel"));

const AMBIGUOUS_TYPES = ["generic_search", "sale", "rent", "vanzare", "necunoscut"];

type StepKey = "search" | "verify" | "contact" | "follow";

interface Step {
  key: StepKey;
  label: string;
  short: string;
  hint: string;
  icon: typeof Search;
  Component: ComponentType<unknown>;
}

const STEPS: Step[] = [
  { key: "search", label: "1. Caută", short: "Caută", hint: "Găsește anunțuri de la proprietari pe toate portalurile.", icon: Search, Component: OwnerListingSearch as ComponentType<unknown> },
  { key: "verify", label: "2. Verifică", short: "Verifică", hint: "Aprobă proprietarii reali, cu poze și analiză automată.", icon: CheckCircle2, Component: ProspectTriageQueue as ComponentType<unknown> },
  { key: "contact", label: "3. Contactează", short: "Contact", hint: "Trimite oferta pe WhatsApp și urmărește livrarea.", icon: MessageSquare, Component: WhatsappOutboundQueue as ComponentType<unknown> },
  { key: "follow", label: "4. Urmărește", short: "Urmărește", hint: "Vezi scăderile de preț și momentul bun de renegociere.", icon: TrendingDown, Component: PriceDropAlertsPanel as ComponentType<unknown> },
];

const since = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

async function headCount(build: () => PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await build();
  if (error) return 0;
  return count ?? 0;
}

/**
 * Flux proprietari — un singur ecran care leagă cei 4 pași:
 * căutare → verificare → contactare → urmărire.
 * Fiecare pas randează panoul existent (lazy), deci nu există logică duplicată.
 */
export default function OwnerFlowWorkspace() {
  const [active, setActive] = useState<StepKey>("search");

  const { data: counts } = useQuery({
    queryKey: ["owner-flow-step-counts"],
    staleTime: 30_000,
    refetchInterval: 90_000,
    queryFn: async () => {
      const [search, verify, contact, follow] = await Promise.all([
        headCount(() => supabase.from("prospect_listings")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("created_at", since(24))),
        headCount(() => supabase.from("prospect_listings")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .or(`prospect_type.in.(${AMBIGUOUS_TYPES.join(",")}),prospect_type.is.null`)),
        headCount(() => supabase.from("wa_outbound_queue")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "failed"])),
        headCount(() => supabase.from("prospect_price_drop_alerts")
          .select("*", { count: "exact", head: true })
          .gte("alerted_at", since(24))),
      ]);
      return { search, verify, contact, follow } as Record<StepKey, number>;
    },
  });

  const activeStep = STEPS.find((s) => s.key === active) ?? STEPS[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Flux proprietari</CardTitle>
          <CardDescription>{activeStep.hint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEPS.map((step) => {
              const isActive = step.key === active;
              const count = counts?.[step.key] ?? 0;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setActive(step.key)}
                  aria-current={isActive}
                  aria-label={`${step.label} — ${count} în așteptare`}
                  className={`min-h-[64px] rounded-lg border p-2.5 text-left transition-colors ${
                    isActive ? "border-primary bg-primary/10" : "hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <step.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{step.label}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-semibold tabular-nums">{count}</span>
                    {count > 0 && isActive && <Badge variant="secondary" className="text-[10px]">activ</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AdminErrorBoundary resetKey={active}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă pasul „{activeStep.short}”…
            </div>
          }
        >
          <activeStep.Component />
        </Suspense>
      </AdminErrorBoundary>
    </div>
  );
}
