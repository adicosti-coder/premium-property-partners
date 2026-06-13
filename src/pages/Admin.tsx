import { useState, useEffect, useCallback, Suspense } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
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
import { useAdminRecentTabs } from "@/hooks/useAdminRecentTabs";
import AdminMFAGuard from "@/components/admin/AdminMFAGuard";
import { getAdminTabComponent, prefetchAdminTab } from "@/components/admin/adminTabLoaders";
import { AdminTabFallback } from "@/components/admin/AdminTabFallback";
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
  const { recent } = useAdminRecentTabs(activeTab);

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

  // Scroll to URL hash anchor (e.g. #cron-monitor) once the tab content mounts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) return;
    const t = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
    return () => clearTimeout(t);
  }, [activeTab]);

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
    prospectPipeline: newScraperCount + hotProspectsCount,
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
                    <ThemeToggle />
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
                <ActiveTabRenderer activeTab={activeTab} />
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

/**
 * Randează doar tab-ul activ, lazy din `adminTabLoaders`.
 * Avantaj cheie: bundle-ul inițial al /admin scade de la ~45 manageri statici
 * la doar shell + chunk-ul tab-ului curent. Restul se descarcă on-demand
 * (sau pe hover, via `prefetchAdminTab`).
 */
function ActiveTabRenderer({ activeTab }: { activeTab: string }) {
  const Component = getAdminTabComponent(activeTab);
  if (!Component) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        Secțiune necunoscută: <code>{activeTab}</code>
      </div>
    );
  }
  return (
    <Suspense fallback={<AdminTabFallback />}>
      <Component />
    </Suspense>
  );
}

export default Admin;

