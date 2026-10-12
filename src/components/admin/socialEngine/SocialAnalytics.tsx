import { useMemo } from "react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ro } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, BarChart3, PieChart as PieIcon, Activity } from "lucide-react";

type Post = {
  id: string;
  title: string;
  type: string;
  status: string;
  posted_to: string[];
  created_at: string;
  scheduled_at: string | null;
  caption: string;
  updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  "Ciorne": "hsl(var(--warning))",
  "Programate": "hsl(var(--accent))",
  "Publicate": "hsl(var(--success))",
};

const TYPE_COLORS: Record<string, string> = {
  "Proprietăți": "hsl(var(--accent))",
  "Blog": "hsl(var(--primary))",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
};

export function SocialAnalytics({ posts }: { posts: Post[] }) {
  const statusData = useMemo(() => [
    { name: "Ciorne", value: posts.filter(p => p.status === "draft").length },
    { name: "Programate", value: posts.filter(p => p.status === "scheduled").length },
    { name: "Publicate", value: posts.filter(p => p.status === "posted").length },
  ].filter(d => d.value > 0), [posts]);

  const typeData = useMemo(() => [
    { name: "Proprietăți", value: posts.filter(p => p.type === "property").length },
    { name: "Blog", value: posts.filter(p => p.type === "blog").length },
  ].filter(d => d.value > 0), [posts]);

  const platformData = useMemo(() => {
    let ig = 0, fb = 0;
    posts.forEach(p => {
      if (p.posted_to.includes("instagram")) ig++;
      if (p.posted_to.includes("facebook")) fb++;
    });
    return [
      { name: "Instagram", value: ig },
      { name: "Facebook", value: fb },
    ].filter(d => d.value > 0);
  }, [posts]);

  const timelineData = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, 29);
    const days = eachDayOfInterval({ start, end });
    const map = new Map<string, { created: number; posted: number }>();
    days.forEach(d => {
      map.set(format(d, "yyyy-MM-dd"), { created: 0, posted: 0 });
    });
    posts.forEach(p => {
      const key = format(new Date(p.created_at), "yyyy-MM-dd");
      if (map.has(key)) map.get(key)!.created++;
      if (p.status === "posted") {
        const pKey = format(new Date(p.updated_at || p.created_at), "yyyy-MM-dd");
        if (map.has(pKey)) map.get(pKey)!.posted++;
      }
    });
    return days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      const entry = map.get(key)!;
      return { date: format(d, "dd MMM", { locale: ro }), created: entry.created, posted: entry.posted };
    });
  }, [posts]);

  const captionRate = useMemo(() => {
    if (posts.length === 0) return 0;
    return Math.round((posts.filter(p => p.caption && p.caption.trim().length > 0).length / posts.length) * 100);
  }, [posts]);

  const postRate = useMemo(() => {
    if (posts.length === 0) return 0;
    return Math.round((posts.filter(p => p.status === "posted").length / posts.length) * 100);
  }, [posts]);

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Nu există date suficiente pentru grafice. Adaugă postări pentru a vedea statisticile.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Rată Publicare", value: `${postRate}%`, icon: TrendingUp, desc: "din totalul postărilor" },
          { label: "Rată Descrieri AI", value: `${captionRate}%`, icon: Activity, desc: "postări cu descriere" },
          { label: "Platforme Active", value: platformData.length.toString(), icon: BarChart3, desc: "canale sociale" },
          { label: "Tipuri Conținut", value: typeData.length.toString(), icon: PieIcon, desc: "categorii" },
        ].map((kpi, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <kpi.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-foreground">Activitate Ultimele 30 Zile</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPosted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="created" name="Create" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorCreated)" strokeWidth={2} />
              <Area type="monotone" dataKey="posted" name="Publicate" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorPosted)" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Status Pie */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-foreground">După Status</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type Pie */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-foreground">După Tip</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                  {typeData.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Bar */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-foreground">După Platformă</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" name="Postări" radius={[4, 4, 0, 0]}>
                  {platformData.map((entry) => (
                    <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name.toLowerCase()] || "hsl(var(--accent))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
