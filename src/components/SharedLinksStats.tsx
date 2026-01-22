import { useState, useEffect, useMemo } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart3,
  Link2,
  Users,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Trash2,
  Loader2,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format, subDays, startOfDay, eachDayOfInterval, startOfWeek, eachWeekOfInterval, subWeeks } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

interface ImportEvent {
  id: string;
  shared_link_id: string;
  imported_count: number;
  created_at: string;
}

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
  const [importEvents, setImportEvents] = useState<ImportEvent[]>([]);
  const [pois, setPois] = useState<Record<string, POI>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

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
      delete: "Șterge",
      deleteConfirmTitle: "Șterge link-ul partajat?",
      deleteConfirmDesc: "Acest link nu va mai funcționa și nu va mai putea fi accesat de alți utilizatori.",
      cancel: "Anulează",
      confirm: "Șterge",
      deleteSuccess: "Link șters cu succes",
      deleteError: "Eroare la ștergerea link-ului",
      importTrends: "Tendințe Importuri",
      daily: "Zilnic",
      weekly: "Săptămânal",
      noData: "Nu există date pentru această perioadă",
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
      delete: "Delete",
      deleteConfirmTitle: "Delete shared link?",
      deleteConfirmDesc: "This link will no longer work and won't be accessible by other users.",
      cancel: "Cancel",
      confirm: "Delete",
      deleteSuccess: "Link deleted successfully",
      deleteError: "Error deleting link",
      importTrends: "Import Trends",
      daily: "Daily",
      weekly: "Weekly",
      noData: "No data for this period",
    },
  };

  const t = translations[language];

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

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

      // Fetch import events for trends chart
      const linkIds = (links || []).map((l) => l.id);
      if (linkIds.length > 0) {
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
        const { data: events, error: eventsError } = await supabase
          .from("poi_import_events")
          .select("*")
          .in("shared_link_id", linkIds)
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true });

        if (!eventsError && events) {
          setImportEvents(events);
        }
      }

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

  // Realtime subscription for import events
  useEffect(() => {
    if (!currentUserId) return;

    const linkIds = sharedLinks.map((l) => l.id);
    if (linkIds.length === 0) return;

    const channel = supabase
      .channel('poi-import-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poi_import_events',
        },
        (payload) => {
          const newEvent = payload.new as ImportEvent;
          
          // Check if this event is for one of our links
          if (linkIds.includes(newEvent.shared_link_id)) {
            // Add to import events for chart
            setImportEvents((prev) => [...prev, newEvent]);
            
            // Update the import count on the corresponding link
            setSharedLinks((prev) =>
              prev.map((link) =>
                link.id === newEvent.shared_link_id
                  ? {
                      ...link,
                      import_count: link.import_count + 1,
                      last_imported_at: newEvent.created_at,
                    }
                  : link
              )
            );

            // Show toast notification
            const link = sharedLinks.find((l) => l.id === newEvent.shared_link_id);
            toast({
              title: language === 'ro' ? '🎉 Nou import!' : '🎉 New import!',
              description: language === 'ro' 
                ? `Cineva a importat ${newEvent.imported_count} locații din link-ul ${link?.share_code || ''}`
                : `Someone imported ${newEvent.imported_count} locations from link ${link?.share_code || ''}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, sharedLinks, language]);

  const copyShareLink = async (shareCode: string) => {
    const shareUrl = `${window.location.origin}/pentru-oaspeti?share=${shareCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedCode(shareCode);
    toast({
      title: t.copied,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (linkId: string) => {
    setDeletingId(linkId);
    try {
      const { error } = await supabase
        .from("shared_poi_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setSharedLinks((prev) => prev.filter((link) => link.id !== linkId));
      toast({
        title: t.deleteSuccess,
      });
    } catch (error) {
      console.error("Error deleting link:", error);
      toast({
        title: t.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const totalImports = sharedLinks.reduce((sum, link) => sum + link.import_count, 0);
  const avgImports = sharedLinks.length > 0 ? (totalImports / sharedLinks.length).toFixed(1) : "0";

  // Calculate chart data based on view type
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (chartView === 'daily') {
      // Last 14 days
      const days = eachDayOfInterval({
        start: subDays(now, 13),
        end: now,
      });
      
      return days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const importsOnDay = importEvents.filter((event) => {
          const eventDate = new Date(event.created_at);
          return eventDate >= dayStart && eventDate < dayEnd;
        });
        
        return {
          date: format(day, 'dd MMM', { locale: dateLocale }),
          imports: importsOnDay.reduce((sum, e) => sum + e.imported_count, 0),
        };
      });
    } else {
      // Last 8 weeks
      const weeks = eachWeekOfInterval({
        start: subWeeks(now, 7),
        end: now,
      }, { weekStartsOn: 1 });
      
      return weeks.map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        const importsInWeek = importEvents.filter((event) => {
          const eventDate = new Date(event.created_at);
          return eventDate >= weekStart && eventDate < weekEnd;
        });
        
        return {
          date: format(weekStart, 'dd MMM', { locale: dateLocale }),
          imports: importsInWeek.reduce((sum, e) => sum + e.imported_count, 0),
        };
      });
    }
  }, [importEvents, chartView, dateLocale]);

  const chartConfig = {
    imports: {
      label: language === 'ro' ? 'Importuri' : 'Imports',
      color: 'hsl(var(--primary))',
    },
  };

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

            {/* Import Trends Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t.importTrends}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant={chartView === 'daily' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartView('daily')}
                      className="text-xs"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {t.daily}
                    </Button>
                    <Button
                      variant={chartView === 'weekly' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setChartView('weekly')}
                      className="text-xs"
                    >
                      {t.weekly}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.some(d => d.imports > 0) ? (
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        className="text-muted-foreground"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="imports" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    <p>{t.noData}</p>
                  </div>
                )}
              </CardContent>
            </Card>

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
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyShareLink(link.share_code)}
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={deletingId === link.id}
                                >
                                  {deletingId === link.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.deleteConfirmDesc}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(link.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t.confirm}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
