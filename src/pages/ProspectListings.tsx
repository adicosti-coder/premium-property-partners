import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Phone, Sparkles, ArrowLeft, Loader2, ExternalLink, RefreshCw,
  TrendingUp, MapPin, Euro, Building2, Home, Hotel, Download, AlertTriangle, PlayCircle,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { computeProspectGeoMatch } from "@/lib/timisoaraGeo";
import type { User } from "@supabase/supabase-js";

const lifecycleColors: Record<string, string> = {
  new: "border-primary/40 text-primary",
  scoring: "border-purple-400 text-purple-700 dark:text-purple-300",
  calling: "border-amber-400 text-amber-700 dark:text-amber-300",
  interested: "border-green-400 text-green-700 dark:text-green-300",
  callback: "border-orange-400 text-orange-700 dark:text-orange-300",
  rejected: "border-destructive/40 text-destructive",
  posted: "border-muted-foreground/40 text-muted-foreground",
  pending_credentials: "border-amber-500/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30",
};

const categoryIcons: Record<string, React.ReactNode> = {
  vanzare: <Building2 className="h-3.5 w-3.5" />,
  inchiriere: <Home className="h-3.5 w-3.5" />,
  hotelier: <Hotel className="h-3.5 w-3.5" />,
};

const categoryLabels: Record<string, string> = {
  vanzare: "Vânzare",
  inchiriere: "Chirie",
  hotelier: "Regim Hotelier",
};

interface Prospect {
  id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  zone: string | null;
  rooms: number | null;
  size: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  source_url: string;
  source_platform: string;
  lead_score: number | null;
  score: number | null;
  category: string | null;
  prospect_type: string | null;
  lifecycle_status: string;
  call_summary: string | null;
  ai_score_breakdown: any;
  ai_scored_at: string | null;
  voice_call_session_id: string | null;
  scraped_at: string | null;
  followup_sent_at: string | null;
  owner_sentiment: string | null;
  urgency_level: number | null;
}

const sentimentEmoji: Record<string, string> = {
  presat: "🔥",
  deschis: "👍",
  agentie: "🏢",
  neutru: "•",
};

const ProspectListings = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, isLoading: adminLoading } = useAdminRole(user);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<string>("0");
  const [callingId, setCallingId] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast({ title: "Acces interzis", description: "Doar admin.", variant: "destructive" });
      navigate("/");
    }
  }, [adminLoading, isAdmin, user, navigate]);

  const { data: prospects = [], isLoading, refetch } = useQuery({
    queryKey: ["prospect-listings", statusFilter, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("prospect_listings")
        .select("id,title,description,price,currency,location,zone,rooms,size,contact_name,contact_phone,phone_normalized,source_url,source_platform,lead_score,score,category,prospect_type,lifecycle_status,call_summary,ai_score_breakdown,ai_scored_at,voice_call_session_id,scraped_at,followup_sent_at,owner_sentiment,urgency_level")
        .order("lead_score", { ascending: false, nullsFirst: false })
        .order("scraped_at", { ascending: false })
        .limit(300);
      if (statusFilter !== "all") q = q.eq("lifecycle_status", statusFilter as any);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Prospect[];
    },
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  // Compute geo match per prospect (memoized)
  const enriched = useMemo(
    () => prospects.map((p) => ({
      ...p,
      geo: computeProspectGeoMatch([p.title, p.location, p.zone, p.description]),
    })),
    [prospects]
  );

  const filtered = enriched.filter((p) => {
    if ((p.lead_score ?? p.score ?? 0) < parseInt(minScore || "0")) return false;
    if (!search) return true;
    const blob = `${p.title} ${p.location} ${p.zone} ${p.contact_name} ${p.contact_phone}`.toLowerCase();
    return blob.includes(search.toLowerCase());
  });

  const stats = {
    total: prospects.length,
    hot: prospects.filter((p) => (p.lead_score || 0) > 80).length,
    interested: prospects.filter((p) => p.lifecycle_status === "interested").length,
    calling: prospects.filter((p) => p.lifecycle_status === "calling").length,
    pending: prospects.filter((p) => p.lifecycle_status === "pending_credentials").length,
  };

  const handleAIScore = async (id: string) => {
    setScoringId(id);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-ai-scorer", {
        body: { prospect_id: id, force: true },
      });
      if (error) throw error;
      toast({
        title: "Scor AI calculat",
        description: `Lead score: ${data?.lead_score ?? "?"} | Categorie: ${data?.category ?? "?"}${data?.will_auto_call ? " | Apel automat declanșat" : ""}`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Eroare scoring", description: e.message, variant: "destructive" });
    } finally {
      setScoringId(null);
    }
  };

  const handleCall = async (p: Prospect) => {
    if (!p.phone_normalized && !p.contact_phone) {
      toast({ title: "Lipsește telefon", description: "Acest prospect nu are număr de telefon.", variant: "destructive" });
      return;
    }
    setCallingId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-auto-dial", {
        body: { prospect_id: p.id, manual: true },
      });
      if (error) throw error;
      if (data?.skipped === "pending_credentials") {
        toast({
          title: "🔧 Apel suspendat — lipsesc cheile Twilio",
          description: "Lead-ul a fost marcat 'pending_credentials'. Configurează TWILIO_API_KEY + TWILIO_FROM_NUMBER pentru a relua apelurile.",
        });
        refetch();
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({
        title: "📞 Apel inițiat",
        description: `Sun ${data?.to || p.contact_phone}. Sesiune: ${data?.session_id?.slice(0, 8)}...`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Apel eșuat", description: e.message, variant: "destructive" });
    } finally {
      setCallingId(null);
    }
  };

  const handleResumePending = async () => {
    setResuming(true);
    try {
      let processed = 0;
      // Loop a few times — each call processes top pending prospect
      for (let i = 0; i < Math.min(stats.pending, 10); i++) {
        const { data } = await supabase.functions.invoke("voice-agent-auto-dial", {
          body: { resume_pending: true },
        });
        if (data?.skipped === "pending_credentials") {
          toast({ title: "Tot lipsesc cheile Twilio", description: "Configurează secretele întâi.", variant: "destructive" });
          break;
        }
        if (data?.success) processed++;
        else break;
      }
      toast({ title: `Procesate ${processed} lead-uri pending`, description: "Verifică tabelul." });
      refetch();
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    } finally {
      setResuming(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Score", "AI Score", "Geo Score", "Sentiment", "Urgency", "Title", "Category", "Phone", "Contact", "Location", "Zone", "Price", "Status", "Source URL"];
    const rows = filtered.map((p) => [
      p.score ?? "",
      p.lead_score ?? "",
      p.geo.score,
      p.owner_sentiment ?? p.ai_score_breakdown?.owner_sentiment ?? "",
      p.urgency_level ?? p.ai_score_breakdown?.urgency_level ?? "",
      (p.title || "").replace(/"/g, '""'),
      p.category ?? "",
      p.phone_normalized || p.contact_phone || "",
      (p.contact_name || "").replace(/"/g, '""'),
      p.location ?? "",
      p.zone ?? "",
      p.price ?? "",
      p.lifecycle_status,
      p.source_url,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospect-listings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Export CSV`, description: `${rows.length} prospecte exportate.` });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <SEOHead title="Prospect Listings | Admin" description="AI-scored leads pipeline" />

      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Prospect Listings
              </h1>
              <p className="text-sm text-muted-foreground">
                Lead-uri scrape-uite, scorate AI și pregătite pentru apel automat (scor &gt; 80).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.pending > 0 && (
              <Button variant="default" size="sm" onClick={handleResumePending} disabled={resuming} className="bg-amber-600 hover:bg-amber-500 text-white">
                {resuming ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
                Reia apelurile pending ({stats.pending})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {stats.pending > 0 && (
          <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-3 flex items-center gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong>{stats.pending} lead-uri pending</strong> — Twilio nu este configurat.
                Adaugă secretele <code className="text-xs bg-background px-1 rounded">TWILIO_API_KEY</code> și
                <code className="text-xs bg-background px-1 rounded ml-1">TWILIO_FROM_NUMBER</code> apoi apasă "Reia apelurile pending".
                Webhook-ul MAKE primește deja datele pentru WhatsApp manual.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "🔥 Hot (>80)", value: stats.hot, icon: <Sparkles className="h-4 w-4 text-orange-500" /> },
            { label: "În apelare", value: stats.calling, icon: <Phone className="h-4 w-4 text-amber-500" /> },
            { label: "Interesați", value: stats.interested, icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
            { label: "⏸ Pending", value: stats.pending, icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                {s.icon}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Caută titlu, locație, contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="new">Noi</SelectItem>
                <SelectItem value="calling">În apelare</SelectItem>
                <SelectItem value="interested">Interesați</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="rejected">Refuzați</SelectItem>
                <SelectItem value="posted">Postate</SelectItem>
                <SelectItem value="pending_credentials">⏸ Pending Credentials</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Categorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate categoriile</SelectItem>
                <SelectItem value="vanzare">Vânzare</SelectItem>
                <SelectItem value="inchiriere">Chirie</SelectItem>
                <SelectItem value="hotelier">Regim Hotelier</SelectItem>
              </SelectContent>
            </Select>
            <Select value={minScore} onValueChange={setMinScore}>
              <SelectTrigger><SelectValue placeholder="Scor minim" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Orice scor</SelectItem>
                <SelectItem value="50">Scor ≥ 50</SelectItem>
                <SelectItem value="70">Scor ≥ 70</SelectItem>
                <SelectItem value="80">🔥 Scor &gt; 80 (hot)</SelectItem>
                <SelectItem value="90">⭐ Scor ≥ 90</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{filtered.length} prospecte afișate</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">AI Score</TableHead>
                    <TableHead className="w-20">Geo SEO</TableHead>
                    <TableHead>Anunț</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Niciun prospect.</TableCell></TableRow>
                  ) : filtered.map((p) => {
                    const score = p.lead_score ?? p.score ?? 0;
                    const scoreColor = score > 80 ? "text-orange-600" : score > 60 ? "text-amber-600" : "text-muted-foreground";
                    const phone = p.phone_normalized || p.contact_phone;
                    const sentiment = p.owner_sentiment ?? p.ai_score_breakdown?.owner_sentiment;
                    const urgency = p.urgency_level ?? p.ai_score_breakdown?.urgency_level;
                    const geoColor = p.geo.score >= 70 ? "text-green-600" : p.geo.score >= 40 ? "text-amber-600" : "text-muted-foreground";
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
                          {p.ai_scored_at && <div className="text-[10px] text-muted-foreground">AI ✓</div>}
                          {sentiment && (
                            <div className="text-[10px] mt-0.5">
                              {sentimentEmoji[sentiment] || "•"} {sentiment}
                              {urgency != null && urgency > 0 && <span className="ml-1 text-orange-600">u{urgency}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm font-semibold ${geoColor}`}>{p.geo.score}</div>
                          {p.geo.primary && <div className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={p.geo.found.join(", ")}>{p.geo.primary}</div>}
                          {p.geo.found.length > 1 && <div className="text-[10px] text-muted-foreground">+{p.geo.found.length - 1}</div>}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="font-medium text-sm truncate">{p.title || "(fără titlu)"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                            {p.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{p.location}</span>}
                            {p.price && <span className="flex items-center gap-0.5"><Euro className="h-3 w-3" />{p.price.toLocaleString()}</span>}
                            {p.rooms && <span>{p.rooms}cam</span>}
                            {p.size && <span>{p.size}mp</span>}
                          </div>
                          {p.ai_score_breakdown?.recommended_pitch && (
                            <div className="text-xs italic text-primary/70 mt-1 line-clamp-1">💡 {p.ai_score_breakdown.recommended_pitch}</div>
                          )}
                          {p.call_summary && (
                            <div className="text-xs text-green-700 mt-1 line-clamp-2">📞 {p.call_summary}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.category && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              {categoryIcons[p.category]}
                              {categoryLabels[p.category]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{p.contact_name || "—"}</div>
                          {phone && <div className="text-xs text-muted-foreground font-mono">{phone}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${lifecycleColors[p.lifecycle_status] || ""} text-xs`} variant="outline">
                            {p.lifecycle_status === "pending_credentials" ? "⏸ pending" : p.lifecycle_status}
                          </Badge>
                          {p.followup_sent_at && <div className="text-[10px] text-green-600 mt-1">WA ✓</div>}
                        </TableCell>
                        <TableCell className="text-right space-y-1">
                          <div className="flex flex-col gap-1 items-end">
                            <Button
                              size="sm"
                              variant={score > 80 ? "default" : "outline"}
                              onClick={() => handleCall(p)}
                              disabled={!phone || callingId === p.id || p.lifecycle_status === "calling"}
                              className="w-full"
                            >
                              {callingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3 mr-1" />}
                              📞 Apelează cu AI
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAIScore(p.id)}
                              disabled={scoringId === p.id}
                              className="w-full text-xs"
                            >
                              {scoringId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                              Re-scoring AI
                            </Button>
                            <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                              Sursă <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProspectListings;
