import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
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
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

      {/* Stats */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {leads.length}
                </p>
                <p className="text-sm text-muted-foreground">{t.admin.totalLeads}</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {leads.length > 0
                    ? Math.round(
                        leads.reduce((acc, l) => acc + l.property_area, 0) /
                          leads.length
                      )
                    : 0}{" "}
                  m²
                </p>
                <p className="text-sm text-muted-foreground">{t.admin.avgArea}</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {leads.length > 0
                    ? Math.round(
                        leads.reduce(
                          (acc, l) => acc + l.calculated_net_profit,
                          0
                        ) / leads.length
                      ).toLocaleString()
                    : 0}{" "}
                  €
                </p>
                <p className="text-sm text-muted-foreground">{t.admin.avgProfit}</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {leads.filter(
                    (l) =>
                      new Date(l.created_at) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">{t.admin.thisWeek}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t.admin.noLeads}
              </h3>
              <p className="text-muted-foreground">
                {t.admin.noLeadsDescription}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.tableHeaders.name}</TableHead>
                  <TableHead>{t.admin.tableHeaders.whatsapp}</TableHead>
                  <TableHead>{t.admin.tableHeaders.property}</TableHead>
                  <TableHead>{t.admin.tableHeaders.estimatedProfit}</TableHead>
                  <TableHead>{t.admin.tableHeaders.date}</TableHead>
                  <TableHead className="w-[80px]">{t.admin.tableHeaders.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <a
                        href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        {lead.whatsapp_number}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {t.admin.propertyTypes[lead.property_type as keyof typeof t.admin.propertyTypes] ||
                            lead.property_type}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({lead.property_area} m²)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-primary">
                          {lead.calculated_net_profit.toLocaleString()} €{t.admin.perMonth}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {lead.calculated_yearly_profit.toLocaleString()} €{t.admin.perYear}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(lead.created_at), "d MMM yyyy, HH:mm", {
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === lead.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.admin.deleteLead}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.admin.deleteDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.admin.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(lead.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.admin.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
