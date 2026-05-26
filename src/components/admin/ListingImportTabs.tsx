import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LinkIcon, Radar, Building2, CheckSquare, Wrench, LineChart } from "lucide-react";
import ListingImporter from "./ListingImporter";
import KeywordRadarPanel from "./KeywordRadarPanel";
import PmLeadsPanel from "./PmLeadsPanel";
import { AutoPublishListingsPanel } from "./AutoPublishListingsPanel";
import { ListingImportHealthPanel } from "./ListingImportHealthPanel";
import { PerformanceROIPanel } from "./PerformanceROIPanel";

const VALID_SUBTABS = ["manual", "radar", "pm-leads", "auto-publish", "sandbox", "performance"] as const;

type SubTab = (typeof VALID_SUBTABS)[number];

/**
 * Wrapper pentru /admin?tab=listing-import.
 * Structură liniară (5 sub-tab-uri vizibile) — fără panouri ascunse adânc.
 * Sub-tab activ sincronizat în URL: ?tab=listing-import&subtab=auto-publish
 */
const ListingImportTabs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSub = searchParams.get("subtab");
  const initial: SubTab = (VALID_SUBTABS as readonly string[]).includes(urlSub ?? "")
    ? (urlSub as SubTab)
    : "manual";
  const [tab, setTab] = useState<SubTab>(initial);

  // Sync URL → state when user navigates externally (e.g. command palette).
  useEffect(() => {
    if (urlSub && (VALID_SUBTABS as readonly string[]).includes(urlSub) && urlSub !== tab) {
      setTab(urlSub as SubTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSub]);

  const handleChange = (value: string) => {
    if (!(VALID_SUBTABS as readonly string[]).includes(value)) return;
    setTab(value as SubTab);
    const next = new URLSearchParams(searchParams);
    if (value === "manual") next.delete("subtab");
    else next.set("subtab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Tabs value={tab} onValueChange={handleChange} className="w-full">
      <TabsList className="mb-4 flex-wrap h-auto">
        <TabsTrigger value="manual" className="gap-2">
          <LinkIcon className="w-4 h-4" /> Import Manual
        </TabsTrigger>
        <TabsTrigger value="radar" className="gap-2">
          <Radar className="w-4 h-4" /> Keyword Radar
        </TabsTrigger>
        <TabsTrigger value="pm-leads" className="gap-2">
          <Building2 className="w-4 h-4" /> PM Leads
        </TabsTrigger>
        <TabsTrigger value="auto-publish" className="gap-2">
          <CheckSquare className="w-4 h-4" /> Cozi Aprobare
        </TabsTrigger>
        <TabsTrigger value="sandbox" className="gap-2">
          <Wrench className="w-4 h-4" /> Sandbox & Health
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-2">
          <LineChart className="w-4 h-4" /> Performanță & ROI
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual"><ListingImporter /></TabsContent>
      <TabsContent value="radar"><KeywordRadarPanel /></TabsContent>
      <TabsContent value="pm-leads"><PmLeadsPanel /></TabsContent>
      <TabsContent value="auto-publish"><AutoPublishListingsPanel /></TabsContent>
      <TabsContent value="sandbox"><ListingImportHealthPanel /></TabsContent>
      <TabsContent value="performance"><PerformanceROIPanel /></TabsContent>

    </Tabs>
  );
};

export default ListingImportTabs;
