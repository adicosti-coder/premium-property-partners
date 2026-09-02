import {
  LayoutDashboard, Users, Phone, Zap, CalendarDays, Calendar, MessageSquare,
  Building, Hotel, TrendingUp, Building2, FileText, LinkIcon, Key,
  Sparkles, BarChart3,
  Mail, MailCheck, Megaphone, Euro, PenLine, BookOpen, Lightbulb, Play,
  MousePointerClick, Target, Activity, FlaskConical,
  Film, MapPin, Wrench, Shield, ShieldCheck, Brain, Radar,
  type LucideIcon,
} from "lucide-react";

export interface AdminTab {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Optional external route (uses navigate instead of internal tab content) */
  externalRoute?: string;
  /** Counter key for live badges */
  badgeKey?: "newLeads" | "newScraper" | "hotProspects" | "prospectPipeline";
  /** Keywords for command palette search */
  keywords?: string[];
  /** Optional sub-section label inside the parent group (visual divider only) */
  subgroup?: string;
}

export interface AdminGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminTab[];
  /** Ordered list of subgroup labels (for rendering order). Optional. */
  subgroupOrder?: string[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: "operational",
    label: "Operațional",
    icon: Zap,
    items: [
      { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: ["home", "start", "overview"] },
      { value: "leads", label: "Lead-uri", icon: Users, badgeKey: "newLeads" },
      { value: "contracts", label: "Contracte & Plăți", icon: FileText, keywords: ["contract", "semnare", "plata", "stripe", "onboarding"] },
      { value: "bookings", label: "Rezervări", icon: CalendarDays },
      { value: "booking-requests", label: "Cereri rezervare", icon: CalendarDays, keywords: ["cereri", "rezervare", "booking requests", "site", "oaspeti"] },
      { value: "ical-sync", label: "iCal Sync", icon: Calendar },
      { value: "reviews", label: "Reviews", icon: MessageSquare },
      { value: "poi-reviews", label: "Moderare Recenzii POI", icon: MessageSquare, keywords: ["recenzii", "moderare", "poi", "restaurante", "oaspeti", "rating", "aprobare"] },
      { value: "poi-review-notifications", label: "Jurnal Notificări Recenzii", icon: MessageSquare, keywords: ["notificari", "jurnal", "log", "email", "whatsapp", "recenzii", "moderare"] },
    ],
  },
  {
    id: "properties",
    label: "Properties",
    icon: Building,
    items: [
      { value: "properties", label: "Proprietăți", icon: Building },
      { value: "cazare", label: "Cazare", icon: Hotel },
      { value: "investitii-premium", label: "Investiții Premium", icon: TrendingUp },
      { value: "complexes", label: "Complexe", icon: Building2 },
      { value: "catalogs", label: "Cataloage PDF", icon: FileText },
      { value: "listing-import", label: "Import Anunț", icon: LinkIcon },
      { value: "owner-codes", label: "Coduri Proprietari", icon: Key },
    ],
  },
  {
    id: "ai-scraper",
    label: "AI & Scraper",
    icon: Sparkles,
    subgroupOrder: ["AI Tools", "Scraper Pipeline"],
    items: [
      // 🧠 AI Tools — utilitare AI pentru conținut și asistență
      { value: "ai-cache", label: "AI Cache", icon: Sparkles, subgroup: "AI Tools", keywords: ["cache", "ai content"] },
      { value: "voice-agent", label: "Voice Agent", icon: Phone, subgroup: "AI Tools", keywords: ["voice", "apel ai"] },
      { value: "whatsapp-andrei", label: "Andrei WhatsApp", icon: MessageSquare, subgroup: "AI Tools", keywords: ["whatsapp", "wa", "andrei", "chat"] },
      { value: "whatsapp-queue", label: "Coadă WhatsApp", icon: MessageSquare, subgroup: "AI Tools", keywords: ["whatsapp", "coada", "queue", "outbound", "template", "rate limit"] },

      { value: "photo-studio", label: "Studio Foto AI", icon: Sparkles, subgroup: "AI Tools", keywords: ["foto", "image"] },
      { value: "seo-optimizer", label: "SEO AI", icon: Sparkles, subgroup: "AI Tools", keywords: ["seo"] },
      { value: "ai-memory", label: "AI Memory", icon: Brain, subgroup: "AI Tools", keywords: ["memorie", "context"] },
      { value: "investment-analysis", label: "Analiză Investiții", icon: TrendingUp, subgroup: "AI Tools", keywords: ["investitii", "roi", "analiza", "glm", "ai"] },
      { value: "seo-guide-generator", label: "Generator Ghiduri SEO", icon: FileText, subgroup: "AI Tools", keywords: ["seo", "ghid", "articol", "blog", "cartier", "complex", "glm"] },

      // 🔍 Scraper Pipeline — ecran UNIFICAT (observabilitate + prospecți + aprobare/publicare)
      { value: "unified-pipeline", label: "Pipeline Unificat", icon: Radar, badgeKey: "prospectPipeline", subgroup: "Scraper Pipeline", keywords: ["pipeline", "unificat", "prospects", "scraper", "monitor", "keywords", "aprobare", "publicare", "leads", "bot", "hot", "agentii"] },

    ],
  },
  {
    id: "marketing",
    label: "Marketing & Analytics",
    icon: BarChart3,
    items: [
      { value: "leads-analytics", label: "Funnel Lead-uri", icon: BarChart3 },
      { value: "tracking-qa", label: "Validare Tracking", icon: Activity, keywords: ["ga4", "meta", "capi", "pixel", "conversii", "test", "dry run"] },
      { value: "tracking-alerts", label: "Alerte Tracking", icon: Activity, keywords: ["ga4", "alerta", "scadere", "sesiuni", "email", "monitorizare"] },
      { value: "conversion-report", label: "Raport Conversii", icon: BarChart3, keywords: ["utm", "gclid", "atribuire", "sursa", "rata conversie", "saptamanal", "raport"] },


      { value: "funnel-analytics", label: "Funnel", icon: Target },
      { value: "cta-analytics", label: "CTA Analytics", icon: MousePointerClick },
      { value: "blog-cta-ab", label: "Blog CTA A/B", icon: FlaskConical },
      { value: "blog-hub-clicks", label: "Hub Clicks Blog", icon: MapPin, keywords: ["hub", "locatie", "blog", "geo"] },
      { value: "property-views", label: "Vizualizări", icon: BarChart3 },
      { value: "evaluare-engagement", label: "Engagement Evaluare", icon: Activity },
      { value: "followup-stats", label: "Follow-up", icon: MailCheck },
      { value: "ab-testing", label: "A/B Testing", icon: FlaskConical },
      { value: "email-campaigns", label: "Email Marketing", icon: Megaphone },
      { value: "newsletter", label: "Newsletter", icon: Mail },
      { value: "discount-codes", label: "Coduri Promo", icon: Euro },
      { value: "blog", label: "Blog Manager", icon: FileText, keywords: ["blog", "manager", "articole", "articles", "posts", "content"] },
      { value: "community", label: "Comunitate", icon: PenLine },
      { value: "guest-guides", label: "Portal Oaspeți", icon: BookOpen },
      { value: "local-tips", label: "Sfaturi Locale", icon: Lightbulb },
      { value: "video-testimonials", label: "Video", icon: Play },
      { value: "auto-publish-logs", label: "Auto-Publish Logs", icon: FileText, keywords: ["blog", "cron", "indexnow", "logs", "auto", "publish"] },
    ],
  },
  {
    id: "system",
    label: "Site & System",
    icon: Wrench,
    items: [
      { value: "hero-video", label: "Hero Video & Text", icon: Film },
      { value: "poi", label: "POI", icon: MapPin },
      { value: "maintenance", label: "Mentenanță", icon: Wrench },
      { value: "captcha", label: "Captcha", icon: Shield },
      { value: "security", label: "Securitate", icon: ShieldCheck },
      { value: "ai-security", label: "Securitate AI", icon: ShieldCheck, keywords: ["ai", "openrouter", "scan", "tokens", "permissions"] },
      { value: "system-health", label: "System Health", icon: Activity, keywords: ["audit", "cron", "monitor", "health", "alerts"] },
      { value: "automation", label: "Automation", icon: Sparkles, keywords: ["automation", "automatizare", "kill switch", "joburi", "approvals"] },
      { value: "blog-error-feed", label: "Erori Frontend", icon: ShieldCheck, keywords: ["errors", "erori", "blog", "401", "403", "correlation"] },
      { value: "not-found-logs", label: "Monitorizare 404", icon: LinkIcon, keywords: ["404", "not found", "linkuri rupte", "broken links", "redirect"] },
      { value: "property-analyses", label: "Istoric analize AI", icon: Sparkles, keywords: ["analiza", "analize", "ai", "randament", "pdf", "raport", "share"] },

    ],
  },
];

export const ALL_TABS: AdminTab[] = ADMIN_GROUPS.flatMap((g) => g.items);

export function findTab(value: string): AdminTab | undefined {
  return ALL_TABS.find((t) => t.value === value);
}

export function findGroupOf(value: string): AdminGroup | undefined {
  return ADMIN_GROUPS.find((g) => g.items.some((i) => i.value === value));
}
