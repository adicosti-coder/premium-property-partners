import { lazy, type LazyExoticComponent, type ComponentType } from "react";

/**
 * Registru centralizat de loadere lazy pentru fiecare tab admin.
 * - reduce dramatic bundle-ul inițial al /admin (fiecare manager devine chunk separat)
 * - `prefetchAdminTab(value)` pornește descărcarea chunk-ului la hover/focus
 * - același loader este folosit atât pentru `lazy()` cât și pentru prefetch
 */
type Loader = () => Promise<{ default: ComponentType<unknown> }>;

const loaders: Record<string, Loader> = {
  dashboard: () => import("@/components/admin/AdminDashboard"),
  "ai-cache": () => import("@/components/admin/AICacheManager"),
  leads: () => import("@/components/admin/LeadsManager"),
  contracts: () => import("@/components/admin/ContractManager"),
  "leads-analytics": () => import("@/components/admin/LeadsAnalyticsDashboard"),
  "tracking-qa": () => import("@/components/admin/TrackingQAPanel"),
  "conversion-report": () => import("@/components/admin/WeeklyConversionReport"),
  "tracking-alerts": () => import("@/components/admin/TrackingAlertsPanel"),


  bookings: () => import("@/components/admin/BookingManager"),
  "booking-requests": () => import("@/components/admin/BookingRequestsPanel"),
  cazare: () => import("@/components/admin/CazareManager"),
  properties: () => import("@/components/admin/PropertyManager"),
  "investitii-premium": () => import("@/components/admin/InvestitiiPremiumManager"),
  blog: () => import("@/components/admin/BlogManager"),
  "owner-codes": () => import("@/components/admin/OwnerCodeManager"),
  maintenance: () => import("@/components/admin/MaintenanceManager"),
  newsletter: () => import("@/components/admin/NewsletterManager"),
  complexes: () => import("@/components/admin/ComplexManager"),
  "video-testimonials": () => import("@/components/admin/VideoTestimonialsManager"),
  poi: () => import("@/components/admin/POIManager"),
  "hero-video": () => import("@/components/admin/HeroVideoComposite"),
  "local-tips": () => import("@/components/admin/LocalTipsManager"),
  "followup-stats": () => import("@/components/admin/FollowupStatsManager"),
  "ab-testing": () => import("@/components/admin/ABTestManager"),
  reviews: () => import("@/components/admin/ReviewsManager"),
  "poi-reviews": () => import("@/components/admin/PoiReviewsModerationManager"),
  "poi-review-notifications": () => import("@/components/admin/PoiNotificationLogsPanel"),
  captcha: () => import("@/components/admin/CaptchaLogsManager"),
  community: () => import("@/components/admin/CommunityManager"),
  "cta-analytics": () => import("@/components/admin/CtaAnalyticsManager"),
  "blog-cta-ab": () => import("@/components/admin/BlogCtaABDashboard"),
  "blog-hub-clicks": () => import("@/components/admin/BlogHubClicksDashboard"),
  "evaluare-engagement": () => import("@/components/admin/EvaluareEngagementManager"),
  "funnel-analytics": () => import("@/components/admin/FunnelAnalyticsManager"),
  security: () => import("@/components/admin/SecurityChecklist"),
  "email-campaigns": () => import("@/components/admin/EmailCampaignManager"),
  "discount-codes": () => import("@/components/admin/DiscountCodeManager"),
  "property-views": () => import("@/components/admin/PropertyViewsManager"),
  "ical-sync": () => import("@/components/admin/ICalManager"),
  prospects: () => import("@/components/admin/ProspectManager"),
  "listing-import": () => import("@/components/admin/ListingImportTabs"),
  "guest-guides": () => import("@/components/admin/GuestGuideManager"),
  catalogs: () => import("@/components/admin/CatalogManager"),
  "scraper-status": () => import("@/components/admin/ScraperStatusDashboard"),
  "seo-optimizer": () => import("@/components/admin/SEOOptimizerManager"),
  "ai-memory": () => import("@/components/admin/AiMemoryPanel"),
  "photo-studio": () => import("@/components/admin/PhotoStudioManager"),
  "voice-agent": () => import("@/components/admin/VoiceAgentCommandCenter"),
  "whatsapp-andrei": () => import("@/components/admin/WhatsappAgentInbox"),
  "whatsapp-queue": () => import("@/components/admin/WhatsappOutboundQueue"),

  "agency-ai": () => import("@/components/admin/AgencyDetectionSettings").then((m) => ({ default: m.AgencyDetectionSettings })),
  "system-health": () => import("@/components/admin/SystemHealthDashboard"),
  automation: () => import("@/components/admin/AutomationManager"),
  "prospect-pipeline": () => import("@/components/admin/ProspectPipelinePanel"),
  "scraper-monitor": () => import("@/components/admin/ScraperMonitorPanel"),
  "unified-pipeline": () => import("@/components/admin/UnifiedPipelinePanel"),
  "investment-analysis": () => import("@/components/admin/InvestmentAnalysisManager"),
  "ai-security": () => import("@/components/admin/AISecurityPanel"),
  "seo-guide-generator": () => import("@/components/admin/SeoGuideGenerator"),
  "blog-error-feed": () => import("@/components/admin/BlogErrorFeed"),
  "not-found-logs": () => import("@/components/admin/NotFoundLogsPanel"),
  "property-analyses": () => import("@/components/admin/PropertyAnalysesPanel"),
  "auto-publish-logs": () => import("@/components/admin/AutoPublishLogsDashboard"),
};

const cache = new Map<string, LazyExoticComponent<ComponentType<unknown>>>();

export function getAdminTabComponent(value: string): LazyExoticComponent<ComponentType<unknown>> | null {
  const loader = loaders[value];
  if (!loader) return null;
  let cached = cache.get(value);
  if (!cached) {
    cached = lazy(loader);
    cache.set(value, cached);
  }
  return cached;
}

const prefetched = new Set<string>();

/** Pornește descărcarea chunk-ului fără a-l randa. Idempotent. */
export function prefetchAdminTab(value: string): void {
  if (prefetched.has(value)) return;
  const loader = loaders[value];
  if (!loader) return;
  prefetched.add(value);
  // Fire & forget; eșecul nu trebuie să spargă UX-ul.
  loader().catch(() => prefetched.delete(value));
}

export const ADMIN_TAB_KEYS = Object.keys(loaders);
