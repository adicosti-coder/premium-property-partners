import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  TrendingUp, 
  MousePointer, 
  Clock, 
  Layers, 
  BarChart3,
  ArrowDown,
  Users,
  Percent,
  Activity
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
  Cell
} from "recharts";

interface AnalyticsRecord {
  id: string;
  cta_type: string;
  page_path: string;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const FUNNEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const FunnelAnalyticsManager = () => {
  const [dateRange, setDateRange] = useState("7");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["funnel-analytics", dateRange],
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
      return data as AnalyticsRecord[];
    },
  });

  // Process data for different analytics views
  const processedData = useMemo(() => {
    if (!analytics) return null;

    // Session analytics
    const sessionEndEvents = analytics.filter(a => a.cta_type === "session_end");
    const sessions = sessionEndEvents.map(event => {
      const meta = event.metadata || {};
      return {
        id: event.session_id,
        duration: (meta.duration as number) || 0,
        pagesVisited: (meta.pagesVisited as number) || 1,
        interactions: (meta.totalInteractions as number) || 0,
        maxScrollDepth: (meta.maxScrollDepth as number) || 0,
        timestamp: event.created_at,
      };
    });

    // Scroll depth analysis
    const scrollMilestones = sessionEndEvents.reduce((acc, event) => {
      const milestones = ((event.metadata?.scrollMilestones as number[]) || []);
      milestones.forEach(m => {
        acc[m] = (acc[m] || 0) + 1;
      });
      return acc;
    }, {} as Record<number, number>);

    // Funnel analysis
    const funnelEvents = analytics.filter(a => a.cta_type === "funnel_step" || a.cta_type === "funnel_complete");
    const funnelsByName = funnelEvents.reduce((acc, event) => {
      const name = (event.metadata?.funnelName as string) || "default";
      if (!acc[name]) acc[name] = [];
      acc[name].push(event);
      return acc;
    }, {} as Record<string, AnalyticsRecord[]>);

    // A/B test results
    const abAssignments = analytics.filter(a => a.cta_type === "ab_assignment");
    const abConversions = analytics.filter(a => a.cta_type === "ab_conversion");
    
    const abTests = abAssignments.reduce((acc, event) => {
      const testName = (event.metadata?.testName as string) || "unknown";
      const variant = (event.metadata?.variant as string) || "unknown";
      
      if (!acc[testName]) acc[testName] = {};
      if (!acc[testName][variant]) acc[testName][variant] = { assignments: 0, conversions: 0 };
      acc[testName][variant].assignments += 1;
      
      return acc;
    }, {} as Record<string, Record<string, { assignments: number; conversions: number }>>);

    abConversions.forEach(event => {
      const testName = (event.metadata?.testName as string) || "unknown";
      const variant = (event.metadata?.variant as string) || "unknown";
      
      if (abTests[testName]?.[variant]) {
        abTests[testName][variant].conversions += 1;
      }
    });

    // Page analytics with scroll depth
    const pageAnalytics = analytics
      .filter(a => a.cta_type === "session_end" && a.metadata?.pages)
      .flatMap(event => {
        const pages = (event.metadata?.pages as Array<{
          path: string;
          duration: number;
          scrollDepth: number;
          interactions: number;
        }>) || [];
        return pages;
      })
      .reduce((acc, page) => {
        if (!acc[page.path]) {
          acc[page.path] = {
            views: 0,
            totalDuration: 0,
            totalScrollDepth: 0,
            totalInteractions: 0,
          };
        }
        acc[page.path].views += 1;
        acc[page.path].totalDuration += page.duration;
        acc[page.path].totalScrollDepth += page.scrollDepth;
        acc[page.path].totalInteractions += page.interactions;
        return acc;
      }, {} as Record<string, { views: number; totalDuration: number; totalScrollDepth: number; totalInteractions: number }>);

    // Daily engagement trend
    const dailyEngagement = analytics
      .filter(a => a.cta_type === "session_end")
      .reduce((acc, event) => {
        const day = format(new Date(event.created_at), "MM/dd");
        if (!acc[day]) {
          acc[day] = { sessions: 0, avgDuration: 0, avgScrollDepth: 0, totalDuration: 0, totalScrollDepth: 0 };
        }
        acc[day].sessions += 1;
        acc[day].totalDuration += (event.metadata?.duration as number) || 0;
        acc[day].totalScrollDepth += (event.metadata?.maxScrollDepth as number) || 0;
        return acc;
      }, {} as Record<string, { sessions: number; avgDuration: number; avgScrollDepth: number; totalDuration: number; totalScrollDepth: number }>);

    Object.values(dailyEngagement).forEach(day => {
      day.avgDuration = day.sessions > 0 ? Math.round(day.totalDuration / day.sessions / 1000) : 0;
      day.avgScrollDepth = day.sessions > 0 ? Math.round(day.totalScrollDepth / day.sessions) : 0;
    });

    return {
      sessions,
      scrollMilestones,
      funnelsByName,
      abTests,
      pageAnalytics,
      dailyEngagement,
    };
  }, [analytics]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!processedData) return null;

    const { sessions } = processedData;
    const totalSessions = sessions.length;
    const avgDuration = totalSessions > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions / 1000)
      : 0;
    const avgScrollDepth = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.maxScrollDepth, 0) / totalSessions)
      : 0;
    const avgInteractions = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.interactions, 0) / totalSessions)
      : 0;

    // Bounce rate (sessions with only 1 page visited)
    const bounces = sessions.filter(s => s.pagesVisited <= 1).length;
    const bounceRate = totalSessions > 0 ? Math.round((bounces / totalSessions) * 100) : 0;

    return {
      totalSessions,
      avgDuration,
      avgScrollDepth,
      avgInteractions,
      bounceRate,
    };
  }, [processedData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const engagementChartData = processedData?.dailyEngagement
    ? Object.entries(processedData.dailyEngagement)
        .map(([date, data]) => ({
          date,
          sessions: data.sessions,
          avgDuration: data.avgDuration,
          avgScrollDepth: data.avgScrollDepth,
        }))
        .reverse()
    : [];

  const scrollDepthData = processedData?.scrollMilestones
    ? [
        { depth: "25%", count: processedData.scrollMilestones[25] || 0 },
        { depth: "50%", count: processedData.scrollMilestones[50] || 0 },
        { depth: "75%", count: processedData.scrollMilestones[75] || 0 },
        { depth: "100%", count: processedData.scrollMilestones[100] || 0 },
      ]
    : [];

  const pageTableData = processedData?.pageAnalytics
    ? Object.entries(processedData.pageAnalytics)
        .map(([path, data]) => ({
          path: path === "/" ? "Homepage" : path,
          views: data.views,
          avgDuration: Math.round(data.totalDuration / data.views / 1000),
          avgScrollDepth: Math.round(data.totalScrollDepth / data.views),
          avgInteractions: Math.round(data.totalInteractions / data.views),
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Conversion & Funnel Analytics
          </h2>
          <p className="text-muted-foreground">Session tracking, scroll depth, and conversion funnels</p>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-3xl font-bold">{summaryMetrics?.totalSessions || 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-3xl font-bold">{summaryMetrics?.avgDuration || 0}s</p>
              </div>
              <Clock className="w-8 h-8 text-chart-2 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Scroll</p>
                <p className="text-3xl font-bold">{summaryMetrics?.avgScrollDepth || 0}%</p>
              </div>
              <ArrowDown className="w-8 h-8 text-chart-3 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Clicks</p>
                <p className="text-3xl font-bold">{summaryMetrics?.avgInteractions || 0}</p>
              </div>
              <MousePointer className="w-8 h-8 text-chart-4 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="text-3xl font-bold">{summaryMetrics?.bounceRate || 0}%</p>
              </div>
              <Percent className="w-8 h-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scroll" className="gap-2">
            <ArrowDown className="w-4 h-4" />
            Scroll Depth
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2">
            <Layers className="w-4 h-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="abtests" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            A/B Tests
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Engagement Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={engagementChartData}>
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
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.2}
                      name="Sessions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Duration & Scroll Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Duration & Scroll Depth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={engagementChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="avgDuration" 
                      fill="hsl(var(--chart-2))" 
                      radius={[4, 4, 0, 0]}
                      name="Avg Duration (s)"
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="avgScrollDepth" 
                      fill="hsl(var(--chart-3))" 
                      radius={[4, 4, 0, 0]}
                      name="Avg Scroll (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scroll Depth Tab */}
        <TabsContent value="scroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDown className="w-5 h-5" />
                Scroll Depth Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scrollDepthData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="depth" className="text-xs" width={50} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {scrollDepthData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  <h4 className="font-semibold">Scroll Funnel Analysis</h4>
                  {scrollDepthData.map((item, index) => {
                    const prevCount = index > 0 ? scrollDepthData[index - 1].count : summaryMetrics?.totalSessions || 0;
                    const dropOff = prevCount > 0 ? Math.round(((prevCount - item.count) / prevCount) * 100) : 0;
                    
                    return (
                      <div key={item.depth} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
                          />
                          <span className="font-medium">{item.depth}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{item.count} users</Badge>
                          {index > 0 && (
                            <span className="text-sm text-destructive">-{dropOff}%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Page Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Page</th>
                      <th className="text-right py-3 px-4 font-medium">Views</th>
                      <th className="text-right py-3 px-4 font-medium">Avg Duration</th>
                      <th className="text-right py-3 px-4 font-medium">Avg Scroll</th>
                      <th className="text-right py-3 px-4 font-medium">Avg Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageTableData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No page data yet
                        </td>
                      </tr>
                    ) : (
                      pageTableData.map((page, index) => (
                        <tr key={page.path} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <span className="truncate max-w-[200px]">{page.path}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            <Badge variant="secondary">{page.views}</Badge>
                          </td>
                          <td className="text-right py-3 px-4">{page.avgDuration}s</td>
                          <td className="text-right py-3 px-4">
                            <span className={page.avgScrollDepth >= 75 ? "text-green-500" : page.avgScrollDepth >= 50 ? "text-yellow-500" : "text-red-500"}>
                              {page.avgScrollDepth}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">{page.avgInteractions}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Tests Tab */}
        <TabsContent value="abtests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                A/B Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!processedData?.abTests || Object.keys(processedData.abTests).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No A/B tests running yet</p>
                  <p className="text-sm mt-2">Use useABTest hook to create tests</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(processedData.abTests).map(([testName, variants]) => (
                    <div key={testName} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-4">{testName}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(variants).map(([variant, data]) => {
                          const conversionRate = data.assignments > 0 
                            ? ((data.conversions / data.assignments) * 100).toFixed(1) 
                            : "0";
                          
                          return (
                            <div 
                              key={variant} 
                              className="p-4 rounded-lg bg-muted/50 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">{variant}</p>
                                <p className="text-sm text-muted-foreground">
                                  {data.assignments} users · {data.conversions} conversions
                                </p>
                              </div>
                              <Badge 
                                variant={parseFloat(conversionRate) > 5 ? "default" : "secondary"}
                                className="text-lg"
                              >
                                {conversionRate}%
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FunnelAnalyticsManager;
