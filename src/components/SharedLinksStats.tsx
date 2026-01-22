import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Link2,
  Users,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface SharedLink {
  id: string;
  share_code: string;
  poi_ids: string[];
  import_count: number;
  created_at: string;
  last_imported_at: string | null;
}

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
}

const SharedLinksStats = () => {
  const { language } = useLanguage();
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [pois, setPois] = useState<Record<string, POI>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const dateLocale = language === "ro" ? ro : enUS;

  const translations = {
    ro: {
      title: "Statistici Partajări",
      subtitle: "Vezi performanța link-urilor tale partajate",
      noLinks: "Nu ai link-uri partajate încă",
      noLinksDesc: "Partajează locațiile tale favorite pentru a vedea statisticile aici",
      totalLinks: "Link-uri Active",
      totalImports: "Total Importuri",
      avgImports: "Media Importuri",
      linkCode: "Cod Link",
      locations: "Locații",
      imports: "Importuri",
      created: "Creat",
      lastImport: "Ultimul Import",
      never: "Niciodată",
      copyLink: "Copiază Link",
      copied: "Copiat!",
      viewDetails: "Vezi Statistici",
      open: "Deschide",
    },
    en: {
      title: "Sharing Statistics",
      subtitle: "View your shared links performance",
      noLinks: "No shared links yet",
      noLinksDesc: "Share your favorite locations to see statistics here",
      totalLinks: "Active Links",
      totalImports: "Total Imports",
      avgImports: "Avg Imports",
      linkCode: "Link Code",
      locations: "Locations",
      imports: "Imports",
      created: "Created",
      lastImport: "Last Import",
      never: "Never",
      copyLink: "Copy Link",
      copied: "Copied!",
      viewDetails: "View Statistics",
      open: "Open",
    },
  };

  const t = translations[language];

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch shared links
      const { data: links, error: linksError } = await supabase
        .from("shared_poi_links")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (linksError) {
        console.error("Error fetching shared links:", linksError);
        setIsLoading(false);
        return;
      }

      setSharedLinks(links || []);

      // Fetch POI names for all referenced POIs
      const allPoiIds = [...new Set((links || []).flatMap((l) => l.poi_ids))];
      if (allPoiIds.length > 0) {
        const { data: poisData } = await supabase
          .from("points_of_interest")
          .select("id, name, name_en, category")
          .in("id", allPoiIds);

        if (poisData) {
          const poisMap: Record<string, POI> = {};
          poisData.forEach((poi) => {
            poisMap[poi.id] = poi;
          });
          setPois(poisMap);
        }
      }

      setIsLoading(false);
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const copyShareLink = async (shareCode: string) => {
    const shareUrl = `${window.location.origin}/pentru-oaspeti?share=${shareCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedCode(shareCode);
    toast({
      title: t.copied,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalImports = sharedLinks.reduce((sum, link) => sum + link.import_count, 0);
  const avgImports = sharedLinks.length > 0 ? (totalImports / sharedLinks.length).toFixed(1) : "0";

  const getPoiName = (poiId: string) => {
    const poi = pois[poiId];
    if (!poi) return poiId;
    return language === "ro" ? poi.name : poi.name_en;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      restaurant: "🍽️",
      cafe: "☕",
      bar: "🍸",
      attraction: "🏛️",
      park: "🌳",
      shopping: "🛍️",
      transport: "🚇",
      health: "🏥",
      default: "📍",
    };
    return icons[category] || icons.default;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          {t.viewDetails}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : sharedLinks.length === 0 ? (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t.noLinks}</h3>
            <p className="text-muted-foreground">{t.noLinksDesc}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sharedLinks.length}</p>
                      <p className="text-sm text-muted-foreground">{t.totalLinks}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent rounded-lg">
                      <Users className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalImports}</p>
                      <p className="text-sm text-muted-foreground">{t.totalImports}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <TrendingUp className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{avgImports}</p>
                      <p className="text-sm text-muted-foreground">{t.avgImports}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Links Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.linkCode}</TableHead>
                      <TableHead>{t.locations}</TableHead>
                      <TableHead className="text-center">{t.imports}</TableHead>
                      <TableHead>{t.created}</TableHead>
                      <TableHead>{t.lastImport}</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sharedLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {link.share_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {link.poi_ids.slice(0, 3).map((poiId) => (
                              <Badge key={poiId} variant="secondary" className="text-xs">
                                {getCategoryIcon(pois[poiId]?.category || "default")}{" "}
                                {getPoiName(poiId).slice(0, 15)}
                                {getPoiName(poiId).length > 15 ? "..." : ""}
                              </Badge>
                            ))}
                            {link.poi_ids.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{link.poi_ids.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={link.import_count > 0 ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            {link.import_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(link.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {link.last_imported_at
                            ? formatDistanceToNow(new Date(link.last_imported_at), {
                                addSuffix: true,
                                locale: dateLocale,
                              })
                            : t.never}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyShareLink(link.share_code)}
                              className="gap-1"
                            >
                              {copiedCode === link.share_code ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={`/pentru-oaspeti?share=${link.share_code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SharedLinksStats;
