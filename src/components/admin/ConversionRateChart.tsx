import { useMemo } from "react";
import { format, subDays, eachDayOfInterval, startOfDay, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FollowupEmail {
  id: string;
  user_id: string;
  email_type: string;
  sent_at: string;
}

interface Lead {
  id: string;
  email: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
}

interface ConversionRateChartProps {
  followupEmails: FollowupEmail[];
  leads: Lead[];
  profiles: Profile[];
  alertThreshold: number;
  language: "ro" | "en";
}

const ConversionRateChart = ({
  followupEmails,
  leads,
  profiles,
  alertThreshold,
  language,
}: ConversionRateChartProps) => {
  const dateLocale = language === "ro" ? ro : enUS;

  // Calculate daily conversion rate data for the last 60 days
  const conversionRateData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 59),
      end: today,
    });

    // Build a map of user_id -> email
    const userEmailMap = new Map<string, string>();
    profiles.forEach((p) => {
      if (p.email) {
        userEmailMap.set(p.id, p.email.toLowerCase());
      }
    });

    // Build a set of lead emails
    const leadEmails = new Set(
      leads.filter((l) => l.email).map((l) => l.email!.toLowerCase())
    );

    // Track cumulative data for running conversion rate
    let cumulativeUsersContacted = new Set<string>();
    let cumulativeConversions = 0;

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get emails sent up to and including this day
      const emailsUpToDay = followupEmails.filter(
        (e) => new Date(e.sent_at) <= dayEnd
      );

      // Unique users contacted up to this day
      const usersContactedUpToDay = new Set(emailsUpToDay.map((e) => e.user_id));

      // Count conversions: leads whose email matches a contacted user
      const conversionsUpToDay = leads.filter((l) => {
        if (!l.email) return false;
        const leadEmail = l.email.toLowerCase();
        // Check if this lead's email belongs to a contacted user
        for (const userId of usersContactedUpToDay) {
          const userEmail = userEmailMap.get(userId);
          if (userEmail === leadEmail) {
            return true;
          }
        }
        return false;
      }).length;

      // Daily new contacts and conversions
      const dailyEmails = followupEmails.filter((e) => {
        const sentAt = new Date(e.sent_at);
        return sentAt >= dayStart && sentAt < dayEnd;
      });
      const dailyNewContacts = new Set(dailyEmails.map((e) => e.user_id)).size;

      // Calculate cumulative conversion rate
      const cumulativeRate =
        usersContactedUpToDay.size > 0
          ? Math.round((conversionsUpToDay / usersContactedUpToDay.size) * 100)
          : 0;

      return {
        date: format(day, "dd MMM", { locale: dateLocale }),
        fullDate: format(day, "dd MMM yyyy", { locale: dateLocale }),
        conversionRate: cumulativeRate,
        usersContacted: usersContactedUpToDay.size,
        conversions: conversionsUpToDay,
        dailyContacts: dailyNewContacts,
        threshold: alertThreshold,
      };
    });
  }, [followupEmails, leads, profiles, alertThreshold, dateLocale]);

  // Calculate trend (last 7 days vs previous 7 days)
  const trend = useMemo(() => {
    if (conversionRateData.length < 14) return { direction: "neutral", change: 0 };

    const last7 = conversionRateData.slice(-7);
    const prev7 = conversionRateData.slice(-14, -7);

    const last7Avg =
      last7.reduce((sum, d) => sum + d.conversionRate, 0) / last7.length;
    const prev7Avg =
      prev7.reduce((sum, d) => sum + d.conversionRate, 0) / prev7.length;

    const change = Math.round(last7Avg - prev7Avg);

    return {
      direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      change: Math.abs(change),
    };
  }, [conversionRateData]);

  // Current rate (latest data point)
  const currentRate = conversionRateData[conversionRateData.length - 1]?.conversionRate || 0;
  const isAboveThreshold = currentRate >= alertThreshold;

  const tr = {
    ro: {
      title: "Evoluție rată conversie",
      subtitle: "Rata cumulativă de conversie în ultimele 60 de zile",
      currentRate: "Rată curentă",
      threshold: "Prag alertă",
      usersContacted: "Utilizatori contactați",
      conversions: "Conversii",
      trend: "Tendință (7 zile)",
      up: "în creștere",
      down: "în scădere",
      stable: "stabilă",
      noData: "Nu există date suficiente",
    },
    en: {
      title: "Conversion rate evolution",
      subtitle: "Cumulative conversion rate over the last 60 days",
      currentRate: "Current rate",
      threshold: "Alert threshold",
      usersContacted: "Users contacted",
      conversions: "Conversions",
      trend: "Trend (7 days)",
      up: "increasing",
      down: "decreasing",
      stable: "stable",
      noData: "Not enough data",
    },
  };

  const t = tr[language] || tr.en;

  const hasData = conversionRateData.some((d) => d.usersContacted > 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t.title}
            </CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Current rate badge */}
            <Badge
              variant={isAboveThreshold ? "default" : "destructive"}
              className="text-sm px-3 py-1"
            >
              {t.currentRate}: {currentRate}%
            </Badge>
            {/* Trend indicator */}
            <div className="flex items-center gap-1 text-sm">
              {trend.direction === "up" ? (
                <TrendingUp className="w-4 h-4 text-chart-2" />
              ) : trend.direction === "down" ? (
                <TrendingDown className="w-4 h-4 text-destructive" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span
                className={
                  trend.direction === "up"
                    ? "text-chart-2"
                    : trend.direction === "down"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }
              >
                {trend.change > 0 ? `${trend.change}%` : ""}{" "}
                {trend.direction === "up"
                  ? t.up
                  : trend.direction === "down"
                  ? t.down
                  : t.stable}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={conversionRateData}>
                <defs>
                  <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-xs fill-muted-foreground"
                  interval="preserveStartEnd"
                  tickMargin={8}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "conversionRate") return [`${value}%`, t.currentRate];
                    if (name === "threshold") return [`${value}%`, t.threshold];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${data.fullDate}\n${t.usersContacted}: ${data.usersContacted} | ${t.conversions}: ${data.conversions}`;
                    }
                    return label;
                  }}
                />
                {/* Threshold reference line */}
                <ReferenceLine
                  y={alertThreshold}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `${t.threshold}: ${alertThreshold}%`,
                    fill: "hsl(var(--destructive))",
                    fontSize: 12,
                    position: "right",
                  }}
                />
                {/* Area under the line */}
                <Area
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#colorConversion)"
                />
                {/* Main conversion rate line */}
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "hsl(var(--primary))",
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t.noData}
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded bg-primary" />
            <span>{t.currentRate}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-destructive" />
            <span>{t.threshold}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversionRateChart;
