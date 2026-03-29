import { useState, useMemo, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageCircle, ExternalLink, Flame, TrendingUp, ArrowLeft, Zap, StickyNote,
  Eye, CheckCircle, Phone, LayoutList, Columns3, Star, Copy, Clock, CalendarCheck,
  ThumbsUp, HelpCircle, Download, GitCompare, ArrowRightCircle, History,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
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
  listing_type: string;
  admin_notes: string | null;
  tags: string[];
}

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

// ── Pipeline Stages ──────────────────────────────
const PIPELINE_STAGES = [
  { value: "new", label: "Nou", emoji: "🆕", color: "border-t-blue-400 bg-blue-50/50 dark:bg-blue-950/20" },
  { value: "contacted", label: "Contactat", emoji: "📱", color: "border-t-amber-400 bg-amber-50/50 dark:bg-amber-950/20" },
  { value: "converted", label: "Convertit", emoji: "✅", color: "border-t-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" },
  { value: "rejected", label: "Respins", emoji: "❌", color: "border-t-red-400 bg-red-50/50 dark:bg-red-950/20" },
];

// ── Conversation Labels ──────────────────────────
const CONVERSATION_LABELS = [
  { value: "interesat", label: "🟢 Interesat", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300" },
  { value: "de-urmarit", label: "🔵 De urmărit", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300" },
  { value: "cald", label: "🔥 Cald", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300" },
  { value: "rece", label: "❄️ Rece", color: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 border-slate-300" },
  { value: "nu-raspunde", label: "📵 Nu răspunde", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300" },
  { value: "revine", label: "🔄 Revine el", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300" },
  { value: "potential-mare", label: "⭐ Potențial mare", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300" },
  { value: "urgent", label: "🚨 Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-400" },
];

// ── Quick Reply Templates ────────────────────────
const QUICK_REPLY_CATEGORIES = [
  {
    id: "proprietari",
    label: "🏠 Proprietari",
    replies: [
      {
        id: "prop-first", label: "👋 Primul contact", icon: MessageCircle,
        getMessage: (l: ScraperLead) => {
          const title = cleanTitleStatic(l.title);
          return `Bună ziua! 👋\n\nAm văzut proprietatea dvs. "${title}".\n\nȘtiați că proprietarii din Timișoara câștigă cu 40-60% mai mult în regim hotelier decât dintr-o chirie normală? Noi ne ocupăm de tot — de la curățenie la oaspeți.\n\nDacă vă interesează o estimare gratuită, scrieți-mi „DA" și vă trimit calculul în 5 minute. Fără nicio obligație! 😊`;
        },
      },
      {
        id: "prop-follow1", label: "🔄 Follow-up #1", icon: Clock,
        getMessage: (l: ScraperLead) => {
          const title = cleanTitleStatic(l.title);
          return `Bună ziua! 😊\n\nV-am scris zilele trecute referitor la "${title}". Înțeleg că sunteți ocupat(ă), dar voiam să vă spun că tocmai am finalizat o analiză.\n\nProprietarii din zonă câștigă în medie ${l.monthly_extra > 0 ? l.monthly_extra.toLocaleString("ro-RO") + "€" : "1.200€"}/lună net din regim hotelier.\n\nScrieți-mi „DA" dacă vă interesează! 🏠`;
        },
      },
      {
        id: "prop-follow2", label: "⏰ Follow-up #2", icon: Clock,
        getMessage: () => `Bună ziua!\n\nÎncerc ultima oară — nu vreau să deranjez. 😊\n\nDacă v-ați gândit vreodată să câștigați mai mult din apartament fără bătăi de cap, noi facem asta de peste 2 ani.\n\nDacă nu e momentul potrivit, nicio problemă! Vă urez o zi frumoasă! 🙏`,
      },
      {
        id: "prop-meeting", label: "📅 Propunere întâlnire", icon: CalendarCheck,
        getMessage: () => `Super, mă bucur că sunteți interesat(ă)! 🎉\n\nCel mai bine ar fi să ne vedem 15-20 minute la apartament.\n\nCând v-ar conveni?\n• Luni-Vineri: 10:00-18:00\n• Sâmbătă: 10:00-14:00\n\nSpuneți-mi o zi și confirm imediat! 📅`,
      },
      {
        id: "prop-after", label: "✅ După întâlnire", icon: ThumbsUp,
        getMessage: () => `Bună ziua! 😊\n\nMultumesc pentru întâlnire! Apartamentul arată foarte bine și are potențial excelent.\n\nVă trimit contractul și detaliile pe email. Dacă aveți întrebări, sunt la dispoziție! 🙏`,
      },
      {
        id: "prop-objection", label: "🤔 Răspuns obiecții", icon: HelpCircle,
        getMessage: () => `Înțeleg perfect! 😊\n\n✅ Contract minim 1 an, ieșire în 30 zile\n✅ Garanție chirie minimă lunară\n✅ Noi plătim utilitățile și reparațiile\n✅ Apartamentul e asigurat integral\n✅ Raport lunar detaliat\n\nProgramăm o discuție de 15 min? 🤝`,
      },
    ],
  },
  {
    id: "agentii",
    label: "🏢 Agenții",
    replies: [
      {
        id: "agent-intro", label: "👋 Parteneriat", icon: MessageCircle,
        getMessage: () => `Bună ziua! 👋\n\nSunt de la RealTrust ApartHotel.\n\n📈 Proprietarii câștigă 40-60% mai mult\n🤝 Agenția primește comision de referral\n🔄 Parteneriat pe termen lung\n\nV-ar interesa o discuție de 10 minute? 😊`,
      },
      {
        id: "agent-follow", label: "🔄 Follow-up", icon: Clock,
        getMessage: () => `Bună ziua! 😊\n\nRevenim cu propunerea de parteneriat. Comisionul de referral e 5% din venitul lunar, pe toată durata contractului.\n\nAveți 5 minute pentru o discuție? 📞`,
      },
    ],
  },
  {
    id: "dezvoltatori",
    label: "🏗️ Dezvoltatori",
    replies: [
      {
        id: "dev-intro", label: "👋 Prim contact", icon: MessageCircle,
        getMessage: () => `Bună ziua! 👋\n\nAdministrăm apartamente în regim hotelier în Timișoara.\n\n🏠 Preluăm blocuri sau apartamente individuale\n📈 ROI 8-12% anual\n🤝 Parteneriat exclusiv pe complex\n\nAți fi deschis la o întâlnire de 30 min? 🏗️`,
      },
      {
        id: "dev-bulk", label: "📦 Ofertă bloc", icon: CalendarCheck,
        getMessage: () => `Bună ziua! 🎉\n\nPachet Dezvoltator:\n• Preluăm minim 10 unități\n• Comision redus 15%\n• Design & staging inclus\n• Marketing dedicat\n\nCând ne-am putea vedea? 🤝`,
      },
    ],
  },
];

function cleanTitleStatic(title: string) {
  return title.replace(/🏢|🏰/g, "").replace(/\|/g, "").replace(/\s{2,}/g, " ").trim();
}

const ScraperLeads = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState<ScraperLead | null>(null);
  const [hotOnly, setHotOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [listingTab, setListingTab] = useState<"all" | "vanzare" | "inchiriere">("all");
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const [editNotes, setEditNotes] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["scraper-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_leads")
        .select("*")
        .order("lead_score", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, tags: d.tags || [] })) as ScraperLead[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // ── Realtime Alerts ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("scraper-leads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scraper_leads" }, (payload: any) => {
        const newLead = payload.new;
        if (newLead?.lead_score > 80) {
          toast.success(`🔥 Lead NOU cu scor ${newLead.lead_score}: ${cleanTitleStatic(newLead.title)}`, { duration: 8000 });
        } else {
          toast.info(`🆕 Lead nou: ${cleanTitleStatic(newLead?.title || "")}`, { duration: 5000 });
        }
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  // ── Fetch Status History when lead selected ────────
  useEffect(() => {
    if (!selectedLead) { setStatusHistory([]); return; }
    supabase
      .from("scraper_lead_status_history")
      .select("*")
      .eq("lead_id", selectedLead.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setStatusHistory((data as StatusHistoryEntry[]) || []));
  }, [selectedLead?.id]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (listingTab !== "all") result = result.filter((l) => l.listing_type === listingTab);
    if (hotOnly) result = result.filter((l) => l.lead_score > 80);
    return result;
  }, [leads, hotOnly, listingTab]);

  const profitStats = useMemo(() => {
    if (!leads || leads.length === 0) return null;
    const totalProfit3y = leads.reduce((s, l) => s + (l.extra_profit_3y || 0), 0);
    const totalMonthly = leads.reduce((s, l) => s + (l.monthly_extra || 0), 0);
    const hotCount = leads.filter((l) => l.lead_score > 80).length;
    const byDate = new Map<string, number>();
    leads.forEach((l) => {
      const day = l.created_at?.slice(0, 10) || "N/A";
      byDate.set(day, (byDate.get(day) || 0) + (l.extra_profit_3y || 0));
    });
    const chartData = Array.from(byDate.entries()).map(([date, profit]) => ({ date: date.slice(5), profit })).slice(-7);
    return { totalProfit3y, totalMonthly, hotCount, chartData };
  }, [leads]);

  const pipelineStats = useMemo(() => {
    if (!filteredLeads.length) return { total: 0, new: 0, contacted: 0, converted: 0, avgScore: 0 };
    return {
      total: filteredLeads.length,
      new: filteredLeads.filter((l) => l.status === "new").length,
      contacted: filteredLeads.filter((l) => l.status === "contacted").length,
      converted: filteredLeads.filter((l) => l.status === "converted").length,
      avgScore: Math.round(filteredLeads.reduce((s, l) => s + l.lead_score, 0) / filteredLeads.length),
    };
  }, [filteredLeads]);

  const formatPrice = (price: number, suffix?: string) =>
    price?.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " €" + (suffix || "");
  const getPriceSuffix = (lead: ScraperLead) => lead.listing_type === "inchiriere" ? "/lună" : "";
  const cleanTitle = (title: string) => cleanTitleStatic(title);

  const getPropertyBadge = (title: string) => {
    if (title.includes("🏢")) return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20 text-[10px] px-1.5 py-0">Ansamblu Nou</Badge>;
    if (title.includes("🏰")) return <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">Istoric Premium</Badge>;
    return null;
  };

  const getYield = (lead: ScraperLead) => {
    if (!lead.original_price || lead.original_price === 0) return null;
    return ((lead.monthly_extra * 12) / lead.original_price * 100).toFixed(1);
  };

  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) setSelectedIds([]);
    else setSelectedIds(filteredLeads.map((l) => l.id));
  };
  const handleRefresh = () => { setSelectedIds([]); refetch(); };

  const getScoreBadge = (score: number) => {
    if (score > 80) return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 gap-1"><Flame className="w-3 h-3" /> {score}</Badge>;
    if (score > 60) return <Badge variant="secondary" className="gap-1"><TrendingUp className="w-3 h-3" /> {score}</Badge>;
    return <Badge variant="outline">{score}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-500/15 text-blue-600 border-blue-500/20",
      contacted: "bg-amber-500/15 text-amber-600 border-amber-500/20",
      converted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
      rejected: "bg-red-500/15 text-red-600 border-red-500/20",
    };
    const labels: Record<string, string> = { new: "Nou", contacted: "Contactat", converted: "Convertit", rejected: "Respins" };
    return <Badge className={map[status] || "bg-muted text-muted-foreground"}>{labels[status] || status}</Badge>;
  };

  const handleWhatsApp = (lead: ScraperLead) => {
    const fallbackMsg = lead.listing_type === "inchiriere"
      ? `Bună ziua! Sunt interesat de închirierea proprietății: ${cleanTitle(lead.title)} (${formatPrice(lead.original_price, "/lună")}). ${lead.url}`
      : `Bună ziua! Sunt interesat de cumpărarea proprietății: ${cleanTitle(lead.title)} (${formatPrice(lead.original_price)}). ${lead.url}`;
    const msg = encodeURIComponent(lead.whatsapp_message || fallbackMsg);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  // ── Inline Status Change ──────────────────────────
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const { error } = await supabase.from("scraper_leads").update({ status: newStatus }).eq("id", leadId);
    if (error) { toast.error("Eroare la schimbarea statusului"); return; }
    toast.success(`Status: ${newStatus}`);
    if (selectedLead?.id === leadId) setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
    refetch();
    // Refresh history
    if (selectedLead?.id === leadId) {
      const { data } = await supabase.from("scraper_lead_status_history").select("*").eq("lead_id", leadId).order("changed_at", { ascending: false });
      setStatusHistory((data as StatusHistoryEntry[]) || []);
    }
  };

  // ── Toggle Tag ────────────────────────────────────
  const toggleTag = async (leadId: string, tag: string) => {
    const lead = leads?.find((l) => l.id === leadId);
    if (!lead) return;
    const currentTags = lead.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
    const { error } = await supabase.from("scraper_leads").update({ tags: newTags } as any).eq("id", leadId);
    if (error) { toast.error("Eroare la etichete"); return; }
    if (selectedLead?.id === leadId) setSelectedLead((prev) => prev ? { ...prev, tags: newTags } : null);
    refetch();
  };

  // ── Save Notes ────────────────────────────────────
  const saveNotes = async () => {
    if (!selectedLead) return;
    const { error } = await supabase.from("scraper_leads").update({ admin_notes: editNotes } as any).eq("id", selectedLead.id);
    if (error) { toast.error("Eroare la salvare"); return; }
    toast.success("Note salvate");
    setSelectedLead((prev) => prev ? { ...prev, admin_notes: editNotes } : null);
    refetch();
  };

  // ── Copy Message ──────────────────────────────────
  const copyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    toast.success("Mesaj copiat! Lipește-l în WhatsApp");
  };

  // ── CSV Export ─────────────────────────────────────
  const exportCSV = () => {
    if (!filteredLeads.length) return;
    const headers = ["Titlu", "Preț", "Tip", "Profit 3Y", "Extra/lună", "Scor", "Randament %", "Status", "Tags", "URL", "Data"];
    const rows = filteredLeads.map((l) => [
      cleanTitle(l.title),
      l.original_price,
      l.listing_type,
      l.extra_profit_3y,
      l.monthly_extra,
      l.lead_score,
      getYield(l) || "N/A",
      l.status,
      (l.tags || []).join("; "),
      l.url,
      l.created_at?.slice(0, 10),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `scraper-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success(`${filteredLeads.length} lead-uri exportate în CSV`);
  };

  // ── Compare Toggle ────────────────────────────────
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) { toast.error("Maxim 3 lead-uri pentru comparare"); return prev; }
      return [...prev, id];
    });
  };

  // ── Export to Properties ──────────────────────────
  const exportToProperties = async (lead: ScraperLead) => {
    const { error } = await supabase.from("prospect_listings").insert({
      prospect_type: lead.listing_type === "inchiriere" ? "inchiriere" : "vanzare",
      price: lead.original_price,
      location: "Timișoara",
      description: `Importat din Oportunități AI. Scor: ${lead.lead_score}. Randament: ${getYield(lead) || "N/A"}%/an. Profit extra 3Y: ${lead.extra_profit_3y}€`,
      admin_notes: lead.admin_notes || `Lead importat automat din scraper. URL: ${lead.url}`,
      is_active: true,
    } as any);
    if (error) {
      toast.error("Eroare la export: " + error.message);
      return;
    }
    toast.success("Lead exportat cu succes în Prospect Listings!");
  };

  const t = language === "ro"
    ? { title: "Oportunități AI", subtitle: "Oportunități de investiții detectate automat", back: "Înapoi", details: "Detalii", send: "Trimite pe WhatsApp", score: "Scor", price: "Preț", profit3y: "Profit Extra 3 ani", monthlyExtra: "Extra/lună", status: "Status", noData: "Niciun lead disponibil.", hotFilter: "Doar 🔥 > 80", totalProfit: "Profit total 3Y", monthlyTotal: "Extra lunar total", hotLeads: "Lead-uri fierbinți" }
    : { title: "AI Opportunities", subtitle: "Automatically detected investment opportunities", back: "Back", details: "Details", send: "Send via WhatsApp", score: "Score", price: "Price", profit3y: "Extra Profit 3Y", monthlyExtra: "Extra/month", status: "Status", noData: "No leads available.", hotFilter: "Only 🔥 > 80", totalProfit: "Total 3Y Profit", monthlyTotal: "Total monthly extra", hotLeads: "Hot leads" };

  // ── Status label helper ───────────────────────────
  const statusLabel = (s: string | null) => {
    const labels: Record<string, string> = { new: "Nou", contacted: "Contactat", converted: "Convertit", rejected: "Respins" };
    return labels[s || ""] || s || "—";
  };

  // ── Pipeline Kanban View ──────────────────────────
  const renderPipelineView = () => (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = filteredLeads.filter((l) => l.status === stage.value).sort((a, b) => b.lead_score - a.lead_score);
        return (
          <div key={stage.value} className={`min-w-[260px] max-w-[300px] flex-shrink-0 border-t-4 rounded-lg border border-border ${stage.color}`}>
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{stage.emoji} {stage.label}</h3>
                <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
              </div>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="p-2 space-y-2">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Gol</p>
                ) : stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="border border-border rounded-lg p-3 hover:bg-background/80 transition-colors cursor-pointer bg-card"
                    onClick={() => { setSelectedLead(lead); setEditNotes(lead.admin_notes || ""); setGeneratedMessage(""); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{cleanTitle(lead.title)}</h4>
                        {getPropertyBadge(lead.title)}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getScoreBadge(lead.lead_score)}
                        {getYield(lead) && <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{getYield(lead)}%/an</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{formatPrice(lead.original_price, getPriceSuffix(lead))}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">+{formatPrice(lead.monthly_extra)}/lu</span>
                    </div>
                    {lead.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lead.tags.map((tag) => {
                          const lbl = CONVERSATION_LABELS.find((l) => l.value === tag);
                          return lbl ? <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${lbl.color}`}>{lbl.label}</span> : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );

  const renderStatCard = (label: string, value: string | number, icon: React.ReactNode, colorClass: string) => (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  // ── Detail Panel Content ──────────────────────────
  const renderDetailPanel = () => {
    if (!selectedLead) return null;
    return (
      <>
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-serif leading-tight">{cleanTitle(selectedLead.title)}</SheetTitle>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {getPropertyBadge(selectedLead.title)}
            {getScoreBadge(selectedLead.lead_score)}
            {getStatusBadge(selectedLead.status)}
            {getYield(selectedLead) && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs">{getYield(selectedLead)}%/an</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{t.price}</p>
              <p className="text-lg font-bold font-mono">{formatPrice(selectedLead.original_price, getPriceSuffix(selectedLead))}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">{t.profit3y}</p>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">+{formatPrice(selectedLead.extra_profit_3y)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border col-span-2">
              <p className="text-xs text-muted-foreground mb-1">{t.monthlyExtra}</p>
              <p className="text-lg font-bold font-mono">+{formatPrice(selectedLead.monthly_extra)}/lună</p>
            </div>
          </div>

          {/* ── Quick Replies ──────────────────────── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">✨ Mesaje rapide (Quick Replies)</p>
            {QUICK_REPLY_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{cat.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.replies.map((reply) => (
                    <Button
                      key={reply.id}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => {
                        const msg = reply.getMessage(selectedLead);
                        setGeneratedMessage(msg);
                      }}
                    >
                      <reply.icon className="w-3 h-3" /> {reply.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {/* Generated Message Preview */}
            {generatedMessage && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm whitespace-pre-line leading-relaxed">
                  {generatedMessage}
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyMessage(generatedMessage)}>
                  <Copy className="w-3.5 h-3.5" /> Copiază mesajul
                </Button>
              </div>
            )}
          </div>

          {/* ── Etichete Conversație ───────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">🏷️ Etichete conversație</p>
            <div className="flex flex-wrap gap-1.5">
              {CONVERSATION_LABELS.map((lbl) => {
                const isActive = selectedLead.tags?.includes(lbl.value);
                return (
                  <button
                    key={lbl.value}
                    onClick={() => toggleTag(selectedLead.id, lbl.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isActive ? lbl.color + " ring-2 ring-offset-1 ring-current/20" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {lbl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Pipeline Status Inline ─────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Pipeline status:</p>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((stage) => (
                <Button
                  key={stage.value}
                  size="sm"
                  variant={selectedLead.status === stage.value ? "default" : "outline"}
                  className="text-xs h-7"
                  onClick={() => handleStatusChange(selectedLead.id, stage.value)}
                >
                  {stage.emoji} {stage.label}
                </Button>
              ))}
            </div>
          </div>

          {/* ── Status History Timeline ────────────── */}
          {statusHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5"><History className="w-4 h-4" /> Istoric statusuri</p>
              <div className="space-y-1.5 pl-3 border-l-2 border-border">
                {statusHistory.slice(0, 10).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground whitespace-nowrap">{new Date(h.changed_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-muted-foreground">{statusLabel(h.old_status)}</span>
                    <span>→</span>
                    <span className="font-medium">{statusLabel(h.new_status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Note Interne ──────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5"><StickyNote className="w-4 h-4" /> Note interne:</p>
            <Textarea
              placeholder="Ex: proprietarul pare interesat, sună luni..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <Button size="sm" onClick={saveNotes} className="bg-primary">Salvează note</Button>
          </div>

          {/* ── Export to Properties ───────────────── */}
          <Button variant="outline" className="w-full gap-2" onClick={() => exportToProperties(selectedLead)}>
            <ArrowRightCircle className="w-4 h-4" />
            Exportă în Prospect Listings
          </Button>

          {/* Link to original */}
          <Button variant="outline" className="w-full" onClick={() => window.open(selectedLead.url, "_blank")}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Deschide anunțul original
          </Button>
        </div>
      </>
    );
  };

  // ── Compare Dialog ────────────────────────────────
  const renderCompareDialog = () => {
    const compareLeads = compareIds.map((id) => leads?.find((l) => l.id === id)).filter(Boolean) as ScraperLead[];
    if (compareLeads.length < 2) return null;
    return (
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" /> Comparare Lead-uri ({compareLeads.length})</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-muted-foreground font-medium">Criteriu</th>
                  {compareLeads.map((l) => (
                    <th key={l.id} className="text-center p-2 font-medium max-w-[200px]">{cleanTitle(l.title)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {([
                  ["Preț", (l: ScraperLead) => formatPrice(l.original_price, getPriceSuffix(l))],
                  ["Scor", (l: ScraperLead) => String(l.lead_score)],
                  ["Randament %/an", (l: ScraperLead) => (getYield(l) || "N/A") + "%"],
                  ["Extra/lună", (l: ScraperLead) => "+" + formatPrice(l.monthly_extra)],
                  ["Profit 3Y", (l: ScraperLead) => "+" + formatPrice(l.extra_profit_3y)],
                  ["Tip", (l: ScraperLead) => l.listing_type === "inchiriere" ? "Închiriere" : "Vânzare"],
                  ["Status", (l: ScraperLead) => statusLabel(l.status)],
                  ["Etichete", (l: ScraperLead) => (l.tags || []).map((t) => CONVERSATION_LABELS.find((c) => c.value === t)?.label || t).join(", ") || "—"],
                ] as [string, (l: ScraperLead) => string][]).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="p-2 text-muted-foreground font-medium">{label}</td>
                    {compareLeads.map((l) => {
                      const vals = compareLeads.map(fn);
                      const val = fn(l);
                      const isBest = label === "Scor" || label === "Randament %/an" || label === "Extra/lună" || label === "Profit 3Y";
                      const best = isBest ? vals.reduce((a, b) => parseFloat(a.replace(/[^0-9.,\-]/g, "").replace(",", ".")) > parseFloat(b.replace(/[^0-9.,\-]/g, "").replace(",", ".")) ? a : b) : null;
                      return (
                        <td key={l.id} className={`p-2 text-center font-mono ${val === best ? "text-emerald-600 font-bold" : ""}`}>{val}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setCompareIds([]); setCompareOpen(false); }}>Închide</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <SEOHead title={`${t.title} | RealTrust`} description={t.subtitle} noIndex />
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
              {/* CSV Export */}
              <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5" disabled={!filteredLeads.length}>
                <Download className="w-4 h-4" /> CSV
              </Button>
              {/* Compare Button */}
              {compareIds.length >= 2 && (
                <Button size="sm" variant="secondary" onClick={() => setCompareOpen(true)} className="gap-1.5">
                  <GitCompare className="w-4 h-4" /> Compară ({compareIds.length})
                </Button>
              )}
              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button size="sm" variant={viewMode === "pipeline" ? "default" : "ghost"} onClick={() => setViewMode("pipeline")} className="rounded-none gap-1.5">
                  <Columns3 className="w-4 h-4" /> Pipeline
                </Button>
                <Button size="sm" variant={viewMode === "table" ? "default" : "ghost"} onClick={() => setViewMode("table")} className="rounded-none gap-1.5">
                  <LayoutList className="w-4 h-4" /> Tabel
                </Button>
              </div>
            </div>
          </div>

          {/* Listing Type Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 bg-muted/50 rounded-lg w-fit">
            {([["all", "Toate"], ["vanzare", "Vânzare"], ["inchiriere", "Închiriere"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setListingTab(val); setSelectedIds([]); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${listingTab === val ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Pipeline Stats */}
          {viewMode === "pipeline" && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {renderStatCard("Total", pipelineStats.total, <TrendingUp className="w-4 h-4 text-white" />, "bg-primary")}
              {renderStatCard("Noi", pipelineStats.new, <Eye className="w-4 h-4 text-white" />, "bg-blue-500")}
              {renderStatCard("Contactați", pipelineStats.contacted, <Phone className="w-4 h-4 text-white" />, "bg-amber-500")}
              {renderStatCard("Convertiți", pipelineStats.converted, <CheckCircle className="w-4 h-4 text-white" />, "bg-emerald-500")}
              {renderStatCard("Scor mediu", pipelineStats.avgScore, <Star className="w-4 h-4 text-white" />, "bg-yellow-500")}
            </div>
          )}

          {/* Table Stats */}
          {viewMode === "table" && profitStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.totalProfit}</p><p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">+{formatPrice(profitStats.totalProfit3y)}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.monthlyTotal}</p><p className="text-xl font-bold font-mono">+{formatPrice(profitStats.totalMonthly)}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.hotLeads}</p><p className="text-xl font-bold font-mono flex items-center gap-1"><Flame className="w-5 h-5 text-red-500" /> {profitStats.hotCount}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-2">{t.profit3y}</p><div className="h-16"><ResponsiveContainer width="100%" height="100%"><BarChart data={profitStats.chartData}><Bar dataKey="profit" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} /><XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip formatter={(v: number) => formatPrice(v)} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          )}

          {/* Filter + Bulk (table) */}
          {viewMode === "table" && (
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Switch checked={hotOnly} onCheckedChange={setHotOnly} />
                <span className="text-sm text-muted-foreground">{t.hotFilter}</span>
                {hotOnly && filteredLeads.length > 0 && <Badge variant="secondary">{filteredLeads.length}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {compareIds.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setCompareIds([])} className="text-xs">
                    Resetează comparare
                  </Button>
                )}
                <ScraperBulkActions selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} onRefresh={handleRefresh} allLeads={filteredLeads} />
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{t.noData}</div>
          ) : viewMode === "pipeline" ? (
            renderPipelineView()
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"><Checkbox checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead className="w-10 text-center" title="Compară"><GitCompare className="w-4 h-4 mx-auto text-muted-foreground" /></TableHead>
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
                      <TableRow key={lead.id} className={`hover:bg-muted/30 cursor-pointer transition-colors ${compareIds.includes(lead.id) ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`} onClick={() => { setSelectedLead(lead); setEditNotes(lead.admin_notes || ""); setGeneratedMessage(""); }}>
                        <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                          <Checkbox checked={compareIds.includes(lead.id)} onCheckedChange={() => toggleCompare(lead.id)} className="border-primary/40" />
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <span className="truncate">{cleanTitle(lead.title)}</span>
                            <div className="flex gap-1 flex-wrap">
                              {getPropertyBadge(lead.title)}
                              {lead.tags?.slice(0, 2).map((tag) => {
                                const lbl = CONVERSATION_LABELS.find((l) => l.value === tag);
                                return lbl ? <span key={tag} className={`text-[9px] px-1 py-0 rounded-full border ${lbl.color}`}>{lbl.label}</span> : null;
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getScoreBadge(lead.lead_score)}
                            {getYield(lead) && <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{getYield(lead)}%/an</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatPrice(lead.original_price, getPriceSuffix(lead))}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">+{formatPrice(lead.extra_profit_3y)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">+{formatPrice(lead.monthly_extra)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(lead.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setEditNotes(lead.admin_notes || ""); setGeneratedMessage(""); }}>
                            <Eye className="w-4 h-4" />
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
      <Sheet open={!!selectedLead} onOpenChange={(open) => { if (!open) { setSelectedLead(null); setGeneratedMessage(""); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {renderDetailPanel()}
        </SheetContent>
      </Sheet>

      {/* Compare Dialog */}
      {renderCompareDialog()}

      <Footer />
    </>
  );
};

export default ScraperLeads;
