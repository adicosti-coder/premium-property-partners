import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Phone, Bot, Radar, ShieldCheck, FileText } from "lucide-react";
import ScraperLeads from "@/pages/ScraperLeads";
import ProspectListings from "@/pages/ProspectListings";
import ProspectManager from "@/components/admin/ProspectManager";
import ScraperStatusDashboard from "@/components/admin/ScraperStatusDashboard";
import { AgencyDetectionSettings } from "@/components/admin/AgencyDetectionSettings";
import OutreachTemplatesPanelB2C from "@/components/admin/outreach/OutreachTemplatesPanelB2C";

const VALID_SUBTABS = ["leads", "hot", "templates", "bot", "status", "agency"] as const;
type Subtab = (typeof VALID_SUBTABS)[number];
const DEFAULT_SUBTAB: Subtab = "leads";

function isSubtab(v: string | null): v is Subtab {
  return !!v && (VALID_SUBTABS as readonly string[]).includes(v);
}

export default function ProspectPipelinePanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("subtab");
  const active: Subtab = isSubtab(raw) ? raw : DEFAULT_SUBTAB;

  useEffect(() => {
    if (raw && !isSubtab(raw)) {
      const next = new URLSearchParams(searchParams);
      next.set("subtab", DEFAULT_SUBTAB);
      setSearchParams(next, { replace: true });
    }
  }, [raw, searchParams, setSearchParams]);

  const handleChange = (value: string) => {
    if (!isSubtab(value)) return;
    const next = new URLSearchParams(searchParams);
    next.set("subtab", value);
    setSearchParams(next, { replace: true });
  };

  const tabs = useMemo(
    () => [
      { value: "leads", label: "Lead-uri Scorate", icon: Inbox },
      { value: "hot", label: "Hot Prospects (Call)", icon: Phone },
      { value: "bot", label: "Configurare Bot", icon: Bot },
      { value: "status", label: "Status & Monitoring", icon: Radar },
      { value: "agency", label: "Filtre Agenții", icon: ShieldCheck },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pipeline Prospecți</h2>
        <p className="text-sm text-muted-foreground">
          Flux unificat de prospectare: scoring AI, apelare, configurare bot, monitoring și filtre agenții.
        </p>
      </div>

      <Tabs value={active} onValueChange={handleChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((t) => {
          const Content =
            t.value === "leads" ? <ScraperLeads embedded /> :
            t.value === "hot" ? <ProspectListings embedded /> :
            t.value === "bot" ? <ProspectManager /> :
            t.value === "status" ? <ScraperStatusDashboard /> :
            <AgencyDetectionSettings />;
          return (
            <TabsContent
              key={t.value}
              value={t.value}
              className="mt-0 space-y-4 [&_input]:rounded-md [&_select]:rounded-md [&_button]:rounded-md"
            >
              <div className="rounded-lg border border-border/40 bg-card/30 p-4 md:p-6">
                {Content}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
