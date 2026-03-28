import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, ExternalLink, Flame, TrendingUp, ArrowLeft, Zap, Euro, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { ScraperLeadActions, getLeadNotes } from "@/components/admin/ScraperLeadActions";
import { ScraperBulkActions } from "@/components/admin/ScraperBulkActions";

interface ScraperLead {
  id: string;
  title: string;
  original_price: number;
  extra_profit_3y: number;
  monthly_extra: number;
  lead_score: number;
  whatsapp_message: string | null;
  url: string;
  status: string;
  created_at: string;
}

const ScraperLeads = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState<ScraperLead | null>(null);
  const [hotOnly, setHotOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["scraper-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_leads")
        .select("*")
        .order("lead_score", { ascending: false });
      if (error) throw error;
      return data as ScraperLead[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return hotOnly ? leads.filter((l) => l.lead_score > 80) : leads;
  }, [leads, hotOnly]);

  const profitStats = useMemo(() => {
    if (!leads || leads.length === 0) return null;
    const totalProfit3y = leads.reduce((s, l) => s + (l.extra_profit_3y || 0), 0);
    const totalMonthly = leads.reduce((s, l) => s + (l.monthly_extra || 0), 0);
    const hotCount = leads.filter((l) => l.lead_score > 80).length;

    // Group by date for chart
    const byDate = new Map<string, number>();
    leads.forEach((l) => {
      const day = l.created_at?.slice(0, 10) || "N/A";
      byDate.set(day, (byDate.get(day) || 0) + (l.extra_profit_3y || 0));
    });
    const chartData = Array.from(byDate.entries())
      .map(([date, profit]) => ({ date: date.slice(5), profit }))
      .slice(-7);

    return { totalProfit3y, totalMonthly, hotCount, chartData };
  }, [leads]);

  const formatPrice = (price: number) =>
    price?.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " €";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) setSelectedIds([]);
    else setSelectedIds(filteredLeads.map((l) => l.id));
  };
  const handleRefresh = () => { setSelectedIds([]); refetch(); };

  const getScoreBadge = (score: number) => {
    if (score > 80) return (
      <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 gap-1">
        <Flame className="w-3 h-3" /> {score}
      </Badge>
    );
    if (score > 60) return (
      <Badge variant="secondary" className="gap-1">
        <TrendingUp className="w-3 h-3" /> {score}
      </Badge>
    );
    return <Badge variant="outline">{score}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-500/15 text-blue-600 border-blue-500/20",
      contacted: "bg-amber-500/15 text-amber-600 border-amber-500/20",
      converted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    };
    return (
      <Badge className={map[status] || "bg-muted text-muted-foreground"}>
        {status === "new" ? "Nou" : status === "contacted" ? "Contactat" : status}
      </Badge>
    );
  };

  const handleWhatsApp = (lead: ScraperLead) => {
    const msg = encodeURIComponent(lead.whatsapp_message || "");
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const t = language === "ro"
    ? { title: "Oportunități AI", subtitle: "Oportunități de investiții detectate automat", back: "Înapoi", details: "Detalii", send: "Trimite pe WhatsApp", score: "Scor", price: "Preț", profit3y: "Profit Extra 3 ani", monthlyExtra: "Extra/lună", status: "Status", noData: "Niciun lead disponibil.", hotFilter: "Doar 🔥 > 80", totalProfit: "Profit total 3Y", monthlyTotal: "Extra lunar total", hotLeads: "Lead-uri fierbinți" }
    : { title: "AI Opportunities", subtitle: "Automatically detected investment opportunities", back: "Back", details: "Details", send: "Send via WhatsApp", score: "Score", price: "Price", profit3y: "Extra Profit 3Y", monthlyExtra: "Extra/month", status: "Status", noData: "No leads available.", hotFilter: "Only 🔥 > 80", totalProfit: "Total 3Y Profit", monthlyTotal: "Total monthly extra", hotLeads: "Hot leads" };

  return (
    <>
      <SEOHead title={`${t.title} | RealTrust`} description={t.subtitle} noIndex />
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">{t.title}</h1>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Stats & Chart */}
          {profitStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{t.totalProfit}</p>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">+{formatPrice(profitStats.totalProfit3y)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{t.monthlyTotal}</p>
                  <p className="text-xl font-bold font-mono">+{formatPrice(profitStats.totalMonthly)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{t.hotLeads}</p>
                  <p className="text-xl font-bold font-mono flex items-center gap-1"><Flame className="w-5 h-5 text-red-500" /> {profitStats.hotCount}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">{t.profit3y}</p>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitStats.chartData}>
                        <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v: number) => formatPrice(v)} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter + Bulk */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Switch checked={hotOnly} onCheckedChange={setHotOnly} />
              <span className="text-sm text-muted-foreground">{t.hotFilter}</span>
              {hotOnly && filteredLeads.length > 0 && (
                <Badge variant="secondary">{filteredLeads.length}</Badge>
              )}
            </div>
            <ScraperBulkActions
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds([])}
              onRefresh={handleRefresh}
              allLeads={filteredLeads}
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{t.noData}</div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">{language === "ro" ? "Proprietate" : "Property"}</TableHead>
                      <TableHead className="font-semibold text-center">{t.score}</TableHead>
                      <TableHead className="font-semibold text-right">{t.price}</TableHead>
                      <TableHead className="font-semibold text-right">{t.profit3y}</TableHead>
                      <TableHead className="font-semibold text-right">{t.monthlyExtra}</TableHead>
                      <TableHead className="font-semibold text-center">{t.status}</TableHead>
                      <TableHead className="font-semibold text-center w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px] truncate">{lead.title}</TableCell>
                        <TableCell className="text-center">{getScoreBadge(lead.lead_score)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatPrice(lead.original_price)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">+{formatPrice(lead.extra_profit_3y)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">+{formatPrice(lead.monthly_extra)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(lead.status)}</TableCell>
                        <TableCell className="text-center">
                          <ScraperLeadActions
                            leadId={lead.id}
                            currentStatus={lead.status}
                            onRefresh={handleRefresh}
                            onViewDetails={() => setSelectedLead(lead)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl font-serif">{selectedLead.title}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getScoreBadge(selectedLead.lead_score)}
                  {getStatusBadge(selectedLead.status)}
                </div>
              </SheetHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{t.price}</p>
                    <p className="text-lg font-bold font-mono">{formatPrice(selectedLead.original_price)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">{t.profit3y}</p>
                    <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">+{formatPrice(selectedLead.extra_profit_3y)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">{t.monthlyExtra}</p>
                    <p className="text-lg font-bold font-mono">+{formatPrice(selectedLead.monthly_extra)}/lună</p>
                  </div>
                </div>

                {selectedLead.whatsapp_message && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">{language === "ro" ? "Mesaj WhatsApp" : "WhatsApp Message"}</p>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground leading-relaxed">
                      {selectedLead.whatsapp_message}
                    </div>
                    <Button
                      className="w-full h-14 text-base font-semibold bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg"
                      onClick={() => handleWhatsApp(selectedLead)}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {t.send}
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedLead.url, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {language === "ro" ? "Vezi anunțul original" : "View original listing"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </>
  );
};

export default ScraperLeads;
