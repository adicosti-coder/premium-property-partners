import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OwnerOverview from "@/components/owner/OwnerOverview";
import OwnerCalendar from "@/components/owner/OwnerCalendar";
import OwnerFinancials from "@/components/owner/OwnerFinancials";
import OwnerMaintenance from "@/components/owner/OwnerMaintenance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutDashboard, 
  Calendar, 
  TrendingUp, 
  Wrench, 
  LogOut,
  Building2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OwnerProperty {
  id: string;
  property_id: string;
  property: {
    id: string;
    name: string;
    location: string;
    image_path: string | null;
  };
}

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const translations = {
    ro: {
      title: "Portal Proprietar",
      overview: "Sumar",
      calendar: "Calendar",
      financials: "Financiar",
      maintenance: "Mentenanță",
      logout: "Deconectare",
      noProperties: "Nu ai proprietăți asociate",
      noPropertiesDesc: "Contactează RealTrust pentru a primi un cod de înregistrare.",
      selectProperty: "Selectează proprietatea",
      logoutSuccess: "Deconectare reușită",
    },
    en: {
      title: "Owner Portal",
      overview: "Overview",
      calendar: "Calendar",
      financials: "Financials",
      maintenance: "Maintenance",
      logout: "Logout",
      noProperties: "No properties associated",
      noPropertiesDesc: "Contact RealTrust to receive a registration code.",
      selectProperty: "Select property",
      logoutSuccess: "Logout successful",
    },
  };

  const t = translations[language] || translations.ro;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/autentificare-proprietar");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/autentificare-proprietar");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from("owner_properties")
        .select(`
          id,
          property_id,
          property:properties(id, name, location, image_path)
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching properties:", error);
      } else if (data) {
        const formattedData = data.map((item: any) => ({
          id: item.id,
          property_id: item.property_id,
          property: item.property,
        }));
        setProperties(formattedData);
        if (formattedData.length > 0) {
          setSelectedPropertyId(formattedData[0].property_id);
        }
      }
      setIsLoading(false);
    };

    if (user) {
      fetchProperties();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: t.logoutSuccess });
    navigate("/autentificare-proprietar");
  };

  const selectedProperty = properties.find(p => p.property_id === selectedPropertyId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6">
            <Skeleton className="h-10 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  {t.title}
                </h1>
                {selectedProperty && (
                  <p className="text-muted-foreground">
                    {selectedProperty.property.name} • {selectedProperty.property.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {properties.length > 1 && (
                <select
                  value={selectedPropertyId || ""}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-foreground"
                >
                  {properties.map((p) => (
                    <option key={p.property_id} value={p.property_id}>
                      {p.property.name}
                    </option>
                  ))}
                </select>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t.logout}
              </Button>
            </div>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-border">
              <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t.noProperties}
              </h2>
              <p className="text-muted-foreground">{t.noPropertiesDesc}</p>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutDashboard className="w-4 h-4 hidden sm:block" />
                  {t.overview}
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <Calendar className="w-4 h-4 hidden sm:block" />
                  {t.calendar}
                </TabsTrigger>
                <TabsTrigger value="financials" className="gap-2">
                  <TrendingUp className="w-4 h-4 hidden sm:block" />
                  {t.financials}
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="gap-2">
                  <Wrench className="w-4 h-4 hidden sm:block" />
                  {t.maintenance}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {selectedPropertyId && (
                  <OwnerOverview propertyId={selectedPropertyId} />
                )}
              </TabsContent>

              <TabsContent value="calendar">
                {selectedPropertyId && (
                  <OwnerCalendar propertyId={selectedPropertyId} />
                )}
              </TabsContent>

              <TabsContent value="financials">
                {selectedPropertyId && (
                  <OwnerFinancials propertyId={selectedPropertyId} />
                )}
              </TabsContent>

              <TabsContent value="maintenance">
                {selectedPropertyId && (
                  <OwnerMaintenance propertyId={selectedPropertyId} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
