import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Session } from "@supabase/supabase-js";
import {
  ArrowLeft, LogOut, Loader2, Users, ShieldAlert,
  Building, LayoutDashboard, FileText, BarChart3, Key, Wrench,
  Mail, MailCheck, Megaphone, Play, MapPin, Film, Lightbulb,
  FlaskConical, Shield, ShieldCheck, PenLine, MousePointerClick,
  Target, TrendingUp, LinkIcon, Search, Euro, Building2, Hotel,
  Calendar, CalendarDays, Phone, Home, MessageSquare, BookOpen, Sparkles, Zap,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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
import LocalTipsManager from "@/components/admin/LocalTipsManager";
import FollowupStatsManager from "@/components/admin/FollowupStatsManager";
import ABTestManager from "@/components/admin/ABTestManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import CaptchaLogsManager from "@/components/admin/CaptchaLogsManager";
import CommunityManager from "@/components/admin/CommunityManager";
import CtaAnalyticsManager from "@/components/admin/CtaAnalyticsManager";
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
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNewLeadsNotification } from "@/hooks/useNewLeadsNotification";
import { useQuery } from "@tanstack/react-query";

interface Lead {
  id: string;
  name: string;
  whatsapp_number: string;
  property_area: number;
  property_type: string;
  calculated_net_profit: number;
  calculated_yearly_profit: number;
  simulation_data: {
    adr: number;
    occupancy: number;
    cleaningCost: number;
    managementFee: number;
    platformFee: number;
    avgStayDuration: number;
  } | null;
  created_at: string;
}

type LeadFromDB = Omit<Lead, 'simulation_data'> & {
  simulation_data: unknown;
};

const Admin = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole(user);
  const { newLeadsCount } = useNewLeadsNotification(activeTab);

  const { data: newScraperCount = 0 } = useQuery({
    queryKey: ["scraper-leads-new-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("scraper_leads_archive_2026" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 1000 * 60,
    enabled: !!user && isAdmin,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchLeads();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const typedLeads: Lead[] = (data || []).map((lead: LeadFromDB) => ({
        ...lead,
        simulation_data: lead.simulation_data as Lead['simulation_data'],
      }));
      setLeads(typedLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast({
        title: t.admin.error,
        description: t.admin.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      setLeads(leads.filter((lead) => lead.id !== id));
      toast({ title: t.admin.deleteSuccess });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: t.admin.error,
        description: t.admin.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user || isAdminLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Admin Dashboard" noIndex={true} />
      <AdminMFAGuard>
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.admin.backToSite}
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {t.admin.title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t.admin.logout}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border flex flex-wrap h-auto gap-1 p-2 overflow-x-auto max-w-full">
            {/* Alphabetically sorted tabs */}
            <TabsTrigger value="ai-cache" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Cache
            </TabsTrigger>
            <TabsTrigger value="ab-testing" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              A/B Testing
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="prospects" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Bot Prospectare
            </TabsTrigger>
            <TabsTrigger value="captcha" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Captcha
            </TabsTrigger>
            <TabsTrigger value="catalogs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Cataloage PDF
            </TabsTrigger>
            <TabsTrigger value="cazare" className="flex items-center gap-2">
              <Hotel className="w-4 h-4" />
              Cazare
            </TabsTrigger>
            <TabsTrigger value="discount-codes" className="flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Coduri Promo
            </TabsTrigger>
            <TabsTrigger value="owner-codes" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              {t.admin.tabs?.ownerCodes || "Coduri Proprietari"}
            </TabsTrigger>
            <TabsTrigger value="complexes" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Complexe
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Comunitate
            </TabsTrigger>
            <TabsTrigger value="cta-analytics" className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" />
              CTA Analytics
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {t.admin.tabs?.dashboard || "Dashboard"}
            </TabsTrigger>
            <TabsTrigger value="email-campaigns" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Email Marketing
            </TabsTrigger>
            <TabsTrigger value="followup-stats" className="flex items-center gap-2">
              <MailCheck className="w-4 h-4" />
              Follow-up
            </TabsTrigger>
            <TabsTrigger value="funnel-analytics" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Funnel
            </TabsTrigger>
            <TabsTrigger value="hero-video" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Hero Video
            </TabsTrigger>
            <TabsTrigger value="ical-sync" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              iCal Sync
            </TabsTrigger>
            <TabsTrigger value="listing-import" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Import Anunț
            </TabsTrigger>
            <TabsTrigger value="investitii-premium" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Investiții Premium
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2 relative">
              <Users className="w-4 h-4" />
              {t.admin.tabs?.leads || "Lead-uri"}
              {newLeadsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 min-w-5 h-5 text-xs px-1.5 animate-bounce"
                >
                  {newLeadsCount > 99 ? '99+' : newLeadsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              {t.admin.tabs?.maintenance || "Mentenanță"}
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t.admin.tabs?.newsletter || "Newsletter"}
            </TabsTrigger>
            <TabsTrigger value="poi" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              POI
            </TabsTrigger>
            <TabsTrigger value="guest-guides" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Portal Oaspeți
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              {t.admin.tabs?.properties || "Proprietăți"}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {t.admin.tabs?.bookings || "Rezervări"}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="scraper-status" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Scraper Status
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Securitate
            </TabsTrigger>
            <TabsTrigger value="scraper-leads" className="flex items-center gap-2 relative" onClick={() => navigate("/scraper-leads")}>
              <Zap className="w-4 h-4" />
              Oportunități AI
              {newScraperCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 min-w-5 h-5 text-xs px-1.5"
                >
                  {newScraperCount > 99 ? '99+' : newScraperCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="local-tips" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Sfaturi Locale
            </TabsTrigger>
            <TabsTrigger value="video-testimonials" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="property-views" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Vizualizări
            </TabsTrigger>
            <TabsTrigger value="seo-optimizer" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              SEO AI
            </TabsTrigger>
            <TabsTrigger value="ai-memory" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Memory
            </TabsTrigger>
            <TabsTrigger value="photo-studio" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Studio Foto AI
            </TabsTrigger>
            <TabsTrigger value="voice-agent" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Voice Agent
            </TabsTrigger>
            <TabsTrigger value="prospect-listings" className="flex items-center gap-2" onClick={() => navigate("/admin/prospect-listings")}>
              <Phone className="w-4 h-4" />
              Prospect Listings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-cache"><AICacheManager /></TabsContent>
          <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
          <TabsContent value="leads"><LeadsManager /></TabsContent>
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
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cum funcționează</h3>
                <p className="text-muted-foreground text-xs">Sistemul AI Memory urmărește anonim sesiunile vizitatorilor (proprietăți vizionate, căutări, interacțiuni cu chatbot-ul) și deduce automat preferințe: buget, cartiere, tip listare, intenție.</p>
                <p className="text-muted-foreground text-xs">Scor 0-100 indică probabilitatea de conversie. Vizitatorii cu scor &gt; 70 pot fi targetați cu campanii personalizate.</p>
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
        </Tabs>
      </div>
      </AdminMFAGuard>
    </div>
  );
};

export default Admin;
