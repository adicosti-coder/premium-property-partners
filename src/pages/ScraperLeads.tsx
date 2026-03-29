import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageCircle, ExternalLink, Flame, TrendingUp, ArrowLeft, Zap, StickyNote,
  Eye, CheckCircle, Phone, LayoutList, Columns3, Star, Copy, Clock, CalendarCheck,
  ThumbsUp, HelpCircle, Download, GitCompare, ArrowRightCircle, History,
  Search, Loader2, Handshake, Calendar, MapPin, Filter, ChevronRight, Ban, Archive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { ScraperBulkActions } from "@/components/admin/ScraperBulkActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  source: string;
  phone: string | null;
}

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

// ── Pipeline Stages (extended from Bot Prospectare) ──────────
const PIPELINE_STAGES = [
  { value: "new", label: "Nou", emoji: "🆕", color: "border-t-blue-400 bg-blue-50/50 dark:bg-blue-950/20" },
  { value: "reviewed", label: "Revizuit", emoji: "👁️", color: "border-t-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20" },
  { value: "contacted", label: "Contactat", emoji: "📱", color: "border-t-orange-400 bg-orange-50/50 dark:bg-orange-950/20" },
  { value: "interested", label: "Interesat", emoji: "🤝", color: "border-t-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" },
  { value: "meeting", label: "Programat", emoji: "📅", color: "border-t-violet-400 bg-violet-50/50 dark:bg-violet-950/20" },
  { value: "converted", label: "Client", emoji: "✅", color: "border-t-green-500 bg-green-50/50 dark:bg-green-950/20" },
  { value: "rejected", label: "Respins", emoji: "❌", color: "border-t-red-400 bg-red-50/50 dark:bg-red-950/20" },
  { value: "archived", label: "Arhivat", emoji: "📦", color: "border-t-gray-400 bg-gray-50/50 dark:bg-gray-950/20" },
];

// ── Prospect Type Categories ─────────────────────
const PROSPECT_TYPES = [
  { value: "proprietar", label: "🏠 Proprietari", icon: "🏠" },
  { value: "agentie", label: "🏢 Agenții", icon: "🏢" },
  { value: "dezvoltator", label: "🏗️ Dezvoltatori", icon: "🏗️" },
] as const;

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

// ── Source Colors ────────────────────────────────
const sourceColors: Record<string, string> = {
  "OLX": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "OLX-Nou": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Storia": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Publi24": "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

// ── Relative Date Helper ─────────────────────────
const getRelativeDate = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "Azi";
  if (diff === 1) return "Ieri";
  if (diff < 7) return `${diff} zile`;
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
};


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
      {
        id: "agent-proposal", label: "📋 Propunere formală", icon: CalendarCheck,
        getMessage: () => `Bună ziua! 🎉\n\nMă bucur de interes! Iată ce oferim:\n\n📌 Comision referral: 5% din venitul net lunar\n📌 Plată lunară, pe toată durata contractului\n📌 Fără costuri pentru agenție\n📌 Raportare transparentă\n\nVă pot trimite contractul cadru pe email? 📧`,
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

function deriveListingType(title: string, dbType: string): string {
  const upper = (title || "").toUpperCase();
  if (upper.includes("INCHIRIERE") || upper.includes("ÎNCHIRIERE") || upper.includes("CHIRIE")) return "inchiriere";
  if (upper.includes("VANZARE") || upper.includes("VÂNZARE")) return "vanzare";
  return dbType || "vanzare";
}

function deriveProspectType(title: string): string {
  const upper = (title || "").toUpperCase();
  if (upper.includes("AGENTI") || upper.includes("AGENȚI") || upper.includes("AGENTIE") || upper.includes("AGENȚIE")) return "agentie";
  if (upper.includes("DEZVOLTATOR") || upper.includes("ANSAMBLU") || upper.includes("COMPLEX") || upper.includes("🏢")) return "dezvoltator";
  return "proprietar";
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isScraping, setIsScraping] = useState(false);

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["scraper-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_leads")
        .select("*")
        .not("status", "eq", "archived")
        .order("lead_score", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        listing_type: deriveListingType(d.title, d.listing_type),
        tags: d.tags || [],
        _prospect_type: deriveProspectType(d.title),
      })) as (ScraperLead & { _prospect_type: string })[];
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
        queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync editNotes when selectedLead changes ────────
  useEffect(() => {
    if (selectedLead) setEditNotes(selectedLead.admin_notes || "");
  }, [selectedLead?.id, selectedLead?.admin_notes]);

  // ── Status History via React Query ────────────────
  const { data: statusHistory = [] } = useQuery({
    queryKey: ["lead-status-history", selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead?.id) return [];
      const { data } = await supabase
        .from("scraper_lead_status_history")
        .select("*")
        .eq("lead_id", selectedLead.id)
        .order("changed_at", { ascending: false })
        .limit(10);
      return (data as StatusHistoryEntry[]) || [];
    },
    enabled: !!selectedLead?.id,
    staleTime: 30_000,
  });

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads as (ScraperLead & { _prospect_type: string })[];
    if (listingTab !== "all") result = result.filter((l) => l.listing_type === listingTab);
    if (filterType !== "all") result = result.filter((l) => l._prospect_type === filterType);
    if (hotOnly) result = result.filter((l) => l.lead_score > 80);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => l.title?.toLowerCase().includes(q) || l.url?.toLowerCase().includes(q));
    }
    return result;
  }, [leads, hotOnly, listingTab, filterType, searchQuery]);

  // Stats based on filtered leads
  const profitStats = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return null;
    const totalProfit3y = filteredLeads.reduce((s, l) => s + (l.extra_profit_3y || 0), 0);
    const totalMonthly = filteredLeads.reduce((s, l) => s + (l.monthly_extra || 0), 0);
    const hotCount = filteredLeads.filter((l) => l.lead_score > 80).length;
    const byDate = new Map<string, number>();
    filteredLeads.forEach((l) => {
      const day = l.created_at?.slice(0, 10) || "N/A";
      byDate.set(day, (byDate.get(day) || 0) + (l.extra_profit_3y || 0));
    });
    const chartData = Array.from(byDate.entries()).map(([date, profit]) => ({ date: date.slice(5), profit })).slice(-7);
    return { totalProfit3y, totalMonthly, hotCount, chartData };
  }, [filteredLeads]);

  // Pipeline stats (6 cards like Bot Prospectare)
  const pipelineStats = useMemo(() => {
    if (!filteredLeads.length) return { total: 0, new: 0, contacted: 0, interested: 0, converted: 0, avgScore: 0 };
    return {
      total: filteredLeads.length,
      new: filteredLeads.filter((l) => l.status === "new").length,
      contacted: filteredLeads.filter((l) => l.status === "contacted" || l.status === "reviewed").length,
      interested: filteredLeads.filter((l) => l.status === "interested" || l.status === "meeting").length,
      converted: filteredLeads.filter((l) => l.status === "converted").length,
      avgScore: Math.round(filteredLeads.reduce((s, l) => s + l.lead_score, 0) / filteredLeads.length),
    };
  }, [filteredLeads]);

  const formatPrice = (price: number, suffix?: string) =>
    price?.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " €" + (suffix || "");
  const getPriceSuffix = (lead: ScraperLead) => lead.listing_type === "inchiriere" ? "/lună" : "";
  

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
    const stage = PIPELINE_STAGES.find((s) => s.value === status);
    if (!stage) return <Badge variant="outline">{status}</Badge>;
    const colorMap: Record<string, string> = {
      new: "bg-blue-500/15 text-blue-600 border-blue-500/20",
      reviewed: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
      contacted: "bg-orange-500/15 text-orange-600 border-orange-500/20",
      interested: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
      meeting: "bg-violet-500/15 text-violet-600 border-violet-500/20",
      converted: "bg-green-500/15 text-green-600 border-green-500/20",
      rejected: "bg-red-500/15 text-red-600 border-red-500/20",
    };
    return <Badge className={colorMap[status] || "bg-muted text-muted-foreground"}>{stage.emoji} {stage.label}</Badge>;
  };

  const handleWhatsApp = (lead: ScraperLead) => {
    const fallbackMsg = lead.listing_type === "inchiriere"
      ? `Bună ziua! Sunt interesat de închirierea proprietății: ${cleanTitleStatic(lead.title)} (${formatPrice(lead.original_price, "/lună")}). ${lead.url}`
      : `Bună ziua! Sunt interesat de cumpărarea proprietății: ${cleanTitleStatic(lead.title)} (${formatPrice(lead.original_price)}). ${lead.url}`;
    const msg = encodeURIComponent(lead.whatsapp_message || fallbackMsg);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  // ── Inline Status Change (optimistic) ──────────────
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.map((l: any) => l.id === leadId ? { ...l, status: newStatus } : l) : old
    );
    if (selectedLead?.id === leadId)
      setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);

    const { error } = await supabase.from("scraper_leads").update({ status: newStatus } as any).eq("id", leadId);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error("Eroare la schimbarea statusului");
      return;
    }
    toast.success(`Status: ${PIPELINE_STAGES.find((s) => s.value === newStatus)?.label || newStatus}`);
    queryClient.invalidateQueries({ queryKey: ["lead-status-history", leadId] });
  };

  // ── Toggle Tag (optimistic) ────────────────────────
  const toggleTag = async (leadId: string, tag: string) => {
    const lead = leads?.find((l) => l.id === leadId);
    if (!lead) return;
    const currentTags = lead.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
    // Optimistic update
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.map((l: any) => l.id === leadId ? { ...l, tags: newTags } : l) : old
    );
    if (selectedLead?.id === leadId) setSelectedLead((prev) => prev ? { ...prev, tags: newTags } : null);
    const { error } = await supabase.from("scraper_leads").update({ tags: newTags } as any).eq("id", leadId);
    if (error) {
      toast.error("Eroare la etichete");
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      return;
    }
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
      cleanTitleStatic(l.title), l.original_price, l.listing_type, l.extra_profit_3y, l.monthly_extra, l.lead_score,
      getYield(l) || "N/A", l.status, (l.tags || []).join("; "), l.url, l.created_at?.slice(0, 10),
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
      prospect_type: (lead as any)._prospect_type || "proprietar",
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

  // ── Blacklist Phone ──────────────────────────────
  const handleBlacklist = async (lead: ScraperLead) => {
    if (!lead.phone) {
      toast.error("Lead-ul nu are număr de telefon");
      return;
    }
    // Optimistic remove from UI
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.filter((l: any) => l.id !== lead.id) : old
    );
    if (selectedLead?.id === lead.id) setSelectedLead(null);

    // Insert into phone_intelligence
    const { error: piError } = await supabase.from("phone_intelligence" as any).upsert({
      phone_number: lead.phone,
      category: (lead as any)._prospect_type || "proprietar",
      is_blacklisted: true,
      last_seen: new Date().toISOString(),
    } as any, { onConflict: "phone_number" });

    // Archive the lead
    const { error } = await supabase.from("scraper_leads").update({ status: "archived" } as any).eq("id", lead.id);

    if (error || piError) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error("Eroare la blacklist");
      return;
    }
    toast.success(`☠️ ${lead.phone} adăugat pe blacklist. Lead-ul a fost arhivat.`);
  };

  // ── Archive Lead (instead of delete) ─────────────
  const handleArchive = async (leadId: string) => {
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.filter((l: any) => l.id !== leadId) : old
    );
    if (selectedLead?.id === leadId) setSelectedLead(null);

    const { error } = await supabase.from("scraper_leads").update({ status: "archived" } as any).eq("id", leadId);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error("Eroare la arhivare");
      return;
    }
    toast.success("Lead arhivat");
  };

  // ── Scan (Scanează acum) ──────────────────────────
  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-prospects", {
        body: { max_results: 10 },
      });
      if (error) throw error;
      toast.success(`Scanare completă! ${data?.new_listings || 0} anunțuri noi găsite.`);
      refetch();
    } catch (err: any) {
      toast.error("Eroare scanare: " + (err.message || "Necunoscută"));
    } finally {
      setIsScraping(false);
    }
  };

  const t = useMemo(() => language === "ro"
    ? { title: "Oportunități AI", subtitle: "Oportunități de investiții detectate automat", back: "Înapoi", details: "Detalii", send: "Trimite pe WhatsApp", score: "Scor", price: "Preț", profit3y: "Profit Extra 3 ani", monthlyExtra: "Extra/lună", status: "Status", noData: "Niciun lead disponibil.", hotFilter: "Doar 🔥 > 80", totalProfit: "Profit total 3Y", monthlyTotal: "Extra lunar total", hotLeads: "Lead-uri fierbinți" }
    : { title: "AI Opportunities", subtitle: "Automatically detected investment opportunities", back: "Back", details: "Details", send: "Send via WhatsApp", score: "Score", price: "Price", profit3y: "Extra Profit 3Y", monthlyExtra: "Extra/month", status: "Status", noData: "No leads available.", hotFilter: "Only 🔥 > 80", totalProfit: "Total 3Y Profit", monthlyTotal: "Total monthly extra", hotLeads: "Hot leads" },
  [language]);

  const statusLabel = (s: string | null) => {
    const stage = PIPELINE_STAGES.find((st) => st.value === (s || ""));
    return stage ? stage.label : s || "—";
  };

  // ── Pipeline Kanban View ──────────────────────────
  const renderPipelineView = () => {
    const activeStages = PIPELINE_STAGES.filter((stage) => {
      if (["new", "contacted", "interested", "converted"].includes(stage.value)) return true;
      return filteredLeads.some((l) => l.status === stage.value);
    });

    return (
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
        {activeStages.map((stage) => {
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
                      onClick={() => { setSelectedLead(lead); setGeneratedMessage(""); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{cleanTitleStatic(lead.title)}</h4>
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
  };

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
          <SheetTitle className="text-lg font-serif leading-tight">{cleanTitleStatic(selectedLead.title)}</SheetTitle>
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
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyMessage(generatedMessage)}>
                    <Copy className="w-3.5 h-3.5" /> Copiază mesajul
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleWhatsApp(selectedLead)}>
                    <Phone className="w-3.5 h-3.5" /> Trimite pe WhatsApp
                  </Button>
                </div>
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
          <Button variant="outline" className="w-full" onClick={() => window.open(selectedLead.url, "_blank", "noopener,noreferrer")}>
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
                    <th key={l.id} className="text-center p-2 font-medium max-w-[200px]">{cleanTitleStatic(l.title)}</th>
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

  // Category counts
  const categoryCounts = useMemo(() => {
    if (!leads) return { all: 0, proprietar: 0, agentie: 0, dezvoltator: 0 };
    const base = listingTab === "all" ? leads : leads.filter((l) => l.listing_type === listingTab);
    return {
      all: base.length,
      proprietar: base.filter((l) => (l as any)._prospect_type === "proprietar").length,
      agentie: base.filter((l) => (l as any)._prospect_type === "agentie").length,
      dezvoltator: base.filter((l) => (l as any)._prospect_type === "dezvoltator").length,
    };
  }, [leads, listingTab]);

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
            <div className="flex items-center gap-2 flex-wrap">
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
              {/* Scanează acum */}
              <Button onClick={handleScrape} disabled={isScraping} className="gap-1.5">
                {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isScraping ? "Se scanează..." : "Scanează acum"}
              </Button>
            </div>
          </div>

          {/* Listing Type Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 bg-muted/50 rounded-lg w-fit">
            {([["all", "Toate", leads?.length || 0], ["vanzare", "Vânzare", leads?.filter((l) => l.listing_type === "vanzare").length || 0], ["inchiriere", "Închiriere", leads?.filter((l) => l.listing_type === "inchiriere").length || 0]] as [string, string, number][]).map(([val, label, count]) => (
              <button key={val} onClick={() => { setListingTab(val as any); setSelectedIds([]); }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${listingTab === val ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${listingTab === val ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{count}</span>
              </button>
            ))}
          </div>

          {/* Category Filters (from Bot Prospectare) */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Button size="sm" variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>
              📋 Toate ({categoryCounts.all})
            </Button>
            {PROSPECT_TYPES.map((pt) => (
              <Button key={pt.value} size="sm" variant={filterType === pt.value ? "default" : "outline"} onClick={() => setFilterType(pt.value)}>
                {pt.label} ({categoryCounts[pt.value as keyof typeof categoryCounts]})
              </Button>
            ))}
          </div>

          {/* Stats (6 cards like Bot Prospectare) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
            {renderStatCard("Total", pipelineStats.total, <TrendingUp className="w-4 h-4 text-white" />, "bg-primary")}
            {renderStatCard("Noi", pipelineStats.new, <Eye className="w-4 h-4 text-white" />, "bg-blue-500")}
            {renderStatCard("Contactați", pipelineStats.contacted, <Phone className="w-4 h-4 text-white" />, "bg-orange-500")}
            {renderStatCard("Interesați", pipelineStats.interested, <Handshake className="w-4 h-4 text-white" />, "bg-emerald-500")}
            {renderStatCard("Clienți", pipelineStats.converted, <CheckCircle className="w-4 h-4 text-white" />, "bg-green-600")}
            {renderStatCard("Scor mediu", pipelineStats.avgScore, <Star className="w-4 h-4 text-white" />, "bg-yellow-500")}
          </div>

          {/* Active filters indicator */}
          {(filterType !== 'all' || hotOnly || searchQuery || listingTab !== 'all') && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mb-4 flex-wrap">
              <Filter className="h-3 w-3 shrink-0" />
              <span className="flex items-center gap-1 flex-wrap">
                Filtre active:
                {hotOnly && <Badge variant="outline" className="ml-1 text-[10px]">🔥 Scor &gt; 80</Badge>}
                {listingTab !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">{listingTab === 'vanzare' ? 'Vânzare' : 'Închiriere'}</Badge>}
                {filterType !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">{filterType}</Badge>}
                {searchQuery && <Badge variant="outline" className="ml-1 text-[10px]">"{searchQuery}"</Badge>}
              </span>
              <button
                className="underline hover:text-foreground ml-1"
                onClick={() => { setHotOnly(false); setListingTab("all"); setFilterType("all"); setSearchQuery(""); }}
              >
                Resetează
              </button>
              <span className="text-[10px] ml-auto">
                {filteredLeads.length} din {(leads as any[])?.length ?? 0} total
              </span>
            </div>
          )}

          {/* Table Stats (profit) */}
          {viewMode === "table" && profitStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.totalProfit}</p><p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">+{formatPrice(profitStats.totalProfit3y)}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.monthlyTotal}</p><p className="text-xl font-bold font-mono">+{formatPrice(profitStats.totalMonthly)}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.hotLeads}</p><p className="text-xl font-bold font-mono flex items-center gap-1"><Flame className="w-5 h-5 text-red-500" /> {profitStats.hotCount}</p></CardContent></Card>
              <Card className="bg-card border-border"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-2">{t.profit3y}</p><div className="h-16"><ResponsiveContainer width="100%" height="100%"><BarChart data={profitStats.chartData}><Bar dataKey="profit" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} /><XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip formatter={(v: number) => formatPrice(v)} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          )}

          {/* Filter + Search + Bulk (table) */}
          {viewMode === "table" && (
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Caută după titlu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
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

          {/* Pipeline search */}
          {viewMode === "pipeline" && (
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după titlu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
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
            <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
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
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="text-center w-24">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className={cn("cursor-pointer transition-colors hover:bg-muted/30", compareIds.includes(lead.id) && "bg-primary/5 ring-1 ring-inset ring-primary/20", lead.lead_score >= 90 ? "border-l-2 border-l-red-500" : lead.lead_score >= 75 ? "border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent")} onClick={() => { setSelectedLead(lead); setGeneratedMessage(""); }}>
                        <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                          <Checkbox checked={compareIds.includes(lead.id)} onCheckedChange={() => toggleCompare(lead.id)} className="border-primary/40" />
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sourceColors[lead.source] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                                {lead.source ?? 'OLX'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {getRelativeDate(lead.created_at)}
                              </span>
                            </div>
                            <span className="truncate">{cleanTitleStatic(lead.title)}</span>
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
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.status}
                            onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs border-0 bg-transparent p-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                              <SelectValue>
                                {getStatusBadge(lead.status)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE_STAGES.map(stage => (
                                <SelectItem key={stage.value} value={stage.value} className="text-xs">
                                  {stage.emoji} {stage.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = lead.whatsapp_message || 
                                  `Bună ziua! Vă contactez referitor la "${cleanTitleStatic(lead.title)}". Mai este disponibil?`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                              }}
                              title="Trimite WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setGeneratedMessage(""); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={cn(
                    "rounded-lg border bg-card p-3 cursor-pointer active:scale-[0.99] transition-transform",
                    lead.lead_score >= 90 ? "border-l-4 border-l-red-500"
                    : lead.lead_score >= 75 ? "border-l-4 border-l-amber-500"
                    : "border-l-4 border-l-border"
                  )}
                  onClick={() => { setSelectedLead(lead); setGeneratedMessage(""); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sourceColors[lead.source] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                        {lead.source ?? 'OLX'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {getRelativeDate(lead.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getScoreBadge(lead.lead_score)}
                      <Select
                        value={lead.status}
                        onValueChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                      >
                        <SelectTrigger className="h-6 w-auto text-[10px] border-0 bg-transparent p-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3" onClick={(e) => e.stopPropagation()}>
                          <SelectValue>{getStatusBadge(lead.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map(stage => (
                            <SelectItem key={stage.value} value={stage.value} className="text-xs">
                              {stage.emoji} {stage.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm font-medium leading-snug line-clamp-2 mb-2">
                    {cleanTitleStatic(lead.title)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span className="font-medium text-foreground">{formatPrice(lead.original_price, getPriceSuffix(lead))}</span>
                    <span className="text-emerald-500">+{formatPrice(lead.monthly_extra)}/lună</span>
                    <span className="text-amber-400">+{formatPrice(lead.extra_profit_3y)} 3Y</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-500 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = lead.whatsapp_message || `Bună ziua! Vă contactez referitor la "${cleanTitleStatic(lead.title)}". Mai este disponibil?`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => { e.stopPropagation(); window.open(lead.url, '_blank', 'noopener,noreferrer'); }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setGeneratedMessage(""); }}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </>
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
