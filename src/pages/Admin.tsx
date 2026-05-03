import { useState, useEffect, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { User, Session } from "@supabase/supabase-js";
import {
  ArrowLeft, LogOut, Loader2, Users, ShieldAlert, Sparkles,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppAdminSidebar } from "@/components/admin/AppAdminSidebar";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { AdminStatusBar } from "@/components/admin/AdminStatusBar";
import { findTab } from "@/components/admin/adminNavConfig";
import { useAdminPinned } from "@/hooks/useAdminPinned";

import BookingManager from "@/components/admin/BookingManager";
import PropertyManager from "@/components/admin/PropertyManager";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BlogManager from "@/components/admin/BlogManager";
import OwnerCodeManager from "@/components/admin/OwnerCodeManager";
import MaintenanceManager from "@/components/admin/MaintenanceManager";
import NewsletterManager from "@/components/admin/NewsletterManager";
import ComplexManager from "@/components/admin/ComplexManager";
import VideoTestimonialsManager from "@/components/admin/VideoTestimonialsManager";
import POIManager from "@/components/admin/POIManager";
import HeroVideoManager from "@/components/admin/HeroVideoManager";
import HeroTextManager from "@/components/admin/HeroTextManager";
import LeadsManager from "@/components/admin/LeadsManager";
import LeadsAnalyticsDashboard from "@/components/admin/LeadsAnalyticsDashboard";
import LocalTipsManager from "@/components/admin/LocalTipsManager";
import FollowupStatsManager from "@/components/admin/FollowupStatsManager";
import ABTestManager from "@/components/admin/ABTestManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import CaptchaLogsManager from "@/components/admin/CaptchaLogsManager";
import CommunityManager from "@/components/admin/CommunityManager";
import CtaAnalyticsManager from "@/components/admin/CtaAnalyticsManager";
import EvaluareEngagementManager from "@/components/admin/EvaluareEngagementManager";
import SecurityChecklist from "@/components/admin/SecurityChecklist";
import AdminMFAGuard from "@/components/admin/AdminMFAGuard";
import EmailCampaignManager from "@/components/admin/EmailCampaignManager";
import DiscountCodeManager from "@/components/admin/DiscountCodeManager";
import FunnelAnalyticsManager from "@/components/admin/FunnelAnalyticsManager";
import PropertyViewsManager from "@/components/admin/PropertyViewsManager";
import CazareManager from "@/components/admin/CazareManager";
import InvestitiiPremiumManager from "@/components/admin/InvestitiiPremiumManager";
import ICalManager from "@/components/admin/ICalManager";
import ListingImporter from "@/components/admin/ListingImporter";
import ProspectManager from "@/components/admin/ProspectManager";
import CatalogManager from "@/components/admin/CatalogManager";
import GuestGuideManager from "@/components/admin/GuestGuideManager";
import AICacheManager from "@/components/admin/AICacheManager";
import ScraperStatusDashboard from "@/components/admin/ScraperStatusDashboard";
import SEOOptimizerManager from "@/components/admin/SEOOptimizerManager";
import { VisitorMemoryWidget } from "@/components/admin/VisitorMemoryWidget";
import PhotoStudioManager from "@/components/admin/PhotoStudioManager";
import VoiceAgentManager from "@/components/admin/VoiceAgentManager";
import { AgencyDetectionSettings } from "@/components/admin/AgencyDetectionSettings";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNewLeadsNotification } from "@/hooks/useNewLeadsNotification";
import { useQuery } from "@tanstack/react-query";

const SIDEBAR_OPEN_KEY = "admin:sidebar-open";

const normalizeAdminTab = (value?: string | null) => {
  if (!value) return null;
  return findTab(value) ? value : null;
};

const Admin = () => {
  const navigate = useNavigate();
  const { adminTab } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);

  const initialTab = normalizeAdminTab(adminTab) || normalizeAdminTab(searchParams.get("tab")) || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { isAdmin, isLoading: isAdminLoading } = useAdminRole(user);
  const { newLeadsCount } = useNewLeadsNotification(activeTab);
  const { pinned, toggle: togglePin } = useAdminPinned();

  // Persist sidebar open state in localStorage (in addition to cookie)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_OPEN_KEY);
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  const handleSidebarOpenChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
    try {
      localStorage.setItem(SIDEBAR_OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const { data: newScraperCount = 0 } = useQuery({
    queryKey: ["scraper-leads-new-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("scraper_leads_archive_2026" as never)
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 60_000,
    enabled: !!user && isAdmin,
  });

  const { data: hotProspectsCount = 0 } = useQuery({
    queryKey: ["prospect-listings-hot-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("prospect_listings")
        .select("*", { count: "exact", head: true })
        .eq("lifecycle_status", "new")
        .gt("lead_score", 80);
      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!user && isAdmin,
  });

  // Auth bootstrap
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) navigate("/auth");
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Sync activeTab → URL
  useEffect(() => {
    if (adminTab) {
      const normalizedPathTab = normalizeAdminTab(adminTab);
      if (normalizedPathTab && activeTab !== normalizedPathTab) {
        setActiveTab(normalizedPathTab);
      } else if (!normalizedPathTab) {
        navigate("/admin", { replace: true });
      }
      return;
    }

    const current = searchParams.get("tab");
    if (current !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, adminTab, navigate, searchParams, setSearchParams]);

  // Sync URL → activeTab (browser back/forward)
  useEffect(() => {
    if (adminTab) return;
    const fromUrl = searchParams.get("tab");
    const normalizedFromUrl = normalizeAdminTab(fromUrl);
    if (normalizedFromUrl && normalizedFromUrl !== activeTab) {
      setActiveTab(normalizedFromUrl);
    }
  }, [adminTab, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTab = useCallback((value: string) => {
    const tab = findTab(value);
    if (tab?.externalRoute) {
      navigate(tab.externalRoute);
      return;
    }
    navigate(value === "dashboard" ? "/admin" : `/admin/${value}`);
    setActiveTab(value);
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user || isAdminLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{t.admin.notAdmin}</h1>
        <p className="text-muted-foreground mb-6">{t.admin.notAdminDescription}</p>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.admin.backToSite}
        </Button>
      </div>
    );
  }

  const counters = {
    newLeads: newLeadsCount,
    newScraper: newScraperCount,
    hotProspects: hotProspectsCount,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Admin Dashboard" noIndex={true} />
      <AdminMFAGuard>
        <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
          <div className="min-h-screen flex w-full">
            <AppAdminSidebar
              activeTab={activeTab}
              onSelect={handleSelectTab}
              pinned={pinned}
              onTogglePin={togglePin}
              onOpenCommand={() => setCmdOpen(true)}
              counters={counters}
            />

            <SidebarInset className="flex flex-col min-w-0">
              <header className="sticky top-0 z-20 border-b border-border bg-card">
                <div className="flex items-center gap-2 px-4 py-3">
                  <SidebarTrigger />
                  <div className="h-6 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{t.admin.backToSite}</span>
                  </Button>
                  <h1 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2 ml-2 truncate">
                    <Users className="w-5 h-5 text-primary shrink-0" />
                    <span className="truncate">
                      {findTab(activeTab)?.label || t.admin.title}
                    </span>
                  </h1>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCmdOpen(true)}
                      className="hidden md:inline-flex h-8 gap-1 text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Caută</span>
                      <kbd className="ml-1 rounded border bg-muted px-1 text-[10px]">⌘K</kbd>
                    </Button>
                    <LanguageSwitcher />
                    <span className="text-xs text-muted-foreground hidden lg:inline">
                      {user.email}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t.admin.logout}</span>
                    </Button>
                  </div>
                </div>
              </header>

              <main className="flex-1 px-4 py-6 md:px-6 overflow-x-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsContent value="ai-cache"><AICacheManager /></TabsContent>
                  <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
                  <TabsContent value="leads"><LeadsManager /></TabsContent>
                  <TabsContent value="leads-analytics"><LeadsAnalyticsDashboard /></TabsContent>
                  <TabsContent value="bookings"><BookingManager /></TabsContent>
                  <TabsContent value="cazare"><CazareManager /></TabsContent>
                  <TabsContent value="properties"><PropertyManager /></TabsContent>
                  <TabsContent value="investitii-premium"><InvestitiiPremiumManager /></TabsContent>
                  <TabsContent value="blog"><BlogManager /></TabsContent>
                  <TabsContent value="owner-codes"><OwnerCodeManager /></TabsContent>
                  <TabsContent value="maintenance"><MaintenanceManager /></TabsContent>
                  <TabsContent value="newsletter"><NewsletterManager /></TabsContent>
                  <TabsContent value="complexes"><ComplexManager /></TabsContent>
                  <TabsContent value="video-testimonials"><VideoTestimonialsManager /></TabsContent>
                  <TabsContent value="poi"><POIManager /></TabsContent>
                  <TabsContent value="hero-video">
                    <div className="space-y-6">
                      <HeroVideoManager />
                      <HeroTextManager />
                    </div>
                  </TabsContent>
                  <TabsContent value="local-tips"><LocalTipsManager /></TabsContent>
                  <TabsContent value="followup-stats"><FollowupStatsManager /></TabsContent>
                  <TabsContent value="ab-testing"><ABTestManager /></TabsContent>
                  <TabsContent value="reviews"><ReviewsManager /></TabsContent>
                  <TabsContent value="captcha"><CaptchaLogsManager /></TabsContent>
                  <TabsContent value="community"><CommunityManager /></TabsContent>
                  <TabsContent value="cta-analytics"><CtaAnalyticsManager /></TabsContent>
                  <TabsContent value="evaluare-engagement"><EvaluareEngagementManager /></TabsContent>
                  <TabsContent value="funnel-analytics"><FunnelAnalyticsManager /></TabsContent>
                  <TabsContent value="security"><SecurityChecklist /></TabsContent>
                  <TabsContent value="email-campaigns"><EmailCampaignManager /></TabsContent>
                  <TabsContent value="discount-codes"><DiscountCodeManager /></TabsContent>
                  <TabsContent value="property-views"><PropertyViewsManager /></TabsContent>
                  <TabsContent value="ical-sync"><ICalManager /></TabsContent>
                  <TabsContent value="prospects"><ProspectManager /></TabsContent>
                  <TabsContent value="listing-import"><ListingImporter /></TabsContent>
                  <TabsContent value="guest-guides"><GuestGuideManager /></TabsContent>
                  <TabsContent value="catalogs"><CatalogManager /></TabsContent>
                  <TabsContent value="scraper-status"><ScraperStatusDashboard /></TabsContent>
                  <TabsContent value="seo-optimizer"><SEOOptimizerManager /></TabsContent>
                  <TabsContent value="ai-memory">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <VisitorMemoryWidget />
                      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-2">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" /> Cum funcționează
                        </h3>
                        <p className="text-muted-foreground text-xs">
                          Sistemul AI Memory urmărește anonim sesiunile vizitatorilor (proprietăți vizionate, căutări, interacțiuni cu chatbot-ul) și deduce automat preferințe.
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          <li><strong>+5</strong> per proprietate vizionată</li>
                          <li><strong>+3</strong> per căutare semantică</li>
                          <li><strong>+20</strong> dacă a declarat buget</li>
                          <li><strong>+25</strong> dacă este autentificat</li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="photo-studio"><PhotoStudioManager /></TabsContent>
                  <TabsContent value="voice-agent"><VoiceAgentManager /></TabsContent>
                  <TabsContent value="agency-ai"><AgencyDetectionSettings /></TabsContent>
                </Tabs>
              </main>

              <AdminStatusBar
                newLeads={newLeadsCount}
                newScraper={newScraperCount}
                hotProspects={hotProspectsCount}
                onJump={(tab, route) => {
                  if (route) navigate(route);
                  else handleSelectTab(tab);
                }}
              />
            </SidebarInset>
          </div>

          <AdminCommandPalette
            open={cmdOpen}
            onOpenChange={setCmdOpen}
            onSelect={handleSelectTab}
            pinned={pinned}
            onTogglePin={togglePin}
          />
        </SidebarProvider>
      </AdminMFAGuard>
    </div>
  );
};

export default Admin;
