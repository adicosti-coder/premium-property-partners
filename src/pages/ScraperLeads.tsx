import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  appendScanHistory,
  clearScanHistory,
  exportScanReportPdf,
  getScanHistory,
  type ScanHistoryEntry,
} from "@/lib/scanHistory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { downloadLeadAnalysisPdf } from "@/utils/exportLeadAnalysisPdf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  MessageCircle, ExternalLink, Flame, TrendingUp, ArrowLeft, Zap, StickyNote,
  Eye, CheckCircle, Phone, LayoutList, Columns3, Star, Copy, Clock, CalendarCheck,
  ThumbsUp, HelpCircle, Download, GitCompare, ArrowRightCircle, History,
  Search, Loader2, Handshake, Calendar, MapPin, Filter, ChevronRight, Ban, Archive,
  Shield, Database, Sparkles, Crown, FileText, ArrowUpDown, Plus, Trash2, Save, Tags,
  ChevronDown, ChevronUp, Pencil, Building2, Check, X, RefreshCw, ClipboardList, Hotel,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BlacklistModal } from "@/components/admin/BlacklistModal";
import { Checkbox } from "@/components/ui/checkbox";
import { ScraperBulkActions } from "@/components/admin/ScraperBulkActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScraperAdvancedFilters, AdvancedFilters, EMPTY_FILTERS, countActiveFilters, parseSurface, parseRooms, parseFloor } from "@/components/admin/ScraperAdvancedFilters";
import { AIInsightButton, DailyBriefingButton } from "@/components/admin/ScraperAIInsight";
import { PredictiveDetailCard, PredictiveBatchButton, UndervaluedLeadsWidget } from "@/components/admin/ScraperPredictive";
import { FollowUpManager, DueRemindersBanner, useDebounce } from "@/components/admin/ScraperFollowUp";
import { useScraperKeyboardShortcuts, SHORTCUTS_HELP } from "@/hooks/useScraperKeyboardShortcuts";
import { ScraperAnalyticsDashboard } from "@/components/admin/ScraperAnalytics";
import { Keyboard, BarChart3 } from "lucide-react";
import OutreachQuickAction from "@/components/admin/outreach/OutreachQuickAction";
import AggregatorRejectionLog from "@/components/admin/AggregatorRejectionLog";

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
  prospect_category: string | null;
  search_keyword: string | null;
  agency_name: string | null;
  neighborhood_slug: string | null;
  follow_up_at?: string | null;
  snoozed_until?: string | null;
  ai_insight?: any;
  description?: string | null;
  contact_name?: string | null;
  location?: string | null;
  zone?: string | null;
  _origin?: "archive" | "prospect";
  is_phone_verified?: boolean | null;
  phone_e164?: string | null;
  phone_line_type?: string | null;
}


/**
 * Native platform filter toggles. Each filter is a checkbox shown in the UI
 * and mapped to a `inurl:` / Google operator hint that the scraper appends to
 * the query (mirroring the in-platform UI like OLX „Privat", Publi24 „De la
 * persoane fizice", imobiliare.ro „Publicate de proprietari").
 *
 * Stored per keyword in `scraper_search_keywords.owner_filters.toggles` as an
 * array of filter ids that are ENABLED. Empty/missing = use platform default
 * (all "owner-only" toggles enabled).
 */
interface PlatformFilterDef {
  id: string;
  label: string;
  description?: string;
  /** Google operator fragment appended when the toggle is ON. */
  hint: string;
  /** Whether this filter is on by default for "Doar Proprietari". */
  defaultOn: boolean;
}

const PLATFORM_FILTERS: Record<string, PlatformFilterDef[]> = {
  "OLX": [
    { id: "private",       label: "Privat (Persoană fizică)", description: "search[private_business]=private", hint: "inurl:search%5Bprivate_business%5D=private OR inurl:search[private_business]=private", defaultOn: true },
    { id: "exclude_firma", label: 'Exclude „Firmă”',          description: "elimină rezultate cu Firma în URL/text", hint: '-inurl:business -"de la firma" -"de la companie"', defaultOn: true },
  ],
  "Storia.ro": [
    { id: "private",        label: "Doar proprietari", description: "ownerTypeSingleSelect=PRIVATE", hint: "inurl:ownerTypeSingleSelect=PRIVATE", defaultOn: true },
    { id: "exclude_agency", label: "Exclude agenții",  description: "elimină rezultate marcate agency", hint: "-inurl:ownerTypeSingleSelect=AGENCY -inurl:by=agency", defaultOn: true },
  ],
  "imobiliare.ro": [
    { id: "owners",    label: "Publicate de proprietari", description: "/persoane-fizice/ sau /proprietari/", hint: "inurl:persoane-fizice OR inurl:proprietari", defaultOn: true },
    { id: "no_agency", label: "Fără agenții",             description: "exclude /agentii/",                   hint: "-inurl:agentii -inurl:agency", defaultOn: true },
    { id: "no_dev",    label: "Fără dezvoltatori",        description: "exclude /dezvoltatori/",              hint: "-inurl:dezvoltatori -inurl:developer", defaultOn: false },
  ],
  "Publi24": [
    { id: "private",  label: "De la persoane fizice", description: "tip-anunt-persoane-fizice", hint: "inurl:tip-anunt-persoane-fizice OR inurl:proprietari", defaultOn: true },
    { id: "no_firms", label: "Fără companii",         description: "exclude tip-anunt-firma",   hint: "-inurl:tip-anunt-firma -inurl:agentie", defaultOn: true },
  ],
  "BursaImobiliara.ro": [
    { id: "private",   label: "Doar proprietari", description: "/proprietar/ sau /persoane-fizice/", hint: "inurl:proprietar OR inurl:persoane-fizice", defaultOn: true },
    { id: "no_agency", label: "Fără agenții",     description: "exclude /agentie/",                  hint: "-inurl:agentie -inurl:agency", defaultOn: true },
  ],
  "Facebook Marketplace": [
    { id: "owner_kw",  label: 'Caută „proprietar / persoană fizică”', description: "filtru text Google", hint: '("proprietar" OR "persoana fizica" OR "persoană fizică")', defaultOn: true },
    { id: "no_agency", label: 'Exclude „agenție / comision”',         description: "operatori negativi", hint: '-agentie -agenție -agency -"comision agentie" -broker', defaultOn: true },
  ],
  "Grupuri Facebook": [
    { id: "owner_kw",  label: 'Caută „proprietar / persoană fizică”', description: "filtru text Google", hint: '("proprietar" OR "persoana fizica" OR "persoană fizică")', defaultOn: true },
    { id: "no_agency", label: 'Exclude „agenție / comision”',         description: "operatori negativi", hint: '-agentie -agenție -agency -"comision agentie" -broker', defaultOn: true },
  ],
  "General": [
    { id: "owner_kw",  label: 'Caută „proprietar / persoană fizică”',     description: "filtru text Google", hint: '("proprietar" OR "persoana fizica" OR "persoană fizică" OR "fara comision" OR "fără comision" OR "direct proprietar")', defaultOn: true },
    { id: "no_agency", label: 'Exclude „agenție / broker / comision”',    description: "operatori negativi", hint: '-agentie -agenție -agency -"comision agentie" -"comision 2%" -"comision agenție" -broker', defaultOn: true },
  ],
};

/** Unknown / custom platform → fall back to "General" toggles. */
function getPlatformFilters(platform: string): PlatformFilterDef[] {
  return PLATFORM_FILTERS[platform] ?? PLATFORM_FILTERS["General"];
}

/** Default toggle ids enabled for a platform. */
function getDefaultEnabledFilterIds(platform: string): string[] {
  return getPlatformFilters(platform).filter((f) => f.defaultOn).map((f) => f.id);
}

interface KeywordOwnerFilters {
  /** Ids of toggles enabled for this keyword. */
  toggles?: string[];
  /** Free-text override (advanced). Empty / missing = no override. */
  text?: string;
}

interface SearchKeyword {
  id: string;
  keyword: string;
  platform: string;
  is_active: boolean;
  owner_filters?: KeywordOwnerFilters | null;
}

/** Returns the toggle ids currently active for a keyword (defaults if not customized). */
function getActiveToggleIds(kw: Pick<SearchKeyword, "platform" | "owner_filters">): string[] {
  const stored = kw.owner_filters?.toggles;
  if (Array.isArray(stored)) return stored;
  return getDefaultEnabledFilterIds(kw.platform);
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
  "Storia.ro": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "imobiliare.ro": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "Publi24": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "BursaImobiliara.ro": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "Facebook Marketplace": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "Grupuri Facebook": "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "General": "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

/**
 * Normalize raw `lead.source` values to the canonical platform labels used in
 * PLATFORM_FILTERS / ScraperPreview. Keeps everything consistent across
 * Scraper Leads chips, ScraperPreview badges and keyword filter toggles.
 */
function normalizePlatformLabel(rawSource: string | null | undefined): string {
  const s = (rawSource || "").trim();
  if (!s) return "General";
  const lower = s.toLowerCase();
  if (lower.startsWith("olx")) return "OLX";
  if (lower.startsWith("storia")) return "Storia.ro";
  if (lower.startsWith("imobiliare")) return "imobiliare.ro";
  if (lower.startsWith("publi24")) return "Publi24";
  if (lower.startsWith("bursa")) return "BursaImobiliara.ro";
  if (lower.includes("marketplace")) return "Facebook Marketplace";
  if (lower.includes("facebook") || lower.includes("grup")) return "Grupuri Facebook";
  return "General";
}

// ── Premium Zone Keywords ────────────────────────
const PREMIUM_KEYWORDS = [
  // Ansambluri existente
  "Piața Unirii", "Operei", "Libertății", "Maria", "Medicină", "ISHO", "Mara",
  "Paltim", "Monarh", "Vivalia", "Nord-One", "X-City", "Fructus", "Campeador",
  "Denya", "Iris", "Ring", "Future Residence",
  // Ansambluri noi v3.2
  "Ateneo", "Adora Forest", "Vivid", "Uptown", "The Riverside", "Belvedere",
  "Greenfield", "Panoramic", "Metropolitan", "Smart City",
  // Zone de interes
  "UMFT", "Iulius Town", "Bastion",
];

const isPremiumLead = (title: string): boolean => {
  const upper = title.toUpperCase();
  return PREMIUM_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()));
};

// ── Smart Filter Tabs ────────────────────────────
const SMART_FILTERS = [
  { value: "all", label: "Toate" },
  { value: "premium", label: "✨ Ansambluri Premium" },
  { value: "topROI", label: "🏆 Top ROI (90+)" },
  { value: "proprietari", label: "🏠 Proprietari Direcți" },
  { value: "vanzare", label: "🏷️ Vânzări" },
  { value: "inchiriere", label: "🔑 Închirieri" },
] as const;
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

const OWNER_SIGNALS = [
  "proprietar", "direct-de-la-proprietar", "direct proprietar", "de la proprietar",
  "persoana privata", "persoană privată", "privat", "privati",
  "privați", "persoana fizica", "persoană fizică", "persoane fizice",
];

const AGENCY_SIGNALS = [
  "agentie", "agenție", "agency", "agent imobiliar", "consultant imobiliar",
  "broker", "brokeraj", "reprezentant vanzari", "reprezentant vânzări",
  "dezvoltator", "developer", "ansamblu rezidential", "ansamblu rezidențial",
  "imobiliare srl", "real estate srl",
];

const GENERIC_LISTING_TITLE_SIGNALS = [
  "anunturi gratuite", "anunturi imobiliare", "anunturi olx", "imobiliare olx",
  "second hand si noi", "apartamente de vanzare in", "apartamente de vânzare în",
  "apartamente 1 camera de", "apartamente 1 cameră de", "apartamente 2 camere de",
  "apartamente 3 camere de", "apartamente 4 camere de",
  "apartamente noi de vanzare", "apartamente noi de vânzare", "apartamente de inchiriat",
  "apartamente de închiriat", "garsoniere de vanzare", "garsoniere de vânzare",
  "proprietati noi", "proprietăți noi", "pagina ", "rezultate vanzare", "rezultate vânzare",
];

function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const PHONE_PATTERN = /(?:\+?40|0040|0)?\s*7[2-8](?:[\s().-]*\d){7}\b/g;

function normalizeRoPhone(raw?: string | null): string | null {
  if (!raw || raw.includes("...") || raw.includes("***")) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0040")) digits = digits.slice(2);
  if (digits.startsWith("40") && digits.length === 11) return /^407[2-8]\d{7}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("0") && digits.length === 10) return /^07[2-8]\d{7}$/.test(digits) ? `+4${digits}` : null;
  if (digits.startsWith("7") && digits.length === 9) return /^7[2-8]\d{7}$/.test(digits) ? `+40${digits}` : null;
  return null;
}

function extractPhoneFromText(text?: string | null): string | null {
  return text?.match(PHONE_PATTERN)?.map(normalizeRoPhone).find(Boolean) ?? null;
}

function hasOwnerSignal(lead: Pick<ScraperLead, "title" | "url" | "admin_notes" | "search_keyword" | "source" | "prospect_category" | "description" | "contact_name">): boolean {
  if (lead.prospect_category === "proprietar") return true;
  // Do not count the original search keyword/source as an owner signal: generic
  // platform searches can contain appended owner filters while the returned row
  // itself is still a mixed search/category page.
  const blob = removeDiacritics(`${lead.url || ""} ${lead.title || ""} ${lead.admin_notes || ""} ${lead.description || ""} ${lead.contact_name || ""}`.toLowerCase());
  return OWNER_SIGNALS.some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
}

function hasAgencySignal(lead: Pick<ScraperLead, "title" | "url" | "admin_notes" | "description" | "contact_name" | "agency_name">): boolean {
  const blob = removeDiacritics(`${lead.title || ""} ${lead.url || ""} ${lead.admin_notes || ""} ${lead.description || ""} ${lead.contact_name || ""} ${lead.agency_name || ""}`.toLowerCase());
  return AGENCY_SIGNALS.some((signal) => blob.includes(removeDiacritics(signal.toLowerCase())));
}

function getLeadContactName(lead: Pick<ScraperLead, "contact_name" | "agency_name" | "admin_notes" | "description">): string {
  if (lead.contact_name?.trim()) return lead.contact_name.trim();
  if (lead.agency_name?.trim()) return lead.agency_name.trim();
  const blob = `${lead.admin_notes || ""}\n${lead.description || ""}`;
  const match = blob.match(/(?:publicat de|postat de|contact|proprietar|persoan[ăa])[:\s-]+([^\n|,]{3,48})/i);
  return match?.[1]?.trim() || "—";
}

function inferPropertySubtype(text: string): string | null {
  const normalized = removeDiacritics(text.toLowerCase());
  if (normalized.includes("garsonier") || normalized.includes("studio")) return "Garsonieră";
  if (normalized.includes("casa") || normalized.includes("vila")) return "Casă / Vilă";
  if (normalized.includes("teren")) return "Teren";
  if (normalized.includes("apartament") || normalized.includes("camere")) return "Apartament";
  return null;
}

function extractImportedSpecs(text: string) {
  const normalized = removeDiacritics(text.toLowerCase());
  const matchNumber = (patterns: RegExp[]) => patterns.map((pattern) => text.match(pattern)?.[1]).find(Boolean);
  const balconies = matchNumber([/(?:balcon|balcoane)\D{0,12}(\d+)/i, /(\d+)\s*(?:balcon|balcoane)/i]);
  const bathrooms = matchNumber([/(?:baie|bai|băi)\D{0,12}(\d+)/i, /(\d+)\s*(?:baie|bai|băi)/i]);
  const kitchens = matchNumber([/(?:bucatarie|bucătărie|bucatarii|bucătării)\D{0,12}(\d+)/i, /(\d+)\s*(?:bucatarie|bucătărie|bucatarii|bucătării)/i]);
  const totalFloors = matchNumber([/(?:bloc|imobil|cladire|clădire)\D{0,18}(?:p\+)?(\d+)\s*(?:etaje|etaj)/i, /(?:etajul|etaj)\s*\d+\s*(?:din|\/)\s*(\d+)/i]);
  const yearBuilt = matchNumber([/(?:an constructie|anul constructiei|construit(?:a)? in|construit(?:ă)? în)\D{0,10}(19\d{2}|20\d{2})/i]);
  const renovationYear = matchNumber([/(?:renovat(?:a)?|renovare)\D{0,10}(20\d{2}|19\d{2})/i]);

  const hasElevator = /\b(lift|ascensor)\b/.test(normalized) ? true : null;
  const hasAc = /\b(aer conditionat|aer condiționat|ac\b|clima|climatizare)\b/.test(normalized) ? true : null;
  const hasCellar = /\b(boxa|pivnita|pivniță|beci)\b/.test(normalized) ? true : null;
  const hasStorage = /\b(debara|spatiu depozitare|spațiu depozitare|storage)\b/.test(normalized) ? true : null;
  const parking = /\b(parcare|loc de parcare|garaj)\b/.test(normalized) ? "Da" : null;
  const furnished = /\b(mobilat|mobilata|mobilată|utilat|utilata|utilată)\b/.test(normalized) ? "Mobilat/utilat" : null;
  const constructionType = /\b(caramida|cărămidă|brick)\b/.test(normalized) ? "Cărămidă" : /\b(beton|bca)\b/.test(normalized) ? "Beton/BCA" : null;
  const heatingType = /incalzire in pardoseala|încălzire în pardoseală/.test(normalized) ? "Încălzire în pardoseală" : /centrala proprie|centrală proprie/.test(normalized) ? "Centrală proprie" : /termoficare|colterm/.test(normalized) ? "Termoficare" : null;
  const propertyCondition = /\b(la rosu|la roșu|nefinisat)\b/.test(normalized) ? "Necesită finisare" : /\b(nou|noua|nouă|prima inchiriere|prima închiriere)\b/.test(normalized) ? "Nou / prima utilizare" : /\b(renovat|renovata|renovată)\b/.test(normalized) ? "Renovat" : null;
  const compartimentare = /semidecomandat/.test(normalized) ? "Semidecomandat" : /nedecomandat|open space/.test(normalized) ? "Nedecomandat / open-space" : /decomandat/.test(normalized) ? "Decomandat" : null;
  const monthlyMaintenance = text.match(/(?:intretinere|întreținere|cheltuieli)\D{0,16}(\d+(?:[.,]\d+)?)\s*(?:lei|ron|€|eur)/i)?.[1]?.replace(",", ".");
  const energyClass = text.match(/(?:clasa energetica|clasă energetică|certificat energetic)\D{0,8}([A-G])/i)?.[1]?.toUpperCase() || null;
  const viewType = /\b(vedere panoramica|vedere panoramică|panoramic)\b/.test(normalized) ? "Panoramică" : /\b(vedere parc|parc)\b/.test(normalized) ? "Parc" : /\b(vedere oras|vedere oraș)\b/.test(normalized) ? "Urbană" : null;
  const orientation = text.match(/orientare\s*[:\-]?\s*([A-Za-zĂÂÎȘȚăâîșț\- ]{3,24})/i)?.[1]?.trim() || null;
  const comfortLevel = normalized.match(/confort\s*(lux|1|2|3|i|ii|iii)/)?.[1]?.replace("i", "1") || null;
  const terrace = text.match(/(?:terasa|terasă)\D{0,12}(\d+(?:[.,]\d+)?)\s*(?:mp|m2)/i)?.[1]?.replace(",", ".");
  const intercomType = /\b(videointerfon|video interfon)\b/.test(normalized) ? "Videointerfon" : /\b(interfon)\b/.test(normalized) ? "Interfon" : null;
  const riskFlags = [
    /\b(licitatie|licitație|executare silita|executare silită)\b/.test(normalized) ? "risc-juridic" : null,
    /\b(urgent|negociabil|accept credit|cash)\b/.test(normalized) ? "marjă-negociere" : null,
    /\b(fara cf|fără cf|intabulare in curs|intabulare în curs)\b/.test(normalized) ? "verifică-acte" : null,
    /\b(necesita renovare|necesită renovare|de renovat|la rosu|la roșu)\b/.test(normalized) ? "necesită-renovare" : null,
  ].filter(Boolean) as string[];
  const amenities = [
    hasAc ? "Aer condiționat" : null,
    hasElevator ? "Lift" : null,
    parking ? "Parcare" : null,
    hasCellar ? "Boxă" : null,
    hasStorage ? "Spațiu depozitare" : null,
    intercomType,
    /centrala proprie|centrală proprie/.test(normalized) ? "Centrală proprie" : null,
    /incalzire in pardoseala|încălzire în pardoseală/.test(normalized) ? "Încălzire în pardoseală" : null,
  ].filter(Boolean) as string[];

  return {
    balconies: balconies ? Number(balconies) : null,
    bathrooms: bathrooms ? Number(bathrooms) : null,
    kitchens: kitchens ? Number(kitchens) : null,
    total_building_floors: totalFloors ? Number(totalFloors) : null,
    year_built: yearBuilt ? Number(yearBuilt) : null,
    renovation_year: renovationYear ? Number(renovationYear) : null,
    has_elevator: hasElevator,
    has_ac: hasAc,
    has_cellar: hasCellar,
    has_storage: hasStorage,
    parking,
    furnished,
    intercom_type: intercomType,
    orientation,
    comfort_level: comfortLevel,
    terrace_area: terrace ? Number(terrace) : null,
    construction_type: constructionType,
    heating_type: heatingType,
    property_condition: propertyCondition,
    compartimentare,
    monthly_maintenance: monthlyMaintenance ? Number(monthlyMaintenance) : null,
    energy_class: energyClass,
    view_type: viewType,
    amenities,
    risk_flags: riskFlags,
  };
}

function inferLocation(lead: ScraperLead): string {
  const source = [lead.location, lead.zone, lead.neighborhood_slug, lead.search_keyword, lead.title].filter(Boolean).join(" ");
  const normalized = removeDiacritics(source.toLowerCase());
  const knownZones = [
    ["Complex Studențesc", ["complex studentesc", "studentilor"]],
    ["Circumvalațiunii", ["circumvalatiunii", "circumvalatiune"]],
    ["Calea Aradului", ["aradului"]],
    ["Calea Girocului", ["girocului"]],
    ["Calea Șagului", ["sagului"]],
    ["Calea Lipovei", ["lipovei"]],
    ["Iulius Town", ["iulius", "openville"]],
    ["Medicină", ["medicina", "umft"]],
    ["Central", ["central", "centru", "unirii", "operei"]],
  ] as const;
  const zone = knownZones.find(([, signals]) => signals.some((signal) => normalized.includes(signal)))?.[0];
  return zone ? `Timișoara, ${zone}` : "Timișoara";
}

function buildImportedDescription(lead: ScraperLead, cleanTitle: string, yieldValue?: string | null): string {
  const parts = [
    lead.description || lead.admin_notes || cleanTitle,
    lead.lead_score ? `Scor lead: ${lead.lead_score}.` : null,
    yieldValue ? `Randament estimat: ${yieldValue}%/an.` : null,
    lead.extra_profit_3y ? `Profit extra estimat 3 ani: ${lead.extra_profit_3y}€.` : null,
    `Sursă import: ${normalizePlatformLabel(lead.source)}${lead.url ? ` · ${lead.url}` : ""}`,
    "Notă internă: date importate automat din scraping; verifică pozele, prețul, contactul și specificațiile înainte de publicare.",
  ];
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Detects if a lead is a search/listing page (e.g. OLX category or query result page)
 * rather than an individual property ad. Used to hide noise from the leads table.
 */
function isSearchPageLead(url?: string | null, title?: string | null): boolean {
  const u = (url || "").toLowerCase().split("?")[0]; // strip query string
  const t = removeDiacritics((title || "").toLowerCase().trim());
  if (!u && !t) return false;

  // ── Allow-list: known individual-ad URL patterns ──
  const isIndividualAd =
    u.includes("/d/oferta/") ||              // OLX individual ad
    /storia\.ro\/ro\/oferta\//.test(u) ||    // Storia individual ad
    /imobiliare\.ro\/oferta-/.test(u) ||     // imobiliare.ro individual ad
    /imobiliare\.ro\/[^/]+\/[^/]+\/[A-Z0-9]{6,}/i.test(url || ""); // imobiliare.ro slug-id pattern
  if (isIndividualAd) return false;

  // ── URL-based search/category page detection ──
  if (u.includes("/q-") || /\/q-[^/]+\/?$/.test(u)) return true;
  if (/olx\.ro\/imobiliare(\/|$)/.test(u)) return true; // OLX search/category pages
  if (/imobiliare\.ro\/(vanzare|inchirieri)-[^/]+\/?$/.test(u)) return true;
  if (/storia\.ro\/ro\/rezultate\//.test(u)) return true;
  if (/imoradar24\.ro\/(apartamente|garsoniere|case|terenuri)-de-(vanzare|inchiriat)\//.test(u)) return true;
  if (/renaissanceestate\.ro\/apartamente-de-vanzare\//.test(u)) return true;
  if (/\/(apartamente|garsoniere|case)-de-(vanzare|inchiriat)(\/|$)/.test(u) && !/\/anunt\//.test(u)) return true;

  // ── Title-based heuristics (OLX-style result pages) ──
  if (GENERIC_LISTING_TITLE_SIGNALS.some((signal) => t.includes(removeDiacritics(signal.toLowerCase())))) return true;
  if (t.endsWith("- olx.ro") || t.endsWith("• olx.ro") || t.endsWith(" storia.ro")) return true;

  return false;
}

function isConfirmedPrivateOwnerLead(lead: ScraperLead): boolean {
  return !isSearchPageLead(lead.url, lead.title) && hasOwnerSignal(lead) && !hasAgencySignal(lead);
}

function extractLeadDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "").toLowerCase() || null;
  }
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

type ImportWorkflow = "smart" | "quick-review" | "owner-contact" | "investment" | "hospitality" | "media-needed" | "seo-ready" | "legal-review" | "renovation" | "active";

interface ImportLeadOptions {
  listingType?: string;
  activate?: boolean;
  verification?: "standard" | "full";
  workflow?: ImportWorkflow;
}

const IMPORT_WORKFLOW_LABELS: Record<ImportWorkflow, string> = {
  smart: "Draft inteligent",
  "quick-review": "Revizie rapidă",
  "owner-contact": "Contact proprietar prioritar",
  investment: "Analiză investiție",
  hospitality: "Pregătire regim hotelier",
  "media-needed": "Necesită poze/verificare",
  "seo-ready": "Draft SEO-ready",
  "legal-review": "Verificare juridică",
  renovation: "Renovare / flip",
  active: "Import activ",
};

const ScraperLeads = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState<ScraperLead | null>(null);
  const [hotOnly, setHotOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [listingTab, setListingTab] = useState<"all" | "vanzare" | "inchiriere">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "pipeline" | "analytics">(() => (localStorage.getItem("scraper:viewMode") as any) || "table");
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isScraping, setIsScraping] = useState(false);
  const [activeScanMode, setActiveScanMode] = useState<"scan" | "rescan" | null>(null);
  const [lastIngestResult, setLastIngestResult] = useState<{ count: number; blacklisted_skipped: number; archived_skipped: number; duplicate_skipped?: number; existing_sources_checked?: number } | null>(null);
  const [activeJob, setActiveJob] = useState<{
    id: string;
    status: string;
    processed_queries: number;
    total_queries: number;
    current_keyword: string | null;
    current_platform: string | null;
    new_listings: number;
    error_message: string | null;
  } | null>(null);
  const [recentScanPulse, setRecentScanPulse] = useState(false);
  const [smartFilter, setSmartFilter] = useState<string>(() => localStorage.getItem("scraper:smartFilter") || "all");
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "date">(() => (localStorage.getItem("scraper:sortBy") as any) || "score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => (localStorage.getItem("scraper:sortDir") as any) || "desc");
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlatform, setNewPlatform] = useState("General");
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null);
  const [editingKeywordText, setEditingKeywordText] = useState("");
  const [filtersEditingId, setFiltersEditingId] = useState<string | null>(null);
  const [filtersSavingId, setFiltersSavingId] = useState<string | null>(null);
  const [editingAgencyName, setEditingAgencyName] = useState(false);
  const [agencyNameValue, setAgencyNameValue] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>({ ...EMPTY_FILTERS });
  const [showArchived, setShowArchived] = useState(false);
  const [hideSnoozed, setHideSnoozed] = useState(true);
  const [hideSearchPages, setHideSearchPages] = useState(true);
  const [hideAgencies, setHideAgencies] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importingLeadId, setImportingLeadId] = useState<string | null>(null);
  const [bulkImportingSmart, setBulkImportingSmart] = useState(false);
  const [bulkImportingHospitality, setBulkImportingHospitality] = useState(false);
  const [queryLimit, setQueryLimit] = useState<number>(() => {
    if (typeof window === "undefined") return 25;
    const v = parseInt(window.localStorage.getItem("prospect_scan_query_limit") || "25", 10);
    return Number.isFinite(v) && v >= 1 && v <= 100 ? v : 25;
  });
  const [keywordsPreviewOpen, setKeywordsPreviewOpen] = useState(false);

  // ── Scan history, Safe Mode & timing ────────────────────────────────
  const [safeMode, setSafeMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("prospect_scan_safe_mode") === "1";
  });
  useEffect(() => {
    try { localStorage.setItem("prospect_scan_safe_mode", safeMode ? "1" : "0"); } catch {}
  }, [safeMode]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>(() => getScanHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const scanContextRef = useRef<{
    startedAt: number;
    mode: "scan" | "rescan" | "simulated";
    queryLimit: number;
    simulated: boolean;
  } | null>(null);
  const recordScanEntry = useCallback((partial: Omit<ScanHistoryEntry,
    "id" | "started_at" | "ended_at" | "duration_ms" | "mode" | "query_limit">) => {
    const ctx = scanContextRef.current;
    if (!ctx) return;
    const endedAt = Date.now();
    const entry = appendScanHistory({
      started_at: new Date(ctx.startedAt).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      duration_ms: endedAt - ctx.startedAt,
      mode: ctx.mode,
      query_limit: ctx.queryLimit,
      ...partial,
    });
    setScanHistory((prev) => [entry, ...prev].slice(0, 50));
    scanContextRef.current = null;
  }, []);
  const simulationTimerRef = useRef<number | null>(null);

  // Debounced search to reduce filter recalcs
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Persist preferences
  useEffect(() => { localStorage.setItem("scraper:smartFilter", smartFilter); }, [smartFilter]);
  useEffect(() => { localStorage.setItem("scraper:sortBy", sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem("scraper:sortDir", sortDir); }, [sortDir]);
  useEffect(() => { localStorage.setItem("scraper:viewMode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("prospect_scan_query_limit", String(queryLimit)); }, [queryLimit]);

  // ── Phone Intelligence Count ──────────────────────
  const { data: phoneIntelCount = 0 } = useQuery({
    queryKey: ["phone-intel-count"],
    queryFn: async () => {
      const { count } = await supabase.from("phone_intelligence").select("*", { count: "exact", head: true });
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Archived/Blacklisted counts ───────────────────
  const { data: archivedCount = 0 } = useQuery({
    queryKey: ["scraper-archived-count"],
    queryFn: async () => {
      const { count } = await supabase.from("scraper_leads_archive_2026" as any).select("*", { count: "exact", head: true }).eq("status", "archived");
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Archived leads query ─────────────────────────
  const { data: archivedLeads = [], isLoading: isLoadingArchived, refetch: refetchArchived } = useQuery({
    queryKey: ["scraper-leads-archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_leads_archive_2026" as any)
        .select("*")
        .eq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        listing_type: deriveListingType(d.title, d.listing_type),
        tags: d.tags || [],
        _prospect_type: d.prospect_category || deriveProspectType(d.title),
      })) as (ScraperLead & { _prospect_type: string })[];
    },
    enabled: showArchived,
    staleTime: 1000 * 60 * 2,
  });

  // ── 7-Day Trend Data ─────────────────────────────
  const { data: trendData = [] } = useQuery({
    queryKey: ["scraper-trend-7d"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      // Read from BOTH legacy archive AND live prospect_listings (real ingestion target)
      const [{ data: archiveRows }, { data: prospectRows }] = await Promise.all([
        supabase
          .from("scraper_leads_archive_2026" as any)
          .select("created_at")
          .gte("created_at", sevenDaysAgo)
          .not("status", "eq", "archived"),
        supabase
          .from("prospect_listings" as any)
          .select("created_at")
          .gte("created_at", sevenDaysAgo),
      ]);
      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      [...(archiveRows || []), ...(prospectRows || [])].forEach((row: any) => {
        const day = row.created_at?.slice(0, 10);
        if (day && byDay.has(day)) byDay.set(day, (byDay.get(day) || 0) + 1);
      });
      return Array.from(byDay.entries()).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }),
        count,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Last Scan Log (persisted) ────────────────────
  const { data: lastScanLog } = useQuery({
    queryKey: ["last-scan-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scraper_scan_logs")
        .select("*")
        .order("scanned_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    staleTime: 1000 * 60 * 2,
  });
  // ── Search Keywords ────────────────────────────────
  const { data: searchKeywords = [], refetch: refetchKeywords } = useQuery({
    queryKey: ["scraper-search-keywords"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scraper_search_keywords")
        .select("*")
        .order("created_at", { ascending: true });
      return (data || []) as SearchKeyword[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["scraper-leads"],
    queryFn: async () => {
      const { data: archiveData, error } = await supabase
        .from("scraper_leads_archive_2026" as any)
        .select("*")
        .not("status", "eq", "archived")
        .order("lead_score", { ascending: false });
      if (error) throw error;

      const archiveLeads = (archiveData || []).map((d: any) => ({
        ...d,
        phone: normalizeRoPhone(d.phone) || extractPhoneFromText(`${d.admin_notes || ""} ${d.title || ""}`),
        listing_type: deriveListingType(d.title, d.listing_type),
        tags: d.tags || [],
        _prospect_type: d.prospect_category || (hasOwnerSignal(d) ? "proprietar" : deriveProspectType(d.title)),
        _origin: "archive" as const,
      }))
        .filter((lead: any) => isConfirmedPrivateOwnerLead(lead)) as (ScraperLead & { _prospect_type: string })[];

      const [{ data: blocklistData }, { data: archivedAgencyData }] = await Promise.all([
        supabase.from("agency_blocklist").select("phone_normalized, domain"),
        supabase
          .from("scraper_leads_archive_2026" as any)
          .select("phone, url")
          .or("prospect_category.eq.agentie,status.eq.archived"),
      ]);
      const blockedPhones = new Set([
        ...(blocklistData || []).map((r: any) => normalizeRoPhone(r.phone_normalized)).filter(Boolean),
        ...(archivedAgencyData || []).map((l: any) => normalizeRoPhone(l.phone)).filter(Boolean),
      ]);
      const blockedDomains = new Set([
        ...(blocklistData || []).map((r: any) => r.domain).filter(Boolean),
        ...(archivedAgencyData || []).map((l: any) => extractLeadDomain(l.url)).filter(Boolean),
      ]);

      const { data: prospectData, error: prospectError } = await supabase
        .from("prospect_listings" as any)
        .select("id,title,description,price,currency,location,zone,rooms,size,contact_name,contact_phone,phone_normalized,source_url,source_platform,lead_score,score,category,prospect_type,lifecycle_status,call_summary,admin_notes,scraped_at,created_at,search_keywords")
        .eq("is_active", true)
        .order("scraped_at", { ascending: false })
        .limit(300);
      if (prospectError) throw prospectError;

      const archiveUrls = new Set([...(archiveData || []).map((l: any) => l.url), ...archiveLeads.map((l) => l.url)].filter(Boolean));
      const prospectLeads = ((prospectData || []) as any[])
        .filter((p) => !isSearchPageLead(p.source_url, p.title))
        .filter((p) => p.prospect_type === "proprietar")
        .filter((p) => hasOwnerSignal({
          title: p.title,
          url: p.source_url,
          admin_notes: p.admin_notes,
          search_keyword: Array.isArray(p.search_keywords) ? p.search_keywords.join(" ") : null,
          source: p.source_platform,
          prospect_category: p.prospect_type,
          description: p.description,
          contact_name: p.contact_name,
        }))
        .filter((p) => !hasAgencySignal({ title: p.title, url: p.source_url, admin_notes: p.admin_notes, description: p.description, contact_name: p.contact_name, agency_name: null }))
        .filter((p) => !archiveUrls.has(p.source_url))
        .filter((p) => !blockedPhones.has(normalizeRoPhone(p.phone_normalized || p.contact_phone) || extractPhoneFromText(`${p.admin_notes || ""} ${p.description || ""} ${p.title || ""}`) || ""))
        .filter((p) => !blockedDomains.has(extractLeadDomain(p.source_url) || ""))
        .map((p) => ({
          id: p.id,
          title: p.title || "Anunț fără titlu",
          original_price: Number(p.price || 0),
          extra_profit_3y: 0,
          monthly_extra: 0,
          lead_score: Number(p.lead_score ?? p.score ?? 0),
          whatsapp_message: null,
          url: p.source_url || "",
          status: p.lifecycle_status || "new",
          created_at: p.scraped_at || p.created_at,
          updated_at: p.created_at,
          listing_type: deriveListingType(`${p.title || ""} ${p.category || ""}`, p.category === "inchiriere" ? "inchiriere" : "vanzare"),
          admin_notes: p.admin_notes,
          tags: [],
          source: p.source_platform || "General",
          phone: normalizeRoPhone(p.phone_normalized || p.contact_phone) || extractPhoneFromText(`${p.admin_notes || ""} ${p.description || ""} ${p.title || ""}`),
          prospect_category: p.prospect_type || "proprietar",
          search_keyword: Array.isArray(p.search_keywords) ? p.search_keywords.join(", ") : null,
          agency_name: null,
          neighborhood_slug: p.zone || null,
          description: p.description,
          contact_name: p.contact_name,
          location: p.location,
          zone: p.zone,
          _prospect_type: "proprietar",
          _origin: "prospect" as const,
        })) as (ScraperLead & { _prospect_type: string })[];

      return [...archiveLeads, ...prospectLeads];
    },
    staleTime: 1000 * 60 * 2,
  });

  const leadSourceUrls = useMemo(() => Array.from(new Set((leads || []).map((l) => l.url).filter(Boolean))), [leads]);
  const { data: importedProperties = [] } = useQuery({
    queryKey: ["scraper-imported-properties", leadSourceUrls.slice(0, 200).join("|")],
    queryFn: async () => {
      if (!leadSourceUrls.length) return [];
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,source_url,listing_type,is_active")
        .in("source_url", leadSourceUrls.slice(0, 200));
      if (error) throw error;
      return data || [];
    },
    enabled: leadSourceUrls.length > 0,
    staleTime: 1000 * 60 * 2,
  });
  const importedPropertyByUrl = useMemo(() => {
    const map = new Map<string, any>();
    importedProperties.forEach((property: any) => property.source_url && map.set(property.source_url, property));
    return map;
  }, [importedProperties]);

  // ── Realtime Alerts ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("scraper-leads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scraper_leads_archive_2026" }, (payload: any) => {
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

  // ── Sync editNotes & agencyName when selectedLead changes ────────
  useEffect(() => {
    if (selectedLead) {
      setEditNotes(selectedLead.admin_notes || "");
      const derived = selectedLead.agency_name || deriveAgencyName(selectedLead.title);
      setAgencyNameValue(derived);
      setEditingAgencyName(false);
    }
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
    if (platformFilter !== "all") result = result.filter((l) => normalizePlatformLabel(l.source) === platformFilter);
    if (filterType === "proprietar") {
      // Strict: exclude anything explicitly classified as agency/developer
      result = result.filter((l) =>
        l._prospect_type !== "agentie" &&
        l._prospect_type !== "dezvoltator" &&
        l.prospect_category !== "agentie" &&
        l.prospect_category !== "dezvoltator"
      );
    } else if (filterType !== "all") {
      result = result.filter((l) => l._prospect_type === filterType);
    }
    if (hotOnly) result = result.filter((l) => l.lead_score > 80);
    // Smart filters
    if (smartFilter === "premium") result = result.filter((l) => isPremiumLead(l.title));
    if (smartFilter === "topROI") result = result.filter((l) => l.lead_score >= 90).sort((a, b) => b.lead_score - a.lead_score);
    if (smartFilter === "proprietari") result = result.filter((l) => l._prospect_type !== "agentie" && l._prospect_type !== "dezvoltator" && l.prospect_category !== "agentie" && l.prospect_category !== "dezvoltator");
    if (smartFilter === "vanzare") result = result.filter((l) => l.listing_type === "vanzare");
    if (smartFilter === "inchiriere") result = result.filter((l) => l.listing_type === "inchiriere");
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((l) => l.title?.toLowerCase().includes(q) || l.url?.toLowerCase().includes(q) || l.phone?.toLowerCase().includes(q));
    }
    // Hide snoozed leads (those with snoozed_until in the future)
    if (hideSnoozed) {
      const now = Date.now();
      result = result.filter((l) => !l.snoozed_until || new Date(l.snoozed_until).getTime() <= now);
    }
    // Hide search/listing pages (not individual ads) — show only real listings.
    // Never allow generic platform result pages back in just because the query
    // used to find them contained owner-only text.
    if (hideSearchPages) {
      result = result.filter((l) => !isSearchPageLead(l.url, l.title));
    }
    // Global rule: keep only owner / private-person leads (hide agencies & developers)
    if (hideAgencies) {
      result = result.filter((l) =>
        l._prospect_type !== "agentie" &&
        l._prospect_type !== "dezvoltator" &&
        l.prospect_category !== "agentie" &&
        l.prospect_category !== "dezvoltator" &&
        isConfirmedPrivateOwnerLead(l)
      );
    }

    // ── Advanced filters ──
    const af = appliedFilters;
    if (af.priceMin) {
      const min = parseFloat(af.priceMin);
      if (!isNaN(min)) result = result.filter((l) => l.original_price >= min);
    }
    if (af.priceMax) {
      const max = parseFloat(af.priceMax);
      if (!isNaN(max)) result = result.filter((l) => l.original_price <= max);
    }
    if (af.surfaceMin) {
      const min = parseFloat(af.surfaceMin);
      if (!isNaN(min)) result = result.filter((l) => { const s = parseSurface(l.title); return s !== null && s >= min; });
    }
    if (af.surfaceMax) {
      const max = parseFloat(af.surfaceMax);
      if (!isNaN(max)) result = result.filter((l) => { const s = parseSurface(l.title); return s !== null && s <= max; });
    }
    if (af.rooms !== "all") {
      const target = parseInt(af.rooms, 10);
      result = result.filter((l) => {
        const r = parseRooms(l.title);
        if (r === null) return false;
        return target >= 4 ? r >= 4 : r === target;
      });
    }
    if (af.floor !== "all") {
      const target = parseInt(af.floor, 10);
      result = result.filter((l) => {
        const f = parseFloor(l.title);
        if (f === null) return false;
        return target >= 4 ? f >= 4 : f === target;
      });
    }
    if (af.ownerType !== "all") {
      result = result.filter((l) => l._prospect_type === af.ownerType);
    }
    if (af.zone !== "all") {
      result = result.filter((l) => (l as any).neighborhood_slug === af.zone);
    }
    if (af.dateFrom) {
      const from = new Date(af.dateFrom);
      result = result.filter((l) => new Date(l.created_at) >= from);
    }
    if (af.dateTo) {
      const to = new Date(af.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((l) => new Date(l.created_at) <= to);
    }

    // Sort based on user selection
    const dir = sortDir === "desc" ? -1 : 1;
    result = [...result].sort((a, b) => {
      if (sortBy === "date") {
        return dir * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return dir * (b.lead_score - a.lead_score);
    });
    return result;
  }, [leads, hotOnly, listingTab, filterType, platformFilter, debouncedSearch, smartFilter, sortBy, sortDir, appliedFilters, hideSnoozed, hideSearchPages, hideAgencies]);

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

  const automationQueue = useMemo(() => {
    const unimported = filteredLeads.filter((lead) => !importedPropertyByUrl.has(lead.url));
    const readyToImport = unimported
      .filter((lead) => lead.lead_score >= 80 && lead.url && !isSearchPageLead(lead.url, lead.title))
      .sort((a, b) => b.lead_score - a.lead_score)
      .slice(0, 5);
    const needsVerification = unimported
      .filter((lead) => lead.lead_score >= 65 && (!lead.phone || !lead.original_price || !parseSurface(`${lead.title || ""} ${lead.description || ""}`)))
      .sort((a, b) => b.lead_score - a.lead_score)
      .slice(0, 5);
    const hospitalityCandidates = unimported
      .filter((lead) => lead.lead_score >= 75 && (isPremiumLead(lead.title) || lead.listing_type === "inchiriere"))
      .sort((a, b) => b.lead_score - a.lead_score)
      .slice(0, 5);
    const readyToContact = filteredLeads
      .filter((lead) => lead.phone && ["new", "reviewed"].includes(lead.status) && lead.lead_score >= 75)
      .sort((a, b) => b.lead_score - a.lead_score)
      .slice(0, 5);
    const missingData = filteredLeads.filter((lead) => !lead.phone || !lead.original_price || !lead.url).length;
    return { readyToImport, readyToContact, needsVerification, hospitalityCandidates, missingData, unimportedCount: unimported.length };
  }, [filteredLeads, importedPropertyByUrl]);

  const formatPrice = (price: number, suffix?: string) =>
    price?.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " €" + (suffix || "");
  const getPriceSuffix = (lead: ScraperLead) => lead.listing_type === "inchiriere" ? "/lună" : "";
  

  const getPropertyBadge = (title: string) => {
    if (title.includes("🏢")) return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20 text-[10px] px-1.5 py-0">Ansamblu Nou</Badge>;
    if (isPremiumLead(title)) return <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">Zonă Premium</Badge>;
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
    const fallbackMsg = `Bună ziua! Vă contactez referitor la anunțul '${cleanTitleStatic(lead.title)}'. Mai este disponibil?`;
    const msg = encodeURIComponent(lead.whatsapp_message || fallbackMsg);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  // ── Inline Status Change (optimistic) ──────────────
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const lead = leads?.find((l) => l.id === leadId) || selectedLead;
    // Optimistic update
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.map((l: any) => l.id === leadId ? { ...l, status: newStatus } : l) : old
    );
    if (selectedLead?.id === leadId)
      setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);

    const { error } = (lead as any)?._origin === "prospect"
      ? await supabase.from("prospect_listings" as any).update({ lifecycle_status: newStatus } as any).eq("id", leadId)
      : await supabase.from("scraper_leads_archive_2026" as any).update({ status: newStatus } as any).eq("id", leadId);
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
    const { error } = lead._origin === "prospect"
      ? await supabase.from("prospect_listings" as any).update({ admin_notes: `${lead.admin_notes ? `${lead.admin_notes}\n` : ""}Etichete conversație: ${newTags.join(", ")}` } as any).eq("id", leadId)
      : await supabase.from("scraper_leads_archive_2026" as any).update({ tags: newTags } as any).eq("id", leadId);
    if (error) {
      toast.error("Eroare la etichete");
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      return;
    }
  };

  // ── Save Notes ────────────────────────────────────
  const saveNotes = async () => {
    if (!selectedLead) return;
    const { error } = selectedLead._origin === "prospect"
      ? await supabase.from("prospect_listings" as any).update({ admin_notes: editNotes } as any).eq("id", selectedLead.id)
      : await supabase.from("scraper_leads_archive_2026" as any).update({ admin_notes: editNotes } as any).eq("id", selectedLead.id);
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

  const exportContactsCSV = () => {
    const contactLeads = filteredLeads.filter((l) => l.phone || getLeadContactName(l) !== "—");
    if (!contactLeads.length) {
      toast.info("Nu există contacte de exportat în filtrarea curentă");
      return;
    }
    const headers = ["Nume contact", "Telefon", "Titlu anunț", "Platformă", "Tip", "Status", "URL"];
    const rows = contactLeads.map((l) => [
      getLeadContactName(l),
      l.phone || "",
      cleanTitleStatic(l.title),
      normalizePlatformLabel(l.source),
      (l as any)._prospect_type || l.prospect_category || "proprietar",
      l.status,
      l.url,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `scraper-contacte-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success(`${contactLeads.length} contacte exportate în CSV`);
  };

  const bulkImportSmartDrafts = async () => {
    const targets = automationQueue.readyToImport.slice(0, 5);
    if (!targets.length) {
      toast.info("Nu există lead-uri potrivite pentru import automat în filtrarea curentă");
      return;
    }
    setBulkImportingSmart(true);
    let imported = 0;
    for (const lead of targets) {
      await importLeadAsListing(lead, { workflow: lead.lead_score >= 90 ? "investment" : "smart", verification: "full" });
      imported += 1;
    }
    setBulkImportingSmart(false);
    toast.success(`${imported} lead-uri prioritare trimise în Proprietăți ca drafturi verificate`);
  };

  const bulkImportHospitalityDrafts = async () => {
    const targets = automationQueue.hospitalityCandidates.slice(0, 3);
    if (!targets.length) {
      toast.info("Nu există candidați potriviți pentru regim hotelier în filtrarea curentă");
      return;
    }
    setBulkImportingHospitality(true);
    let imported = 0;
    for (const lead of targets) {
      await importLeadAsListing(lead, { workflow: "hospitality", verification: "full", listingType: lead.listing_type === "inchiriere" ? "inchiriere" : "investitie" });
      imported += 1;
    }
    setBulkImportingHospitality(false);
    toast.success(`${imported} candidați pentru regim hotelier au fost trimiși ca drafturi`);
  };

  const copyAutomationBrief = () => {
    const lines = [
      "Brief operațional — Oportunități AI",
      `Gata de import: ${automationQueue.readyToImport.length}`,
      `Gata de contact: ${automationQueue.readyToContact.length}`,
      `Necesită verificare: ${automationQueue.needsVerification.length}`,
      `Candidați regim hotelier: ${automationQueue.hospitalityCandidates.length}`,
      "",
      ...automationQueue.readyToContact.map((lead, index) => `${index + 1}. ${cleanTitleStatic(lead.title)} · ${lead.phone || "fără telefon"} · scor ${lead.lead_score} · ${lead.url}`),
    ].join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Brief-ul operațional a fost copiat");
  };

  // ── Compare Toggle ────────────────────────────────
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) { toast.error("Maxim 3 lead-uri pentru comparare"); return prev; }
      return [...prev, id];
    });
  };

  // ── Import lead as draft listing ───────────────────
  const importLeadAsListing = async (lead: ScraperLead, options?: ImportLeadOptions) => {
    if (!lead.url) {
      toast.error("Anunțul nu are URL sursă pentru import");
      return;
    }

    setImportingLeadId(lead.id);
    try {
      const knownExisting = importedPropertyByUrl.get(lead.url);
      if (knownExisting) {
        toast.info(`Anunțul este deja importat: ${knownExisting.name}`);
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("properties")
        .select("id,name")
        .eq("source_url", lead.url)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        toast.info(`Anunțul este deja importat: ${existing.name}`);
        return;
      }

      const workflow = options?.workflow || (options?.activate ? "active" : options?.verification === "full" ? "quick-review" : "smart");
      const listingType = options?.listingType || deriveListingType(lead.title, lead.listing_type || "vanzare");
      const cleanTitle = cleanTitleStatic(lead.title);
      const textBlob = `${lead.title || ""}\n${lead.description || ""}\n${lead.admin_notes || ""}`;
      const rooms = parseRooms(textBlob);
      const size = parseSurface(textBlob);
      const floor = parseFloor(textBlob);
      const yieldValue = getYield(lead);
      const pricePerSqm = ["vanzare", "investitie"].includes(listingType) && lead.original_price && size ? Math.round(lead.original_price / size) : null;
      const description = buildImportedDescription(lead, cleanTitle, yieldValue);
      const sourcePlatform = normalizePlatformLabel(lead.source);
      const contactName = getLeadContactName(lead);
      const specs = extractImportedSpecs(textBlob);
      const hasRenovationSignal = specs.risk_flags.includes("necesită-renovare") || workflow === "renovation";
      const hasLegalRisk = specs.risk_flags.includes("risc-juridic") || specs.risk_flags.includes("verifică-acte") || workflow === "legal-review";
      const needsMediaReview = workflow === "media-needed" || (!lead.description && !lead.admin_notes) || !size || !lead.phone;
      const isPriorityContact = workflow === "owner-contact" || (lead.lead_score >= 85 && Boolean(lead.phone));
      const internalChecklist = [
        "verifică-preț",
        !size ? "completează-suprafață" : null,
        !rooms ? "completează-camere" : null,
        !lead.phone ? "găsește-telefon" : null,
        needsMediaReview ? "atașează-poze" : null,
        hasLegalRisk ? "verifică-acte-proprietate" : null,
        hasRenovationSignal ? "estimează-buget-renovare" : null,
        specs.monthly_maintenance ? "confirmă-întreținere" : null,
        workflow === "seo-ready" ? "optimizează-seo" : null,
        workflow === "investment" ? "calculează-roi-final" : null,
        workflow === "hospitality" ? "verifică-regim-hotelier" : null,
      ].filter(Boolean) as string[];
      const importedFeatures = [
        "importat-scraper",
        "necesită-verificare",
        options?.verification === "full" ? "verificare-completă" : "verificare-standard",
        `workflow-${workflow}`,
        ...internalChecklist,
        lead.lead_score >= 90 ? "lead-premium" : null,
        isPremiumLead(lead.title) ? "zonă-premium" : null,
        isPriorityContact ? "contact-prioritar" : null,
        hasLegalRisk ? "atenție-juridic" : null,
        hasRenovationSignal ? "potențial-flip" : null,
        lead.phone ? "contact-disponibil" : "verifică-telefon",
        `sursa-${sourcePlatform.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        ...specs.amenities.map((item) => item.toLowerCase().replace(/\s+/g, "-")),
        ...specs.risk_flags,
      ].filter(Boolean) as string[];
      const tag = options?.activate ? "Importat scraper" : needsMediaReview ? "Necesită poze/verificare" : options?.verification === "full" ? "De verificat complet" : "Draft importat";
      const estimatedRevenue = listingType === "inchiriere" && lead.original_price
        ? `${lead.original_price}€/lună chirie listată`
        : lead.monthly_extra
          ? `${lead.monthly_extra}€/lună extra estimat`
          : null;

      const { data: insertedProperty, error } = await supabase.from("properties").insert({
        name: cleanTitle,
        location: inferLocation(lead),
        description_ro: description,
        description_en: description,
        features: importedFeatures,
        amenities: specs.amenities.length ? specs.amenities : null,
        amenities_en: specs.amenities.length ? specs.amenities : null,
        booking_url: lead.url,
        tag,
        is_active: Boolean(options?.activate),
        display_order: 999,
        status_operativ: listingType,
        listing_type: listingType,
        capital_necesar: ["vanzare", "investitie"].includes(listingType) ? lead.original_price || null : null,
        rooms,
        size,
        bedrooms: rooms ? Math.max(1, rooms - 1) : null,
        capacity: rooms ? Math.max(2, rooms * 2) : null,
        floor: floor !== null ? String(floor) : null,
        property_subtype: inferPropertySubtype(textBlob),
        bathrooms: specs.bathrooms,
        kitchens: specs.kitchens,
        balconies: specs.balconies,
        usable_area: size,
        built_area: size,
        terrace_area: specs.terrace_area,
        total_building_floors: specs.total_building_floors,
        year_built: specs.year_built,
        renovation_year: specs.renovation_year,
        has_elevator: specs.has_elevator,
        has_ac: specs.has_ac,
        has_cellar: specs.has_cellar,
        has_storage: specs.has_storage,
        parking: specs.parking,
        furnished: specs.furnished,
        intercom_type: specs.intercom_type,
        orientation: specs.orientation,
        comfort_level: specs.comfort_level,
        construction_type: specs.construction_type,
        heating_type: specs.heating_type,
        property_condition: specs.property_condition,
        compartimentare: specs.compartimentare,
        monthly_maintenance: specs.monthly_maintenance,
        energy_class: specs.energy_class,
        view_type: specs.view_type,
        destination: "Rezidențial",
        price_per_sqm: pricePerSqm,
        estimated_revenue: estimatedRevenue,
        roi_percentage: yieldValue ? `${yieldValue}%` : null,
        expert_insight_ro: [
          `Import: ${IMPORT_WORKFLOW_LABELS[workflow]}.`,
          `Prioritate: ${isPriorityContact ? "contact rapid" : lead.lead_score >= 70 ? "revizie comercială" : "verificare standard"}.`,
          specs.risk_flags.length ? `Semnale detectate: ${specs.risk_flags.join(", ")}.` : null,
          internalChecklist.length ? `Checklist: ${internalChecklist.join(", ")}.` : null,
        ].filter(Boolean).join("\n"),
        expert_insight_en: [
          `Import workflow: ${IMPORT_WORKFLOW_LABELS[workflow]}.`,
          `Priority: ${isPriorityContact ? "fast owner contact" : lead.lead_score >= 70 ? "commercial review" : "standard review"}.`,
          specs.risk_flags.length ? `Detected signals: ${specs.risk_flags.join(", ")}.` : null,
          internalChecklist.length ? `Checklist: ${internalChecklist.join(", ")}.` : null,
        ].filter(Boolean).join("\n"),
        source_url: lead.url,
        source_platform: sourcePlatform,
      } as any).select("id,name").single();

      if (error) throw error;

      // Save contact details to admin-only table
      if (insertedProperty?.id && (lead.phone || (contactName !== "—" && contactName))) {
        await supabase.from("property_contact_details" as any).upsert({
          property_id: insertedProperty.id,
          contact_phone: lead.phone || null,
          contact_name: contactName !== "—" ? contactName : null,
        }, { onConflict: "property_id" });
      }

      if (lead._origin === "prospect") {
        await supabase.from("prospect_listings" as any).update({ lifecycle_status: "converted" } as any).eq("id", lead.id);
      } else {
        await supabase.from("scraper_leads_archive_2026" as any).update({ status: "converted" } as any).eq("id", lead.id);
      }

      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      queryClient.invalidateQueries({ queryKey: ["scraper-imported-properties"] });
      toast.success(options?.activate ? "Anunț importat și activat în Proprietăți." : "Anunț importat ca draft în Proprietăți. Verifică-l înainte de publicare.", {
        description: insertedProperty?.name || cleanTitle,
        duration: 8000,
        action: { label: "Vezi proprietăți", onClick: () => navigate("/admin?tab=properties") },
      });
    } catch (error: any) {
      toast.error(`Eroare la import: ${error.message || "necunoscută"}`);
    } finally {
      setImportingLeadId(null);
    }
  };

  // ── Export to Prospect Listings ────────────────────
  const exportToProperties = async (lead: ScraperLead) => {
    const { error } = await supabase.from("prospect_listings").insert({
      prospect_type: (lead as any)._prospect_type || "proprietar",
      source_platform: lead.source || "OLX",
      source_url: lead.url || "",
      title: cleanTitleStatic(lead.title),
      price: lead.original_price,
      location: "Timișoara",
      contact_phone: lead.phone || null,
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
    const { error } = await supabase.from("scraper_leads_archive_2026" as any).update({ status: "archived" } as any).eq("id", lead.id);

    if (error || piError) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error("Eroare la blacklist");
      return;
    }
    toast.success(`☠️ ${lead.phone} adăugat pe blacklist. Lead-ul a fost arhivat.`);
  };

  // ── Mark lead as Agency: blocklist (phone+domain) + archive ─────────
  const handleMarkAsAgency = async (lead: ScraperLead) => {
    const url = lead.url || "";
    const domain = extractLeadDomain(url);
    const phone = lead.phone || null;

    if (!phone && !domain) {
      toast.error("Anunțul nu are telefon sau URL pentru blocare");
      return;
    }

    // Optimistic remove
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.filter((l: any) => l.id !== lead.id) : old
    );
    if (selectedLead?.id === lead.id) setSelectedLead(null);

    // Check existing blocklist entries to avoid duplicates
    const orParts: string[] = [];
    if (phone) orParts.push(`phone_normalized.eq.${phone}`);
    if (domain) orParts.push(`domain.eq.${domain}`);
    const { data: existing } = await supabase
      .from("agency_blocklist")
      .select("phone_normalized, domain")
      .or(orParts.join(","));

    const phoneExists = !!existing?.some((e: any) => phone && e.phone_normalized === phone);
    const domainExists = !!existing?.some((e: any) => domain && e.domain === domain);

    const rows: any[] = [];
    if (phone && !phoneExists) {
      rows.push({
        phone_normalized: phone,
        reason: "manual_scraper_leads",
        notes: `Marcat manual din Oportunități AI · ${(lead.title || "").slice(0, 80)}`,
      });
    }
    if (domain && !domainExists) {
      rows.push({
        domain,
        reason: "manual_scraper_leads",
        notes: `Marcat manual din Oportunități AI · ${url.slice(0, 120)}`,
      });
    }

    if (rows.length > 0) {
      const { error: blErr } = await supabase.from("agency_blocklist").insert(rows);
      if (blErr) {
        queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
        toast.error(`Eroare blocklist: ${blErr.message}`);
        return;
      }
    }

    // Update lead in its real source, then mirror by URL/phone so it cannot reappear from the merged source.
    const { error: updErr } = lead._origin === "prospect"
      ? await supabase
          .from("prospect_listings" as any)
          .update({ prospect_type: "agentie", is_active: false, auto_blacklisted_at: new Date().toISOString(), auto_blacklist_reason: "Manual scraper-leads" } as any)
          .eq("id", lead.id)
      : await supabase
          .from("scraper_leads_archive_2026" as any)
          .update({ prospect_category: "agentie", status: "archived" } as any)
          .eq("id", lead.id);

    const mirrorUpdates: Array<PromiseLike<any>> = [];
    if (url) {
      mirrorUpdates.push(supabase.from("scraper_leads_archive_2026" as any).update({ prospect_category: "agentie", status: "archived" } as any).eq("url", url));
      mirrorUpdates.push(supabase.from("prospect_listings" as any).update({ prospect_type: "agentie", is_active: false, auto_blacklisted_at: new Date().toISOString(), auto_blacklist_reason: "Manual scraper-leads" } as any).eq("source_url", url));
    }
    if (phone) {
      mirrorUpdates.push(supabase.from("prospect_listings" as any).update({ prospect_type: "agentie", is_active: false, auto_blacklisted_at: new Date().toISOString(), auto_blacklist_reason: "Manual scraper-leads" } as any).eq("phone_normalized", phone));
    }
    await Promise.allSettled(mirrorUpdates);

    if (updErr) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error(`Eroare la arhivare: ${updErr.message}`);
      return;
    }

    const added = rows.length > 0 ? rows.map((r) => r.phone_normalized || r.domain).join(" · ") : "—";
    const skipped = [
      phone && phoneExists ? phone : null,
      domain && domainExists ? domain : null,
    ].filter(Boolean).join(" · ");

    if (rows.length === 0) {
      toast.info(`🏢 Deja în blocklist (${skipped}). Lead arhivat.`);
    } else if (skipped) {
      toast.success(`🏢 Adăugat: ${added} · Existent: ${skipped}`);
    } else {
      toast.success(`🏢 Marcat agenție: ${added}. Lead arhivat.`);
    }
    queryClient.invalidateQueries({ queryKey: ["scraper-archived-count"] });
    queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
  };
  const handleArchive = async (lead: ScraperLead) => {
    const leadId = lead.id;
    const url = lead.url || "";
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.filter((l: any) => l.id !== leadId) : old
    );
    if (selectedLead?.id === leadId) setSelectedLead(null);

    const { error } = (lead as any)._origin === "prospect"
      ? await supabase
          .from("prospect_listings" as any)
          .update({
            is_active: false,
            lifecycle_status: "rejected",
            status: "archived",
            admin_notes: `${lead.admin_notes ? `${lead.admin_notes}\n` : ""}Arhivat manual din Oportunități AI. Nu se reimportă automat.`,
          } as any)
          .eq("id", leadId)
      : await supabase
          .from("scraper_leads_archive_2026" as any)
          .update({ status: "archived" } as any)
          .eq("id", leadId);

    if (!error && url) {
      await Promise.allSettled([
        supabase.from("scraper_leads_archive_2026" as any).update({ status: "archived" } as any).eq("url", url),
        supabase.from("prospect_listings" as any).update({ is_active: false, lifecycle_status: "rejected", status: "archived" } as any).eq("source_url", url),
      ]);
    }
    if (error) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error("Eroare la arhivare");
      return;
    }
    toast.success("Lead arhivat");
    queryClient.invalidateQueries({ queryKey: ["scraper-archived-count"] });
    queryClient.invalidateQueries({ queryKey: ["scraper-leads-archived"] });
    queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
  };

  // ── Restore Lead from archive ────────────────────
  const handleRestore = async (leadId: string) => {
    const { error } = await supabase.from("scraper_leads_archive_2026" as any).update({ status: "new" } as any).eq("id", leadId);
    if (error) {
      toast.error("Eroare la restaurare");
      return;
    }
    toast.success("Lead restaurat cu succes");
    queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
    queryClient.invalidateQueries({ queryKey: ["scraper-leads-archived"] });
    queryClient.invalidateQueries({ queryKey: ["scraper-archived-count"] });
  };

  // ── Assign Category (saves to phone_intelligence + lead) ──
  const handleCategoryChange = async (lead: ScraperLead & { _prospect_type: string }, newCategory: string) => {
    // Optimistic update
    queryClient.setQueryData(["scraper-leads"], (old: any) =>
      Array.isArray(old) ? old.map((l: any) => l.id === lead.id ? { ...l, prospect_category: newCategory, _prospect_type: newCategory } : l) : old
    );
    if (selectedLead?.id === lead.id) {
      setSelectedLead((prev) => prev ? { ...prev, prospect_category: newCategory } : null);
    }

    // Update lead category in the actual source table.
    const { error } = lead._origin === "prospect"
      ? await supabase.from("prospect_listings" as any).update({ prospect_type: newCategory } as any).eq("id", lead.id)
      : await supabase.from("scraper_leads_archive_2026" as any).update({ prospect_category: newCategory } as any).eq("id", lead.id);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      toast.error("Eroare la schimbarea categoriei");
      return;
    }

    // If lead has phone, also save to phone_intelligence for future auto-categorization
    if (lead.phone) {
      await supabase.from("phone_intelligence" as any).upsert({
        phone_number: lead.phone,
        category: newCategory,
        is_blacklisted: false,
        last_seen: new Date().toISOString(),
      } as any, { onConflict: "phone_number" });
    }

    const label = PROSPECT_TYPES.find((p) => p.value === newCategory)?.label || newCategory;
    toast.success(`Categorie: ${label}${lead.phone ? " (salvată și pentru viitoarele importuri)" : ""}`);
  };

  // ── Keyboard shortcuts ──────────────────────────
  useScraperKeyboardShortcuts({
    enabled: !!selectedLead,
    onNext: () => {
      if (!selectedLead || !filteredLeads.length) return;
      const idx = filteredLeads.findIndex((l) => l.id === selectedLead.id);
      const next = filteredLeads[Math.min(idx + 1, filteredLeads.length - 1)];
      if (next) { setSelectedLead(next as any); setGeneratedMessage(""); }
    },
    onPrev: () => {
      if (!selectedLead || !filteredLeads.length) return;
      const idx = filteredLeads.findIndex((l) => l.id === selectedLead.id);
      const prev = filteredLeads[Math.max(idx - 1, 0)];
      if (prev) { setSelectedLead(prev as any); setGeneratedMessage(""); }
    },
    onWhatsApp: () => selectedLead && handleWhatsApp(selectedLead),
    onArchive: () => selectedLead && handleArchive(selectedLead),
    onEscape: () => setSelectedLead(null),
    onStatusChange: (status) => selectedLead && handleStatusChange(selectedLead.id, status),
  });

  // ── Active keywords + duplicate detection for current scan ────────────
  const activeKeywords = useMemo(
    () => (searchKeywords || []).filter((k) => k.is_active),
    [searchKeywords],
  );
  const duplicateKeywords = useMemo(() => {
    const seen = new Map<string, number>();
    for (const k of activeKeywords) {
      const key = `${(k.keyword || "").trim().toLowerCase()}::${k.platform}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return Array.from(seen.entries())
      .filter(([, n]) => n > 1)
      .map(([key, n]) => {
        const [keyword, platform] = key.split("::");
        return { keyword, platform, count: n };
      });
  }, [activeKeywords]);
  const uniqueActiveKeywords = useMemo(() => {
    const seen = new Set<string>();
    const out: SearchKeyword[] = [];
    for (const k of activeKeywords) {
      const key = `${(k.keyword || "").trim().toLowerCase()}::${k.platform}`;
      if (!seen.has(key)) { seen.add(key); out.push(k); }
    }
    return out;
  }, [activeKeywords]);

  const runSimulatedScan = useCallback((mode: "scan" | "rescan", effectiveLimit: number) => {
    const total = Math.max(1, Math.min(uniqueActiveKeywords.length || effectiveLimit, effectiveLimit));
    const fakeId = `sim-${Date.now()}`;
    scanContextRef.current = {
      startedAt: Date.now(),
      mode: "simulated",
      queryLimit: effectiveLimit,
      simulated: true,
    };
    setIsScraping(true);
    setActiveScanMode(mode);
    setRecentScanPulse(true);
    setActiveJob({
      id: fakeId,
      status: "running",
      processed_queries: 0,
      total_queries: total,
      current_keyword: null,
      current_platform: null,
      new_listings: 0,
      error_message: null,
    });
    let processed = 0;
    let fakeFound = 0;
    const tick = () => {
      processed += 1;
      if (Math.random() < 0.35) fakeFound += 1;
      const kw = uniqueActiveKeywords[processed - 1];
      setActiveJob((prev) => prev && prev.id === fakeId ? {
        ...prev,
        processed_queries: processed,
        new_listings: fakeFound,
        current_keyword: kw?.keyword ?? `sim-keyword-${processed}`,
        current_platform: kw?.platform ?? "Simulat",
      } : prev);
      if (processed >= total) {
        setActiveJob((prev) => prev && prev.id === fakeId ? { ...prev, status: "completed" } : prev);
        setIsScraping(false);
        setActiveScanMode(null);
        toast.success(`Simulare completă — ${fakeFound} prospecți simulați (fără credite consumate).`);
        recordScanEntry({
          status: "simulated",
          total_queries: total,
          processed_queries: processed,
          batches_total: Math.max(1, Math.ceil(total / 25)),
          batches_done: Math.max(1, Math.ceil(total / 25)),
          new_listings: fakeFound,
          duplicate_skipped: 0,
          blacklisted_skipped: 0,
        });
        setTimeout(() => { setActiveJob(null); setRecentScanPulse(false); }, 3500);
        simulationTimerRef.current = null;
        return;
      }
      simulationTimerRef.current = window.setTimeout(tick, 120 + Math.random() * 180);
    };
    simulationTimerRef.current = window.setTimeout(tick, 200);
  }, [uniqueActiveKeywords, recordScanEntry]);

  useEffect(() => () => {
    if (simulationTimerRef.current) window.clearTimeout(simulationTimerRef.current);
  }, []);

  const handleScrape = async (mode: "scan" | "rescan" = "scan") => {
    if (duplicateKeywords.length > 0) {
      toast.warning(
        `${duplicateKeywords.length} cuvinte cheie duplicate detectate — vor fi scanate o singură dată.`,
        { description: duplicateKeywords.slice(0, 3).map((d) => `"${d.keyword}" (${d.platform}) ×${d.count}`).join(", ") },
      );
    }
    const isRescan = mode === "rescan";
    const effectiveLimit = isRescan ? Math.min(100, Math.max(queryLimit, 40)) : queryLimit;

    if (safeMode) {
      toast.info("Mod Simulare activ — nu consumă credite Firecrawl.");
      runSimulatedScan(mode, effectiveLimit);
      return;
    }

    setIsScraping(true);
    setActiveScanMode(mode);
    setRecentScanPulse(true);
    scanContextRef.current = {
      startedAt: Date.now(),
      mode,
      queryLimit: effectiveLimit,
      simulated: false,
    };
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Trebuie să fii autentificat ca admin.");

      const { data: jobRow, error: jobErr } = await supabase
        .from("prospect_scan_jobs")
        .insert({
          created_by: userId,
          query_limit: effectiveLimit,
          max_results: isRescan ? 20 : 10,
          triggered_by: isRescan ? "manual_rescan_ui" : "manual_scan_ui",
        } as any)
        .select("*")
        .single();
      if (jobErr || !jobRow) throw jobErr || new Error("Nu am putut crea job-ul.");

      setActiveJob({
        id: (jobRow as any).id,
        status: "pending",
        processed_queries: 0,
        total_queries: 0,
        current_keyword: null,
        current_platform: null,
        new_listings: 0,
        error_message: null,
      });

      const { error } = await supabase.functions.invoke("scrape-prospects", {
        body: {
          max_results: isRescan ? 20 : 10,
          only_new_sources: isRescan,
          preserve_agency_filter: true,
          query_limit: effectiveLimit,
          job_id: (jobRow as any).id,
          async_mode: true,
        },
      });
      if (error) throw error;

      toast.success(`${isRescan ? "Rescan" : "Scanare"} pornit în fundal — vezi bara de progres.`);
    } catch (err: any) {
      console.error("[ScraperLeads] handleScrape failed", err);
      const msg = err?.message || "Necunoscută";
      toast.error(`${mode === "rescan" ? "Eroare rescan" : "Eroare scanare"}: ${msg}`);
      recordScanEntry({
        status: "failed",
        total_queries: 0,
        processed_queries: 0,
        batches_total: 0,
        batches_done: 0,
        new_listings: 0,
        duplicate_skipped: 0,
        blacklisted_skipped: 0,
        error_message: msg,
        error_details: (() => { try { return JSON.stringify(err, Object.getOwnPropertyNames(err)).slice(0, 2000); } catch { return String(err); } })(),
      });
      setIsScraping(false);
      setActiveScanMode(null);
    }
  };

  // Realtime subscription to active scan job.
  useEffect(() => {
    if (!activeJob?.id) return;
    const channel = supabase
      .channel(`scraperleads_scan_job_${activeJob.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "prospect_scan_jobs", filter: `id=eq.${activeJob.id}` },
        (payload) => {
          const row = payload.new as any;
          setActiveJob((prev) => prev && prev.id === row.id ? {
            id: row.id,
            status: row.status,
            processed_queries: row.processed_queries ?? 0,
            total_queries: row.total_queries ?? 0,
            current_keyword: row.current_keyword,
            current_platform: row.current_platform,
            new_listings: row.new_listings ?? 0,
            error_message: row.error_message,
          } : prev);

          if (row.status === "completed") {
            const found = row.new_listings ?? 0;
            toast.success(`Scanare completă! ${found} anunțuri noi.`);
            setIsScraping(false);
            setActiveScanMode(null);
            setLastIngestResult({
              count: found,
              blacklisted_skipped: row.blacklisted_skipped ?? 0,
              archived_skipped: row.archived_skipped ?? 0,
              duplicate_skipped: row.duplicate_skipped ?? 0,
            });
            void supabase.from("scraper_scan_logs").insert({
              new_count: found,
              blacklisted_skipped: row.blacklisted_skipped ?? 0,
              archived_skipped: row.archived_skipped ?? 0,
              total_processed: (found || 0) + (row.blacklisted_skipped ?? 0) + (row.archived_skipped ?? 0),
            } as any);
            queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
            queryClient.invalidateQueries({ queryKey: ["phone-intel-count"] });
            queryClient.invalidateQueries({ queryKey: ["scraper-archived-count"] });
            queryClient.invalidateQueries({ queryKey: ["last-scan-log"] });
            queryClient.invalidateQueries({ queryKey: ["scraper-trend-7d"] });
            queryClient.invalidateQueries({ queryKey: ["scraper-search-keywords"] });
            recordScanEntry({
              status: "completed",
              total_queries: row.total_queries ?? 0,
              processed_queries: row.processed_queries ?? 0,
              batches_total: Math.max(1, Math.ceil((row.total_queries ?? 0) / 25)),
              batches_done: Math.max(1, Math.ceil((row.processed_queries ?? 0) / 25)),
              new_listings: found,
              duplicate_skipped: row.duplicate_skipped ?? 0,
              blacklisted_skipped: row.blacklisted_skipped ?? 0,
            });
            setTimeout(() => { setActiveJob(null); setRecentScanPulse(false); }, 4000);
          } else if (row.status === "failed") {
            toast.error(`Scanare eșuată: ${row.error_message || "necunoscut"}`);
            setIsScraping(false);
            setActiveScanMode(null);
            recordScanEntry({
              status: "failed",
              total_queries: row.total_queries ?? 0,
              processed_queries: row.processed_queries ?? 0,
              batches_total: Math.max(1, Math.ceil((row.total_queries ?? 0) / 25)),
              batches_done: Math.max(0, Math.floor((row.processed_queries ?? 0) / 25)),
              new_listings: row.new_listings ?? 0,
              duplicate_skipped: row.duplicate_skipped ?? 0,
              blacklisted_skipped: row.blacklisted_skipped ?? 0,
              error_message: row.error_message || "necunoscut",
              error_details: JSON.stringify({
                failed_batches: row.failed_batches ?? null,
                last_error_at: row.last_error_at ?? null,
                current_keyword: row.current_keyword ?? null,
                current_platform: row.current_platform ?? null,
              }, null, 2),
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeJob?.id, queryClient, recordScanEntry]);

  // Resume tracking any running job on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("prospect_scan_jobs")
        .select("*")
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as any;
      setActiveJob({
        id: row.id,
        status: row.status,
        processed_queries: row.processed_queries ?? 0,
        total_queries: row.total_queries ?? 0,
        current_keyword: row.current_keyword,
        current_platform: row.current_platform,
        new_listings: row.new_listings ?? 0,
        error_message: row.error_message,
      });
      setIsScraping(true);
      setActiveScanMode("scan");
    })();
    return () => { cancelled = true; };
  }, []);


  // ── Keyword CRUD ──────────────────────────────────
  const handleAddKeyword = async () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const { error } = await supabase.from("scraper_search_keywords").insert({ keyword: kw, platform: newPlatform } as any);
    if (error) { toast.error("Eroare la adăugare"); return; }
    setNewKeyword("");
    setNewPlatform("General");
    refetchKeywords();
    toast.success("Cuvânt cheie adăugat");
  };

  const handleToggleKeyword = async (id: string, isActive: boolean) => {
    await supabase.from("scraper_search_keywords").update({ is_active: !isActive } as any).eq("id", id);
    refetchKeywords();
  };

  const handleDeleteKeyword = async (id: string) => {
    await supabase.from("scraper_search_keywords").delete().eq("id", id);
    refetchKeywords();
    toast.success("Cuvânt cheie șters");
  };

  const handleEditKeyword = async (id: string, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    await supabase.from("scraper_search_keywords").update({ keyword: trimmed } as any).eq("id", id);
    setEditingKeywordId(null);
    refetchKeywords();
    toast.success("Cuvânt cheie actualizat");
  };

  // ── Owner-only filter toggles per keyword ──────────
  // Toggle a single platform filter for a keyword. Persists immediately so the
  // UI feels like the native platform filter panels (OLX/Storia/imobiliare.ro).
  const handleToggleOwnerFilter = async (kw: SearchKeyword, filterId: string) => {
    const current = getActiveToggleIds(kw);
    const next = current.includes(filterId)
      ? current.filter((id) => id !== filterId)
      : [...current, filterId];

    setFiltersSavingId(kw.id);
    const payload: KeywordOwnerFilters = {
      ...(kw.owner_filters ?? {}),
      toggles: next,
    };
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({ owner_filters: payload } as any)
      .eq("id", kw.id);
    setFiltersSavingId(null);
    if (error) { toast.error("Eroare la salvarea filtrului"); return; }
    refetchKeywords();
  };

  const handleResetOwnerFilters = async (id: string) => {
    setFiltersSavingId(id);
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({ owner_filters: {} } as any)
      .eq("id", id);
    setFiltersSavingId(null);
    if (error) { toast.error("Eroare la resetare"); return; }
    refetchKeywords();
    toast.success("Filtre resetate la valorile implicite");
  };

  const toggleFiltersExpanded = (id: string) => {
    setFiltersEditingId(filtersEditingId === id ? null : id);
  };

  // ── Agency Name helpers ────────────────────────────
  function deriveAgencyName(title: string): string {
    const agencyPatterns = [
      /(?:prin|de la|oferit de|publicat de|agent(?:ie)?|imobiliare?)\s*[:\-–]?\s*(.{3,50}?)(?:\s*[-–|,]|$)/i,
    ];
    for (const p of agencyPatterns) {
      const m = title.match(p);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return "";
  }

  const saveAgencyName = async (leadId: string, name: string) => {
    const { error } = await supabase.from("scraper_leads_archive_2026" as any).update({ agency_name: name.trim() || null } as any).eq("id", leadId);
    if (error) { toast.error("Eroare la salvare"); return; }
    setEditingAgencyName(false);
    setSelectedLead((prev) => prev ? { ...prev, agency_name: name.trim() || null } : null);
    refetch();
    toast.success("Nume agenție salvat");
  };

  const toggleSort = (col: "score" | "date") => {
    if (sortBy === col) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(col);
      setSortDir("desc");
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

    const handleDrop = (e: React.DragEvent, stageValue: string) => {
      e.preventDefault();
      setDragOverStage(null);
      const id = e.dataTransfer.getData("text/plain") || draggedLeadId;
      setDraggedLeadId(null);
      if (!id) return;
      const lead = filteredLeads.find((l) => l.id === id);
      if (!lead || lead.status === stageValue) return;
      handleStatusChange(id, stageValue);
    };

    return (
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
        {activeStages.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.status === stage.value).sort((a, b) => b.lead_score - a.lead_score);
          const isDragOver = dragOverStage === stage.value;
          return (
            <div
              key={stage.value}
              className={cn(
                `min-w-[260px] max-w-[300px] flex-shrink-0 border-t-4 rounded-lg border border-border ${stage.color} transition-all`,
                isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01]"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.value); }}
              onDragLeave={() => setDragOverStage((cur) => cur === stage.value ? null : cur)}
              onDrop={(e) => handleDrop(e, stage.value)}
            >
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{stage.emoji} {stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="p-2 space-y-2 min-h-[100px]">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">{isDragOver ? "↓ Plasează aici" : "Gol"}</p>
                  ) : stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", lead.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggedLeadId(lead.id);
                      }}
                      onDragEnd={() => { setDraggedLeadId(null); setDragOverStage(null); }}
                      className={cn(
                        "border border-border rounded-lg p-3 hover:bg-background/80 transition-all cursor-grab active:cursor-grabbing bg-card",
                        isPremiumLead(lead.title) && "bg-amber-500/5 dark:bg-amber-500/[0.03] border-amber-400/30",
                        draggedLeadId === lead.id && "opacity-40 scale-95"
                      )}
                      onClick={() => { setSelectedLead(lead); setGeneratedMessage(""); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{isPremiumLead(lead.title) && "✨ "}{cleanTitleStatic(lead.title)}</h4>
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
          <SheetTitle className="text-lg font-serif leading-tight">
            {isPremiumLead(selectedLead.title) && <span className="mr-1">✨</span>}
            {cleanTitleStatic(selectedLead.title)}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {getPropertyBadge(selectedLead.title)}
            {getScoreBadge(selectedLead.lead_score)}
            {getStatusBadge(selectedLead.status)}
            {getYield(selectedLead) && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs">{getYield(selectedLead)}%/an</Badge>
            )}
          </div>
          {/* Phone & Source */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {selectedLead.phone && (
              <a
                href={`tel:${selectedLead.phone}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline font-mono"
              >
                <Phone className="w-3.5 h-3.5" /> {selectedLead.phone}
              </a>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sourceColors[normalizePlatformLabel(selectedLead.source)] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
              {normalizePlatformLabel(selectedLead.source)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {getRelativeDate(selectedLead.created_at)}
            </span>
          </div>
          {/* Category Selector */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Categorie:</span>
            <Select
              value={(selectedLead as any)._prospect_type || selectedLead.prospect_category || "proprietar"}
              onValueChange={(val) => handleCategoryChange(selectedLead as any, val)}
            >
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROSPECT_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value} className="text-xs">
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Agency Name */}
          <div className="flex items-center gap-2 mt-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Agenție:</span>
            {editingAgencyName ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={agencyNameValue}
                  onChange={(e) => setAgencyNameValue(e.target.value)}
                  className="h-7 text-xs flex-1"
                  placeholder="Nume agenție imobiliară..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveAgencyName(selectedLead.id, agencyNameValue);
                    if (e.key === "Escape") setEditingAgencyName(false);
                  }}
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-500" onClick={() => saveAgencyName(selectedLead.id, agencyNameValue)}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingAgencyName(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">{agencyNameValue || "—"}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => setEditingAgencyName(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
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

          {/* AI Insight + Follow-up reminder */}
          <div className="flex gap-2 flex-wrap">
            <AIInsightButton
              leadId={selectedLead.id}
              leadTitle={cleanTitleStatic(selectedLead.title)}
              leadPhone={selectedLead.phone}
              cachedInsight={(selectedLead as any).ai_insight}
              onMessageSelected={(msg) => setGeneratedMessage(msg)}
            />
            <FollowUpManager
              leadId={selectedLead.id}
              followUpAt={(selectedLead as any).follow_up_at}
              snoozedUntil={(selectedLead as any).snoozed_until}
            />
          </div>

          {/* Predictive Analytics — conversion probability + undervaluation */}
          <PredictiveDetailCard
            lead={selectedLead}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ["scraper-leads"] })}
          />

          {/* ── Export to Properties ───────────────── */}
          <div className="flex gap-2 flex-wrap">
            {importedPropertyByUrl.has(selectedLead.url) ? (
              <Button className="flex-1 gap-2" variant="secondary" disabled>
                <Check className="w-4 h-4" /> Importat
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex-1 gap-2" disabled={importingLeadId === selectedLead.id}>
                    {importingLeadId === selectedLead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    Importă Anunț
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead)}>Draft inteligent</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { workflow: "owner-contact", verification: "full" })}>Contact proprietar prioritar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { workflow: "media-needed", verification: "full" })}>Necesită poze/verificare</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { listingType: "vanzare" })}>Importă ca vânzare</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { listingType: "inchiriere" })}>Importă ca închiriere</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { listingType: "investitie", verification: "full", workflow: "investment" })}>Importă pentru investiție</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { listingType: "cazare", verification: "full", workflow: "hospitality" })}>Pregătește regim hotelier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { verification: "full", workflow: "quick-review" })}>Draft + verificare completă</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { workflow: "seo-ready", verification: "full" })}>Draft SEO-ready</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { workflow: "legal-review", verification: "full" })}>Verificare juridică</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { listingType: "investitie", workflow: "renovation", verification: "full" })}>Renovare / flip</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => importLeadAsListing(selectedLead, { activate: true })}>Importă și activează</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" className="flex-1 gap-2" onClick={() => exportToProperties(selectedLead)}>
              <ArrowRightCircle className="w-4 h-4" />
              Trimite în Prospectare
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => downloadLeadAnalysisPdf(selectedLead)}>
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
          </div>

          {/* Mark as Agency + Blacklist + Archive */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="flex-1 gap-2 text-orange-500 border-orange-500/30 hover:bg-orange-500/10" onClick={() => handleMarkAsAgency(selectedLead)}>
              <Building2 className="w-4 h-4" />
              Marchează Agenție
            </Button>
            {selectedLead.phone && (
              <Button variant="outline" className="flex-1 gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => handleBlacklist(selectedLead)}>
                <Ban className="w-4 h-4" />
                Blacklist {selectedLead.phone}
              </Button>
            )}
            <Button variant="outline" className="flex-1 gap-2" onClick={() => handleArchive(selectedLead)}>
              <Archive className="w-4 h-4" />
              Arhivează
            </Button>
          </div>

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
      {!embedded && <SEOHead title={`${t.title} | RealTrust`} description={t.subtitle} noIndex />}
      {!embedded && <Header />}
      <main className={embedded ? "" : "min-h-screen bg-background pt-24 pb-16"}>
        <div className={embedded ? "" : "container mx-auto px-4 md:px-6"}>
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                      {filterType === "proprietar"
                        ? "Oportunități Direct de la Proprietari"
                        : filterType === "agentie"
                        ? "Lead-uri Agenții Imobiliare"
                        : filterType === "dezvoltator"
                        ? "Lead-uri Dezvoltatori"
                        : t.title}
                    </h1>
                    {(isScraping || recentScanPulse) && (
                      <Badge className={cn(
                        "text-[10px] px-2 py-0.5 gap-1",
                        isScraping
                          ? "bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse"
                          : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 animate-pulse"
                      )}>
                        <Sparkles className="w-3 h-3" />
                        {isScraping ? "Scanare..." : "Actualizat"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {filterType === "proprietar"
                      ? "Lead-uri verificate de la persoane fizice. Agențiile și dezvoltatorii sunt filtrați automat ca să economisești timp."
                      : t.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DailyBriefingButton />
              <PredictiveBatchButton />
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setShortcutsOpen(true)} title="Shortcuts (?)">
                <Keyboard className="w-4 h-4" /> Shortcuts
              </Button>
              {/* CSV Export */}
              <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5" disabled={!filteredLeads.length}>
                <Download className="w-4 h-4" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportContactsCSV} className="gap-1.5" disabled={!filteredLeads.length}>
                <Phone className="w-4 h-4" /> Contacte
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
                <Button size="sm" variant={viewMode === "analytics" ? "default" : "ghost"} onClick={() => setViewMode("analytics")} className="rounded-none gap-1.5">
                  <BarChart3 className="w-4 h-4" /> Analiză
                </Button>
              </div>
              <Button onClick={() => handleScrape("rescan")} disabled={isScraping} variant="outline" className="gap-1.5">
                {isScraping && activeScanMode === "rescan" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isScraping && activeScanMode === "rescan" ? "Rescan..." : "Rescan"}
              </Button>
              <Button onClick={() => handleScrape("scan")} disabled={isScraping} className="gap-1.5">
                {isScraping && activeScanMode === "scan" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isScraping && activeScanMode === "scan" ? "Se scanează..." : "Scanează acum"}
              </Button>
            </div>
          </div>

          {/* ── Scan Controls: query limit slider + duplicates + active keywords ── */}
          <div className="mb-3 rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 min-w-[260px] flex-1">
                <span className="text-muted-foreground whitespace-nowrap">
                  Pachet scanare: <span className="font-bold text-foreground tabular-nums">{queryLimit}</span> kw
                </span>
                <Slider
                  className="flex-1 max-w-[260px]"
                  value={[queryLimit]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(v) => setQueryLimit(v[0] ?? 25)}
                  disabled={isScraping}
                />
              </div>
              <span className="text-muted-foreground">
                {uniqueActiveKeywords.length} kw active · {Math.max(1, Math.ceil(Math.min(uniqueActiveKeywords.length, queryLimit) / 25))} loturi (×25)
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <Badge variant="outline" className="text-[10px] font-normal bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" title="prospect_listings.source_url are constraint UNIQUE — duplicatele nu pot fi inserate la nivel de DB">
                  🛡 Dedup DB · UNIQUE(source_url)
                </Badge>
                <label className="flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded border border-border bg-background hover:border-foreground/40 transition-colors">
                  <Switch checked={safeMode} onCheckedChange={setSafeMode} disabled={isScraping} />
                  <span className="text-[11px] font-medium">Mod Simulare</span>
                </label>
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-[11px]" onClick={() => setHistoryOpen(true)}>
                  <History className="w-3.5 h-3.5" /> Istoric ({scanHistory.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1 text-[11px]"
                  disabled={!scanHistory.length && !activeJob}
                  onClick={() => exportScanReportPdf(
                    activeJob ? {
                      id: activeJob.id,
                      started_at: new Date(scanContextRef.current?.startedAt ?? Date.now()).toISOString(),
                      ended_at: new Date().toISOString(),
                      duration_ms: Date.now() - (scanContextRef.current?.startedAt ?? Date.now()),
                      mode: (scanContextRef.current?.mode ?? "scan"),
                      status: activeJob.status === "completed" ? "completed" : activeJob.status === "failed" ? "failed" : "simulated",
                      query_limit: scanContextRef.current?.queryLimit ?? queryLimit,
                      total_queries: activeJob.total_queries,
                      processed_queries: activeJob.processed_queries,
                      batches_total: Math.max(1, Math.ceil(activeJob.total_queries / 25)),
                      batches_done: Math.max(0, Math.floor(activeJob.processed_queries / 25)),
                      new_listings: activeJob.new_listings,
                      duplicate_skipped: 0,
                      blacklisted_skipped: 0,
                      error_message: activeJob.error_message,
                    } as ScanHistoryEntry : null,
                    scanHistory,
                  )}
                >
                  <FileText className="w-3.5 h-3.5" /> Export PDF
                </Button>
              </div>
            </div>

            {safeMode && (
              <div className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-[11px] text-sky-700 dark:text-sky-300">
                🧪 Mod Simulare activ — următoarea „Scanează acum” va parcurge loturile vizual, fără request-uri reale și fără consum de credite Firecrawl.
              </div>
            )}


            {duplicateKeywords.length > 0 && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                ⚠️ {duplicateKeywords.length} duplicat(e) detectat(e): {duplicateKeywords.slice(0, 4).map((d) => `"${d.keyword}" (${d.platform}) ×${d.count}`).join(", ")}
                {duplicateKeywords.length > 4 ? "…" : ""}. Vor fi scanate o singură dată.
              </div>
            )}

            <Collapsible open={keywordsPreviewOpen} onOpenChange={setKeywordsPreviewOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  {keywordsPreviewOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Vezi cuvintele cheie active incluse ({uniqueActiveKeywords.length})
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                {uniqueActiveKeywords.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic">Nu există cuvinte cheie active.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {uniqueActiveKeywords.slice(0, queryLimit).map((k) => (
                      <Badge key={k.id} variant="outline" className={cn("text-[10px] font-normal", sourceColors[k.platform] || sourceColors["General"])}>
                        {k.keyword} <span className="opacity-60 ml-1">· {k.platform}</span>
                      </Badge>
                    ))}
                    {uniqueActiveKeywords.length > queryLimit && (
                      <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                        +{uniqueActiveKeywords.length - queryLimit} excluse de limită
                      </Badge>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {activeJob && (
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {activeJob.status === "completed"
                    ? "✅ Scanare finalizată"
                    : activeJob.status === "failed"
                      ? "❌ Scanare eșuată"
                      : activeJob.status === "running"
                        ? "⚙️ Scanare în fundal (Firecrawl)"
                        : "⏳ Se inițializează…"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {activeJob.processed_queries}/{activeJob.total_queries || "?"} cuvinte-cheie
                </span>
              </div>
              <Progress
                value={activeJob.total_queries > 0
                  ? Math.min(100, Math.round((activeJob.processed_queries / activeJob.total_queries) * 100))
                  : (activeJob.status === "running" ? 5 : 0)}
                className="h-2"
              />
              {/* Batch breakdown (groups of 25) */}
              {activeJob.total_queries > 0 && (() => {
                const BATCH = 25;
                const totalBatches = Math.max(1, Math.ceil(activeJob.total_queries / BATCH));
                const done = activeJob.processed_queries;
                return (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {Array.from({ length: totalBatches }).map((_, i) => {
                      const start = i * BATCH;
                      const end = Math.min(activeJob.total_queries, start + BATCH);
                      const size = end - start;
                      const batchDone = Math.min(size, Math.max(0, done - start));
                      const status =
                        batchDone === 0 ? "pending"
                        : batchDone >= size ? "done"
                        : "running";
                      const cls =
                        status === "done" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : status === "running" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse"
                        : "bg-muted text-muted-foreground border-border";
                      return (
                        <Badge key={i} variant="outline" className={cn("text-[10px] font-normal", cls)}>
                          Lotul {i + 1} ({size} kw) · {status === "done" ? "Finalizat" : status === "running" ? `${batchDone}/${size}` : "În așteptare"}
                        </Badge>
                      );
                    })}
                  </div>
                );
              })()}
              {activeJob.current_keyword && activeJob.status === "running" && (
                <div className="text-[11px] text-muted-foreground truncate">
                  <span className="text-foreground/70">{activeJob.current_platform || "—"}</span>
                  {" · "}
                  <span className="italic">"{activeJob.current_keyword}"</span>
                </div>
              )}
              {activeJob.new_listings > 0 && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  🎯 {activeJob.new_listings} anunțuri noi colectate până acum
                </div>
              )}
              {activeJob.error_message && (
                <div className="text-[11px] text-destructive line-clamp-2">{activeJob.error_message}</div>
              )}
            </div>
          )}

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

          {/* Platform Source Filters */}
          {(() => {
            const baseForPlatforms = listingTab === "all"
              ? (leads || [])
              : (leads || []).filter((l: any) => l.listing_type === listingTab);
            const platformCounts: Record<string, number> = {};
            baseForPlatforms.forEach((l: any) => {
              const src = normalizePlatformLabel(l.source);
              platformCounts[src] = (platformCounts[src] || 0) + 1;
            });
            const platforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]);
            if (platforms.length === 0) return null;
            return (
              <div className="flex items-center gap-1.5 flex-wrap mb-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mr-1">Platformă:</span>
                <button
                  onClick={() => { setPlatformFilter("all"); setSelectedIds([]); }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${platformFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"}`}
                >
                  Toate
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${platformFilter === "all" ? "bg-primary-foreground/20" : "bg-muted"}`}>{baseForPlatforms.length}</span>
                </button>
                {platforms.map(([src, count]) => {
                  const active = platformFilter === src;
                  const colorCls = sourceColors[src];
                  return (
                    <button
                      key={src}
                      onClick={() => { setPlatformFilter(active ? "all" : src); setSelectedIds([]); }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground border-primary" : colorCls ? colorCls + " hover:opacity-80" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"}`}
                    >
                      {src}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

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

          {/* Scraper Analytics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card
              className="bg-card border-border cursor-pointer transition-colors hover:border-rose-500/60 hover:bg-rose-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              role="button"
              tabIndex={0}
              onClick={() => {
                document.getElementById("anti-spam-rescue-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("anti-spam-rescue-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              aria-label="Deschide lista lead-urilor blocate de anti-spam"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/15">
                  <Shield className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Scut Anti-Spam</p>
                  <p className="text-xl font-bold font-mono">{lastIngestResult?.blacklisted_skipped ?? (lastScanLog as any)?.blacklisted_skipped ?? archivedCount}</p>
                  <p className="text-[10px] text-rose-600 font-medium">click → recuperare</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Surse Noi</p>
                  <p className="text-xl font-bold font-mono">{lastIngestResult?.duplicate_skipped ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">duplicate ignorate</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Anunțuri Curățate</p>
                  <p className="text-xl font-bold font-mono">{leads?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">importate cu succes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/15">
                  <Database className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bază de Date Inteligentă</p>
                  <p className="text-xl font-bold font-mono">{phoneIntelCount}</p>
                  <p className="text-[10px] text-muted-foreground">telefoane în memorie</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/15">
                  <Archive className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Arhivate</p>
                  <p className="text-xl font-bold font-mono">{lastIngestResult?.archived_skipped ?? (lastScanLog as any)?.archived_skipped ?? archivedCount}</p>
                  <p className="text-[10px] text-muted-foreground">ignorate la re-import</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7-Day Trend Chart + Blacklist Button */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Card className="bg-card border-border md:col-span-3 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Lead-uri noi — Ultimele 7 zile</p>
                <div className="h-24 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [`${v} lead-uri`, "Noi"]} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#trendGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3 relative z-10">
              <Button variant="outline" className="gap-2 flex-1" onClick={() => setBlacklistOpen(true)}>
                <Shield className="w-4 h-4 text-red-500" /> Gestionare Blacklist
              </Button>
              <Button
                variant={showArchived ? "default" : "outline"}
                className="gap-2 flex-1"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4" /> Arhivă ({archivedCount})
              </Button>
              {lastScanLog && (
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ultima scanare</p>
                    <p className="text-xs font-medium">
                      {new Date((lastScanLog as any).scanned_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(lastScanLog as any).new_count} noi · {(lastScanLog as any).blacklisted_skipped} blocate
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Anti-Spam Rescue: recuperare lead-uri blocate de filtre */}
          <div className="mb-4">
            <AggregatorRejectionLog />
          </div>

          {/* Smart Filter Pills */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
            {SMART_FILTERS.map((sf) => (
              <button
                key={sf.value}
                onClick={() => setSmartFilter(sf.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors",
                  smartFilter === sf.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {sf.label}
                {sf.value === "premium" && leads && (
                  <span className="ml-1 opacity-70">({leads.filter((l) => isPremiumLead(l.title)).length})</span>
                )}
                {sf.value === "topROI" && leads && (
                  <span className="ml-1 opacity-70">({leads.filter((l) => l.lead_score >= 90).length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Advanced Filters */}
          <ScraperAdvancedFilters
            filters={advancedFilters}
            onChange={setAdvancedFilters}
            onApply={() => setAppliedFilters({ ...advancedFilters })}
            activeCount={countActiveFilters(appliedFilters)}
          />

          {/* Stats (6 cards like Bot Prospectare) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
            {renderStatCard("Total", pipelineStats.total, <TrendingUp className="w-4 h-4 text-white" />, "bg-primary")}
            {renderStatCard("Noi", pipelineStats.new, <Eye className="w-4 h-4 text-white" />, "bg-blue-500")}
            {renderStatCard("Contactați", pipelineStats.contacted, <Phone className="w-4 h-4 text-white" />, "bg-orange-500")}
            {renderStatCard("Interesați", pipelineStats.interested, <Handshake className="w-4 h-4 text-white" />, "bg-emerald-500")}
            {renderStatCard("Clienți", pipelineStats.converted, <CheckCircle className="w-4 h-4 text-white" />, "bg-green-600")}
            {renderStatCard("Scor mediu", pipelineStats.avgScore, <Star className="w-4 h-4 text-white" />, "bg-yellow-500")}
          </div>

          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> Flux automat proprietăți
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {automationQueue.readyToImport.length} gata de import · {automationQueue.readyToContact.length} gata de contact · {automationQueue.needsVerification.length} de verificat · {automationQueue.hospitalityCandidates.length} pentru regim hotelier
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={bulkImportSmartDrafts} disabled={bulkImportingSmart || automationQueue.readyToImport.length === 0} className="gap-1.5">
                    {bulkImportingSmart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Importă top {automationQueue.readyToImport.length} ca draft
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkImportHospitalityDrafts} disabled={bulkImportingHospitality || automationQueue.hospitalityCandidates.length === 0} className="gap-1.5">
                    {bulkImportingHospitality ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hotel className="h-4 w-4" />}
                    Regim hotelier ({automationQueue.hospitalityCandidates.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSmartFilter("topROI"); setHotOnly(true); setViewMode("pipeline"); }} className="gap-1.5">
                    <Flame className="h-4 w-4" /> Vezi prioritare
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyAutomationBrief} className="gap-1.5">
                    <ClipboardList className="h-4 w-4" /> Brief
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/admin/prospect-listings")} className="gap-1.5">
                    <ArrowRightCircle className="h-4 w-4" /> Prospect Listings
                  </Button>
                </div>
              </div>
              {automationQueue.readyToImport.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {automationQueue.readyToImport.map((lead) => (
                    <button key={`auto-${lead.id}`} onClick={() => setSelectedLead(lead)} className="min-w-[220px] rounded-md border bg-background p-2 text-left text-xs hover:border-primary/50">
                      <span className="block truncate font-medium">{cleanTitleStatic(lead.title)}</span>
                      <span className="text-muted-foreground">Scor {lead.lead_score} · {formatPrice(lead.original_price, getPriceSuffix(lead))}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                <button onClick={() => { setSmartFilter("topROI"); setHotOnly(true); setViewMode("table"); }} className="rounded-md border bg-background p-3 text-left text-xs hover:border-primary/50">
                  <span className="block font-semibold text-foreground">Import inteligent</span>
                  <span className="text-muted-foreground">{automationQueue.readyToImport.length} lead-uri cu scor mare și URL valid</span>
                </button>
                <button onClick={() => { setHideSnoozed(true); setViewMode("pipeline"); }} className="rounded-md border bg-background p-3 text-left text-xs hover:border-primary/50">
                  <span className="block font-semibold text-foreground">Contact prioritar</span>
                  <span className="text-muted-foreground">{automationQueue.readyToContact.length} proprietari cu telefon disponibil</span>
                </button>
                <button onClick={() => { setAdvancedFilters({ ...EMPTY_FILTERS }); setAppliedFilters({ ...EMPTY_FILTERS }); setViewMode("table"); }} className="rounded-md border bg-background p-3 text-left text-xs hover:border-primary/50">
                  <span className="block font-semibold text-foreground">Curățare date</span>
                  <span className="text-muted-foreground">{automationQueue.needsVerification.length} lead-uri fără telefon, preț sau suprafață</span>
                </button>
                <button onClick={() => { setListingTab("inchiriere"); setHotOnly(true); setViewMode("table"); }} className="rounded-md border bg-background p-3 text-left text-xs hover:border-primary/50">
                  <span className="block font-semibold text-foreground">Regim hotelier</span>
                  <span className="text-muted-foreground">{automationQueue.hospitalityCandidates.length} candidați pentru analiză operațională</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Hide search/listing pages toggle — keeps the table focused on individual ads */}
          <div className="flex items-center gap-2 text-xs px-1 mb-2 flex-wrap">
            <button
              type="button"
              onClick={() => setHideSearchPages((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors ${
                hideSearchPages
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={hideSearchPages}
              title="Ascunde paginile de listare/căutare (ex. categorii OLX) și afișează doar anunțurile individuale"
            >
              {hideSearchPages ? "✅" : "⬜"} Doar anunțuri individuale
            </button>
            <button
              type="button"
              onClick={() => setHideAgencies((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors ${
                hideAgencies
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={hideAgencies}
              title="Ascunde lead-urile clasificate ca agenții sau dezvoltatori — păstrează doar persoane fizice / proprietari"
            >
              {hideAgencies ? "✅" : "⬜"} Doar Proprietari (persoane fizice)
            </button>
            <span className="text-[10px] text-muted-foreground">
              (ascunde paginile de listare + agențiile/dezvoltatorii)
            </span>
          </div>

          {/* Active filters indicator */}
          {(filterType !== 'all' || hotOnly || searchQuery || listingTab !== 'all' || platformFilter !== 'all' || smartFilter !== 'all' || countActiveFilters(advancedFilters) > 0) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mb-4 flex-wrap">
              <Filter className="h-3 w-3 shrink-0" />
              <span className="flex items-center gap-1 flex-wrap">
                Filtre active:
                {hotOnly && <Badge variant="outline" className="ml-1 text-[10px]">🔥 Scor &gt; 80</Badge>}
                {listingTab !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">{listingTab === 'vanzare' ? 'Vânzare' : 'Închiriere'}</Badge>}
                {platformFilter !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">📡 {platformFilter}</Badge>}
                {filterType !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">{filterType}</Badge>}
                {searchQuery && <Badge variant="outline" className="ml-1 text-[10px]">"{searchQuery}"</Badge>}
                {smartFilter !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">{SMART_FILTERS.find(s => s.value === smartFilter)?.label}</Badge>}
                {countActiveFilters(advancedFilters) > 0 && <Badge variant="outline" className="ml-1 text-[10px]">🔍 Filtre avansate ({countActiveFilters(advancedFilters)})</Badge>}
              </span>
              <button
                className="underline hover:text-foreground ml-1"
                onClick={() => { setHotOnly(false); setListingTab("all"); setPlatformFilter("all"); setFilterType("all"); setSearchQuery(""); setSmartFilter("all"); setAdvancedFilters({ ...EMPTY_FILTERS }); setAppliedFilters({ ...EMPTY_FILTERS }); }}
              >
                Resetează
              </button>
              <span className="text-[10px] ml-auto">
                {filteredLeads.length} din {(leads as any[])?.length ?? 0} total
              </span>
            </div>
          )}

          {/* Archive View */}
          {showArchived && (
            <Card className="mb-4 border-dashed border-muted-foreground/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Archive className="w-4 h-4" /> Lead-uri arhivate ({archivedLeads.length})
                  <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowArchived(false)}>
                    <X className="w-3 h-3 mr-1" /> Închide
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {isLoadingArchived ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : archivedLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Niciun lead arhivat.</p>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="flex flex-col gap-2">
                      {archivedLeads.map((lead) => (
                        <div key={lead.id} className="flex flex-col gap-1.5 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <p className="text-sm font-medium leading-snug line-clamp-2">{lead.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="font-mono font-medium text-foreground">{lead.original_price?.toLocaleString("ro-RO")} €</span>
                            <span>Scor: {lead.lead_score}</span>
                            <span>{new Date(lead.created_at).toLocaleDateString("ro-RO")}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleRestore(lead.id)}>
                              <History className="w-3 h-3" /> Restaurează
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelectedLead(lead as any); setShowArchived(false); }}>
                              <Eye className="w-3 h-3" /> Detalii
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* Table Stats (profit) */}
          {viewMode === "table" && profitStats && (
            <div className="mb-6">
              <Card className="bg-card border-border max-w-xs"><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground mb-1">{t.hotLeads}</p><p className="text-xl font-bold font-mono flex items-center gap-1"><Flame className="w-5 h-5 text-red-500" /> {profitStats.hotCount}</p></CardContent></Card>
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

          {/* ── Cuvinte Cheie Scraper ──────────────────────── */}
          <div className="mb-4">
            <button
              onClick={() => setKeywordsOpen(!keywordsOpen)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Tags className="w-4 h-4" />
              Cuvinte cheie căutare ({searchKeywords.filter(k => k.is_active).length} active)
              {keywordsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {keywordsOpen && (
              <Card className="mt-2 bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  {/* Add new keyword */}
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-muted-foreground mb-1 block">Cuvânt cheie nou</label>
                      <Input
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="ex: garsonieră centru timișoara site:olx.ro"
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                      />
                    </div>
                    <div className="w-40">
                      <label className="text-xs text-muted-foreground mb-1 block">Platformă</label>
                      <Input
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value)}
                        placeholder="General"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button size="sm" onClick={handleAddKeyword} className="h-8 gap-1">
                      <Plus className="w-3 h-3" /> Adaugă
                    </Button>
                  </div>

                  {/* Keywords list */}
                  <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                    {searchKeywords.map((kw) => {
                      const platformDefs = getPlatformFilters(kw.platform);
                      const activeIds = getActiveToggleIds(kw);
                      const defaultIds = getDefaultEnabledFilterIds(kw.platform);
                      const isCustomized = !!kw.owner_filters?.toggles
                        && (activeIds.length !== defaultIds.length
                            || activeIds.some((id) => !defaultIds.includes(id))
                            || defaultIds.some((id) => !activeIds.includes(id)));
                      const isExpanded = filtersEditingId === kw.id;
                      const activeCount = platformDefs.filter((f) => activeIds.includes(f.id)).length;

                      return (
                      <div key={kw.id} className={cn(
                        "rounded-lg border text-sm transition-colors",
                        kw.is_active ? "bg-muted/30 border-border" : "bg-muted/10 border-border/50 opacity-60"
                      )}>
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Switch
                            checked={kw.is_active}
                            onCheckedChange={() => handleToggleKeyword(kw.id, kw.is_active)}
                            className="scale-75"
                          />
                          {editingKeywordId === kw.id ? (
                            <div className="flex-1 flex items-center gap-1">
                              <Input
                                value={editingKeywordText}
                                onChange={(e) => setEditingKeywordText(e.target.value)}
                                className="h-6 text-xs font-mono flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEditKeyword(kw.id, editingKeywordText);
                                  if (e.key === "Escape") setEditingKeywordId(null);
                                }}
                              />
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-500" onClick={() => handleEditKeyword(kw.id, editingKeywordText)}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setEditingKeywordId(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              className="flex-1 font-mono text-xs truncate cursor-pointer hover:text-primary transition-colors"
                              onDoubleClick={() => { setEditingKeywordId(kw.id); setEditingKeywordText(kw.keyword); }}
                            >
                              {kw.keyword}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] shrink-0">{kw.platform}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-6 px-1.5 gap-1 text-[10px]",
                              isCustomized
                                ? "text-amber-600 dark:text-amber-400 hover:text-amber-500"
                                : "text-muted-foreground hover:text-primary"
                            )}
                            title="Editează filtrele platformei pentru această căutare"
                            onClick={() => toggleFiltersExpanded(kw.id)}
                          >
                            <Filter className="w-3 h-3" />
                            <span className="hidden sm:inline">Filtre</span>
                            <span className="text-[9px] opacity-80">({activeCount}/{platformDefs.length})</span>
                            {isCustomized && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 gap-1 text-[10px] text-muted-foreground hover:text-primary"
                            title="Preview rezultate cu filtrele aplicate (fără salvare în DB)"
                            onClick={() => navigate(`/admin/scraper-preview?kw=${kw.id}`)}
                          >
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Preview</span>
                          </Button>
                          {editingKeywordId !== kw.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingKeywordId(kw.id); setEditingKeywordText(kw.keyword); }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteKeyword(kw.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Native platform filter toggles (Privat / Persoană fizică / Proprietari) */}
                        {isExpanded && (
                          <div className="border-t border-border/60 px-3 py-2.5 space-y-2 bg-background/40">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <Filter className="w-3 h-3" />
                                Filtre {kw.platform} — selectează ce să includă căutarea
                              </span>
                              {isCustomized && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                  onClick={() => handleResetOwnerFilters(kw.id)}
                                  disabled={filtersSavingId === kw.id}
                                >
                                  Resetează la implicit
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {platformDefs.map((flt) => {
                                const checked = activeIds.includes(flt.id);
                                return (
                                  <label
                                    key={flt.id}
                                    className={cn(
                                      "flex items-start gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors",
                                      checked
                                        ? "border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10"
                                        : "border-border/60 bg-muted/20 hover:bg-muted/40"
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => handleToggleOwnerFilter(kw, flt.id)}
                                      disabled={filtersSavingId === kw.id}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[11px] font-medium leading-tight">{flt.label}</div>
                                      {flt.description && (
                                        <div className="text-[9px] text-muted-foreground font-mono truncate" title={flt.hint}>
                                          {flt.description}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-muted-foreground/80 leading-snug">
                              💡 Filtrele bifate sunt aplicate automat căutării pe {kw.platform}, exact ca în panoul nativ al platformei (ex. OLX: <em>Privat</em>, Publi24: <em>De la persoane fizice</em>, imobiliare.ro: <em>Publicate de proprietari</em>).
                            </p>
                          </div>
                        )}

                        {/* Compact summary when collapsed */}
                        {!isExpanded && (
                          <div className="border-t border-border/40 px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                            <Filter className="w-3 h-3 shrink-0 opacity-60" />
                            {platformDefs.filter((f) => activeIds.includes(f.id)).length === 0 ? (
                              <span className="italic">Niciun filtru activ — căutare neutră</span>
                            ) : (
                              platformDefs
                                .filter((f) => activeIds.includes(f.id))
                                .map((f) => (
                                  <span
                                    key={f.id}
                                    className="px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 text-[9px]"
                                    title={f.hint}
                                  >
                                    ✓ {f.label}
                                  </span>
                                ))
                            )}
                            {isCustomized && (
                              <span className="ml-auto text-[9px] text-amber-600 dark:text-amber-400">✏️ personalizat</span>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {searchKeywords.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Niciun cuvânt cheie configurat.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    💡 Apasă <Filter className="w-2.5 h-2.5 inline -mt-0.5" /> <strong>Filtre</strong> lângă fiecare cuvânt cheie pentru a bifa/debifa filtrele native ale platformei (ex. OLX „Privat", Publi24 „De la persoane fizice", imobiliare.ro „Publicate de proprietari"). Modificările se salvează automat.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : viewMode === "analytics" ? (
            <ScraperAnalyticsDashboard leads={(leads || []) as any} />
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-3xl">
                {filterType === "proprietar" ? "🏠" : "🔍"}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {filterType === "proprietar"
                  ? "Momentan nu sunt lead-uri noi de la proprietari"
                  : "Niciun lead găsit"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {filterType === "proprietar"
                  ? "Revenim imediat ce apar oferte noi de la persoane fizice. Între timp, poți rula un scan nou sau ajusta filtrele."
                  : t.noData}
              </p>
            </div>
          ) : viewMode === "pipeline" ? (
            <>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                💡 <span>Trage-și-plasează card-urile între coloane pentru a schimba statusul instant.</span>
              </p>
              {renderPipelineView()}
            </>
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
                      <TableHead className="font-semibold text-center cursor-pointer select-none" onClick={() => toggleSort("date")}>
                        <span className="inline-flex items-center gap-1">Data <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
                      </TableHead>
                      <TableHead className="font-semibold text-center cursor-pointer select-none" onClick={() => toggleSort("score")}>
                        <span className="inline-flex items-center gap-1">{t.score} <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
                      </TableHead>
                      <TableHead className="font-semibold text-right">{t.price}</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="text-center w-40">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className={cn("cursor-pointer transition-colors hover:bg-muted/30", compareIds.includes(lead.id) && "bg-primary/5 ring-1 ring-inset ring-primary/20", isPremiumLead(lead.title) && "bg-amber-500/5 dark:bg-amber-500/[0.03]", lead.lead_score >= 95 && "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]", lead.lead_score >= 90 ? "border-l-2 border-l-red-500" : lead.lead_score >= 75 ? "border-l-2 border-l-amber-500" : isPremiumLead(lead.title) ? "border-l-2 border-l-amber-400" : "border-l-2 border-l-transparent")} onClick={() => { setSelectedLead(lead); setGeneratedMessage(""); }}>
                        <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                          <Checkbox checked={compareIds.includes(lead.id)} onCheckedChange={() => toggleCompare(lead.id)} className="border-primary/40" />
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sourceColors[normalizePlatformLabel(lead.source)] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                                {normalizePlatformLabel(lead.source)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {getRelativeDate(lead.created_at)}
                              </span>
                            </div>
                            <span className="truncate flex items-center gap-1">{isPremiumLead(lead.title) && <span title="Ansamblu Premium">✨</span>}{cleanTitleStatic(lead.title)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone || "Fără telefon"}
                              {lead.is_phone_verified && (
                                <span
                                  title={`Mobil pre-validat Twilio${lead.phone_e164 ? ` (${lead.phone_e164})` : ""}`}
                                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-500"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </span>
                              )}
                              {" · "}{getLeadContactName(lead)}
                            </span>

                            <div className="flex gap-1 flex-wrap items-center">
                              <Select
                                value={(lead as any)._prospect_type || "proprietar"}
                                onValueChange={(val) => { handleCategoryChange(lead as any, val); }}
                              >
                                <SelectTrigger className="h-5 w-auto text-[10px] border-0 bg-muted/50 rounded px-1.5 py-0 focus:ring-0 gap-0.5 [&>svg]:h-2.5 [&>svg]:w-2.5" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue>
                                    {PROSPECT_TYPES.find((p) => p.value === (lead as any)._prospect_type)?.icon || "🏠"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {PROSPECT_TYPES.map((pt) => (
                                    <SelectItem key={pt.value} value={pt.value} className="text-xs">
                                      {pt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {getPropertyBadge(lead.title)}
                              {lead.tags?.slice(0, 2).map((tag) => {
                                const lbl = CONVERSATION_LABELS.find((l) => l.value === tag);
                                return lbl ? <span key={tag} className={`text-[9px] px-1 py-0 rounded-full border ${lbl.color}`}>{lbl.label}</span> : null;
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getScoreBadge(lead.lead_score)}
                            {getYield(lead) && <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{getYield(lead)}%/an</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatPrice(lead.original_price, getPriceSuffix(lead))}</TableCell>
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
                          <div className="flex items-center justify-center gap-2">
                            {importedPropertyByUrl.has(lead.url) ? (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" title="Anunț deja importat" disabled>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Importă anunț ca draft în Proprietăți"
                                    disabled={importingLeadId === lead.id}
                                  >
                                    {importingLeadId === lead.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead)}>Draft inteligent</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "owner-contact", verification: "full" })}>Contact prioritar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "media-needed", verification: "full" })}>Necesită poze</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "vanzare" })}>Ca vânzare</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "inchiriere" })}>Ca închiriere</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "investitie", verification: "full", workflow: "investment" })}>Ca investiție</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "cazare", verification: "full", workflow: "hospitality" })}>Regim hotelier</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { verification: "full", workflow: "quick-review" })}>Verificare completă</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "seo-ready", verification: "full" })}>SEO-ready</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "legal-review", verification: "full" })}>Verificare juridică</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "investitie", workflow: "renovation", verification: "full" })}>Renovare / flip</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => importLeadAsListing(lead, { activate: true })}>Importă și activează</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = lead.whatsapp_message || 
                                  `Bună ziua! Vă contactez referitor la anunțul '${cleanTitleStatic(lead.title)}'. Mai este disponibil?`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                              }}
                              title="Trimite WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <OutreachQuickAction lead={lead as any} />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setGeneratedMessage(""); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                              onClick={(e) => { e.stopPropagation(); handleMarkAsAgency(lead); }}
                              title="Marchează ca Agenție (blocklist + arhivă)"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              onClick={(e) => { e.stopPropagation(); handleBlacklist(lead); }}
                              title={lead.phone ? `Blacklist ${lead.phone}` : "Fără telefon"}
                              disabled={!lead.phone}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); handleArchive(lead); }}
                              title="Arhivează"
                            >
                              <Archive className="h-3.5 w-3.5" />
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
                    isPremiumLead(lead.title) && "bg-amber-500/5 dark:bg-amber-500/[0.03]",
                    lead.lead_score >= 95 && "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]",
                    lead.lead_score >= 90 ? "border-l-4 border-l-red-500"
                    : lead.lead_score >= 75 ? "border-l-4 border-l-amber-500"
                    : isPremiumLead(lead.title) ? "border-l-4 border-l-amber-400"
                    : "border-l-4 border-l-border"
                  )}
                  onClick={() => { setSelectedLead(lead); setGeneratedMessage(""); }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sourceColors[normalizePlatformLabel(lead.source)] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                        {normalizePlatformLabel(lead.source)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {getRelativeDate(lead.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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
                  <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">
                    {isPremiumLead(lead.title) && <span className="mr-1">✨</span>}{cleanTitleStatic(lead.title)}
                  </p>
                  <div className="mb-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] leading-tight">
                    <div className="flex items-center gap-1 text-foreground font-medium truncate">
                      <Phone className="w-3 h-3 shrink-0" />
                      {lead.phone ? <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="font-mono truncate">{lead.phone}</a> : <span className="text-muted-foreground">Fără telefon</span>}
                      {lead.is_phone_verified && (
                        <span
                          title={`Mobil pre-validat Twilio${lead.phone_e164 ? ` (${lead.phone_e164})` : ""}`}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[9px] font-semibold uppercase tracking-wide"
                        >
                          <CheckCircle className="w-2.5 h-2.5" /> ok
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-muted-foreground truncate">Contact: {getLeadContactName(lead)}</div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span className="font-medium text-foreground">{formatPrice(lead.original_price, getPriceSuffix(lead))}</span>
                    <span className="text-emerald-500">+{formatPrice(lead.monthly_extra)}/lună</span>
                    <span className="text-amber-400">+{formatPrice(lead.extra_profit_3y)} 3Y</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {importedPropertyByUrl.has(lead.url) ? (
                      <Button size="sm" variant="secondary" className="col-span-2 h-8 text-xs" disabled>
                        <Check className="h-3 w-3 mr-1" /> Importat
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="col-span-2 h-8 text-xs"
                            onClick={(e) => e.stopPropagation()}
                            disabled={importingLeadId === lead.id}
                          >
                            {importingLeadId === lead.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Database className="h-3 w-3 mr-1" />}
                            Importă
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead)}>Draft inteligent</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "owner-contact", verification: "full" })}>Contact prioritar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "media-needed", verification: "full" })}>Necesită poze</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "vanzare" })}>Ca vânzare</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "inchiriere" })}>Ca închiriere</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "investitie", verification: "full", workflow: "investment" })}>Ca investiție</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "cazare", verification: "full", workflow: "hospitality" })}>Regim hotelier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { verification: "full", workflow: "quick-review" })}>Verificare completă</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "seo-ready", verification: "full" })}>SEO-ready</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { workflow: "legal-review", verification: "full" })}>Verificare juridică</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { listingType: "investitie", workflow: "renovation", verification: "full" })}>Renovare / flip</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => importLeadAsListing(lead, { activate: true })}>Importă și activează</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = lead.whatsapp_message || `Bună ziua! Vă contactez referitor la anunțul '${cleanTitleStatic(lead.title)}'. Mai este disponibil?`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                    <div className="h-8 flex items-center justify-center">
                      <OutreachQuickAction lead={lead as any} />
                    </div>
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                      onClick={(e) => { e.stopPropagation(); handleMarkAsAgency(lead); }}
                      title="Marchează Agenție"
                    >
                      <Building2 className="h-3 w-3" />
                    </Button>
                    {lead.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); handleBlacklist(lead); }}
                        title={`Blacklist ${lead.phone}`}
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleArchive(lead); }}
                      title="Arhivează"
                    >
                      <Archive className="h-3 w-3" />
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

      {/* Blacklist Modal */}
      <BlacklistModal open={blacklistOpen} onOpenChange={setBlacklistOpen} />

      <Footer />
    </>
  );
};

export default ScraperLeads;
