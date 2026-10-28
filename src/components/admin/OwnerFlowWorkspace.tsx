import { lazy, Suspense, type ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { fetchOwnerContactReady, fetchOwnerReview, fetchOwnerReminders, OWNER_FLOW_QUERY_KEY } from "@/lib/ownerFlowData";
import { Loader2, Search, CheckCircle2, MessageSquare, TrendingDown } from "lucide-react";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";

const OwnerListingSearch = lazy(() => import("@/components/admin/OwnerListingSearch"));
const ProspectTriageQueue = lazy(() => import("@/components/admin/ProspectTriageQueue"));
const OwnerContactPanel = lazy(() => import("@/components/admin/OwnerContactPanel"));
const OwnerFollowUpPanel = lazy(() => import("@/components/admin/OwnerFollowUpPanel"));
const AndreiBulkCallTable = lazy(() => import("@/components/admin/AndreiBulkCallTable"));

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
  { key: "search", label: "1. Caută", short: "Caută", hint: "Anunțuri de la proprietari", icon: Search, Component: OwnerListingSearch as ComponentType<unknown> },
  { key: "verify", label: "2. Verifică", short: "Verifică", hint: "Proprietari de verificat", icon: CheckCircle2, Component: ProspectTriageQueue as ComponentType<unknown> },
  { key: "contact", label: "3. Contactează", short: "Contact", hint: "Proprietari confirmați, fără contact anterior", icon: MessageSquare, Component: OwnerContactPanel as ComponentType<unknown> },
  { key: "follow", label: "4. Urmărește", short: "Urmărește", hint: "Mementouri scadente și scăderi de preț", icon: TrendingDown, Component: OwnerFollowUpPanel as ComponentType<unknown> },
];

/**
 * Flux proprietari — un singur ecran care leagă cei 4 pași:
 * căutare → verificare → contactare → urmărire.
 * Fiecare pas randează panoul existent (lazy), deci nu există logică duplicată.
 */
const STEP_KEYS: StepKey[] = ["search", "verify", "contact", "follow"];

export default function OwnerFlowWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get("step");
  const active: StepKey = STEP_KEYS.find((step) => step === stepParam) ?? "search";
  const setActive = (step: StepKey) => {
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("step", step); return next; });
  };
  const review = useQuery({ queryKey: [...OWNER_FLOW_QUERY_KEY, "review"], queryFn: fetchOwnerReview, staleTime: 30_000 });
  const contact = useQuery({ queryKey: [...OWNER_FLOW_QUERY_KEY, "contact"], queryFn: fetchOwnerContactReady, staleTime: 30_000 });
  const follow = useQuery({ queryKey: [...OWNER_FLOW_QUERY_KEY, "follow"], queryFn: fetchOwnerReminders, staleTime: 30_000, refetchInterval: 60_000 });
  const fresh = useQuery({
    queryKey: [...OWNER_FLOW_QUERY_KEY, "fresh"], staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("prospect_listings").select("id", { count: "exact", head: true }).eq("is_active", true).gte("created_at", new Date(Date.now() - 86400000).toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
  const counts = { search: fresh.data, verify: review.data?.length, contact: contact.data?.length, follow: follow.data?.due.length };
  const errors = { search: fresh.error, verify: review.error, contact: contact.error, follow: follow.error };
  const captions = { search: "noi în ultimele 24h", verify: "de verificat", contact: "gata de contactat", follow: "mementouri scadente" };

  const activeStep = STEPS.find((s) => s.key === active) ?? STEPS[0];

  return (
    <div className="space-y-4">
      <header className="space-y-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Flux proprietari</h1>
          <p className="mt-1 text-sm text-muted-foreground">{activeStep.hint}</p>
        </div>
        <nav aria-label="Pașii fluxului proprietari" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STEPS.map((step) => {
            const isActive = step.key === active;
            const count = counts[step.key];
            return (
              <Button key={step.key} variant="outline" onClick={() => setActive(step.key)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${step.label} — ${count ?? "se încarcă"} ${captions[step.key]}`}
                className={`h-auto min-h-[88px] w-full flex-col items-start gap-2 p-3 whitespace-normal text-left transition-colors active:scale-[0.98] ${isActive ? "border-primary bg-primary/10 text-foreground" : "hover:bg-accent"}`}>
                <span className="flex items-center gap-2 text-sm font-medium"><step.icon className="h-4 w-4 shrink-0" />{step.label}</span>
                <span className="flex flex-wrap items-baseline gap-1.5"><span className="text-lg font-semibold tabular-nums">{errors[step.key] ? "—" : count ?? "…"}</span><span className="text-xs text-muted-foreground">{captions[step.key]}</span></span>
              </Button>
            );
          })}
        </nav>
      </header>

      <AdminErrorBoundary resetKey={active}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă pasul „{activeStep.short}”…
            </div>
          }
        >
          {active === "contact" && <div id="andrei-whatsapp" className="mb-4 scroll-mt-24"><AndreiBulkCallTable /></div>}
          <activeStep.Component />
        </Suspense>
      </AdminErrorBoundary>
    </div>
  );
}
