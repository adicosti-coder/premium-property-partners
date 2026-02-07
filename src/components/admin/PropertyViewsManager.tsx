import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ro } from "date-fns/locale";

interface PropertyStats {
  property_id: string;
  property_name: string;
  property_code: string | null;
  total_views: number;
  unique_sessions: number;
  views_today: number;
  views_week: number;
  views_month: number;
}

const PropertyViewsManager = () => {
  const [stats, setStats] = useState<PropertyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>("30");
  const [totalViews, setTotalViews] = useState(0);
  const [totalUnique, setTotalUnique] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(period));
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      // Fetch all properties
      const { data: properties } = await supabase
        .from("properties")
        .select("id, name, property_code")
        .eq("is_active", true)
        .order("display_order");

      if (!properties) {
        setStats([]);
        setIsLoading(false);
        return;
      }

      // Fetch all views in period
      const { data: views } = await supabase
        .from("property_views")
        .select("property_id, session_id, viewed_at")
        .gte("viewed_at", startDate.toISOString());

      const propertyStats: PropertyStats[] = properties.map((prop) => {
        const propViews = views?.filter((v) => v.property_id === prop.id) || [];
        const uniqueSessions = new Set(propViews.map((v) => v.session_id)).size;
        
        const viewsToday = propViews.filter(
          (v) => new Date(v.viewed_at) >= today
        ).length;
        
        const viewsWeek = propViews.filter(
          (v) => new Date(v.viewed_at) >= weekAgo
        ).length;
        
        const viewsMonth = propViews.filter(
          (v) => new Date(v.viewed_at) >= monthAgo
        ).length;

        return {
          property_id: prop.id,
          property_name: prop.name,
          property_code: prop.property_code,
          total_views: propViews.length,
          unique_sessions: uniqueSessions,
          views_today: viewsToday,
          views_week: viewsWeek,
          views_month: viewsMonth,
        };
      });

      // Sort by total views descending
      propertyStats.sort((a, b) => b.total_views - a.total_views);

      setStats(propertyStats);
      setTotalViews(views?.length || 0);
      setTotalUnique(new Set(views?.map((v) => v.session_id) || []).size);
    } catch (error) {
      console.error("Error fetching property stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceBadge = (views: number, maxViews: number) => {
    if (maxViews === 0) return <Badge variant="secondary">-</Badge>;
    const percentage = (views / maxViews) * 100;
    if (percentage >= 80) return <Badge className="bg-green-500">Top</Badge>;
    if (percentage >= 50) return <Badge className="bg-blue-500">Bun</Badge>;
    if (percentage >= 20) return <Badge className="bg-yellow-500">Mediu</Badge>;
    return <Badge variant="destructive">Slab</Badge>;
  };

  const maxViews = Math.max(...stats.map((s) => s.total_views), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Statistici Vizualizări Proprietăți
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ultimele 7 zile</SelectItem>
            <SelectItem value="30">Ultimele 30 zile</SelectItem>
            <SelectItem value="90">Ultimele 90 zile</SelectItem>
            <SelectItem value="365">Ultimul an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Vizualizări
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalViews.toLocaleString("ro-RO")}</div>
            <p className="text-xs text-muted-foreground">în perioada selectată</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Vizitatori Unici
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUnique.toLocaleString("ro-RO")}</div>
            <p className="text-xs text-muted-foreground">sesiuni distincte</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Medie/Proprietate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.length > 0 ? Math.round(totalViews / stats.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">vizualizări</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Proprietăți Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.length}</div>
            <p className="text-xs text-muted-foreground">în portofoliu</p>
          </CardContent>
        </Card>
      </div>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performanță pe Proprietăți</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cod</TableHead>
                  <TableHead>Proprietate</TableHead>
                  <TableHead className="text-right">Azi</TableHead>
                  <TableHead className="text-right">7 Zile</TableHead>
                  <TableHead className="text-right">30 Zile</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Unici</TableHead>
                  <TableHead className="text-center">Performanță</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.property_id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {stat.property_code || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {stat.property_name}
                    </TableCell>
                    <TableCell className="text-right">{stat.views_today}</TableCell>
                    <TableCell className="text-right">{stat.views_week}</TableCell>
                    <TableCell className="text-right">{stat.views_month}</TableCell>
                    <TableCell className="text-right font-semibold">{stat.total_views}</TableCell>
                    <TableCell className="text-right">{stat.unique_sessions}</TableCell>
                    <TableCell className="text-center">
                      {getPerformanceBadge(stat.total_views, maxViews)}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nu există date de vizualizare încă
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyViewsManager;
