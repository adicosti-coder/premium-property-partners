import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, ArrowUpDown, Download, FileText, Headphones, MessageCircle, Phone, RefreshCw, Search, TrendingUp, Info } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { MarkAsAgencyButton } from "@/components/admin/MarkAsAgencyButton";

const sourceToTable = (s: "voice" | "scraper" | "prospect") =>
  s === "scraper" ? "scraper_leads_archive_2026" : s === "prospect" ? "prospect_listings" : null;

// Compute a 0-100 hotness score based on outcome + sentiment + lead_score
const computeHotScore = (r: { outcome: string | null; sentiment: string | null; lead_score: number | null }): number => {
  let score = 0;
  const o = (r.outcome || "").toLowerCase();
  const s = (r.sentiment || "").toLowerCase();

  // Outcome weight (max 60)
  if (["interested", "qualified", "viewing"].includes(o)) score += 60;
  else if (o === "callback") score += 45;
  else if (["contacted", "calling"].includes(o)) score += 25;
  else if (["voicemail", "no_answer"].includes(o)) score += 15;
  else if (["rejected", "not_qualified"].includes(o)) score += 5;
  else score += 20; // unknown / new

  // Sentiment weight (max 25)
  if (["positive", "pozitiv"].includes(s)) score += 25;
  else if (["neutral", "neutru"].includes(s)) score += 12;
  else if (["negative", "negativ"].includes(s)) score += 0;
  else score += 8;

  // Lead score blend (max 15)
  if (r.lead_score != null) score += Math.round((Math.min(100, Math.max(0, r.lead_score)) / 100) * 15);
  else score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
};

// Detailed breakdown for tooltip explanation — with icon + semantic color
type BreakdownItem = { label: string; pts: number; icon: string; tone: "success" | "warning" | "danger" | "neutral" };

const scoreBreakdown = (r: { outcome: string | null; sentiment: string | null; lead_score: number | null; interest_type?: string | null; source?: string }): BreakdownItem[] => {
  const parts: BreakdownItem[] = [];
  const o = (r.outcome || "").toLowerCase();
  const s = (r.sentiment || "").toLowerCase();
  const it = (r.interest_type || "").toLowerCase();

  // Outcome
  if (["interested", "qualified", "viewing"].includes(o)) parts.push({ label: `Interes ridicat (${OUTCOME_LABEL[o] || o})`, pts: 60, icon: "🎯", tone: "success" });
  else if (o === "callback") parts.push({ label: "Callback solicitat", pts: 45, icon: "📞", tone: "success" });
  else if (["contacted", "calling"].includes(o)) parts.push({ label: "În contact activ", pts: 25, icon: "💬", tone: "warning" });
  else if (["voicemail", "no_answer"].includes(o)) parts.push({ label: "Fără răspuns / voicemail", pts: 15, icon: "🔕", tone: "warning" });
  else if (["rejected", "not_qualified"].includes(o)) parts.push({ label: "Respins / necalificat", pts: 5, icon: "⛔", tone: "danger" });
  else parts.push({ label: "Status nou / necunoscut", pts: 20, icon: "🆕", tone: "neutral" });

  // Sentiment
  if (["positive", "pozitiv"].includes(s)) parts.push({ label: "Sentiment pozitiv", pts: 25, icon: "📈", tone: "success" });
  else if (["neutral", "neutru"].includes(s)) parts.push({ label: "Sentiment neutru", pts: 12, icon: "➖", tone: "warning" });
  else if (["negative", "negativ"].includes(s)) parts.push({ label: "Sentiment negativ", pts: 0, icon: "📉", tone: "danger" });
  else parts.push({ label: "Sentiment nedetectat", pts: 8, icon: "❔", tone: "neutral" });

  // Interest type bonus visualization
  if (it === "hotelier") parts.push({ label: "Interes Administrare 🏨", pts: 0, icon: "🏨", tone: "neutral" });
  else if (it === "vanzare") parts.push({ label: "Interes Vânzare", pts: 0, icon: "💰", tone: "neutral" });
  else if (it === "investitie") parts.push({ label: "Interes Investiție", pts: 0, icon: "📊", tone: "neutral" });

  // Lead score
  if (r.lead_score != null) {
    const pts = Math.round((Math.min(100, Math.max(0, r.lead_score)) / 100) * 15);
    parts.push({ label: `Lead score (${r.lead_score}/100)`, pts, icon: "⭐", tone: pts >= 10 ? "success" : "neutral" });
  } else {
    parts.push({ label: "Lead score lipsă", pts: 5, icon: "⭐", tone: "neutral" });
  }
  return parts;
};

const scoreClasses = (score: number) => {
  if (score >= 80) return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40";
  if (score >= 40) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40";
  return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40";
};

const toneDot: Record<BreakdownItem["tone"], string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-muted-foreground/40",
};

// Shared body of the breakdown panel — used by both desktop popover and mobile drawer
function ScoreBreakdownBody({ row, parts, onOpenTranscript }: { row: any; parts: BreakdownItem[]; onOpenTranscript?: () => void }) {
  const tier = row.hot_score >= 80 ? "Fierbinte" : row.hot_score >= 40 ? "Cald" : "Rece";
  const canTranscript = !!(row.transcript || row.ai_summary);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Hot Score</div>
          <div className="text-2xl font-bold leading-none mt-0.5">{row.hot_score}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
        </div>
        <Badge variant="outline" className={`font-semibold ${scoreClasses(row.hot_score)}`}>
          {row.hot_score >= 80 ? "🔥" : row.hot_score >= 40 ? "✨" : "❄️"} {tier}
        </Badge>
      </div>

      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all ${row.hot_score >= 80 ? "bg-green-500" : row.hot_score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${row.hot_score}%` }}
        />
      </div>

      <ul className="space-y-1.5 text-xs">
        {parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2 py-0.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneDot[p.tone]}`} aria-hidden />
            <span className="text-base leading-none" aria-hidden>{p.icon}</span>
            <span className="flex-1 truncate text-foreground/90">{p.label}</span>
            <span className={`font-bold tabular-nums shrink-0 ${
              p.pts >= 20 ? "text-green-600 dark:text-green-400"
              : p.pts > 0 ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
            }`}>
              {p.pts > 0 ? `+${p.pts}` : "0"}
            </span>
          </li>
        ))}
      </ul>

      {onOpenTranscript && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-primary hover:text-primary h-8"
            disabled={!canTranscript}
            onClick={onOpenTranscript}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            {canTranscript ? "Vezi transcript complet" : "Transcript indisponibil"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Popover (desktop) / Bottom drawer (mobile) with score explanation
function ScoreBadge({ row, mobile = false, onOpenTranscript }: { row: any; mobile?: boolean; onOpenTranscript?: () => void }) {
  const isMobile = useIsMobile();
  const parts = scoreBreakdown(row);

  const trigger = (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold cursor-pointer hover:opacity-80 transition ${scoreClasses(row.hot_score)}`}
      aria-label={`Hot score ${row.hot_score} din 100 — apasă pentru detalii`}
    >
      {mobile && <span aria-hidden>🔥</span>}{row.hot_score}
      <Info className="w-3 h-3 opacity-60" />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Detalii scor lead</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <ScoreBreakdownBody row={row} parts={parts} onOpenTranscript={onOpenTranscript} />
          </div>
          <DrawerFooter className="pt-2" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <ScoreBreakdownBody row={row} parts={parts} onOpenTranscript={onOpenTranscript} />
      </PopoverContent>
    </Popover>
  );
}

type CallRow = {
  id: string;
  source: "voice" | "scraper" | "prospect";
  created_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  property_title: string | null;
  outcome: string | null;
  sentiment: string | null;
  lead_score: number | null;
  interest_type: string | null; // hotelier / inchiriere / vanzare
  status: string | null;
  transcript: any;
  recording_url: string | null;
  ai_summary: string | null;
  url: string | null;
};

const OUTCOME_LABEL: Record<string, string> = {
  interested: "Interesat",
  callback: "Callback",
  viewing: "Vizionare",
  rejected: "Respins",
  no_answer: "Fără răspuns",
  voicemail: "Voicemail",
  qualified: "Calificat",
  not_qualified: "Necalificat",
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  neutral: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  negative: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const INTEREST_LABEL: Record<string, string> = {
  hotelier: "Hotelier",
  inchiriere: "Închiriere",
  vanzare: "Vânzare",
  investitie: "Investiție",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });

export default function CallDashboard() {
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7"); // days
  const [minScore, setMinScore] = useState<string>("0");
  const [sortByScore, setSortByScore] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState<CallRow | null>(null);
  const [visibleCount, setVisibleCount] = useState(50); // incremental rendering for performance

  const fetchAll = async () => {
    setLoading(true);
    try {
      const sinceIso =
        dateFilter === "all"
          ? null
          : new Date(Date.now() - parseInt(dateFilter) * 24 * 60 * 60 * 1000).toISOString();

      // 1) voice_call_sessions
      let voiceQ = supabase
        .from("voice_call_sessions" as any)
        .select("id,created_at,to_number,ai_outcome,ai_sentiment,ai_summary,transcript,recording_url,status,scraper_lead_id,prospect_listing_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (sinceIso) voiceQ = voiceQ.gte("created_at", sinceIso);

      // 2) scraper_leads_archive_2026 with calling/callback/interested
      let scraperQ = supabase
        .from("scraper_leads_archive_2026" as any)
        .select("id,created_at,title,phone,status,lead_score,listing_type,url,whatsapp_message")
        .in("status", ["calling", "callback", "interested", "contacted", "converted"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (sinceIso) scraperQ = scraperQ.gte("created_at", sinceIso);

      // 3) prospect_listings with lifecycle
      let prospectQ = supabase
        .from("prospect_listings" as any)
        .select("id,created_at,title,contact_name,contact_phone,lifecycle_status,lead_score,category,source_url,owner_sentiment,call_summary")
        .in("lifecycle_status", ["calling", "callback", "interested", "qualified", "rejected"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (sinceIso) prospectQ = prospectQ.gte("created_at", sinceIso);

      const [voiceRes, scraperRes, prospectRes] = await Promise.all([voiceQ, scraperQ, prospectQ]);

      const merged: CallRow[] = [];

      (voiceRes.data || []).forEach((v: any) => {
        merged.push({
          id: `v-${v.id}`,
          source: "voice",
          created_at: v.created_at,
          contact_name: null,
          contact_phone: v.to_number,
          property_title: null,
          outcome: v.ai_outcome,
          sentiment: v.ai_sentiment,
          lead_score: null,
          interest_type: null,
          status: v.status,
          transcript: v.transcript,
          recording_url: v.recording_url,
          ai_summary: v.ai_summary,
          url: null,
        });
      });

      (scraperRes.data || []).forEach((s: any) => {
        merged.push({
          id: `s-${s.id}`,
          source: "scraper",
          created_at: s.created_at,
          contact_name: null,
          contact_phone: s.phone,
          property_title: s.title,
          outcome: s.status,
          sentiment: null,
          lead_score: s.lead_score,
          interest_type: s.listing_type,
          status: s.status,
          transcript: null,
          recording_url: null,
          ai_summary: s.whatsapp_message,
          url: s.url,
        });
      });

      (prospectRes.data || []).forEach((p: any) => {
        merged.push({
          id: `p-${p.id}`,
          source: "prospect",
          created_at: p.created_at,
          contact_name: p.contact_name,
          contact_phone: p.contact_phone,
          property_title: p.title,
          outcome: p.lifecycle_status,
          sentiment: p.owner_sentiment,
          lead_score: p.lead_score,
          interest_type: p.category,
          status: p.lifecycle_status,
          transcript: null,
          recording_url: null,
          ai_summary: p.call_summary,
          url: p.source_url,
        });
      });

      merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setRows(merged);
    } catch (e: any) {
      toast.error("Eroare la încărcare: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [dateFilter]);

  const filtered = useMemo(() => {
    const min = parseInt(minScore) || 0;
    const enriched = rows.map((r) => ({ ...r, hot_score: computeHotScore(r) }));
    const list = enriched.filter((r) => {
      if (outcomeFilter !== "all" && r.outcome !== outcomeFilter) return false;
      if (sentimentFilter !== "all" && r.sentiment !== sentimentFilter) return false;
      if (interestFilter !== "all" && r.interest_type !== interestFilter) return false;
      if (r.hot_score < min) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${r.contact_name || ""} ${r.contact_phone || ""} ${r.property_title || ""} ${r.ai_summary || ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    if (sortByScore) list.sort((a, b) => b.hot_score - a.hot_score);
    else list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return list;
  }, [rows, outcomeFilter, sentimentFilter, interestFilter, search, minScore, sortByScore]);

  // Reset visible count when filters change → page stays light
  useEffect(() => { setVisibleCount(50); }, [outcomeFilter, sentimentFilter, interestFilter, search, minScore, sortByScore, dateFilter]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const interested = filtered.filter((r) => ["interested", "qualified", "viewing", "callback"].includes(r.outcome || "")).length;
    const conversionRate = total > 0 ? Math.round((interested / total) * 100) : 0;
    const byInterest: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.interest_type) byInterest[r.interest_type] = (byInterest[r.interest_type] || 0) + 1;
    });
    return { total, interested, conversionRate, byInterest };
  }, [filtered]);

  const outcomeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.outcome && set.add(r.outcome));
    return Array.from(set);
  }, [rows]);

  const sendWhatsAppCatalog = (phone: string | null, name?: string | null) => {
    if (!phone) {
      toast.error("Numărul de telefon lipsește");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    const greet = name ? `Bună ziua, ${name}!` : "Bună ziua!";
    const message = `${greet} Sunt de la RealTrust. Vă trimit catalogul nostru de investiții imobiliare în Timișoara cu ROI verificat 9.4%: https://realtrust.ro/catalog-investitii\n\nMă puteți suna oricând pentru detalii. Mulțumesc!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp deschis cu mesaj pre-completat");
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Nimic de exportat — modifică filtrele");
      return;
    }
    const headers = ["Data", "Sursa", "Contact", "Telefon", "Proprietate", "Outcome", "Sentiment", "Tip Interes", "Lead Score", "Hot Score", "Sumar"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    const lines = [headers.join(",")];
    filtered.forEach((r: any) => {
      lines.push([
        formatDate(r.created_at),
        r.source,
        r.contact_name || "",
        r.contact_phone || "",
        r.property_title || "",
        OUTCOME_LABEL[r.outcome || ""] || r.outcome || "",
        r.sentiment || "",
        INTEREST_LABEL[r.interest_type || ""] || r.interest_type || "",
        r.lead_score ?? "",
        r.hot_score ?? "",
        r.ai_summary || "",
      ].map(escape).join(","));
    });
    const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `apeluri-realtrust-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exportat ${filtered.length} apeluri`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dashboard Apeluri Voice Agent — Admin RealTrust</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-2" /> Înapoi la Admin</Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Phone className="w-7 h-7 text-primary" /> Dashboard Apeluri
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vedere unificată: Voice Agent AI + Scraper Leads + Prospecți
            </p>
          </div>
          <div className="flex gap-2">
            <AuditLogViewer />
            <Button onClick={exportCSV} variant="outline" size="sm" disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export CSV ({filtered.length})
            </Button>
            <Button onClick={fetchAll} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
            </Button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total apeluri</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rată conversie (interesat/vizionare)</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {stats.conversionRate}%
                <TrendingUp className="w-5 h-5 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {stats.interested} din {stats.total} apeluri
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Distribuția pe interes</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-0">
              {Object.entries(stats.byInterest).length === 0 && (
                <span className="text-xs text-muted-foreground">Fără date</span>
              )}
              {Object.entries(stats.byInterest).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-xs">
                  {INTEREST_LABEL[k] || k}: <strong className="ml-1">{v}</strong>
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Caută nume, telefon, proprietate…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs value={dateFilter} onValueChange={setDateFilter} className="lg:col-span-3">
                <TabsList className="w-full">
                  <TabsTrigger value="1" className="flex-1">24h</TabsTrigger>
                  <TabsTrigger value="7" className="flex-1">7 zile</TabsTrigger>
                  <TabsTrigger value="30" className="flex-1">30 zile</TabsTrigger>
                  <TabsTrigger value="all" className="flex-1">Toate</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger><SelectValue placeholder="Outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate outcomes</SelectItem>
                  {outcomeOptions.map((o) => (
                    <SelectItem key={o} value={o}>{OUTCOME_LABEL[o] || o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={interestFilter} onValueChange={setInterestFilter}>
                <SelectTrigger><SelectValue placeholder="Tip interes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate tipurile</SelectItem>
                  <SelectItem value="hotelier">Hotelier</SelectItem>
                  <SelectItem value="inchiriere">Închiriere</SelectItem>
                  <SelectItem value="vanzare">Vânzare</SelectItem>
                  <SelectItem value="investitie">Investiție</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger><SelectValue placeholder="Sentiment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate sentimentele</SelectItem>
                  <SelectItem value="positive">Pozitiv</SelectItem>
                  <SelectItem value="neutral">Neutru</SelectItem>
                  <SelectItem value="negative">Negativ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t">
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Scor minim hot lead: <span className="text-foreground font-bold">{minScore}</span>
                  {parseInt(minScore) >= 70 && <span className="ml-2 text-[10px] text-amber-600">🔥 doar lead-uri fierbinți</span>}
                </label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[parseInt(minScore) || 0]}
                  onValueChange={(v) => setMinScore(String(v[0]))}
                  aria-label="Scor minim"
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0 (toate)</span><span>50</span><span>100 🔥</span>
                </div>
              </div>
              <Button
                variant={sortByScore ? "default" : "outline"}
                size="sm"
                onClick={() => setSortByScore(true)}
                className="h-9"
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Sortare după scor
              </Button>
              <Button
                variant={!sortByScore ? "default" : "outline"}
                size="sm"
                onClick={() => setSortByScore(false)}
                className="h-9"
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Sortare după dată
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Apeluri ({filtered.length})</CardTitle>
            <CardDescription>Cele mai recente apeluri și interacțiuni</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Contact / Proprietate</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Interes</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>
                      <button
                        onClick={() => setSortByScore(true)}
                        className="flex items-center gap-1 hover:text-primary transition"
                        title="Sortare după hot score"
                      >
                        🔥 Hot {sortByScore && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.contact_name || r.property_title || "—"}</div>
                        {r.contact_phone && <div className="text-xs text-muted-foreground">{r.contact_phone}</div>}
                        <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1">{r.source}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.outcome ? (
                          <Badge variant="secondary">{OUTCOME_LABEL[r.outcome] || r.outcome}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.interest_type ? (
                          <Badge variant="outline">{INTEREST_LABEL[r.interest_type] || r.interest_type}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.sentiment ? (
                          <Badge className={SENTIMENT_COLOR[r.sentiment] || ""} variant="outline">
                            {r.sentiment}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.lead_score != null ? (
                          <span className="text-sm text-muted-foreground">{r.lead_score}</span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <ScoreBadge row={r} onOpenTranscript={() => setTranscriptOpen(r)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={!r.transcript && !r.ai_summary}
                            onClick={() => setTranscriptOpen(r)}
                            title="Vezi transcript"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={!r.recording_url}
                            onClick={() => r.recording_url && window.open(r.recording_url, "_blank")}
                            title="Ascultă audio"
                          >
                            <Headphones className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => sendWhatsAppCatalog(r.contact_phone, r.contact_name)}
                            title="Trimite catalog WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Niciun apel găsit pentru filtrele selectate</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {visible.map((r: any) => (
                <Card key={r.id} className="border">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.contact_name || r.property_title || "—"}</div>
                        {r.contact_phone && <div className="text-xs text-muted-foreground">{r.contact_phone}</div>}
                        <div className="text-[10px] text-muted-foreground mt-0.5">{formatDate(r.created_at)}</div>
                      </div>
                      <ScoreBadge row={r} mobile onOpenTranscript={() => setTranscriptOpen(r)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{r.source}</Badge>
                      {r.outcome && <Badge variant="secondary" className="text-xs">{OUTCOME_LABEL[r.outcome] || r.outcome}</Badge>}
                      {r.interest_type && <Badge variant="outline" className="text-xs">{INTEREST_LABEL[r.interest_type] || r.interest_type}</Badge>}
                      {r.sentiment && <Badge className={`text-xs ${SENTIMENT_COLOR[r.sentiment] || ""}`} variant="outline">{r.sentiment}</Badge>}
                      {r.lead_score != null && <Badge variant="outline" className="text-xs">Lead: {r.lead_score}</Badge>}
                    </div>
                    <div className="flex gap-1 pt-2 border-t">
                      <Button size="sm" variant="ghost" className="flex-1 h-8 px-2" disabled={!r.transcript && !r.ai_summary} onClick={() => setTranscriptOpen(r)}>
                        <FileText className="w-3.5 h-3.5 mr-1" /> <span className="text-xs">Transcript</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 h-8 px-2" disabled={!r.recording_url} onClick={() => r.recording_url && window.open(r.recording_url, "_blank")}>
                        <Headphones className="w-3.5 h-3.5 mr-1" /> <span className="text-xs">Audio</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 h-8 px-2" onClick={() => sendWhatsAppCatalog(r.contact_phone, r.contact_name)}>
                        <MessageCircle className="w-3.5 h-3.5 mr-1 text-green-600" /> <span className="text-xs">WA</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8 text-sm">Niciun apel găsit</p>
              )}
            </div>

            {/* Incremental loading: Load more */}
            {visible.length < filtered.length && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Încarcă încă 50 ({filtered.length - visible.length} rămase)
                </Button>
              </div>
            )}
            {visible.length > 0 && (
              <p className="text-center text-[10px] text-muted-foreground mt-3">
                Afișat {visible.length} din {filtered.length} (cache local pentru performanță)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transcript dialog */}
      <Dialog open={!!transcriptOpen} onOpenChange={(o) => !o && setTranscriptOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transcript / Sumar apel</DialogTitle>
          </DialogHeader>
          {transcriptOpen && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>Data:</strong> {formatDate(transcriptOpen.created_at)}</div>
                <div><strong>Telefon:</strong> {transcriptOpen.contact_phone || "—"}</div>
                <div><strong>Outcome:</strong> {OUTCOME_LABEL[transcriptOpen.outcome || ""] || transcriptOpen.outcome || "—"}</div>
                <div><strong>Sentiment:</strong> {transcriptOpen.sentiment || "—"}</div>
              </div>
              {transcriptOpen.ai_summary && (
                <div>
                  <h4 className="font-semibold mb-1">Sumar AI</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{transcriptOpen.ai_summary}</p>
                </div>
              )}
              {transcriptOpen.transcript && (
                <div>
                  <h4 className="font-semibold mb-1">Transcript complet</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {typeof transcriptOpen.transcript === "string"
                      ? transcriptOpen.transcript
                      : JSON.stringify(transcriptOpen.transcript, null, 2)}
                  </pre>
                </div>
              )}
              {transcriptOpen.url && (
                <a href={transcriptOpen.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                  Vezi anunțul original →
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
