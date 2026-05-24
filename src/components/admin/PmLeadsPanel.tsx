import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, ExternalLink, RefreshCw, Mail, Copy, Search, Save, Settings, SlidersHorizontal } from "lucide-react";

interface PmLead {
  id: string;
  platform: string;
  source_url: string;
  property_name: string | null;
  host_name: string | null;
  zone: string | null;
  rating: number | null;
  reviews_count: number | null;
  price_per_night: number | null;
  currency: string | null;
  property_type: string | null;
  rooms: number | null;
  capacity: number | null;
  pm_potential_score: number;
  ai_pitch: string | null;
  status: string;
  sent_to_andrei_at: string | null;
  contacted_at?: string | null;
  notes: string | null;
  created_at: string;
}

interface OutreachTemplate {
  id: string;
  platform: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
}

const ANDREI_EMAIL_KEY = "pm_leads_andrei_email";

const AVAILABLE_TAGS = [
  "{{host_name}}",
  "{{property_name}}",
  "{{rating}}",
  "{{average_price}}",
  "{{zone}}",
];

const PRIORITY_ZONE_OPTIONS = ["ISHO", "Paltim", "City of Mara", "Fructus Plaza", "Cetate/Unirii"];

interface ScanSettings {
  id?: string;
  min_rating_airbnb: number;
  min_rating_booking: number;
  price_min: number;
  price_max: number;
  priority_zones: string[];
}

const DEFAULT_SETTINGS: ScanSettings = {
  min_rating_airbnb: 4.5,
  min_rating_booking: 8.5,
  price_min: 35,
  price_max: 200,
  priority_zones: [...PRIORITY_ZONE_OPTIONS],
};

const renderTemplate = (tpl: string, lead: PmLead): string => {
  const map: Record<string, string> = {
    "{{host_name}}": lead.host_name || "gazdă",
    "{{property_name}}": lead.property_name || "proprietatea ta",
    "{{rating}}": lead.rating != null ? String(lead.rating) : "n/a",
    "{{average_price}}": lead.price_per_night != null ? String(lead.price_per_night) : "n/a",
    "{{zone}}": lead.zone || "Timișoara",
  };
  return tpl.replace(/\{\{(host_name|property_name|rating|average_price|zone)\}\}/g, (m) => map[m] ?? m);
};

const PmLeadsPanel = () => {
  const [leads, setLeads] = useState<PmLead[]>([]);
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [searchKeyword, setSearchKeyword] = useState("apartament regim hotelier Timișoara");
  const [andreiEmail, setAndreiEmail] = useState<string>(() => localStorage.getItem(ANDREI_EMAIL_KEY) || "");
  const [editingTpl, setEditingTpl] = useState<Record<string, OutreachTemplate>>({});
  const [savingTpl, setSavingTpl] = useState<string | null>(null);
  const [settings, setSettings] = useState<ScanSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("pm_scan_settings" as any)
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) setSettings(data as any);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const payload = {
      min_rating_airbnb: Number(settings.min_rating_airbnb),
      min_rating_booking: Number(settings.min_rating_booking),
      price_min: Number(settings.price_min),
      price_max: Number(settings.price_max),
      priority_zones: settings.priority_zones,
    };
    const q = settings.id
      ? supabase.from("pm_scan_settings" as any).update(payload).eq("id", settings.id)
      : supabase.from("pm_scan_settings" as any).insert({ ...payload, singleton: true } as any);
    const { error } = await q;
    setSavingSettings(false);
    if (error) toast.error(error.message);
    else { toast.success("Setări salvate"); loadSettings(); }
  };

  const toggleZone = (zone: string) => {
    setSettings((s) => ({
      ...s,
      priority_zones: s.priority_zones.includes(zone)
        ? s.priority_zones.filter((z) => z !== zone)
        : [...s.priority_zones, zone],
    }));
  };

  const loadLeads = async () => {
    setLoading(true);
    let q = supabase
      .from("pm_collaboration_leads")
      .select("*")
      .order("pm_potential_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter === "all") {
      // "Toate" = toate statusurile vizibile (exclude log-ul de competitori)
      q = q.neq("status", "competitor_blocked");
    } else {
      q = q.eq("status", statusFilter);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setLeads((data as PmLead[]) || []);
    setLoading(false);
  };


  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("outreach_templates")
      .select("*")
      .order("platform");
    if (error) { toast.error(error.message); return; }
    const list = (data as OutreachTemplate[]) || [];
    setTemplates(list);
    const map: Record<string, OutreachTemplate> = {};
    list.forEach((t) => { map[t.id] = { ...t }; });
    setEditingTpl(map);
  };

  useEffect(() => { loadLeads(); }, [statusFilter]);
  useEffect(() => { loadTemplates(); loadSettings(); }, []);

  const triggerScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("pm-leads-scan", {
        body: { keyword: searchKeyword, platform: "both", max_results: 10 },
      });
      if (error) throw error;
      toast.success(`Scan complet: ${data?.inserted || 0} leaduri noi/actualizate`);
      await loadLeads();
    } catch (e: any) {
      toast.error(e.message || "Scan eșuat");
    } finally {
      setScanning(false);
    }
  };

  const updateStatus = async (id: string, status: string, extra: Partial<PmLead> = {}) => {
    const { error } = await supabase
      .from("pm_collaboration_leads")
      .update({ status, ...extra })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status actualizat"); loadLeads(); }
  };

  const saveTemplate = async (id: string) => {
    const tpl = editingTpl[id];
    if (!tpl) return;
    setSavingTpl(id);
    const { error } = await supabase
      .from("outreach_templates")
      .update({ name: tpl.name, subject: tpl.subject, body: tpl.body, is_active: tpl.is_active })
      .eq("id", id);
    setSavingTpl(null);
    if (error) toast.error(error.message);
    else { toast.success("Șablon salvat"); loadTemplates(); }
  };

  const insertTag = (id: string, tag: string) => {
    setEditingTpl((prev) => ({
      ...prev,
      [id]: { ...prev[id], body: (prev[id]?.body || "") + " " + tag },
    }));
  };

  const sendToAndrei = (lead: PmLead) => {
    if (!andreiEmail) {
      toast.error("Setează emailul lui Andrei mai întâi");
      return;
    }
    const tpl =
      templates.find((t) => t.platform === lead.platform && t.is_active) ||
      templates.find((t) => t.platform === "generic" && t.is_active);

    let subject: string;
    let body: string;
    if (tpl) {
      subject = renderTemplate(tpl.subject, lead);
      body =
        renderTemplate(tpl.body, lead) +
        `\n\n— Date lead —\nURL: ${lead.source_url}\nScore PM: ${lead.pm_potential_score}/100${lead.ai_pitch ? `\n\nPitch AI:\n${lead.ai_pitch}` : ""}`;
    } else {
      subject = `[PM Lead] ${lead.property_name || lead.platform} — ${lead.zone || "Timișoara"} (score ${lead.pm_potential_score})`;
      body = `Lead nou pentru Property Management:\n\n${lead.property_name || ""}\n${lead.source_url}`;
    }
    const mailto = `mailto:${andreiEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    updateStatus(lead.id, "sent_to_andrei", { sent_to_andrei_at: new Date().toISOString() as any });
  };

  const copyPitch = async (lead: PmLead) => {
    if (!lead.ai_pitch) return;
    await navigator.clipboard.writeText(lead.ai_pitch);
    toast.success("Pitch copiat în clipboard");
  };

  const saveAndreiEmail = (val: string) => {
    setAndreiEmail(val);
    localStorage.setItem(ANDREI_EMAIL_KEY, val);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      reviewed: "bg-slate-100 text-slate-800",
      sent_to_andrei: "bg-amber-100 text-amber-800",
      contacted: "bg-purple-100 text-purple-800",
      onboarded: "bg-green-100 text-green-800",
      declined: "bg-rose-100 text-rose-800",
      blacklisted: "bg-gray-200 text-gray-700",
      competitor_blocked: "bg-red-100 text-red-800 border border-red-300",
    };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };


  return (
    <Tabs defaultValue="leads" className="space-y-4">
      <TabsList>
        <TabsTrigger value="leads"><Mail className="w-4 h-4 mr-1" /> Leaduri</TabsTrigger>
        <TabsTrigger value="templates"><Settings className="w-4 h-4 mr-1" /> Șabloane pitch</TabsTrigger>
        <TabsTrigger value="settings"><SlidersHorizontal className="w-4 h-4 mr-1" /> Setări Scanare</TabsTrigger>
      </TabsList>

      <TabsContent value="leads" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> PM Collaboration Leads (Booking/Airbnb → Andrei)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Gazde persoane fizice din Timișoara identificate pe Booking/Airbnb.
              <strong> Aceste anunțuri NU se publică pe realtrust.ro</strong> — sunt propuneri
              pentru Andrei să le abordeze cu oferta de Property Management de regim hotelier.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Email Andrei</label>
                <Input
                  type="email"
                  placeholder="andrei@realtrust.ro"
                  value={andreiEmail}
                  onChange={(e) => saveAndreiEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Keyword scan</label>
                <div className="flex gap-2">
                  <Input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
                  <Button onClick={triggerScan} disabled={scanning}>
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate (active)</SelectItem>
                  <SelectItem value="new">Noi</SelectItem>
                  <SelectItem value="reviewed">Revizuite</SelectItem>
                  <SelectItem value="sent_to_andrei">Trimise lui Andrei</SelectItem>
                  <SelectItem value="contacted">Contactate</SelectItem>
                  <SelectItem value="onboarded">Onboarded</SelectItem>
                  <SelectItem value="declined">Refuzate</SelectItem>
                  <SelectItem value="competitor_blocked">🚫 Blocate (log competitori)</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={loadLeads}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">{leads.length} leaduri</span>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : leads.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Niciun lead. Rulează un scan pentru a descoperi gazde Booking/Airbnb.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="uppercase">{lead.platform}</Badge>
                        {statusBadge(lead.status)}
                        <Badge className="bg-emerald-100 text-emerald-800">Score {lead.pm_potential_score}</Badge>
                        {lead.zone && <Badge variant="secondary">{lead.zone}</Badge>}
                      </div>
                      <h3 className="font-semibold mt-1">{lead.property_name || "(fără nume)"}</h3>
                      <div className="text-sm text-muted-foreground">
                        {lead.host_name && <span>Gazdă: {lead.host_name} · </span>}
                        {lead.rating && <span>{lead.rating}/10 ({lead.reviews_count || 0} rec.) · </span>}
                        {lead.price_per_night && <span>{lead.price_per_night} {lead.currency}/noapte · </span>}
                        {lead.rooms && <span>{lead.rooms} cam · </span>}
                        {lead.capacity && <span>{lead.capacity} pers</span>}
                      </div>
                    </div>
                    <a href={lead.source_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                    </a>
                  </div>

                  {lead.ai_pitch && (
                    <div className="bg-muted/50 p-3 rounded text-sm">
                      <div className="text-xs font-medium mb-1 flex items-center justify-between">
                        <span>Pitch sugerat pentru Andrei</span>
                        <Button variant="ghost" size="sm" onClick={() => copyPitch(lead)}>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <p className="whitespace-pre-wrap">{lead.ai_pitch}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => sendToAndrei(lead)} disabled={!andreiEmail}>
                      <Send className="w-4 h-4 mr-1" /> Trimite lui Andrei
                    </Button>
                    {lead.status !== "contacted" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(lead.id, "contacted", { contacted_at: new Date().toISOString() as any })}>
                        Marchează contactat
                      </Button>
                    )}
                    {lead.status !== "onboarded" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(lead.id, "onboarded")}>
                        Onboarded
                      </Button>
                    )}
                    {lead.status !== "declined" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(lead.id, "declined")}>
                        Refuzat
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="templates" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> Șabloane pitch outreach
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Editează textul pitch-ului folosit la butonul „Trimite lui Andrei”. Tag-uri disponibile:{" "}
              {AVAILABLE_TAGS.map((t) => (
                <code key={t} className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs">{t}</code>
              ))}
            </p>
          </CardHeader>
        </Card>

        {templates.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Niciun șablon. Rulează migrarea pentru a popula default-urile.
          </CardContent></Card>
        ) : (
          templates.map((t) => {
            const draft = editingTpl[t.id] || t;
            return (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">{t.platform}</Badge>
                      <Input
                        className="w-72"
                        value={draft.name}
                        onChange={(e) => setEditingTpl((p) => ({ ...p, [t.id]: { ...draft, name: e.target.value } }))}
                      />
                    </div>
                    <Button size="sm" onClick={() => saveTemplate(t.id)} disabled={savingTpl === t.id}>
                      {savingTpl === t.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      Salvează
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Subiect email</label>
                    <Input
                      value={draft.subject}
                      onChange={(e) => setEditingTpl((p) => ({ ...p, [t.id]: { ...draft, subject: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium">Corp pitch</label>
                      <div className="flex flex-wrap gap-1">
                        {AVAILABLE_TAGS.map((tag) => (
                          <Button key={tag} size="sm" variant="outline" className="h-6 text-xs" onClick={() => insertTag(t.id, tag)}>
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      value={draft.body}
                      onChange={(e) => setEditingTpl((p) => ({ ...p, [t.id]: { ...draft, body: e.target.value } }))}
                      rows={Math.max(8, draft.body.split("\n").length + 1)}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" /> Setări Scanare PM Leads
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Criterii aplicate live de <code>pm-leads-scan</code> la fiecare rulare (inclusiv cron 06:10).
              Anunțurile care nu se încadrează sunt ignorate înainte de inserare — protejează creditele Gemini.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">⭐ Rating minim Airbnb (0–5)</label>
                <Input
                  type="number" step="0.1" min={0} max={5}
                  value={settings.min_rating_airbnb}
                  onChange={(e) => setSettings((s) => ({ ...s, min_rating_airbnb: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">⭐ Rating minim Booking (0–10)</label>
                <Input
                  type="number" step="0.1" min={0} max={10}
                  value={settings.min_rating_booking}
                  onChange={(e) => setSettings((s) => ({ ...s, min_rating_booking: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">💶 Preț minim / noapte (EUR)</label>
                <Input
                  type="number" min={0}
                  value={settings.price_min}
                  onChange={(e) => setSettings((s) => ({ ...s, price_min: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">💶 Preț maxim / noapte (EUR)</label>
                <Input
                  type="number" min={0}
                  value={settings.price_max}
                  onChange={(e) => setSettings((s) => ({ ...s, price_max: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-2">📍 Zone prioritare Timișoara</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PRIORITY_ZONE_OPTIONS.map((zone) => (
                  <label key={zone} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-muted">
                    <Checkbox
                      checked={settings.priority_zones.includes(zone)}
                      onCheckedChange={() => toggleZone(zone)}
                    />
                    {zone}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Lista goală = nu se filtrează după zonă (acceptă toate).
              </p>
            </div>

            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Salvează setările
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PmLeadsPanel;
