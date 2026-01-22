import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Trash2,
  Users,
  Phone,
  Home,
  Euro,
  Building2,
  Calendar,
  CalendarDays,
  ShieldAlert,
  Building,
  LayoutDashboard,
  FileText,
  Key,
  Wrench,
  Mail,
  MailCheck,
  Play,
  MapPin,
  Film,
  Lightbulb,
  FlaskConical,
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
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
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNewLeadsNotification } from "@/hooks/useNewLeadsNotification";

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
  const dateLocale = language === 'ro' ? ro : enUS;

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
      {/* Header */}
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

      {/* Content with Tabs */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {t.admin.tabs?.dashboard || "Dashboard"}
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2 relative">
              <Users className="w-4 h-4" />
              {t.admin.tabs?.leads || "Leads"}
              {newLeadsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 min-w-5 h-5 text-xs px-1.5 animate-bounce"
                >
                  {newLeadsCount > 99 ? '99+' : newLeadsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {t.admin.tabs?.bookings || "Bookings"}
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              {t.admin.tabs?.properties || "Properties"}
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="owner-codes" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              {t.admin.tabs?.ownerCodes || "Owner Codes"}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              {t.admin.tabs?.maintenance || "Maintenance"}
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t.admin.tabs?.newsletter || "Newsletter"}
            </TabsTrigger>
            <TabsTrigger value="complexes" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Complexe
            </TabsTrigger>
            <TabsTrigger value="video-testimonials" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="poi" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              POI
            </TabsTrigger>
            <TabsTrigger value="hero-video" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Hero Video
            </TabsTrigger>
            <TabsTrigger value="local-tips" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Sfaturi Locale
            </TabsTrigger>
            <TabsTrigger value="followup-stats" className="flex items-center gap-2">
              <MailCheck className="w-4 h-4" />
              Follow-up
            </TabsTrigger>
            <TabsTrigger value="ab-testing" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              A/B Testing
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <LeadsManager />
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <BookingManager />
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <PropertyManager />
          </TabsContent>

          {/* Blog Tab */}
          <TabsContent value="blog">
            <BlogManager />
          </TabsContent>

          {/* Owner Codes Tab */}
          <TabsContent value="owner-codes">
            <OwnerCodeManager />
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <MaintenanceManager />
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>

          {/* Complexes Tab */}
          <TabsContent value="complexes">
            <ComplexManager />
          </TabsContent>

          {/* Video Testimonials Tab */}
          <TabsContent value="video-testimonials">
            <VideoTestimonialsManager />
          </TabsContent>

          {/* POI Tab */}
          <TabsContent value="poi">
            <POIManager />
          </TabsContent>

          {/* Hero Video Tab */}
          <TabsContent value="hero-video">
            <div className="space-y-6">
              <HeroVideoManager />
              <HeroTextManager />
            </div>
          </TabsContent>

          {/* Local Tips Tab */}
          <TabsContent value="local-tips">
            <LocalTipsManager />
          </TabsContent>

          {/* Follow-up Stats Tab */}
          <TabsContent value="followup-stats">
            <FollowupStatsManager />
          </TabsContent>

          {/* A/B Testing Tab */}
          <TabsContent value="ab-testing">
            <ABTestManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
