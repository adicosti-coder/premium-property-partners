import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LinkIcon, Radar, Building2 } from "lucide-react";
import ListingImporter from "./ListingImporter";
import KeywordRadarPanel from "./KeywordRadarPanel";
import PmLeadsPanel from "./PmLeadsPanel";

/**
 * Wrapper pentru tabul "Import Anunț" din /admin?tab=listing-import.
 * Conține:
 *  - Import manual (URL → extract → publish)
 *  - Keyword Radar (descoperire automată cuvinte-cheie + scraping pe baza lor)
 *  - PM Leads (gazde Booking/Airbnb pentru outreach Property Management — NU se publică)
 */
const ListingImportTabs = () => {
  const [tab, setTab] = useState("manual");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="manual" className="gap-2">
          <LinkIcon className="w-4 h-4" /> Import Manual
        </TabsTrigger>
        <TabsTrigger value="radar" className="gap-2">
          <Radar className="w-4 h-4" /> Keyword Radar
        </TabsTrigger>
        <TabsTrigger value="pm-leads" className="gap-2">
          <Building2 className="w-4 h-4" /> PM Leads
        </TabsTrigger>
      </TabsList>
      <TabsContent value="manual"><ListingImporter /></TabsContent>
      <TabsContent value="radar"><KeywordRadarPanel /></TabsContent>
      <TabsContent value="pm-leads"><PmLeadsPanel /></TabsContent>
    </Tabs>
  );
};

export default ListingImportTabs;
