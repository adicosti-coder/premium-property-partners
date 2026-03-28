import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, ExternalLink, Flame, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const { data: leads, isLoading } = useQuery({
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

  const formatPrice = (price: number) =>
    price.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " €";

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
    ? { title: "Lead-uri Scraper", subtitle: "Oportunități de investiții detectate automat", back: "Înapoi", details: "Detalii", send: "Trimite pe WhatsApp", score: "Scor", price: "Preț", profit3y: "Profit Extra 3 ani", monthlyExtra: "Extra/lună", status: "Status", noData: "Niciun lead disponibil." }
    : { title: "Scraper Leads", subtitle: "Automatically detected investment opportunities", back: "Back", details: "Details", send: "Send via WhatsApp", score: "Score", price: "Price", profit3y: "Extra Profit 3Y", monthlyExtra: "Extra/month", status: "Status", noData: "No leads available." };

  return (
    <>
      <SEOHead
        title={`${t.title} | RealTrust`}
        description={t.subtitle}
        canonicalPath="/scraper-leads"
      />
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{t.noData}</div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">{language === "ro" ? "Proprietate" : "Property"}</TableHead>
                      <TableHead className="font-semibold text-center">{t.score}</TableHead>
                      <TableHead className="font-semibold text-right">{t.price}</TableHead>
                      <TableHead className="font-semibold text-right">{t.profit3y}</TableHead>
                      <TableHead className="font-semibold text-right">{t.monthlyExtra}</TableHead>
                      <TableHead className="font-semibold text-center">{t.status}</TableHead>
                      <TableHead className="font-semibold text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <TableCell className="font-medium max-w-[220px] truncate">{lead.title}</TableCell>
                        <TableCell className="text-center">{getScoreBadge(lead.lead_score)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatPrice(lead.original_price)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">+{formatPrice(lead.extra_profit_3y)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">+{formatPrice(lead.monthly_extra)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(lead.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                          >
                            {t.details}
                          </Button>
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
                {/* Stats */}
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

                {/* WhatsApp Message */}
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

                {/* Source link */}
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
