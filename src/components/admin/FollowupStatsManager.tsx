import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, MailCheck, TrendingUp, Users, Target, RefreshCw, ArrowRight, Gift } from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfDay, parseISO, differenceInDays } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "@/hooks/use-toast";

interface FollowupEmail {
  id: string;
  user_id: string;
  simulation_id: string | null;
  email_type: string;
  sent_at: string;
  created_at: string;
}

interface Lead {
  id: string;
  email: string | null;
  created_at: string;
}

interface UserSimulation {
  id: string;
  user_id: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const FollowupStatsManager = () => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const [followupEmails, setFollowupEmails] = useState<FollowupEmail[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [simulations, setSimulations] = useState<UserSimulation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [emailsRes, leadsRes, simsRes, profilesRes] = await Promise.all([
        supabase.from("simulation_followup_emails").select("*").order("sent_at", { ascending: false }),
        supabase.from("leads").select("id, email, created_at"),
        supabase.from("user_simulations").select("id, user_id, created_at"),
        supabase.from("profiles").select("id, email"),
      ]);

      if (emailsRes.data) setFollowupEmails(emailsRes.data);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (simsRes.data) setSimulations(simsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    } catch (error) {
      console.error("Error fetching followup stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger followup job manually
  const handleTriggerFollowup = async () => {
    setIsTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-simulation-followup");
      
      if (error) throw error;
      
      toast({
        title: language === "ro" ? "Job executat" : "Job executed",
        description: language === "ro" 
          ? `Trimise: ${data.totalSent || 0} email-uri (${data.firstEmailsSent || 0} primare, ${data.secondEmailsSent || 0} ofertă specială)`
          : `Sent: ${data.totalSent || 0} emails (${data.firstEmailsSent || 0} first, ${data.secondEmailsSent || 0} special offer)`,
      });
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error triggering followup:", error);
      toast({
        title: language === "ro" ? "Eroare" : "Error",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalEmailsSent = followupEmails.length;
    const firstFollowups = followupEmails.filter(e => e.email_type === "first_followup").length;
    const secondFollowups = followupEmails.filter(e => e.email_type === "second_followup").length;
    
    // Users who received emails
    const usersWithEmails = new Set(followupEmails.map(e => e.user_id));
    
    // Get profiles with emails for those users
    const emailedUserEmails = new Set(
      profiles
        .filter(p => usersWithEmails.has(p.id) && p.email)
        .map(p => p.email!.toLowerCase())
    );
    
    // Leads from users who received follow-up emails
    const leadsFromFollowups = leads.filter(l => 
      l.email && emailedUserEmails.has(l.email.toLowerCase())
    );
    
    // Conversion rate
    const conversionRate = usersWithEmails.size > 0 
      ? Math.round((leadsFromFollowups.length / usersWithEmails.size) * 100)
      : 0;
    
    // Users with simulations who haven't received any email yet
    const usersWithSimulations = new Set(simulations.map(s => s.user_id));
    const pendingUsers = [...usersWithSimulations].filter(u => !usersWithEmails.has(u)).length;
    
    // Average days between email and lead conversion
    const conversionDays: number[] = [];
    leadsFromFollowups.forEach(lead => {
      if (!lead.email) return;
      const userProfile = profiles.find(p => p.email?.toLowerCase() === lead.email?.toLowerCase());
      if (!userProfile) return;
      
      const userEmails = followupEmails.filter(e => e.user_id === userProfile.id);
      if (userEmails.length === 0) return;
      
      const firstEmail = userEmails.reduce((earliest, e) => 
        new Date(e.sent_at) < new Date(earliest.sent_at) ? e : earliest
      );
      
      const days = differenceInDays(parseISO(lead.created_at), parseISO(firstEmail.sent_at));
      if (days >= 0) conversionDays.push(days);
    });
    
    const avgConversionDays = conversionDays.length > 0
      ? Math.round(conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length)
      : 0;

    return {
      totalEmailsSent,
      firstFollowups,
      secondFollowups,
      usersReached: usersWithEmails.size,
      conversions: leadsFromFollowups.length,
      conversionRate,
      pendingUsers,
      avgConversionDays,
    };
  }, [followupEmails, leads, simulations, profiles]);

  // Daily emails sent (last 30 days)
  const dailyData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 29),
      end: today,
    });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const firstCount = followupEmails.filter(e => {
        const sentAt = new Date(e.sent_at);
        return sentAt >= dayStart && sentAt < dayEnd && e.email_type === "first_followup";
      }).length;

      const secondCount = followupEmails.filter(e => {
        const sentAt = new Date(e.sent_at);
        return sentAt >= dayStart && sentAt < dayEnd && e.email_type === "second_followup";
      }).length;

      return {
        date: format(day, "dd MMM", { locale: dateLocale }),
        first: firstCount,
        second: secondCount,
        total: firstCount + secondCount,
      };
    });
  }, [followupEmails, dateLocale]);

  // Email type distribution
  const emailTypeData = useMemo(() => [
    { name: language === "ro" ? "Primul follow-up" : "First follow-up", value: stats.firstFollowups },
    { name: language === "ro" ? "Ofertă specială" : "Special offer", value: stats.secondFollowups },
  ], [stats, language]);

  // Funnel data
  const funnelData = useMemo(() => {
    const usersWithSims = new Set(simulations.map(s => s.user_id)).size;
    return [
      { 
        name: language === "ro" ? "Simulări salvate" : "Saved simulations", 
        value: usersWithSims,
        fill: "hsl(var(--chart-3))",
      },
      { 
        name: language === "ro" ? "Email-uri trimise" : "Emails sent", 
        value: stats.usersReached,
        fill: "hsl(var(--primary))",
      },
      { 
        name: language === "ro" ? "Lead-uri generate" : "Leads generated", 
        value: stats.conversions,
        fill: "hsl(var(--chart-2))",
      },
    ];
  }, [simulations, stats, language]);

  const tr = {
    ro: {
      title: "Statistici Follow-up Email",
      subtitle: "Monitorizează email-urile de follow-up și conversia în lead-uri",
      totalSent: "Email-uri trimise",
      usersReached: "Utilizatori contactați",
      conversions: "Conversii în lead",
      conversionRate: "Rată conversie",
      pending: "În așteptare",
      avgDays: "Zile medii până la conversie",
      dailyTrend: "Tendință zilnică (30 zile)",
      emailTypes: "Tipuri email-uri",
      funnel: "Funnel conversie",
      triggerNow: "Rulează acum",
      refresh: "Reîmprospătează",
      first: "Primul email",
      second: "Ofertă specială",
      noData: "Nu există date",
    },
    en: {
      title: "Follow-up Email Stats",
      subtitle: "Monitor follow-up emails and lead conversion",
      totalSent: "Emails sent",
      usersReached: "Users reached",
      conversions: "Lead conversions",
      conversionRate: "Conversion rate",
      pending: "Pending",
      avgDays: "Avg days to conversion",
      dailyTrend: "Daily trend (30 days)",
      emailTypes: "Email types",
      funnel: "Conversion funnel",
      triggerNow: "Run now",
      refresh: "Refresh",
      first: "First email",
      second: "Special offer",
      noData: "No data",
    },
  };

  const t = tr[language] || tr.en;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t.refresh}
          </Button>
          <Button size="sm" onClick={handleTriggerFollowup} disabled={isTriggering}>
            {isTriggering ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {t.triggerNow}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.totalEmailsSent}
                </p>
                <p className="text-sm text-muted-foreground">{t.totalSent}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {stats.firstFollowups} {t.first}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Gift className="w-3 h-3 mr-1" />
                {stats.secondFollowups}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-chart-2/10">
                <Users className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.usersReached}
                </p>
                <p className="text-sm text-muted-foreground">{t.usersReached}</p>
              </div>
            </div>
            <div className="mt-3">
              <Badge variant="outline" className="text-xs">
                {stats.pendingUsers} {t.pending}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-chart-3/10">
                <MailCheck className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.conversions}
                </p>
                <p className="text-sm text-muted-foreground">{t.conversions}</p>
              </div>
            </div>
            {stats.avgConversionDays > 0 && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">
                  ~{stats.avgConversionDays} {t.avgDays}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-chart-4/10">
                <Target className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {stats.conversionRate}%
                </p>
                <p className="text-sm text-muted-foreground">{t.conversionRate}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t.dailyTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats.totalEmailsSent > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorFirst" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSecond" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="first"
                      name={t.first}
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorFirst)"
                    />
                    <Area
                      type="monotone"
                      dataKey="second"
                      name={t.second}
                      stroke="hsl(var(--chart-2))"
                      fillOpacity={1}
                      fill="url(#colorSecond)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5 text-primary" />
              {t.emailTypes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {stats.totalEmailsSent > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emailTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {emailTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRight className="w-5 h-5 text-primary" />
              {t.funnel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs fill-muted-foreground"
                    width={130}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === "ro" ? "Email-uri recente" : "Recent emails"}
          </CardTitle>
          <CardDescription>
            {language === "ro" ? "Ultimele 10 email-uri trimise" : "Last 10 emails sent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followupEmails.length > 0 ? (
            <div className="space-y-3">
              {followupEmails.slice(0, 10).map((email) => {
                const profile = profiles.find(p => p.id === email.user_id);
                return (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        email.email_type === "second_followup" 
                          ? "bg-chart-2/10" 
                          : "bg-primary/10"
                      }`}>
                        {email.email_type === "second_followup" ? (
                          <Gift className={`w-4 h-4 text-chart-2`} />
                        ) : (
                          <Mail className={`w-4 h-4 text-primary`} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {profile?.email || email.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(email.sent_at), "dd MMM yyyy, HH:mm", { locale: dateLocale })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={email.email_type === "second_followup" ? "default" : "secondary"}>
                      {email.email_type === "second_followup" 
                        ? (language === "ro" ? "Ofertă specială" : "Special offer")
                        : (language === "ro" ? "Primul email" : "First email")
                      }
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {language === "ro" ? "Nu există email-uri trimise" : "No emails sent yet"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FollowupStatsManager;
