import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSuperAdminRole } from "@/hooks/useSuperAdminRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Phone, Sparkles, ArrowLeft, Loader2, ExternalLink, RefreshCw, Clock,
  TrendingUp, MapPin, Euro, Building2, Home, Hotel, Download, AlertTriangle, PlayCircle, Rocket, StopCircle, History, Bot, Zap, Trash2, ShieldAlert, MoreVertical,
  RotateCcw, CheckSquare, Send,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { AgencyExplainerDialog, type AgencyExplainerInput } from "@/components/admin/AgencyExplainerDialog";
import { ProspectKeywordsEditor } from "@/components/admin/ProspectKeywordsEditor";
import { ProspectPersonaSnapshot } from "@/components/admin/ProspectPersonaSnapshot";
import SEOHead from "@/components/SEOHead";
import { DismissExpiredButton } from "@/components/admin/DismissExpiredButton";
import Header from "@/components/Header";
import { computeProspectGeoMatch } from "@/lib/timisoaraGeo";
import { useAgencyDetectionSettings } from "@/hooks/useAgencyDetectionSettings";
import type { User } from "@supabase/supabase-js";
import { markAsAgency } from "@/lib/markAsAgency";

const lifecycleColors: Record<string, string> = {
  new: "border-primary/40 text-primary",
  scoring: "border-purple-400 text-purple-700 dark:text-purple-300",
  calling: "border-amber-400 text-amber-700 dark:text-amber-300",
  interested: "border-green-400 text-green-700 dark:text-green-300",
  callback: "border-orange-400 text-orange-700 dark:text-orange-300",
  rejected: "border-destructive/40 text-destructive",
  failed: "border-destructive/60 text-destructive bg-destructive/5",
  posted: "border-muted-foreground/40 text-muted-foreground",
  pending_credentials: "border-amber-500/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30",
};

const categoryIcons: Record<string, React.ReactNode> = {
  vanzare: <Building2 className="h-3.5 w-3.5" />,
  inchiriere: <Home className="h-3.5 w-3.5" />,
  hotelier: <Hotel className="h-3.5 w-3.5" />,
};

const categoryLabels: Record<string, string> = {
  vanzare: "Vânzare",
  inchiriere: "Chirie",
  hotelier: "Regim Hotelier",
};

// Visual palette for source platforms — used as a colored badge in the row.
const sourceStyles: Record<string, { label: string; emoji: string; cls: string }> = {
  olx: { label: "OLX", emoji: "🟣", cls: "border-purple-400 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30" },
  storia: { label: "Storia", emoji: "🟢", cls: "border-green-400 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30" },
  "imobiliare.ro": { label: "Imobiliare.ro", emoji: "🔵", cls: "border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30" },
  publi24: { label: "Publi24", emoji: "🟠", cls: "border-orange-400 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30" },
  facebook: { label: "Facebook", emoji: "🔷", cls: "border-sky-400 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30" },
  anuntul: { label: "Anunțul.ro", emoji: "⚪", cls: "border-slate-400 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/30" },
};
function getSourceStyle(platform?: string | null) {
  if (!platform) return null;
  const key = platform.toLowerCase().trim();
  if (sourceStyles[key]) return sourceStyles[key];
  // Fuzzy match
  for (const k of Object.keys(sourceStyles)) {
    if (key.includes(k) || k.includes(key)) return sourceStyles[k];
  }
  return { label: platform, emoji: "🌐", cls: "border-muted-foreground/40 text-muted-foreground bg-muted/30" };
}

interface Prospect {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  zone: string | null;
  rooms: number | null;
  size: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  source_url: string;
  source_platform: string;
  is_active: boolean | null;
  lead_score: number | null;
  score: number | null;
  category: string | null;
  prospect_type: string | null;
  lifecycle_status: string;
  call_summary: string | null;
  admin_notes: string | null;
  ai_score_breakdown: any;
  ai_scored_at: string | null;
  voice_call_session_id: string | null;
  scraped_at: string | null;
  followup_sent_at: string | null;
  owner_sentiment: string | null;
  urgency_level: number | null;
  auto_call_triggered_at: string | null;
  search_keywords: string[] | null;
  auto_blacklisted_at: string | null;
  auto_blacklist_reason: string | null;
  persona_snapshot: any;
  persona_generated_at: string | null;
}

const PHONE_PATTERN = /(?:(?:\+|00)\s*40|0)\s*[237](?:[\s().\/-]*\d){8}\b/g;
const CONTEXT_PHONE_PATTERN = /(?:telefon|tel\.?|mobil|mobile|whatsapp|contact|num[ăa]r|phone)\D{0,24}((?:(?:\+|00)\s*40|0)?\s*[237](?:[\s().\/-]*\d){8})/gi;
const VISIBLE_PHONE_PATTERN = /(?:\+?40|0040|0)\s*[237]\d{2}(?:[\s().-]*(?:\d|x|X|\*|•|\.)){2,}/g;

function formatRelativeRo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 60) return "acum";
  const min = Math.round(sec / 60);
  if (min < 60) return `acum ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `acum ${hr}h`;
  const d = Math.round(hr / 24);
  if (d < 7) return `acum ${d}z`;
  if (d < 30) return `acum ${Math.round(d / 7)}săpt`;
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

type ProspectPhoneSource = "phone_normalized" | "contact_phone" | "admin_notes" | "description" | "title";

interface ProspectPhoneInfo {
  phone: string;
  source: ProspectPhoneSource;
  persisted: boolean;
}

interface VisibleProspectPhoneInfo extends ProspectPhoneInfo {
  displayPhone: string;
  masked: boolean;
}

export function normalizeRoPhone(raw?: string | null): string | null {
  if (!raw) return null;
  if (/[xX*•]{2,}|\.{3,}/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0040")) digits = digits.slice(2);
  if (digits.startsWith("40") && digits.length === 11) return /^40[237]\d{8}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("0") && digits.length === 10) return /^0[237]\d{8}$/.test(digits) ? `+4${digits}` : null;
  if (/^[237]\d{8}$/.test(digits)) return `+40${digits}`;
  return null;
}

function decodePhoneText(text: string): string {
  return text
    .replace(/%2B/gi, "+")
    .replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u00([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&nbsp;|&thinsp;|&ensp;|&emsp;/gi, " ");
}

export function extractPhoneFromText(text?: string | null): string | null {
  if (!text) return null;
  const decoded = decodePhoneText(text);
  const candidates = new Set<string>();
  for (const match of decoded.match(PHONE_PATTERN) ?? []) candidates.add(match);
  for (const match of decoded.matchAll(CONTEXT_PHONE_PATTERN)) candidates.add(match[1]);
  return [...candidates]
    .map(normalizeRoPhone)
    .filter(Boolean)
    .sort((a, b) => Number(!a!.startsWith("+407")) - Number(!b!.startsWith("+407")))[0] ?? null;
}

export function getProspectPhoneInfo(
  p: Pick<Prospect, "phone_normalized" | "contact_phone" | "description" | "admin_notes" | "title">
): ProspectPhoneInfo | null {
  const sources: Array<[ProspectPhoneSource, string | null | undefined, boolean]> = [
    ["phone_normalized", p.phone_normalized, true],
    ["contact_phone", p.contact_phone, true],
    ["admin_notes", p.admin_notes, false],
    ["description", p.description, false],
    ["title", p.title, false],
  ];

  for (const [source, value, persisted] of sources) {
    const phone = persisted ? normalizeRoPhone(value) || extractPhoneFromText(value) : extractPhoneFromText(value);
    if (phone) return { phone, source, persisted };
  }

  return null;
}

export function getProspectPhone(p: Pick<Prospect, "phone_normalized" | "contact_phone" | "description" | "admin_notes" | "title">): string | null {
  return getProspectPhoneInfo(p)?.phone ?? null;
}

function cleanVisiblePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, " ").trim();
  const digits = compact.replace(/\D/g, "");
  if (digits.length < 4) return null;
  if (!/[*.xX•]/.test(compact) && digits.length < 9) return null;
  return compact.slice(0, 22);
}

function extractVisiblePhoneFromText(text?: string | null): string | null {
  return text?.match(VISIBLE_PHONE_PATTERN)?.map(cleanVisiblePhone).find(Boolean) ?? null;
}

function extractContactNameFromText(p: Pick<Prospect, "contact_name" | "admin_notes" | "description">): string | null {
  if (p.contact_name?.trim()) return p.contact_name.trim();
  const blob = `${p.admin_notes || ""}\n${p.description || ""}`;
  const match = blob.match(/(?:publicat de|postat de|contact|proprietar|persoan[ăa])[:\s-]+([^\n|,]{3,48})/i);
  return match?.[1]?.trim() || null;
}

function getVisibleProspectPhoneInfo(
  p: Pick<Prospect, "phone_normalized" | "contact_phone" | "description" | "admin_notes" | "title">
): VisibleProspectPhoneInfo | null {
  const full = getProspectPhoneInfo(p);
  if (full) return { ...full, displayPhone: full.phone, masked: false };

  const sources: Array<[ProspectPhoneSource, string | null | undefined]> = [
    ["phone_normalized", p.phone_normalized],
    ["contact_phone", p.contact_phone],
    ["admin_notes", p.admin_notes],
    ["description", p.description],
    ["title", p.title],
  ];
  for (const [source, value] of sources) {
    const displayPhone = extractVisiblePhoneFromText(value);
    if (displayPhone) return { phone: displayPhone, displayPhone, source, persisted: false, masked: true };
  }
  return null;
}

const sentimentEmoji: Record<string, string> = {
  presat: "🔥",
  deschis: "👍",
  agentie: "🏢",
  neutru: "•",
};

// ── Agency detection (heuristic) ─────────────────────────────────────────────
// Goal: keep the prospect pipeline focused on OWNERS, hide agencies by default.
// Tuned against real data observed in `prospect_listings` (Apr 2026):
// imobiliare.ro/agentie/*, storia.ro/companii/agentii/*, blitz.ro, remax.ro,
// designimobiliare.ro, renaissanceestate.ro, romimo.ro, voxpropertygroup.ro,
// luxuryimob.ro, eficientestate.ro, premier-estate.eu, iconic-properties.ro,
// iulius-imobiliare.ro, sodolescu.ro, foxfort.ro, brig.ro, paltim.ro,
// minervaimobiliare.ro, lux-life-imobily, sedako, primum.ro, oxia.ro,
// cubimobiliare.ro, cauta-imobiliare.ro, hitchmosher.ro, necesit.ro, etc.

// Keywords found in title / description / contact_name → agency.
export const AGENCY_KEYWORDS = [
  // RO labels
  "agentie", "agenție", "agenti", "agenți", "agentia", "agenția",
  "agentie imobiliara", "agenție imobiliară",
  "real estate", "broker", "brokeraj", "brokerage",
  "dezvoltator", "developer", "ansamblu rezidential", "ansamblu rezidențial",
  "design imobiliare", "imobily", "imobil grup", "grup imobiliar",
  // Legal forms
  " srl", " s.r.l", " sa ", " s.a.", "p.f.a", "pfa ",
  // Known TM/RO agency brands (extend over time)
  "eximbroker", "blitz", "remax", "re/max", "century 21", "century21",
  "imoneon", "imopedia", "edil", "imobitim", "esoplus",
  "renaissance estate", "vox property", "lux life", "sedako",
  "iconic properties", "premier estate", "minerva imobiliare",
  "luxury imob", "eficient estate", "primum", "foxfort",
  "iulius imobiliare", "sodolescu", "apostu estate", "cub imobiliare",
  "m&g design", "m & g design",
  // Generic clues
  " imo ", " imo,", " imo.", "estate", "consulting", "properties",
];

// "Soft" agency signals — high-suspicion phrases used in agency listings even
// when the brand isn't named. Trigger the 🤖 badge but NOT a hard block.
export const AGENCY_SOFT_KEYWORDS = [
  "comision", "comision 0", "comision agentie", "comision agenție",
  "intermedi", "intermediere", "intermediar",
  "vizionari prin agentie", "vizionări prin agenție", "vizionari prin agenție",
  "reprezentare exclusiva", "reprezentare exclusivă", "exclusivitate",
  "contract de reprezentare", "mandat exclusiv", "mandat de vanzare", "mandat de vânzare",
  "portofoliul nostru", "echipa noastra", "echipa noastră",
  "consultantul tau", "consultantul tău", "consultant imobiliar",
  "oferta noastra", "oferta noastră", "agent imobiliar",
  "comisionul agentiei", "comisionul agenției",
  "tva inclus", "tva neinclus",
];

// Domains that are entirely agencies / aggregators / portals → mark as agency.
export const AGENCY_DOMAINS = new Set([
  "blitz.ro", "www.blitz.ro",
  "remax.ro", "www.remax.ro",
  "designimobiliare.ro", "www.designimobiliare.ro",
  "renaissanceestate.ro", "www.renaissanceestate.ro",
  "romimo.ro", "www.romimo.ro",
  "voxpropertygroup.ro", "www.voxpropertygroup.ro",
  "voxverticalvillage.ro",
  "luxuryimob.ro", "www.luxuryimob.ro",
  "eficientestate.ro", "www.eficientestate.ro",
  "premier-estate.eu", "www.premier-estate.eu",
  "iconic-properties.ro", "www.iconic-properties.ro",
  "iulius-imobiliare.ro", "www.iulius-imobiliare.ro",
  "sodolescu.ro", "www.sodolescu.ro",
  "foxfort.ro", "www.foxfort.ro",
  "brig.ro", "www.brig.ro",
  "paltim.ro", "www.paltim.ro",
  "minervaimobiliare.ro", "www.minervaimobiliare.ro",
  "apostuestate.ro", "www.apostuestate.ro",
  "primum.ro", "www.primum.ro",
  "oxia.ro", "www.oxia.ro",
  "cubimobiliare.ro", "www.cubimobiliare.ro",
  "cauta-imobiliare.ro", "www.cauta-imobiliare.ro",
  "hitchmosher.ro", "www.hitchmosher.ro",
  "necesit.ro", "www.necesit.ro",
  "imoradar24.ro", "www.imoradar24.ro",
  "compariimobiliare.ro", "www.compariimobiliare.ro",
  "mitula.ro", "apartamente.mitula.ro",
  "trovit.ro", "case.trovit.ro",
  "homezz.ro", "www.homezz.ro",
  "lajumate.ro", "www.lajumate.ro",
  "homerun.ro", "www.homerun.ro",
  "korter.ro", "www.korter.ro",
  "properstar.com", "www.properstar.com", "www.properstar.ro", "www.properstar.ie",
  "rentbyowner.com", "www.rentbyowner.com",
  "vrbo.com", "www.vrbo.com",
  "booking.com", "www.booking.com",
  "agoda.com", "www.agoda.com",
  "airbnb.com", "www.airbnb.com", "www.airbnb.com.ro",
  "expedia.com", "www.expedia.com",
  // Big developer projects (not single-owner sales)
  "isho.ro",
  "xcitytowers.ro",
  "nord-one.ro",
  "ateneo.ro",
  "cityofmara.ro", "www.cityofmara.ro",
]);

// URL substrings that always mean "agency profile / developer page / aggregator".
export const AGENCY_URL_PATTERNS = [
  "/agentie/", "/agentii/", "/companii/agentii/", "/companii/dezvoltatori/",
  "/dezvoltator/", "/developer/", "/agency/",
];

// URL substrings that mean "search / listing / category page" (not a real ad).
// These should be flagged as noise; we treat them as agencies so they're hidden
// from the owner pipeline by default (they cannot be called anyway).
const NOISE_URL_PATTERNS = [
  "/imobiliare/q-", "/imobiliare/timisoara/q-", "/imobiliare/apartamente",
  "/ro/rezultate/", "/ro/companii/",
  "/vanzare-imobiliare/", "/vanzare-apartamente/", "/vanzare-penthouses/",
  "/inchiriere-imobiliare/", "/inchirieri-apartamente",
  "/anunturi/imobiliare/de-vanzare/", "/anunturi/imobiliare/de-inchiriat/",
  "/oferte/q-", "/imobiliare/?", "/imobiliare/timisoara/?", "/imobiliare/timisoara/",
];

const DETAIL_URL_PATTERNS = [
  "/d/oferta/", "/anunt/", "/oferta/", "/proprietate/", "/property/",
];

const GENERIC_SEARCH_TITLE_PATTERNS = [
  "anunturi gratuite", "anunțuri gratuite", "olx.ro", "rezultate cautare", "rezultate căutare",
  "apartamente de vanzare", "apartamente de vânzare", "apartamente de inchiriat", "apartamente de închiriat",
  "imobiliare timisoara", "imobiliare timișoara", "cautare", "căutare",
];

// Strong "this IS an owner" signals in URL or title — override agency hits.
export const OWNER_SIGNALS = [
  "proprietar", "direct-de-la-proprietar", "direct proprietar",
  "de la proprietar", "fara comision", "fără comision", "fara intermediar",
  "privat", "privati", "privați", "persoana fizica", "persoană fizică", "persoane fizice",
];

function hasOwnerFilterSignal(p: {
  title?: string | null;
  description?: string | null;
  contact_name?: string | null;
  prospect_type?: string | null;
  source_url?: string | null;
  search_keywords?: string[] | null;
}): boolean {
  if (p.prospect_type === "proprietar") return true;
  const blob = `${p.source_url || ""} ${p.title || ""} ${p.description || ""} ${p.contact_name || ""} ${(p.search_keywords || []).join(" ")}`.toLowerCase();
  return OWNER_SIGNALS.some((signal) => blob.includes(signal));
}

function isImportedFromPlatformSearch(p: { search_keywords?: string[] | null; source_url?: string | null }): boolean {
  const url = (p.source_url || "").toLowerCase();
  return (p.search_keywords?.length ?? 0) > 0 || NOISE_URL_PATTERNS.some((pat) => url.includes(pat));
}

function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    const m = url.match(/^https?:\/\/([^/]+)/i);
    return m ? m[1].toLowerCase() : null;
  }
}

function isGenericSearchProspect(p: {
  title?: string | null;
  description?: string | null;
  contact_name?: string | null;
  source_url?: string | null;
}): boolean {
  const url = (p.source_url || "").toLowerCase();
  const title = (p.title || "").toLowerCase();
  const contact = (p.contact_name || "").trim();

  if (NOISE_URL_PATTERNS.some((pat) => url.includes(pat))) return true;

  const hasDetailUrl = DETAIL_URL_PATTERNS.some((pat) => url.includes(pat));
  if (hasDetailUrl) return false;

  const genericTitle = GENERIC_SEARCH_TITLE_PATTERNS.some((pat) => title.includes(pat));
  const noRealContact = !contact || contact === "—" || contact === "-";
  return genericTitle && noRealContact;
}

export function detectIsAgency(p: {
  title?: string | null;
  description?: string | null;
  contact_name?: string | null;
  prospect_type?: string | null;
  source_url?: string | null;
}): boolean {
  // 0. Search/category pages are not callable ads and must never be treated as owners.
  if (isGenericSearchProspect(p)) return true;

  // 1. Manual override wins only for real listing detail pages.
  if (p.prospect_type === "agentie" || p.prospect_type === "dezvoltator") return true;
  if (p.prospect_type === "proprietar") return false;

  const url = (p.source_url || "").toLowerCase();
  const blob = `${p.title || ""}  ${p.description || ""}  ${p.contact_name || ""}`.toLowerCase();

  // 2. Strong owner signals in URL/title → trust the owner claim, even if domain is mixed.
  if (OWNER_SIGNALS.some((s) => url.includes(s) || blob.includes(s))) return false;

  // 3. URL-based detection (highest confidence).
  if (AGENCY_URL_PATTERNS.some((pat) => url.includes(pat))) return true;
  if (NOISE_URL_PATTERNS.some((pat) => url.includes(pat))) return true;

  // 4. Domain-based detection.
  const domain = extractDomain(url);
  if (domain && AGENCY_DOMAINS.has(domain)) return true;

  // 5. Keyword detection in title/desc/contact.
  if (!blob.trim()) return false;
  if (blob.includes("🏢")) return true;
  return AGENCY_KEYWORDS.some((kw) => blob.includes(kw));
}

// Soft agency suspicion (0..3). 0=clean, 3=very likely agency but not blocked yet.
// Inputs: phone recurrence count across current dataset + soft keyword hits.
export function computeAgencySuspicion(p: {
  title?: string | null;
  description?: string | null;
  contact_name?: string | null;
  source_url?: string | null;
}, phoneCount: number = 0): { level: 0 | 1 | 2 | 3; reasons: string[] } {
  const reasons: string[] = [];
  let level: 0 | 1 | 2 | 3 = 0;

  if (phoneCount >= 4) { reasons.push(`Telefon asociat cu ${phoneCount} anunțuri (≥4)`); level = 3; }
  else if (phoneCount === 3) { reasons.push(`Telefon asociat cu 3 anunțuri`); level = 2; }
  else if (phoneCount === 2) { reasons.push(`Telefon asociat cu 2 anunțuri`); level = 1; }

  const blob = `${p.title || ""}  ${p.description || ""}  ${p.contact_name || ""}`.toLowerCase();
  const softHits = AGENCY_SOFT_KEYWORDS.filter((kw) => blob.includes(kw));
  if (softHits.length > 0) {
    reasons.push(`Cuvinte suspecte: ${softHits.slice(0, 3).join(", ")}`);
    level = Math.min(3, (level as number) + (softHits.length >= 2 ? 2 : 1)) as 0 | 1 | 2 | 3;
  }

  return { level, reasons };
}

const ProspectListings = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { isAdmin, isLoading: adminLoading, error: adminError, recheck } = useAdminRole(user);
  const { isSuperAdmin } = useSuperAdminRole(user);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showRejected, setShowRejected] = useState<boolean>(false);
  const [showStale, setShowStale] = useState<boolean>(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  // ── Bulk selection + keyboard navigation ────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Hard cap on manual "force-fetch phone" runs per prospect (matches edge function).
  const MAX_PHONE_FETCH_ATTEMPTS = 5;
  const countPhoneFetchAttempts = (notes: string | null | undefined): number =>
    ((notes ?? "").match(/\[fetch-phone /g) ?? []).length;
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [confirmBulkDismissOpen, setConfirmBulkDismissOpen] = useState(false);
  const [confirmKbdDismissId, setConfirmKbdDismissId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState<"dismiss" | "rescore" | "recover_phones" | "push_to_review" | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);

  const handlePushToFastReview = async (prospectId: string) => {
    setPushingId(prospectId);
    const tId = sonnerToast.loading("Trimit la Fast Review…");
    try {
      const { data, error } = await supabase.functions.invoke("prospect-to-fast-review", {
        body: { prospect_id: prospectId },
      });
      if (error) throw error;
      const result = (data?.results?.[0]) as { property_id?: string; reason?: string; created?: boolean } | undefined;
      if (!result?.property_id) throw new Error(result?.reason || "Eroare necunoscută");
      sonnerToast.dismiss(tId);
      if (result.created) {
        sonnerToast.success("✅ Draft creat în Fast Review.");
      } else {
        sonnerToast.info("ℹ️ Anunțul era deja trimis — deschid draftul existent.");
      }
      window.open(`/admin/properties/fast-review?id=${result.property_id}`, "_blank", "noopener,noreferrer");
      refetch();
    } catch (e) {
      sonnerToast.dismiss(tId);
      sonnerToast.error(`Eroare: ${(e as Error).message}`);
    } finally {
      setPushingId(null);
    }
  };

  const runBulkPushToFastReview = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkPending("push_to_review");
    const tId = sonnerToast.loading(`Trimit ${ids.length} anunțuri la Fast Review…`);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-to-fast-review", {
        body: { prospect_ids: ids },
      });
      if (error) throw error;
      sonnerToast.dismiss(tId);
      sonnerToast.success(
        `🚀 Fast Review: ${data?.created ?? 0} create · ${data?.existed ?? 0} existau deja${data?.failed ? ` · ${data.failed} erori` : ""}`,
      );
      refetch();
    } catch (e) {
      sonnerToast.dismiss(tId);
      sonnerToast.error(`Eroare bulk: ${(e as Error).message}`);
    } finally {
      setBulkPending(null);
    }
  };
  const [confirmRecoverAllOpen, setConfirmRecoverAllOpen] = useState(false);
  const [phonelessExpanded, setPhonelessExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<string>("0");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const SOURCE_FILTER_LS_KEY = "prospects:sourceFilter";
  const [sourceFilter, setSourceFilter] = useState<string>(() => {
    try { return localStorage.getItem(SOURCE_FILTER_LS_KEY) || "all"; } catch { return "all"; }
  });
  useEffect(() => {
    try { localStorage.setItem(SOURCE_FILTER_LS_KEY, sourceFilter); } catch { /* ignore */ }
  }, [sourceFilter]);

  // ── Saved (favorite) filters ────────────────────────────────────────────────
  type SavedFilter = {
    id: string;
    name: string;
    statusFilter: string;
    categoryFilter: string;
    minScore: string;
    zoneFilter: string;
    sourceFilter: string;
    prospectTypeFilter: "proprietar" | "agentie" | "all";
    search: string;
  };
  const SAVED_FILTERS_LS_KEY = "prospects:savedFilters";
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_FILTERS_LS_KEY);
      return raw ? (JSON.parse(raw) as SavedFilter[]) : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(SAVED_FILTERS_LS_KEY, JSON.stringify(savedFilters)); } catch { /* ignore */ }
  }, [savedFilters]);
  // Default = only owners (hide agencies). Persisted in localStorage.
  // Hard rule: agencies are NEVER shown unless the admin explicitly switches to "all" or "agentie"
  // in the toolbar. We sanitize the stored value defensively.
  type ProspectTypeFilter = "proprietar" | "agentie" | "all";
  const PROSPECT_TYPE_LS_KEY = "prospects:typeFilter";
  const readPersistedTypeFilter = (): ProspectTypeFilter => {
    try {
      const v = localStorage.getItem(PROSPECT_TYPE_LS_KEY);
      return v === "all" || v === "agentie" || v === "proprietar" ? v : "proprietar";
    } catch {
      return "proprietar";
    }
  };
  const [prospectTypeFilter, setProspectTypeFilterRaw] = useState<ProspectTypeFilter>(readPersistedTypeFilter);
  const setProspectTypeFilter = (v: ProspectTypeFilter) => {
    const safe: ProspectTypeFilter = v === "all" || v === "agentie" || v === "proprietar" ? v : "proprietar";
    setProspectTypeFilterRaw(safe);
  };
  useEffect(() => {
    try { localStorage.setItem(PROSPECT_TYPE_LS_KEY, prospectTypeFilter); } catch { /* ignore */ }
  }, [prospectTypeFilter]);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [recoveringPhoneId, setRecoveringPhoneId] = useState<string | null>(null);

  const handleRecoverPhone = async (p: { id: string; source_url: string | null; admin_notes?: string | null }) => {
    if (!p.source_url) {
      toast({ title: "Fără URL sursă", description: "Nu am de unde recupera telefonul.", variant: "destructive" });
      return;
    }
    const prior = countPhoneFetchAttempts(p.admin_notes);
    if (prior >= MAX_PHONE_FETCH_ATTEMPTS) {
      sonnerToast.warning(`Limită atinsă (${prior}/${MAX_PHONE_FETCH_ATTEMPTS})`, {
        description: "Acest anunț a epuizat încercările de forțare. Verifică manual sursa.",
      });
      return;
    }
    setRecoveringPhoneId(p.id);
    const loadingToast = sonnerToast.loading(`Forțez extragere telefon (${prior + 1}/${MAX_PHONE_FETCH_ATTEMPTS})…`);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-listings-fetch-phone", {
        body: { prospect_id: p.id, max_attempts: 3 },
      });
      if (error) throw error;
      sonnerToast.dismiss(loadingToast);
      if (data?.limit_reached) {
        sonnerToast.warning(`Limită atinsă (${data.prior_runs}/${data.limit})`);
      } else if (data?.found) {
        sonnerToast.success(`📞 Telefon recuperat: ${data.phone}`, {
          description: `${data.attempts} încercări · proxy rezidențial`,
        });
        refetch();
      } else {
        sonnerToast.warning("Niciun telefon găsit", {
          description: `${data?.attempts ?? "?"} încercări · sursa nu expune numărul${data?.lastError ? ` (${data.lastError})` : ""}`,
        });
        refetch();
      }
    } catch (e: any) {
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error(`Eroare extragere: ${e?.message || String(e)}`);
    } finally {
      setRecoveringPhoneId(null);
    }
  };
  const [resuming, setResuming] = useState(false);
  const [expiryChecking, setExpiryChecking] = useState(false);

  const handleExpiryRecheck = async (mode: "batch" | "all") => {
    const label = mode === "all" ? "TOATE anunțurile active" : "primele 120 anunțuri";
    if (!window.confirm(`Pornesc reverificarea pentru ${label}? Cele expirate vor fi marcate automat ca inactive.`)) return;
    setExpiryChecking(true);
    const startToast = sonnerToast.loading(`Reverific ${label}…`);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-expiry-check", {
        body: { mode, limit: mode === "all" ? 200 : 120 },
      });
      if (error) throw error;
      sonnerToast.dismiss(startToast);
      const exp = data?.expired ?? 0;
      const ok = data?.ok ?? 0;
      const err = data?.errors ?? 0;
      sonnerToast.success(`Reverificare completă: ${exp} expirate, ${ok} active, ${err} erori`);
      refetch();
    } catch (e: any) {
      sonnerToast.dismiss(startToast);
      sonnerToast.error(`Eroare reverificare: ${e?.message || String(e)}`);
    } finally {
      setExpiryChecking(false);
    }
  };
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<ProspectTypeFilter | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<AgencyExplainerInput | null>(null);
  const CAMPAIGN_LIMIT = 30;

  const openAgencyExplainer = (p: any) => {
    const blob = `${p.title || ""}  ${p.description || ""}  ${p.contact_name || ""}`.toLowerCase();
    const url = (p.source_url || "").toLowerCase();
    const hardKeywordHits = AGENCY_KEYWORDS.filter((kw) => blob.includes(kw));
    const softKeywordHits = AGENCY_SOFT_KEYWORDS.filter((kw) => blob.includes(kw));
    const ownerSignalHits = OWNER_SIGNALS.filter((s) => url.includes(s) || blob.includes(s));
    let domain: string | null = null;
    try { domain = p.source_url ? new URL(p.source_url).hostname.toLowerCase() : null; }
    catch { domain = null; }
    const domainBlocked = !!(domain && AGENCY_DOMAINS.has(domain));
    const urlPatternBlocked = AGENCY_URL_PATTERNS.some((pat) => url.includes(pat));

    setExplainerData({
      prospectId: p.id,
      contactName: p.contact_name ?? null,
      phone: p.phone_normalized || p.contact_phone || null,
      phoneNormalized: p.phone_normalized ?? null,
      sourceUrl: p.source_url ?? null,
      isAgency: !!p.isAgency,
      prospectType: p.prospect_type ?? null,
      phoneCount: p.phoneCount ?? 0,
      suspicion: p.suspicion ?? { level: 0, reasons: [] },
      hardKeywordHits,
      softKeywordHits,
      domain,
      domainBlocked,
      urlPatternBlocked,
      ownerSignalHits,
    });
    setExplainerOpen(true);
  };


  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setUser(s?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // NU mai redirectăm automat dacă isAdmin=false — afișăm un panou cu Recheck.
  // Doar dacă nu există user, trimitem la login.
  useEffect(() => {
    if (!authReady || adminLoading) return;
    if (!user) {
      navigate("/auth?redirect=/admin/prospect-listings");
    }
  }, [authReady, adminLoading, user, navigate]);

  const { data: prospects = [], isLoading, refetch, error: queryError } = useQuery({
    queryKey: ["prospect-listings", statusFilter, categoryFilter],
    queryFn: async () => {
    let q = supabase
        .from("prospect_listings")
        .select("id,title,description,price,currency,location,zone,rooms,size,contact_name,contact_phone,phone_normalized,source_url,source_platform,is_active,lead_score,score,category,prospect_type,lifecycle_status,call_summary,admin_notes,ai_score_breakdown,ai_scored_at,voice_call_session_id,scraped_at,created_at,followup_sent_at,owner_sentiment,urgency_level,auto_call_triggered_at,search_keywords,auto_blacklisted_at,auto_blacklist_reason,persona_snapshot,persona_generated_at")
        // Hard exclusion: dismissed/expired/agency rows are persisted as inactive.
        .eq("is_active", true)
        .order("lead_score", { ascending: false, nullsFirst: false })
        .order("scraped_at", { ascending: false })
        .limit(300);
      // Hard exclusion: anything explicitly marked as agency stays out of every view.
      // (Manual "Marchează Agenție" sets prospect_type='agentie' AND archives the row.)
      q = q.neq("prospect_type", "agentie");
      if (statusFilter !== "all") {
        q = q.eq("lifecycle_status", statusFilter as any);
      } else {
        // Default view never includes archived rows (agency, expired, manually killed).
        q = q.neq("lifecycle_status", "expired");
      }
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter as any);
      const { data, error } = await q;
      if (error) {
        console.error("[ProspectListings] Query error:", error);
        throw error;
      }
      const rows = ((data || []) as Prospect[]).filter((row) => row.is_active === true && row.prospect_type !== "agentie" && row.lifecycle_status !== "expired");
      console.log("[ProspectListings] Loaded", rows.length, "rows");
      return rows;
    },

    enabled: authReady && isAdmin,
    refetchInterval: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (queryError) {
      toast({
        title: "Eroare la încărcare prospecte",
        description: (queryError as Error).message,
        variant: "destructive",
      });
    }
  }, [queryError]);

  // Phone recurrence map across the loaded dataset (multi-listing detection).
  const phoneCounts = useMemo(() => {
    const m = new Map<string, number>();
    prospects.forEach((p) => {
      const key = getProspectPhone(p);
      if (!key) return;
      m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }, [prospects]);

  // Most-recent call timestamp per phone (within last 48h) — used for re-call warnings.
  const recentCallsByPhone = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const m = new Map<string, { at: string; prospectId: string }>();
    prospects.forEach((p) => {
      if (!p.auto_call_triggered_at) return;
      const t = new Date(p.auto_call_triggered_at).getTime();
      if (Number.isNaN(t) || t < cutoff) return;
      const key = getProspectPhone(p);
      if (!key) return;
      const prev = m.get(key);
      if (!prev || new Date(prev.at).getTime() < t) {
        m.set(key, { at: p.auto_call_triggered_at, prospectId: p.id });
      }
    });
    return m;
  }, [prospects]);

  // Compute geo match + agency suspicion per prospect.
  const enriched = useMemo(
    () => prospects.map((p) => {
      let geo: { score: number; found: string[]; primary: string | null } = { score: 0, found: [], primary: null };
      try {
        geo = computeProspectGeoMatch([p.title, p.location, p.zone, p.description]);
      } catch (e) {
        console.warn("[ProspectListings] geo match failed for", p.id, e);
      }
      const isGenericSearch = isGenericSearchProspect(p) && !hasOwnerFilterSignal(p);
      const isAgency = detectIsAgency(p);
      const phoneKey = getProspectPhone(p) || "";
      const phoneCount = phoneKey ? (phoneCounts.get(phoneKey) || 0) : 0;
      const suspicion = computeAgencySuspicion(p, phoneCount);
      // Stale = no usable phone + scraped_at older than 14 days (mirrors the
      // pg_cron 'auto-archive-stale-prospects' rule, so the UI hides them
      // even before the next nightly run).
      const hasPhone = !!phoneKey;
      const scrapedTs = p.scraped_at ? new Date(p.scraped_at).getTime() : 0;
      const isStale =
        !hasPhone &&
        scrapedTs > 0 &&
        (Date.now() - scrapedTs) > 14 * 24 * 60 * 60 * 1000;
      const phoneFetchAttempts = countPhoneFetchAttempts(p.admin_notes);
      const phoneFetchExhausted = phoneFetchAttempts >= MAX_PHONE_FETCH_ATTEMPTS;
      return { ...p, geo, isAgency, isGenericSearch, phoneCount, suspicion, isStale, phoneFetchAttempts, phoneFetchExhausted };
    }),
    [prospects, phoneCounts]
  );

  // Count agencies before filtering, so we can show "X agenții ascunse"
  const agencyCount = useMemo(() => enriched.filter((p) => p.isAgency).length, [enriched]);
  const staleCount = useMemo(() => enriched.filter((p) => p.isStale).length, [enriched]);

  // ─── AUTO-BLACKLIST ──────────────────────────────────────────────
  // When a prospect's suspicion crosses the configured threshold, fire the
  // backend RPC which (a) re-checks the threshold, (b) skips whitelisted
  // numbers/domains, (c) marks the prospect as agency, (d) inserts in the
  // blocklist with reason 'Auto-detected (High Suspicion)' and (e) writes
  // an admin_audit_log row. The RPC is idempotent — already-blacklisted
  // prospects return early. We dedupe per session to avoid spamming.
  const { data: detectionSettings } = useAgencyDetectionSettings();
  const triggeredRef = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    if (!detectionSettings?.enabled) return;
    const threshold = detectionSettings.suspicion_threshold ?? 70;
    // Map suspicion level (0..3) → coarse score (0/33/66/99) so the slider
    // semantics in the settings panel keep working for the auto-trigger.
    const candidates = enriched.filter((p) => {
      if (p.auto_blacklisted_at) return false;
      if (triggeredRef.has(p.id)) return false;
      if (p.prospect_type === "proprietar") return false; // manual override
      const score = (p.suspicion?.level ?? 0) * 33;
      return score >= threshold;
    });
    if (candidates.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const p of candidates) {
        if (cancelled) break;
        triggeredRef.add(p.id);
        const score = (p.suspicion?.level ?? 0) * 33;
        try {
          await supabase.rpc("auto_blacklist_prospect" as any, {
            p_prospect_id: p.id,
            p_score: score,
            p_reasons: p.suspicion?.reasons ?? [],
          });
        } catch (e) {
          console.warn("[ProspectListings] auto_blacklist_prospect failed:", (e as Error).message);
        }
      }
      if (!cancelled) {
        // Refresh once at the end to pull updated auto_blacklisted_at.
        qc.invalidateQueries({ queryKey: ["prospect-listings"] });
      }
    })();
    return () => { cancelled = true; };
  }, [enriched, detectionSettings?.enabled, detectionSettings?.suspicion_threshold, triggeredRef, qc]);

  const filtered = enriched.filter((p) => {
    // Hide rejected by default unless toggle is on or user explicitly filters by "rejected".
    if (p.lifecycle_status === "rejected" && !showRejected && statusFilter !== "rejected") return false;
    // Hide stale (no-phone, >14d) by default — cron archives them nightly, this is the UI defense.
    if (p.isStale && !showStale) return false;
    // Hide generic search/category pages; keep owner/private/person-physical results imported from platform searches.
    if (p.isGenericSearch) return false;
    if (isImportedFromPlatformSearch(p) && !hasOwnerFilterSignal(p)) return false;
    // Owner / agency filter (default: hide agencies)
    if (prospectTypeFilter === "proprietar" && p.isAgency) return false;
    if (prospectTypeFilter === "agentie" && !p.isAgency) return false;
    if ((p.lead_score ?? p.score ?? 0) < parseInt(minScore || "0")) return false;
    if (zoneFilter !== "all") {
      const zoneBlob = `${p.zone || ""} ${p.location || ""} ${p.geo.primary || ""} ${(p.geo.found || []).join(" ")}`.toLowerCase();
      if (!zoneBlob.includes(zoneFilter.toLowerCase())) return false;
    }
    if (sourceFilter !== "all" && (p.source_platform || "") !== sourceFilter) return false;
    if (!search) return true;
    const blob = `${p.title} ${p.location} ${p.zone} ${p.contact_name} ${p.contact_phone}`.toLowerCase();
    return blob.includes(search.toLowerCase());
  });

  // ── Bulk selection helpers ──────────────────────────────────────────────────
  const filteredIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allSelectedOnPage =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelectedOnPage =
    !allSelectedOnPage && filteredIds.some((id) => selectedIds.has(id));

  const toggleSelectOne = (id: string) => {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (allSelectedOnPage) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk: mark N prospects as expired (5s sonner Undo, then commit DB + audit).
  const runBulkDismiss = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkPending("dismiss");
    // Optimistic fade-out
    setRemovingIds((cur) => {
      const next = new Set(cur);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const noteLine = `[${new Date().toISOString().slice(0, 16).replace("T", " ")}] bulk dismissed (expired) · /admin/prospect-listings`;

    try {
      // Update in chunks of 200 to stay well under any query-size cap.
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
      for (const chunk of chunks) {
        const { error } = await supabase
          .from("prospect_listings")
          .update({
            is_active: false,
            lifecycle_status: "expired",
          } as any)
          .in("id", chunk);
        if (error) throw error;
      }
      // Best-effort: append a single audit row per id (fire-and-forget).
      void supabase.from("admin_audit_log").insert(
        ids.map((id) => ({
          action: "prospect_dismissed_expired_bulk",
          entity_id: id,
          details: { source: "bulk", note: noteLine },
        })) as any,
      );

      sonnerToast.success(`🗑️ ${ids.length} anunțuri marcate ca expirate.`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["prospect-listings"] });
    } catch (e: any) {
      sonnerToast.error(`Eroare la dismiss în masă: ${e?.message || e}`);
      // Restore optimistic fade-out
      setRemovingIds((cur) => {
        const next = new Set(cur);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } finally {
      setBulkPending(null);
    }
  };

  // Bulk: re-score N prospects sequentially through the existing handleAIScore.
  const runBulkRescore = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkPending("rescore");
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await handleAIScore(id);
        ok++;
      } catch {
        fail++;
      }
    }
    sonnerToast.success(`🤖 Re-scoring complet: ${ok} reușite${fail ? ` · ${fail} eșuate` : ""}.`);
    setBulkPending(null);
  };

  // Bulk: force-fetch phones for selected prospects without a usable number
  // and not yet at the 5-attempt cap. Sequential to protect the residential proxy pool.
  const runBulkRecoverPhones = async (
    candidates: Array<{ id: string; source_url: string | null; admin_notes?: string | null }>
  ) => {
    const eligible = candidates.filter(
      (p) => !!p.source_url && countPhoneFetchAttempts(p.admin_notes) < MAX_PHONE_FETCH_ATTEMPTS,
    );
    if (eligible.length === 0) {
      sonnerToast.warning("Niciun anunț eligibil (toate au telefon valid sau au atins limita 5/5).");
      return;
    }
    setBulkPending("recover_phones");
    let recovered = 0;
    let empty = 0;
    let limit = 0;
    let fail = 0;
    const tId = sonnerToast.loading(`Recuperez telefoane: 0/${eligible.length}…`);
    for (let i = 0; i < eligible.length; i++) {
      const p = eligible[i];
      sonnerToast.loading(`Recuperez telefoane: ${i + 1}/${eligible.length}…`, { id: tId });
      try {
        const { data, error } = await supabase.functions.invoke("prospect-listings-fetch-phone", {
          body: { prospect_id: p.id, max_attempts: 3 },
        });
        if (error) throw error;
        if (data?.limit_reached) limit++;
        else if (data?.found) recovered++;
        else empty++;
      } catch {
        fail++;
      }
      // Small breather between calls — keeps residential pool happy.
      if (i < eligible.length - 1) await new Promise((r) => setTimeout(r, 800));
    }
    sonnerToast.dismiss(tId);
    sonnerToast.success(
      `📞 Bulk telefoane: ${recovered} recuperate · ${empty} fără rezultat${limit ? ` · ${limit} la limită` : ""}${fail ? ` · ${fail} erori` : ""}`,
    );
    refetch();
    setBulkPending(null);
  };

  // ── Smart selection: auto-pick rows on current filtered view that
  // still have phone-fetch budget (no valid phone + attempts < cap).
  const eligibleForPhoneRecovery = useMemo(
    () =>
      filtered.filter(
        (p) =>
          !!p.source_url &&
          !getProspectPhone(p) &&
          countPhoneFetchAttempts(p.admin_notes) < MAX_PHONE_FETCH_ATTEMPTS,
      ),
    [filtered],
  );

  const exhaustedInFiltered = useMemo(
    () =>
      filtered.filter(
        (p) => countPhoneFetchAttempts(p.admin_notes) >= MAX_PHONE_FETCH_ATTEMPTS,
      ),
    [filtered],
  );

  const selectEligibleForPhoneRecovery = () => {
    if (eligibleForPhoneRecovery.length === 0) {
      sonnerToast.info("Niciun anunț eligibil în lista curentă (toate au telefon valid sau au atins limita 5/5).");
      return;
    }
    setSelectedIds((cur) => {
      const next = new Set(cur);
      eligibleForPhoneRecovery.forEach((p) => next.add(p.id));
      return next;
    });
    sonnerToast.success(`✅ ${eligibleForPhoneRecovery.length} anunțuri eligibile selectate (cu buget 1–5/5).`);
  };

  // ── Reset phone-fetch attempt counters ────────────────────────────────────
  // Strips every "[fetch-phone ...]" line from admin_notes so the
  // MAX_PHONE_FETCH_ATTEMPTS cap is recalculated from scratch. Per-row update
  // (each note is different) but chunked sequentially to avoid hammering DB.
  const [confirmResetCountersOpen, setConfirmResetCountersOpen] = useState(false);
  const [resetCountersScope, setResetCountersScope] = useState<"selected" | "exhausted">("selected");

  const runResetPhoneCounters = async (
    targets: Array<{ id: string; admin_notes?: string | null }>,
  ) => {
    if (!isSuperAdmin) {
      sonnerToast.error("Acțiune restricționată: necesită rol SuperAdmin.");
      return;
    }
    if (targets.length === 0) {
      sonnerToast.warning("Nimic de resetat.");
      return;
    }
    setBulkPending("recover_phones");
    const tId = sonnerToast.loading(`Resetez contoare: 0/${targets.length}…`);
    let ok = 0;
    let fail = 0;
    const okIds = new Set<string>();
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const stripFetchLines = (notes: string | null | undefined) =>
      (notes ?? "")
        .split("\n")
        .filter((ln) => !/^\s*\[fetch-phone /.test(ln))
        .join("\n")
        .trim();

    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      sonnerToast.loading(`Resetez contoare: ${i + 1}/${targets.length}…`, { id: tId });
      try {
        const cleaned = stripFetchLines(p.admin_notes);
        const note = `[${stamp}] reset phone-fetch counters (super_admin)`;
        const nextNotes = [cleaned, note].filter(Boolean).join("\n");
        const { error } = await supabase
          .from("prospect_listings")
          .update({ admin_notes: nextNotes } as any)
          .eq("id", p.id);
        if (error) throw error;
        ok++;
        okIds.add(p.id);
      } catch {
        fail++;
      }
    }
    void supabase.from("admin_audit_log").insert(
      targets.map((t) => ({
        action: "prospect_phone_fetch_counters_reset",
        entity_id: t.id,
        details: { source: "admin_ui", scope: resetCountersScope, actor: "super_admin" },
      })) as any,
    );

    // Optimistic cache update — strip [fetch-phone …] lines on every cached
    // prospect-listings query so contoarele apar instant 0/5 și butoanele
    // inline de recuperare se reactivează fără refetch hard.
    if (okIds.size > 0) {
      qc.setQueriesData<any[]>({ queryKey: ["prospect-listings"] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) =>
          row && okIds.has(row.id)
            ? { ...row, admin_notes: stripFetchLines(row.admin_notes) }
            : row,
        );
      });
    }

    sonnerToast.dismiss(tId);
    if (ok > 0) {
      sonnerToast.success(
        `♻️ ${ok} ${ok === 1 ? "anunț a revenit" : "anunțuri au revenit"} la 0/${MAX_PHONE_FETCH_ATTEMPTS}${fail ? ` · ${fail} erori` : ""}.`,
        { duration: 5000 },
      );
    } else {
      sonnerToast.error(`Nu s-a putut reseta niciun contor (${fail} erori).`);
    }

    // Background sync to confirm DB state.
    refetch();
    setBulkPending(null);
  };




  // ── Keyboard shortcuts (J/K nav, C call, X dismiss-with-confirm) ────────────
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (filtered.length === 0) return;
      const k = e.key.toLowerCase();

      if (k === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((cur) => Math.min(filtered.length - 1, (cur < 0 ? -1 : cur) + 1));
        return;
      }
      if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((cur) => Math.max(0, (cur < 0 ? 0 : cur) - 1));
        return;
      }
      if (k === "escape") {
        setFocusedIndex(-1);
        clearSelection();
        return;
      }

      const target = filtered[focusedIndex];
      if (!target) return;

      if (k === "c") {
        e.preventDefault();
        const callable = getProspectPhone(target);
        if (!callable) {
          sonnerToast.error("Lead-ul nu are telefon valid pentru apel.");
          return;
        }
        if (isCallLocked(target)) {
          sonnerToast.error("Apel blocat pe acest lead (deja sunat sau în curs).");
          return;
        }
        void handleCall(target as any);
        return;
      }
      if (k === "x") {
        e.preventDefault();
        setConfirmKbdDismissId(target.id);
        return;
      }
      if (k === " " || k === "spacebar") {
        e.preventDefault();
        toggleSelectOne(target.id);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filtered, focusedIndex]);

  // Auto-scroll focused row into view
  useEffect(() => {
    if (focusedIndex < 0) return;
    const row = document.querySelector<HTMLElement>(`[data-prospect-row="${focusedIndex}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);



  // Available zones (from current data + canonical Timișoara list)
  const availableZones = useMemo(() => {
    const canonical = ["Centru", "Aradului", "Girocului", "Iosefin", "Fabric", "Elisabetin", "Cetate", "Dumbrăvița", "Lipovei", "Soarelui", "Complex Studențesc", "Take Ionescu", "Circumvalațiunii", "Torontalului", "Mehala"];
    const fromData = new Set<string>();
    enriched.forEach((p) => {
      if (p.geo.primary) fromData.add(p.geo.primary);
      if (p.zone) fromData.add(p.zone);
    });
    const merged = new Set<string>([...canonical, ...fromData]);
    return Array.from(merged).sort();
  }, [enriched]);

  // Available sources (platforms) — derived from current dataset.
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((p) => {
      if (p.source_platform) set.add(p.source_platform);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  // Eligible prospects for the bulk campaign — top N filtered, with phone, not currently calling.
  // Hard rule: never auto-call agencies, even if the view filter shows "all".
  const campaignTargets = useMemo(() => {
    return filtered
      .filter((p) => !p.isAgency)
      .filter((p) => !isImportedFromPlatformSearch(p) || hasOwnerFilterSignal(p))
      .filter((p) => getProspectPhone(p))
      .filter((p) => !["calling", "interested", "rejected"].includes(p.lifecycle_status))
      .slice(0, CAMPAIGN_LIMIT);
  }, [filtered]);

  // Debug: log render state
  useEffect(() => {
    console.log("[ProspectListings] State:", {
      isAdmin,
      adminLoading,
      userEmail: user?.email,
      prospectsLoaded: prospects.length,
      filtered: filtered.length,
      isLoading,
    });
  }, [isAdmin, adminLoading, user, prospects.length, filtered.length, isLoading]);

  const stats = {
    total: prospects.length,
    hot: prospects.filter((p) => (p.lead_score || 0) > 80).length,
    interested: prospects.filter((p) => p.lifecycle_status === "interested").length,
    calling: prospects.filter((p) => p.lifecycle_status === "calling").length,
    pending: prospects.filter((p) => p.lifecycle_status === "pending_credentials").length,
  };

  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleDismiss = async (p: Prospect, reason: "expired" | "manual" = "expired") => {
    const label = reason === "expired" ? "expirat" : "renunțare manuală";
    if (!window.confirm(`Renunți la „${(p.title || "anunț").slice(0, 60)}”?\n\nMotiv: ${label}\nAnunțul va fi marcat inactiv și ascuns din listă.`)) {
      return;
    }
    setDismissingId(p.id);
    const noteLine = `[${new Date().toISOString().slice(0, 16).replace("T", " ")}] dismissed (${reason}) din /admin/prospect-listings`;
    try {
      const { data: existing } = await supabase
        .from("prospect_listings")
        .select("admin_notes")
        .eq("id", p.id)
        .maybeSingle();
      const newNotes = existing?.admin_notes ? `${existing.admin_notes}\n${noteLine}` : noteLine;

      const { error } = await supabase
        .from("prospect_listings")
        .update({
          is_active: false,
          lifecycle_status: "rejected",
          admin_notes: newNotes,
        } as any)
        .eq("id", p.id);

      if (error) {
        toast({ title: "Eroare", description: error.message, variant: "destructive" });
        return;
      }

      // Trigger fade-out animation, then remove from cache.
      setRemovingIds((cur) => {
        const next = new Set(cur);
        next.add(p.id);
        return next;
      });
      setTimeout(() => {
        qc.setQueryData<Prospect[]>(["prospect-listings", statusFilter, categoryFilter], (old) =>
          (old || []).filter((row) => row.id !== p.id)
        );
        setRemovingIds((cur) => {
          if (!cur.has(p.id)) return cur;
          const next = new Set(cur);
          next.delete(p.id);
          return next;
        });
      }, 300);
      sonnerToast.success("Anunț marcat ca renunțat", {
        description: label,
        action: {
          label: "Undo",
          onClick: async () => {
            await supabase
              .from("prospect_listings")
              .update({ is_active: true, lifecycle_status: "new" } as any)
              .eq("id", p.id);
            refetch();
          },
        },
      });
    } finally {
      setDismissingId(null);
    }
  };

  const handleToggleProspectType = async (p: Prospect & { isAgency?: boolean }) => {
    const previous = p.isAgency ? "agentie" : "proprietar";
    const next = p.isAgency ? "proprietar" : "agentie";
    const phone = getProspectPhone(p);
    const domain = (() => {
      try {
        const host = p.source_url ? new URL(p.source_url).hostname.replace(/^www\./i, "").toLowerCase() : null;
        return host && !["olx.ro", "storia.ro", "imobiliare.ro", "facebook.com", "publi24.ro", "romimo.ro"].includes(host) ? host : null;
      } catch {
        return null;
      }
    })();

    // Optimistic
    qc.setQueriesData({ queryKey: ["prospect-listings"] }, (old: any) =>
      Array.isArray(old)
        ? (next === "agentie"
            // Hide immediately when marking as agency (permanent removal from view)
            ? old.filter((row: any) => row.id !== p.id)
            : old.map((row: any) => row.id === p.id ? { ...row, prospect_type: next } : row))
        : old
    );

    if (next === "agentie") {
      const result = await markAsAgency({
        id: p.id,
        source: "prospect_listings",
        phone,
        rawPhone: p.contact_phone,
        url: p.source_url,
        contextLabel: `Prospect Listings · ${p.title?.slice(0, 80) || p.id}`,
      });
      if (!result.ok) {
        toast({ title: "Eroare", description: result.message, variant: "destructive" });
        qc.invalidateQueries({ queryKey: ["prospect-listings"] });
        return;
      }
    } else {
      const { error } = await supabase
        .from("prospect_listings")
        .update({
          prospect_type: "proprietar",
          is_active: true,
          lifecycle_status: "new",
          auto_blacklisted_at: null,
          auto_blacklist_reason: null,
        } as any)
        .eq("id", p.id);
      if (error) {
        toast({ title: "Eroare", description: error.message, variant: "destructive" });
        qc.invalidateQueries({ queryKey: ["prospect-listings"] });
        return;
      }
      if (phone) {
        await supabase.from("agency_blocklist" as any).delete().eq("phone_normalized", phone);
      }
    }

    // Undo handler: reverts everything (prospect_type + blocklist side-effects)
    const undo = async () => {
      qc.invalidateQueries({ queryKey: ["prospect-listings"] });
      const undoPayload: Record<string, unknown> = previous === "agentie"
        ? {
            prospect_type: "agentie",
            is_active: false,
            lifecycle_status: "expired",
            auto_blacklisted_at: new Date().toISOString(),
            auto_blacklist_reason: "manual_admin_mark_agency",
          }
        : {
            prospect_type: "proprietar",
            is_active: true,
            lifecycle_status: "new",
            auto_blacklisted_at: null,
            auto_blacklist_reason: null,
          };
      await supabase.from("prospect_listings").update(undoPayload as any).eq("id", p.id);

      if (previous === "agentie") {
        // Re-add to blocklist
        if (phone || domain) {
          await supabase.from("agency_blocklist" as any).insert({
            phone_normalized: phone,
            domain,
            reason: "manual_admin",
            notes: `Restabilit (undo) din /admin/prospect-listings`,
            source_prospect_id: p.id,
          });
        }
      } else {
        // Remove from blocklist
        if (phone) await supabase.from("agency_blocklist" as any).delete().eq("phone_normalized", phone);
        if (domain) await supabase.from("agency_blocklist" as any).delete().eq("domain", domain);
      }
      sonnerToast.success("Acțiune anulată", {
        description: previous === "agentie"
          ? "Lead-ul a fost re-marcat ca Agenție și re-adăugat în blocklist."
          : "Lead-ul a fost restabilit ca Proprietar și scos din blocklist.",
      });
      refetch();
    };

    if (next === "agentie") {
      sonnerToast.success("🏢 Marcat ca agenție (blocat permanent)", {
        description: [
          phone ? `📞 Telefon adăugat în blocklist: ${phone}` : null,
          domain ? `🌐 Domeniu adăugat în blocklist: ${domain}` : null,
          !phone && !domain ? "Niciun telefon/domeniu de blocat — doar tipul a fost schimbat." : "Orice import viitor va fi blocat automat.",
        ].filter(Boolean).join("\n"),
        duration: 8000,
        action: { label: "↩️ Anulează", onClick: undo },
      });
    } else {
      sonnerToast.success("🏠 Marcat ca proprietar", {
        description: [
          "Lead-ul va apărea în filtrul Proprietari.",
          phone || domain ? "Scos din blocklist (telefon + domeniu)." : null,
        ].filter(Boolean).join("\n"),
        duration: 8000,
        action: { label: "↩️ Anulează", onClick: undo },
      });
    }
  };

  const handleAIScore = async (id: string) => {
    setScoringId(id);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-ai-scorer", {
        body: { prospect_id: id, force: true },
      });
      if (error) throw error;
      toast({
        title: "Scor AI calculat",
        description: `Lead score: ${data?.lead_score ?? "?"} | Categorie: ${data?.category ?? "?"}${data?.will_auto_call ? " | Apel automat declanșat" : ""}`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Eroare scoring", description: e.message, variant: "destructive" });
    } finally {
      setScoringId(null);
    }
  };

  const handleCall = async (p: Prospect) => {
    if (isGenericSearchProspect(p)) {
      toast({ title: "Nu este anunț apelabil", description: "Această intrare este o căutare generică de platformă, nu un anunț de proprietar.", variant: "destructive" });
      return;
    }
    const phone = getProspectPhone(p);
    if (!phone) {
      toast({ title: "Lipsește telefon", description: "Acest prospect nu are număr de telefon.", variant: "destructive" });
      return;
    }
    setCallingId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-auto-dial", {
        body: { prospect_id: p.id, manual: true },
      });
      if (error) throw error;
      if (data?.skipped === "pending_credentials") {
        toast({
          title: "🔧 Apel suspendat — lipsesc cheile Twilio",
          description: "Lead-ul a fost marcat 'pending_credentials'. Configurează TWILIO_API_KEY + TWILIO_FROM_NUMBER pentru a relua apelurile.",
        });
        refetch();
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({
        title: "📞 Apel inițiat",
        description: `Sun ${data?.to || phone}. Sesiune: ${data?.session_id?.slice(0, 8)}...`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Apel eșuat", description: e.message, variant: "destructive" });
    } finally {
      setCallingId(null);
    }
  };

  const isCallLocked = (p: Prospect) => {
    if (p.lifecycle_status !== "calling") return false;
    if (p.voice_call_session_id) return true;
    if (!p.auto_call_triggered_at) return false;

    const ageMs = Date.now() - new Date(p.auto_call_triggered_at).getTime();
    return ageMs < 5 * 60 * 1000;
  };

  const handleResumePending = async () => {
    setResuming(true);
    try {
      let processed = 0;
      // Loop a few times — each call processes top pending prospect
      for (let i = 0; i < Math.min(stats.pending, 10); i++) {
        const { data } = await supabase.functions.invoke("voice-agent-auto-dial", {
          body: { resume_pending: true },
        });
        if (data?.skipped === "pending_credentials") {
          toast({ title: "Tot lipsesc cheile Twilio", description: "Configurează secretele întâi.", variant: "destructive" });
          break;
        }
        if (data?.success) processed++;
        else break;
      }
      toast({ title: `Procesate ${processed} lead-uri pending`, description: "Verifică tabelul." });
      refetch();
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    } finally {
      setResuming(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignTargets.length) {
      toast({ title: "Niciun lead eligibil", description: "Ajustează filtrele.", variant: "destructive" });
      return;
    }
    setCampaignRunning(true);
    setCampaignOpen(false);
    try {
      const ids = campaignTargets.map((p) => p.id);
      // Optimistically mark in queue locally for instant UI feedback
      qc.setQueryData<Prospect[]>(["prospect-listings", statusFilter, categoryFilter], (old) =>
        (old || []).map((p) => ids.includes(p.id) ? { ...p, lifecycle_status: "calling", auto_call_triggered_at: new Date().toISOString() } : p)
      );
      const { data, error } = await supabase.functions.invoke("voice-agent-bulk-campaign", {
        body: { prospect_ids: ids, zone: zoneFilter === "all" ? null : zoneFilter },
      });
      if (error) throw error;
      if (data?.campaign_id) setCurrentCampaignId(data.campaign_id);
      toast({
        title: data?.cancelled ? `🛑 Campanie oprită` : `🚀 Campanie finalizată`,
        description: `${data?.dialed ?? 0}/${ids.length} apeluri inițiate${zoneFilter !== "all" ? ` în zona ${zoneFilter}` : ""}.`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Campanie eșuată", description: e.message, variant: "destructive" });
      refetch();
    } finally {
      setCampaignRunning(false);
      setCurrentCampaignId(null);
    }
  };

  const handleStopCampaign = async () => {
    setStopping(true);
    setStopOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-stop-campaign", {
        body: currentCampaignId ? { campaign_id: currentCampaignId } : {},
      });
      if (error) throw error;
      toast({
        title: "🛑 Campanie oprită",
        description: `${data?.reverted_count ?? 0} lead-uri din coadă au fost resetate la statusul anterior. Apelurile deja în curs nu sunt întrerupte.`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Oprire eșuată", description: e.message, variant: "destructive" });
    } finally {
      setStopping(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Score", "AI Score", "Geo Score", "Sentiment", "Urgency", "Title", "Category", "Phone", "Contact", "Location", "Zone", "Price", "Status", "Source URL"];
    const rows = filtered.map((p) => [
      p.score ?? "",
      p.lead_score ?? "",
      p.geo.score,
      p.owner_sentiment ?? p.ai_score_breakdown?.owner_sentiment ?? "",
      p.urgency_level ?? p.ai_score_breakdown?.urgency_level ?? "",
      (p.title || "").replace(/"/g, '""'),
      p.category ?? "",
      getProspectPhone(p) || "",
      (p.contact_name || "").replace(/"/g, '""'),
      p.location ?? "",
      p.zone ?? "",
      p.price ?? "",
      p.lifecycle_status,
      p.source_url,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospect-listings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Export CSV`, description: `${rows.length} prospecte exportate.` });
  };

  if (!authReady || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Dacă userul este logat dar nu e admin (sau verificarea a eșuat), arătăm un panou
  // explicit cu Recheck + Relogin în loc să redirectăm — pe mobil tokenul poate fi stale.
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Verificare admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Email:</strong> {user.email ?? "—"}<br />
              <strong>User ID:</strong> <code className="text-xs">{user.id}</code>
            </div>
            {adminError ? (
              <div className="text-destructive">⚠️ {adminError}</div>
            ) : (
              <div className="text-muted-foreground">
                Backend-ul confirmă rolul admin pentru contul tău, dar sesiunea curentă din browser
                nu a returnat încă rolul. Cel mai probabil tokenul JWT e expirat — apasă „Reîncearcă"
                sau „Relogheaza-te".
              </div>
            )}
            <div className="flex gap-2 flex-wrap pt-2">
              <Button onClick={() => recheck()} size="sm">
                <RefreshCw className="h-4 w-4 mr-1" /> Reîncearcă
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth?redirect=/admin/prospect-listings");
                }}
              >
                Relogheaza-te
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                Înapoi acasă
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {!embedded && <Header />}
      <div className={embedded ? "" : "min-h-screen bg-background p-4 md:p-6 pt-24 md:pt-28"}>
        {!embedded && <SEOHead title="Prospect Listings | Admin" description="AI-scored leads pipeline" />}


      {/* Debug banner — vizibil pe mobil pentru diagnoză */}
      <div className="max-w-[1600px] mx-auto mb-3 p-3 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-xs space-y-1">
        <div><strong>👤 User:</strong> {user?.email ?? "—"} <span className="text-muted-foreground">({user?.id?.slice(0, 8)}…)</span></div>
        <div><strong>🔐 Admin:</strong> {isAdmin ? "✅ DA" : "❌ NU"} {adminLoading && "(loading…)"}</div>
        <div><strong>📊 Prospecte încărcate:</strong> {prospects.length} | <strong>După filtre:</strong> {filtered.length} | {isLoading && "(loading…)"}</div>
        {queryError ? <div className="text-destructive"><strong>❌ Eroare query:</strong> {(queryError as Error).message}</div> : null}
      </div>

      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Prospect Listings
              </h1>
              <p className="text-sm text-muted-foreground">
                Lead-uri scrape-uite, scorate AI și pregătite pentru apel automat (scor &gt; 80).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setCampaignOpen(true)}
              disabled={campaignRunning || campaignTargets.length === 0}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl font-semibold border-2 border-orange-300/50"
            >
              {campaignRunning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
              🚀 Lansează Campanie AI (Top {Math.min(CAMPAIGN_LIMIT, campaignTargets.length)})
            </Button>
            {campaignRunning && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setStopOpen(true)}
                disabled={stopping}
                className="shadow-lg font-semibold"
              >
                {stopping ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <StopCircle className="h-4 w-4 mr-1" />}
                Oprește campania
              </Button>
            )}
            {stats.pending > 0 && (
              <Button variant="default" size="sm" onClick={handleResumePending} disabled={resuming} className="bg-amber-600 hover:bg-amber-500 text-white">
                {resuming ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
                Reia apelurile pending ({stats.pending})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/call-dashboard")}>
              <Phone className="h-4 w-4 mr-1" /> Call Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExpiryRecheck("batch")} disabled={expiryChecking} title="Verifică pe sursă dacă anunțurile mai sunt active și retrage automat pe cele expirate">
              {expiryChecking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
              Reverifică expirate
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {stats.pending > 0 && (
          <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-3 flex items-center gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong>{stats.pending} lead-uri pending</strong> — Twilio nu este configurat.
                Adaugă secretele <code className="text-xs bg-background px-1 rounded">TWILIO_API_KEY</code> și
                <code className="text-xs bg-background px-1 rounded ml-1">TWILIO_FROM_NUMBER</code> apoi apasă "Reia apelurile pending".
                Webhook-ul MAKE primește deja datele pentru WhatsApp manual.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "🔥 Hot (>80)", value: stats.hot, icon: <Sparkles className="h-4 w-4 text-orange-500" /> },
            { label: "În apelare", value: stats.calling, icon: <Phone className="h-4 w-4 text-amber-500" /> },
            { label: "Interesați", value: stats.interested, icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
            { label: "⏸ Pending", value: stats.pending, icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                {s.icon}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-7 gap-3">
            <Input placeholder="Caută titlu, locație, contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select
              value={prospectTypeFilter}
              onValueChange={(v) => {
                const next = v as ProspectTypeFilter;
                // Switching AWAY from "proprietar" requires explicit confirmation
                // so agencies are never shown by accident.
                if (prospectTypeFilter === "proprietar" && next !== "proprietar") {
                  setPendingTypeFilter(next);
                } else {
                  setProspectTypeFilter(next);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tip prospect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proprietar">🔒 🏠 Doar proprietari (lock)</SelectItem>
                <SelectItem value="agentie">🏢 Doar agenții</SelectItem>
                <SelectItem value="all">⚠️ Toate (include agenții)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="new">Noi</SelectItem>
                <SelectItem value="calling">În apelare</SelectItem>
                <SelectItem value="interested">Interesați</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="rejected">Refuzați</SelectItem>
                <SelectItem value="posted">Postate</SelectItem>
                <SelectItem value="pending_credentials">⏸ Pending Credentials</SelectItem>
              </SelectContent>
            </Select>
            <label
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 h-10 text-xs font-medium cursor-pointer select-none whitespace-nowrap"
              title="Anunțurile respinse sunt ascunse implicit (rămân în DB pentru a preveni re-importul)."
            >
              <Switch
                checked={showRejected}
                onCheckedChange={setShowRejected}
                aria-label="Arată anunțurile respinse"
              />
              <span>
                Arată respinse
                <span className="ml-1 text-muted-foreground">
                  ({enriched.filter((p) => p.lifecycle_status === "rejected").length})
                </span>
              </span>
            </label>
            <label
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 h-10 text-xs font-medium cursor-pointer select-none whitespace-nowrap"
              title="Anunțurile fără telefon și mai vechi de 14 zile sunt ascunse automat (auto-stale). Cron-ul nocturn le arhivează definitiv."
            >
              <Switch
                checked={showStale}
                onCheckedChange={setShowStale}
                aria-label="Arată anunțurile stale (fără telefon, >14 zile)"
              />
              <span>
                🌫️ Arată stale
                <span className="ml-1 text-muted-foreground">({staleCount})</span>
              </span>
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Categorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate categoriile</SelectItem>
                <SelectItem value="vanzare">Vânzare</SelectItem>
                <SelectItem value="inchiriere">Chirie</SelectItem>
                <SelectItem value="hotelier">Regim Hotelier</SelectItem>
              </SelectContent>
            </Select>
            <Select value={minScore} onValueChange={setMinScore}>
              <SelectTrigger><SelectValue placeholder="Scor minim" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Orice scor</SelectItem>
                <SelectItem value="50">Scor ≥ 50</SelectItem>
                <SelectItem value="70">Scor ≥ 70</SelectItem>
                <SelectItem value="80">🔥 Scor &gt; 80 (hot)</SelectItem>
                <SelectItem value="90">⭐ Scor ≥ 90</SelectItem>
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger><SelectValue placeholder="Zonă" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">📍 Toate zonele</SelectItem>
                {availableZones.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue placeholder="Sursă" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">🌐 Toate sursele</SelectItem>
                {availableSources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
          {/* Saved (favorite) filters bar */}
          <div className="px-4 pb-3 -mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">⭐ Filtre salvate:</span>
            {savedFilters.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Niciun filtru salvat încă.</span>
            )}
            {savedFilters.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs pl-2">
                <button
                  type="button"
                  className="hover:underline"
                  title="Aplică acest filtru"
                  onClick={() => {
                    setStatusFilter(f.statusFilter);
                    setCategoryFilter(f.categoryFilter);
                    setMinScore(f.minScore);
                    setZoneFilter(f.zoneFilter);
                    setSourceFilter(f.sourceFilter);
                    setProspectTypeFilter(f.prospectTypeFilter);
                    setSearch(f.search || "");
                    toast({ title: "Filtru aplicat", description: f.name });
                  }}
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  className="px-1.5 py-0.5 hover:text-destructive"
                  title="Șterge filtrul"
                  onClick={() => {
                    setSavedFilters((prev) => prev.filter((x) => x.id !== f.id));
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-auto"
              onClick={() => {
                const defaultName =
                  sourceFilter !== "all"
                    ? `${sourceFilter}${zoneFilter !== "all" ? ` · ${zoneFilter}` : ""}`
                    : `Filtru ${savedFilters.length + 1}`;
                const name = window.prompt("Nume pentru acest filtru:", defaultName)?.trim();
                if (!name) return;
                const entry: SavedFilter = {
                  id: crypto.randomUUID(),
                  name,
                  statusFilter,
                  categoryFilter,
                  minScore,
                  zoneFilter,
                  sourceFilter,
                  prospectTypeFilter,
                  search,
                };
                setSavedFilters((prev) => [...prev.filter((x) => x.name !== name), entry]);
                toast({ title: "Filtru salvat", description: name });
              }}
            >
              💾 Salvează filtru curent
            </Button>
          </div>
          {prospectTypeFilter === "proprietar" && (
            <div className="px-4 pb-3 -mt-1 text-xs flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-300/60 text-green-800 dark:text-green-300 font-medium">
                🔒 Mod „Doar proprietari" activ — agențiile sunt blocate
                {agencyCount > 0 && <span className="font-normal opacity-80">· {agencyCount} ascunse</span>}
              </span>
              {agencyCount > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setPendingTypeFilter("all")}>
                  Arată tot (cere confirmare)
                </Button>
              )}
            </div>
          )}
          {prospectTypeFilter !== "proprietar" && (
            <div className="px-4 pb-3 -mt-1 text-xs flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Agențiile sunt vizibile ({prospectTypeFilter === "agentie" ? "doar agenții" : "toate"}). Reactivează lock-ul pentru siguranță.
              </span>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setProspectTypeFilter("proprietar")}>
                🔒 Reactivează „Doar proprietari"
              </Button>
            </div>
          )}
        </Card>

        {/* ── Phoneless prospects: dedicated section with one-click bulk recover ── */}
        {(() => {
          const phoneless = filtered.filter((p) => !getProspectPhone(p));
          if (phoneless.length === 0) return null;
          const eligible = phoneless.filter(
            (p) => !!p.source_url && !p.phoneFetchExhausted,
          );
          const exhausted = phoneless.filter((p) => p.phoneFetchExhausted);
          const noUrl = phoneless.filter((p) => !p.source_url);
          const preview = phoneless.slice(0, phonelessExpanded ? phoneless.length : 8);
          return (
            <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4 text-amber-600" />
                    Fără telefon ({phoneless.length})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {eligible.length} eligibile pentru recuperare
                    {exhausted.length > 0 && ` · ${exhausted.length} la limită (5/5)`}
                    {noUrl.length > 0 && ` · ${noUrl.length} fără sursă`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {phoneless.length > 8 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPhonelessExpanded((v) => !v)}
                    >
                      {phonelessExpanded ? "Restrânge" : `Arată toate (${phoneless.length})`}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setConfirmRecoverAllOpen(true)}
                    disabled={bulkPending !== null || eligible.length === 0}
                    className="gap-1.5"
                    title={
                      eligible.length === 0
                        ? "Niciun anunț eligibil (lipsă sursă sau limită 5/5 atinsă)"
                        : `Forțează extragere telefon pentru toate cele ${eligible.length} anunțuri eligibile`
                    }
                  >
                    {bulkPending === "recover_phones"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                    Recuperează toate ({eligible.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border/60 rounded-md border border-border/60 bg-background/60 text-sm">
                  {preview.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.title || "(fără titlu)"}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[p.zone, p.location].filter(Boolean).join(" · ") || "—"}
                          {p.source_platform ? ` · ${p.source_platform}` : ""}
                          {p.phoneFetchExhausted
                            ? ` · limită ${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS}`
                            : p.phoneFetchAttempts > 0
                              ? ` · încercări ${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS}`
                              : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.source_url && (
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> sursă
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={recoveringPhoneId === p.id || p.phoneFetchExhausted || !p.source_url || bulkPending !== null}
                          onClick={() => void handleRecoverPhone({ id: p.id, source_url: p.source_url, admin_notes: p.admin_notes })}
                        >
                          {recoveringPhoneId === p.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <RefreshCw className="h-3 w-3" />}
                          tel.
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Confirm recover-all phoneless ─────────────────────────────────── */}
        <AlertDialog open={confirmRecoverAllOpen} onOpenChange={setConfirmRecoverAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                Recuperează telefoane pentru toate anunțurile fără telefon?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Va rula extragerea forțată pentru{" "}
                    <strong>
                      {filtered.filter((p) => !getProspectPhone(p) && !!p.source_url && !p.phoneFetchExhausted).length}
                    </strong>{" "}
                    anunțuri eligibile din lista filtrată curentă.
                  </p>
                  <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                    <div>⏱️ Rulare secvențială (~5–10s/anunț) cu pauză între cereri.</div>
                    <div>📞 Max 5 încercări/anunț (proxy stealth + UA rotation).</div>
                    <div>🛡️ Cele la limita 5/5 sau fără sursă sunt sărite automat.</div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const eligible = filtered.filter(
                    (p) => !getProspectPhone(p) && !!p.source_url && !p.phoneFetchExhausted,
                  );
                  void runBulkRecoverPhones(
                    eligible.map((p) => ({ id: p.id, source_url: p.source_url, admin_notes: p.admin_notes })),
                  );
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Da, recuperează
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">{filtered.length} prospecte afișate</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectEligibleForPhoneRecovery}
                disabled={bulkPending !== null || eligibleForPhoneRecovery.length === 0}
                className="gap-1.5 h-8"
                title="Bifează doar anunțurile din lista curentă care n-au telefon valid și nu au atins limita 5/5"
              >
                <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                Selectează eligibili ({eligibleForPhoneRecovery.length})
              </Button>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResetCountersScope("exhausted");
                    setConfirmResetCountersOpen(true);
                  }}
                  disabled={bulkPending !== null || exhaustedInFiltered.length === 0}
                  className="gap-1.5 h-8"
                  title="SuperAdmin · Resetează contoarele de încercări pentru toate anunțurile epuizate (5/5) din lista filtrată"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                  Resetează contoare ({exhaustedInFiltered.length})
                </Button>
              )}
              <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono pl-2 border-l border-border ml-1">
                <kbd className="px-1.5 py-0.5 rounded border bg-muted">J</kbd>/<kbd className="px-1.5 py-0.5 rounded border bg-muted">K</kbd> nav
                · <kbd className="px-1.5 py-0.5 rounded border bg-muted">Space</kbd> select
                · <kbd className="px-1.5 py-0.5 rounded border bg-muted">C</kbd> call
                · <kbd className="px-1.5 py-0.5 rounded border bg-muted">X</kbd> dismiss
                · <kbd className="px-1.5 py-0.5 rounded border bg-muted">Esc</kbd> reset
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 px-1 md:px-2">
                      <Checkbox
                        checked={allSelectedOnPage ? true : someSelectedOnPage ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAllVisible}
                        aria-label="Selectează toate anunțurile filtrate"
                      />
                    </TableHead>
                    <TableHead className="hidden md:table-cell w-16">AI Score</TableHead>
                    <TableHead className="hidden lg:table-cell w-20">Geo SEO</TableHead>
                    <TableHead className="min-w-[108px] px-1 md:min-w-[280px] md:px-4">Anunț</TableHead>
                    <TableHead className="hidden sm:table-cell">Categorie</TableHead>
                    <TableHead className="min-w-[124px] px-1 md:px-4">Telefon Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-right min-w-[82px] px-1 md:min-w-[118px] md:px-4">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Niciun prospect.</TableCell></TableRow>
                  ) : filtered.map((p, idx) => {
                    const score = p.lead_score ?? p.score ?? 0;
                    const scoreColor = score > 80 ? "text-orange-600" : score > 60 ? "text-amber-600" : "text-muted-foreground";
                    const phoneInfo = getVisibleProspectPhoneInfo(p);
                    const phone = phoneInfo?.phone ?? null;
                    const callablePhone = getProspectPhone(p);
                    const contactName = extractContactNameFromText(p);
                    const sentiment = p.owner_sentiment ?? p.ai_score_breakdown?.owner_sentiment;
                    const urgency = p.urgency_level ?? p.ai_score_breakdown?.urgency_level;
                    const geoColor = p.geo.score >= 70 ? "text-green-600" : p.geo.score >= 40 ? "text-amber-600" : "text-muted-foreground";
                    const callLocked = isCallLocked(p);
                    const isSelected = selectedIds.has(p.id);
                    const isFocused = focusedIndex === idx;
                    return (
                      <TableRow
                        key={p.id}
                        data-prospect-row={idx}
                        className={`transition-all duration-300 ${
                          removingIds.has(p.id) ? "opacity-0 -translate-x-2 pointer-events-none" : ""
                        } ${isFocused ? "ring-2 ring-primary/60 ring-inset bg-primary/5" : ""} ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <TableCell className="px-1 md:px-2 align-top pt-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOne(p.id)}
                            aria-label={`Selectează ${p.title || "anunț"}`}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
                          {p.ai_scored_at && <div className="text-[10px] text-muted-foreground">AI ✓</div>}
                          {sentiment && (
                            <div className="text-[10px] mt-0.5">
                              {sentimentEmoji[sentiment] || "•"} {sentiment}
                              {urgency != null && urgency > 0 && <span className="ml-1 text-orange-600">u{urgency}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className={`text-sm font-semibold ${geoColor}`}>{p.geo.score}</div>
                          {p.geo.primary && <div className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={p.geo.found.join(", ")}>{p.geo.primary}</div>}
                          {p.geo.found.length > 1 && <div className="text-[10px] text-muted-foreground">+{p.geo.found.length - 1}</div>}
                        </TableCell>
                        <TableCell className="max-w-[108px] md:max-w-xs px-1 md:px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const s = getSourceStyle(p.source_platform);
                              return s ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] py-0 px-1.5 font-semibold ${s.cls}`}
                                  title={`Sursă: ${s.label}`}
                                >
                                  {s.emoji} {s.label}
                                </Badge>
                              ) : null;
                            })()}
                            <div className="font-medium text-sm truncate">{p.title || "(fără titlu)"}</div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                            {p.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{p.location}</span>}
                            {p.price && <span className="flex items-center gap-0.5"><Euro className="h-3 w-3" />{p.price.toLocaleString()}</span>}
                            {p.rooms && <span>{p.rooms}cam</span>}
                            {p.size && <span>{p.size}mp</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                            {p.source_url ? (
                              <a
                                href={p.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-primary font-medium max-w-[220px] truncate"
                                title={p.source_url}
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {(() => { try { return new URL(p.source_url).hostname.replace(/^www\./, ""); } catch { return "sursă"; } })()}
                              </a>
                            ) : (
                              <span className="text-[10px] italic text-amber-600">fără URL sursă</span>
                            )}
                            {(p.scraped_at || (p as any).created_at) && (
                              <span
                                className="inline-flex items-center gap-1"
                                title={new Date(p.scraped_at || (p as any).created_at).toLocaleString("ro-RO")}
                              >
                                <Clock className="h-3 w-3" />
                                {formatRelativeRo(p.scraped_at || (p as any).created_at)}
                              </span>
                            )}
                          </div>
                          {p.ai_score_breakdown?.recommended_pitch && !p.persona_snapshot && (
                            <div className="text-xs italic text-primary/70 mt-1 line-clamp-1">💡 {p.ai_score_breakdown.recommended_pitch}</div>
                          )}
                          {(() => {
                            const phoneKey = getProspectPhone(p);
                            const recent = phoneKey ? recentCallsByPhone.get(phoneKey) : undefined;
                            return (
                              <ProspectPersonaSnapshot
                                prospectId={p.id}
                                persona={p.persona_snapshot}
                                generatedAt={p.persona_generated_at}
                                recentCallAt={recent?.at ?? null}
                                recentCallSameProspect={recent?.prospectId === p.id}
                                onSent={() => {
                                  const nowIso = new Date().toISOString();
                                  qc.setQueriesData<any[]>({ queryKey: ["prospect-listings"] }, (old) =>
                                    old?.map((row) => (row.id === p.id ? { ...row, lifecycle_status: "calling", auto_call_triggered_at: nowIso } : row)) || old
                                  );
                                }}
                                onChange={(next, gen) => {
                                  qc.setQueriesData<any[]>({ queryKey: ["prospect-listings"] }, (old) =>
                                    old?.map((row) => (row.id === p.id ? { ...row, persona_snapshot: next, persona_generated_at: gen } : row)) || old
                                  );
                                }}
                              />
                            );
                          })()}
                          {p.call_summary && (
                            <div className="text-xs text-green-700 mt-1 line-clamp-2">📞 {p.call_summary}</div>
                          )}
                          <ProspectKeywordsEditor
                            prospectId={p.id}
                            keywords={p.search_keywords || []}
                            onChange={(next) => {
                              qc.setQueriesData<any[]>({ queryKey: ["prospect-listings"] }, (old) =>
                                old?.map((row) => (row.id === p.id ? { ...row, search_keywords: next } : row)) || old
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {p.category && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              {categoryIcons[p.category]}
                              {categoryLabels[p.category]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-2 md:px-4">
                          <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                            {contactName || (phoneInfo ? "Contact anunț" : "—")}
                            {p.isAgency && (
                              <button
                                type="button"
                                onClick={() => openAgencyExplainer(p)}
                                title={p.auto_blacklisted_at
                                  ? `Auto-blacklist (High Suspicion) la ${new Date(p.auto_blacklisted_at).toLocaleString("ro-RO")}`
                                  : "Vezi de ce a fost marcat"}
                              >
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 cursor-pointer inline-flex items-center gap-0.5">
                                  🏢 Agenție
                                  {p.auto_blacklisted_at && (
                                    <Zap className="h-3 w-3 text-red-500 ml-0.5" aria-label="Auto-blocat" />
                                  )}
                                </Badge>
                              </button>
                            )}
                            {!p.isAgency && p.suspicion && p.suspicion.level >= 2 && (
                              <button
                                type="button"
                                onClick={() => openAgencyExplainer(p)}
                                title="Vezi semnalele AI"
                              >
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 gap-1 cursor-pointer hover:opacity-80 ${
                                    p.suspicion.level === 3
                                      ? "border-red-400 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30"
                                      : "border-orange-400 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30"
                                  }`}
                                >
                                  <Bot className="h-3 w-3" />
                                  {p.suspicion.level === 3 ? "AI: probabil agenție" : "AI: suspect"}
                                </Badge>
                              </button>
                            )}
                          </div>
                          {phone ? (
                            <a href={callablePhone ? `tel:${callablePhone}` : p.source_url} target={callablePhone ? undefined : "_blank"} rel={callablePhone ? undefined : "noopener noreferrer"} className="text-xs text-primary font-mono flex items-center gap-1 hover:underline break-all">
                              <Phone className="h-3 w-3" />
                              {phoneInfo?.displayPhone || phone}
                              {phoneInfo?.masked && <span className="hidden sm:inline text-[9px] text-muted-foreground">vizibil parțial</span>}
                              {phoneInfo && !phoneInfo.persisted && !phoneInfo.masked && (
                                <span
                                  className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground"
                                  title={`Telefon extras din ${phoneInfo.source === "admin_notes" ? "note" : phoneInfo.source === "description" ? "descriere" : "titlu"}`}
                                >
                                  extras
                                </span>
                              )}
                              {p.phoneCount > 1 && (
                                <span
                                  className={`text-[9px] px-1 py-0 rounded ${
                                    p.phoneCount >= 4
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  }`}
                                  title={`Acest telefon apare pe ${p.phoneCount} anunțuri în lista curentă`}
                                >
                                  ×{p.phoneCount}
                                </span>
                              )}
                            </a>
                          ) : (
                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Fără telefon</span>
                              {p.source_url && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRecoverPhone({ id: p.id, source_url: p.source_url, admin_notes: p.admin_notes })}
                                    disabled={recoveringPhoneId === p.id || p.phoneFetchExhausted}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={p.phoneFetchExhausted
                                      ? `Limită atinsă (${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS}). Verifică manual sursa.`
                                      : `Apasă butonul «Arată numărul» pe sursă și extrage telefonul (${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS})`}
                                  >
                                    {recoveringPhoneId === p.id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <Sparkles className="h-3 w-3" />}
                                    {p.phoneFetchExhausted ? `limită ${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS}` : "recuperează tel."}
                                  </button>
                                  <a
                                    href={p.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
                                    title="Deschide anunțul sursă"
                                  >
                                    <ExternalLink className="h-3 w-3" /> deschide
                                  </a>
                                </>
                              )}
                            </div>
                          )}
                          {/* Clasificarea (proprietar/agenție) a fost mutată în meniul «⋮ Acțiuni» pentru a preveni tap-uri accidentale pe mobil. */}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={`${lifecycleColors[p.lifecycle_status] || ""} text-xs`} variant="outline">
                            {p.lifecycle_status === "pending_credentials" ? "⏸ pending" : p.lifecycle_status}
                          </Badge>
                          {p.isStale && (
                            <Badge
                              variant="outline"
                              className="mt-1 text-[10px] py-0 px-1.5 border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-900/30"
                              title="Fără telefon valid și mai vechi de 14 zile. Va fi arhivat automat la următorul cron nocturn."
                            >
                              🌫️ stale
                            </Badge>
                          )}
                          {p.followup_sent_at && <div className="text-[10px] text-green-600 mt-1">WA ✓</div>}
                        </TableCell>
                        <TableCell className="text-right px-2 md:px-4">
                          <div className="flex flex-col gap-1.5 items-end">
                            {/* Acțiune primară — singura mare/colorată, pentru triere rapidă */}
                            <Button
                              size="sm"
                              variant={score > 80 ? "default" : "outline"}
                              onClick={() => handleCall(p)}
                              disabled={!callablePhone || callingId === p.id || callLocked}
                              className="w-full min-h-[40px] px-2 text-[11px] sm:text-xs font-medium"
                              title={callablePhone ? "Pornește apel AI (Andrei)" : "Nu există telefon valid"}
                            >
                              {callingId === p.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <><Phone className="h-3.5 w-3.5 mr-1" /><span>Apelează AI</span></>}
                            </Button>

                            {/* Toate celelalte acțiuni (inclusiv distructive) — în spatele unui meniu, 2 tap-uri intenționate */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full min-h-[36px] gap-1.5 text-muted-foreground hover:text-foreground"
                                  title="Mai multe acțiuni"
                                  aria-label="Mai multe acțiuni"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="text-[11px] sm:text-xs">Acțiuni</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                  Lead: {(p.title || "—").slice(0, 28)}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => handleAIScore(p.id)}
                                  disabled={scoringId === p.id}
                                  className="gap-2 cursor-pointer"
                                >
                                  {scoringId === p.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Sparkles className="h-3.5 w-3.5" />}
                                  Re-scoring AI
                                </DropdownMenuItem>

                                {p.source_url && (
                                  <DropdownMenuItem
                                    onClick={() => handleRecoverPhone({ id: p.id, source_url: p.source_url, admin_notes: p.admin_notes })}
                                    disabled={recoveringPhoneId === p.id || p.phoneFetchExhausted}
                                    className="gap-2 cursor-pointer"
                                    title={p.phoneFetchExhausted
                                      ? `Limită atinsă (${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS})`
                                      : `Încercare ${p.phoneFetchAttempts + 1}/${MAX_PHONE_FETCH_ATTEMPTS}`}
                                  >
                                    {recoveringPhoneId === p.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <RefreshCw className={`h-3.5 w-3.5 ${p.phoneFetchExhausted ? "text-muted-foreground" : "text-blue-600"}`} />}
                                    {p.phoneFetchExhausted
                                      ? `Limită telefon ${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS}`
                                      : `Forțează extragere telefon (${p.phoneFetchAttempts}/${MAX_PHONE_FETCH_ATTEMPTS})`}
                                  </DropdownMenuItem>
                                )}



                                <DropdownMenuItem
                                  onClick={() => handleToggleProspectType(p)}
                                  className="gap-2 cursor-pointer"
                                >
                                  {p.isAgency
                                    ? <><Home className="h-3.5 w-3.5 text-green-600" /> Marchează ca Proprietar</>
                                    : <><Building2 className="h-3.5 w-3.5 text-amber-600" /> Marchează ca Agenție</>}
                                </DropdownMenuItem>

                                {p.source_url && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={p.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="gap-2 cursor-pointer flex items-center"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Deschide sursa ({p.source_platform || "anunț"})
                                    </a>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                {/* Zonă distructivă — vizual separată */}
                                <div className="px-1 py-1">
                                  <DismissExpiredButton
                                    id={p.id}
                                    title={p.title}
                                    reason="expired"
                                    contextLabel="/admin/prospect-listings"
                                    className="w-full justify-start min-h-[36px]"
                                    label="Renunță (expirat)"
                                    onDismissed={() => {
                                      setRemovingIds((cur) => {
                                        const next = new Set(cur);
                                        next.add(p.id);
                                        return next;
                                      });
                                    }}
                                    onUndo={() => {
                                      setRemovingIds((cur) => {
                                        if (!cur.has(p.id)) return cur;
                                        const next = new Set(cur);
                                        next.delete(p.id);
                                        return next;
                                      });
                                    }}
                                    invalidateKeys={[["prospect-listings", statusFilter, categoryFilter]]}
                                  />
                                </div>

                                <DropdownMenuSeparator />

                                <div className="px-2 py-1">
                                  <AuditLogViewer
                                    entityType="prospect_listing"
                                    entityId={p.id}
                                    title={`Istoric: ${(p.title || "lead").slice(0, 40)}`}
                                    trigger={
                                      <Button size="sm" variant="ghost" className="w-full justify-start gap-2 h-8">
                                        <History className="h-3.5 w-3.5" />
                                        Istoric acțiuni
                                      </Button>
                                    }
                                  />
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Badge informativ — vizibil doar pe desktop, fără să încarce mobilul */}
                            <Badge
                              variant="outline"
                              className="hidden sm:inline-flex text-[9px] py-0 px-1 border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                              title="Filtru aplicat global: doar Proprietari / Persoane fizice / Privați"
                            >
                              👤 Doar Proprietari
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Bulk action bar (fixed bottom, appears when items selected) ── */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4"
          role="region"
          aria-label="Acțiuni colective pentru anunțurile selectate"
        >
          <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="default" className="text-sm px-2.5 py-1">
                {selectedIds.size} selectat{selectedIds.size === 1 ? "" : "e"}
              </Badge>
              <span className="hidden sm:inline text-muted-foreground">
                Acțiunile colective afectează doar anunțurile bifate.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                disabled={bulkPending !== null}
              >
                Anulează selecția
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={selectEligibleForPhoneRecovery}
                disabled={bulkPending !== null || eligibleForPhoneRecovery.length === 0}
                className="gap-1.5"
                title="Adaugă în selecție anunțurile fără telefon valid și cu buget de încercări rămas"
              >
                <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                Eligibili ({eligibleForPhoneRecovery.length})
              </Button>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResetCountersScope("selected");
                    setConfirmResetCountersOpen(true);
                  }}
                  disabled={bulkPending !== null}
                  className="gap-1.5"
                  title="SuperAdmin · Resetează contoarele de încercări (5/5) pentru anunțurile selectate"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                  Reset contoare ({selectedIds.size})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const ids = filtered.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
                  void runBulkRescore(ids);
                }}
                disabled={bulkPending !== null}
                className="gap-1.5"
              >
                {bulkPending === "rescore"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                Re-score ({selectedIds.size})
              </Button>
              {(() => {
                const eligible = filtered.filter(
                  (p) =>
                    selectedIds.has(p.id) &&
                    !!p.source_url &&
                    !getProspectPhone(p) &&
                    !p.phoneFetchExhausted,
                );
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void runBulkRecoverPhones(
                        eligible.map((p) => ({ id: p.id, source_url: p.source_url, admin_notes: p.admin_notes })),
                      );
                    }}
                    disabled={bulkPending !== null || eligible.length === 0}
                    className="gap-1.5"
                    title={
                      eligible.length === 0
                        ? "Niciun anunț selectat fără telefon (sau toate la limita 5/5)"
                        : `Forțează extragere telefon pentru ${eligible.length} anunțuri (max 5/anunț, secvențial)`
                    }
                  >
                    {bulkPending === "recover_phones"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5 text-blue-600" />}
                    Recuperează telefoane ({eligible.length})
                  </Button>
                );
              })()}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmBulkDismissOpen(true)}
                disabled={bulkPending !== null}
                className="gap-1.5"
              >
                {bulkPending === "dismiss"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />}
                Renunță ({selectedIds.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm bulk dismiss ─────────────────────────────────────────── */}
      <AlertDialog open={confirmBulkDismissOpen} onOpenChange={setConfirmBulkDismissOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Renunță în masă la {selectedIds.size} anunțuri?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Anunțurile vor fi marcate ca <strong>expirate</strong> și ascunse din listă.</p>
                <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                  <div>📦 Rămân în baza de date (nu se șterg) — previn re-import scraper.</div>
                  <div>📝 Se înregistrează în <code className="bg-background px-1 rounded">admin_audit_log</code> per ID.</div>
                  <div>↩️ Pentru anulare individuală: filtrează după „expired" și folosește meniul ⋮.</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = filtered.filter((p) => selectedIds.has(p.id)).map((p) => p.id);
                void runBulkDismiss(ids);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Da, renunță la {selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm reset phone-fetch counters ──────────────────────────── */}
      <AlertDialog open={confirmResetCountersOpen} onOpenChange={setConfirmResetCountersOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Resetează contoarele de încercări?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {(() => {
                  const targets = resetCountersScope === "selected"
                    ? filtered.filter((p) => selectedIds.has(p.id))
                    : exhaustedInFiltered;
                  return (
                    <>
                      <p>
                        Vor fi resetate contoarele de extragere telefon pentru{" "}
                        <strong>{targets.length}</strong>{" "}
                        {resetCountersScope === "selected" ? "anunțuri selectate" : "anunțuri epuizate (5/5) din lista filtrată"}.
                      </p>
                      <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                        <div>♻️ Bugetul revine la <strong>0/5</strong> — anunțul redevine eligibil pentru forțare telefon.</div>
                        <div>📝 Liniile <code>[fetch-phone …]</code> din notițe sunt curățate, restul notițelor rămân.</div>
                        <div>🛡️ Se înregistrează în <code>admin_audit_log</code> per ID.</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const targets = resetCountersScope === "selected"
                  ? filtered.filter((p) => selectedIds.has(p.id))
                  : exhaustedInFiltered;
                void runResetPhoneCounters(
                  targets.map((p) => ({ id: p.id, admin_notes: p.admin_notes })),
                );
              }}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Da, resetează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {/* ── Confirm keyboard X dismiss (single row) ──────────────────────── */}
      <AlertDialog
        open={confirmKbdDismissId !== null}
        onOpenChange={(o) => { if (!o) setConfirmKbdDismissId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Renunță la acest anunț?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const t = filtered.find((p) => p.id === confirmKbdDismissId);
                return t
                  ? `„${(t.title || "anunț").slice(0, 80)}" va fi marcat ca expirat și ascuns din listă.`
                  : "Anunțul va fi marcat ca expirat și ascuns din listă.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmKbdDismissId) void runBulkDismiss([confirmKbdDismissId]);
                setConfirmKbdDismissId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Da, renunță
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <AlertDialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-orange-500" />
              Lansare Campanie AI
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Ești sigur că vrei să suni <strong>{campaignTargets.length} proprietari</strong>
                  {zoneFilter !== "all" ? <> din zona <strong>{zoneFilter}</strong></> : <> din toate zonele filtrate</>}?
                </p>
                <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                  <div>📞 Voice Agent va apela secvențial cu pauză de 1.5s</div>
                  <div>🔒 Lead-urile vor fi marcate <code className="bg-background px-1 rounded">calling</code> imediat</div>
                  <div>📊 Rezultatele apar în <strong>Call Dashboard</strong> live</div>
                  <div>⚠️ Acțiunea <strong>nu poate fi anulată</strong> odată inițiată</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLaunchCampaign}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Rocket className="h-4 w-4 mr-1" /> Da, lansează campania
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-destructive" />
              Oprește campania activă
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Sigur vrei să oprești campania în curs?</p>
                <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                  <div>🛑 Apelurile rămase din coadă vor fi <strong>anulate</strong></div>
                  <div>↩️ Lead-urile neapelate revin la statusul <strong>anterior</strong> (ex: <code className="bg-background px-1 rounded">new</code>)</div>
                  <div>📞 Apelurile <strong>deja în desfășurare</strong> nu sunt întrerupte</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuă campania</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <StopCircle className="h-4 w-4 mr-1" /> Da, oprește campania
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingTypeFilter !== null} onOpenChange={(o) => { if (!o) setPendingTypeFilter(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Deblochezi afișarea agențiilor?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  În prezent ești în modul <strong>🔒 Doar proprietari</strong>. Vei trece la
                  {pendingTypeFilter === "all"
                    ? <> <strong>„Toate"</strong> — vor apărea și anunțurile de agenție.</>
                    : <> <strong>„Doar agenții"</strong> — vor apărea exclusiv agențiile.</>}
                </p>
                <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                  <div>🛡️ Campania AI tot <strong>nu va apela</strong> agențiile, indiferent de filtru.</div>
                  <div>🔄 Poți reactiva oricând lock-ul „Doar proprietari" cu un click.</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Păstrează lock-ul</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTypeFilter) setProspectTypeFilter(pendingTypeFilter);
                setPendingTypeFilter(null);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Da, deblochează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AgencyExplainerDialog
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        data={explainerData}
        onForceOwner={async (d) => {
          // 1) Read existing admin_notes to append (don't overwrite history)
          const { data: existing } = await supabase
            .from("prospect_listings")
            .select("admin_notes")
            .eq("id", d.prospectId)
            .maybeSingle();
          const stamp = new Date().toISOString();
          const noteLine = `[${stamp}] Deblocat manual din Explainer (${user?.email || "admin"}) — suspicion=${d.suspicion.level}/3`;
          const newNotes = existing?.admin_notes
            ? `${existing.admin_notes}\n${noteLine}`
            : noteLine;

          // 2) Update prospect → owner + append admin_notes
          const { error: upErr } = await supabase
            .from("prospect_listings")
            .update({
              prospect_type: "proprietar",
              is_active: true,
              admin_notes: newNotes,
            })
            .eq("id", d.prospectId);
          if (upErr) {
            toast({ title: "Eroare", description: upErr.message, variant: "destructive" });
            return;
          }

          // 2) Insert into whitelist (phone + domain), idempotent
          if (d.phoneNormalized) {
            await supabase.from("agency_whitelist" as any).insert({
              phone_normalized: d.phoneNormalized,
              reason: "manual_admin",
              notes: `Override din Explainer (${d.contactName || "—"})`,
              source_prospect_id: d.prospectId,
              created_by: user?.id ?? null,
            }).then(({ error }) => {
              if (error && !error.message?.toLowerCase().includes("duplicate")) {
                console.warn("[whitelist] phone insert:", error.message);
              }
            });
          }
          if (d.domain) {
            await supabase.from("agency_whitelist" as any).insert({
              domain: d.domain,
              reason: "manual_admin",
              notes: `Override din Explainer (${d.contactName || "—"})`,
              source_prospect_id: d.prospectId,
              created_by: user?.id ?? null,
            }).then(({ error }) => {
              if (error && !error.message?.toLowerCase().includes("duplicate")) {
                console.warn("[whitelist] domain insert:", error.message);
              }
            });
          }

          // 3) Remove from blocklist (phone + domain) so it stops being blocked
          if (d.phoneNormalized) {
            await supabase.from("agency_blocklist" as any).delete().eq("phone_normalized", d.phoneNormalized);
          }
          if (d.domain) {
            await supabase.from("agency_blocklist" as any).delete().eq("domain", d.domain);
          }

          // 4) Audit log
          await supabase.from("admin_audit_log").insert({
            actor_user_id: user?.id ?? null,
            actor_label: user?.email ?? null,
            action: "agency_manual_override",
            entity_type: "prospect_listing",
            entity_id: d.prospectId,
            severity: "info",
            details: {
              reason: "Manual override din Explainer",
              from: d.isAgency ? "agentie" : "suspect",
              to: "proprietar",
              suspicion_level: d.suspicion.level,
              suspicion_reasons: d.suspicion.reasons,
              hard_keyword_hits: d.hardKeywordHits,
              soft_keyword_hits: d.softKeywordHits,
              phone_count: d.phoneCount,
              phone_normalized: d.phoneNormalized,
              domain: d.domain,
              whitelisted_phone: !!d.phoneNormalized,
              whitelisted_domain: !!d.domain,
            },
          });

          toast({
            title: "🏠 Marcat ca proprietar (whitelist)",
            description: "Telefonul și domeniul au fost adăugate permanent în whitelist. Acțiunea a fost înregistrată în audit log.",
          });
          setExplainerOpen(false);
          refetch();
        }}
      />
      </div>
    </>
  );
};

export default ProspectListings;
