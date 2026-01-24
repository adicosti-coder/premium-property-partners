import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, Calendar, ExternalLink, Mail, FileText, TrendingUp, BarChart3 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface CtaAnalytic {
  id: string;
  cta_type: string;
  page_path: string;
  property_id: string | null;
  property_name: string | null;
  created_at: string;
}

const CTA_COLORS: Record<string, string> = {
  call: "#3b82f6",
  whatsapp: "#25D366",
  booking: "#f59e0b",
  airbnb: "#FF5A5F",
  email: "#6366f1",
  form_submit: "#8b5cf6",
};

const CTA_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  booking: <Calendar className="w-4 h-4" />,
  airbnb: <ExternalLink className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  form_submit: <FileText className="w-4 h-4" />,
};

const CtaAnalyticsManager = () => {
  const [dateRange, setDateRange] = useState("7");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["cta-analytics", dateRange],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      const endDate = endOfDay(new Date());

      const { data, error } = await supabase
        .from("cta_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CtaAnalytic[];
    },
  });

  // Aggregate data by CTA type
  const ctaTypeCounts = analytics?.reduce((acc, item) => {
    acc[item.cta_type] = (acc[item.cta_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Aggregate data by page
  const pageCounts = analytics?.reduce((acc, item) => {
    const page = item.page_path === "/" ? "Homepage" : item.page_path;
    acc[page] = (acc[page] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Aggregate data by day
  const dailyCounts = analytics?.reduce((acc, item) => {
    const day = format(new Date(item.created_at), "MM/dd");
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Property interactions
  const propertyCounts = analytics
    ?.filter((item) => item.property_name)
    .reduce((acc, item) => {
      acc[item.property_name!] = (acc[item.property_name!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

  const pieData = Object.entries(ctaTypeCounts).map(([name, value]) => ({
    name: name.replace("_", " ").toUpperCase(),
    value,
    color: CTA_COLORS[name] || "#94a3b8",
  }));

  const barData = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .reverse();

  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topProperties = Object.entries(propertyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const totalClicks = analytics?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            CTA Analytics
          </h2>
          <p className="text-muted-foreground">Track conversion button interactions</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-3xl font-bold">{totalClicks}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        {Object.entries(ctaTypeCounts).slice(0, 3).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{type.replace("_", " ")}</p>
                  <p className="text-3xl font-bold">{count}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${CTA_COLORS[type]}20`, color: CTA_COLORS[type] }}
                >
                  {CTA_ICONS[type]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CTA Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>CTA Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPages.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                topPages.map(([page, count], index) => (
                  <div key={page} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[200px]">{page}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Top Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProperties.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No property-specific data yet</p>
              ) : (
                topProperties.map(([property, count], index) => (
                  <div key={property} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm truncate max-w-[200px]">{property}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analytics?.slice(0, 20).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: `${CTA_COLORS[item.cta_type] || "#94a3b8"}20`,
                      color: CTA_COLORS[item.cta_type] || "#94a3b8",
                    }}
                  >
                    {CTA_ICONS[item.cta_type] || <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{item.cta_type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.property_name || item.page_path}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(item.created_at), "MMM d, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CtaAnalyticsManager;