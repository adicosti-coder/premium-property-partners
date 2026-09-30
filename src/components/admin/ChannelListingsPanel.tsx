import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { properties as staticProps } from "@/data/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles, Loader2, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ChannelTab from "@/components/admin/property/ChannelTab";
import { listingUtmUrl, utmSourceFromPath } from "@/lib/listingUtm";

type Ch = { titles: string[]; description: string };
type Channels = { airbnb?: Ch; booking?: Ch; google?: Ch };
type Row = { id: string; slug: string; name: string; image_path: string | null; airbnb_url: string | null; booking_com_url: string | null; booking_url: string | null };
type Stat = { views: number; cazare: number; contact: number; direct: number; fromBooking: number; fromAirbnb: number; visitsBooking: number; visitsAirbnb: number };

const cazareSlugs = new Set(staticProps.map((p) => p.slug));

export default function ChannelListingsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sugg, setSugg] = useState<Record<string, Channels>>({});
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);
  const optimize = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("andrei-listing-seo", { body: { property_id: id } });
    setBusy(null);
    if (error) { toast({ title: "Andrei AI", description: error.message, variant: "destructive" }); return; }
    const ch = (data?.channels ?? data?.suggestion?.channels) as Channels | undefined;
    if (ch) setSugg((m) => ({ ...m, [id]: ch }));
    toast({ title: "Texte noi generate" });
  };

  useEffect(() => {
    supabase.from("properties").select("id, slug, name, image_path, airbnb_url, booking_com_url, booking_url").eq("is_active", true)
      .then(({ data }) => setRows(((data ?? []) as Row[]).filter((r) => cazareSlugs.has(r.slug) || /apart|residence|suite|studio/i.test(r.slug))));
    supabase.from("property_seo_suggestions").select("property_id, channels, created_at").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => {
        const m: Record<string, Channels> = {};
        ((data ?? []) as unknown as { property_id: string; channels: Channels | null }[]).forEach((s) => { if (!m[s.property_id] && s.channels) m[s.property_id] = s.channels; });
        setSugg(m);
      });
  }, []);

  useEffect(() => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    Promise.all([
      supabase.from("cta_analytics").select("cta_type, property_name").in("cta_type", ["listing_view", "listing_cazare_click", "listing_contact_click"]).gte("created_at", since).limit(10000),
      supabase.from("booking_requests").select("property_slug, source, utm").gte("created_at", since).limit(5000),
      supabase.from("property_views").select("page_path").gte("viewed_at", since).like("page_path", "%utm_source=%").limit(20000),
    ]).then(([cta, br, pv]) => {
      const m: Record<string, Stat> = {};
      const keyOf = (n: string | null) => {
        const sp = staticProps.find((p) => p.slug === n || p.name === n);
        return sp?.slug ?? n ?? "—";
      };
      const get = (k: string) => (m[k] ||= { views: 0, cazare: 0, contact: 0, direct: 0, fromBooking: 0, fromAirbnb: 0, visitsBooking: 0, visitsAirbnb: 0 });
      (cta.data ?? []).forEach((r: { cta_type: string; property_name: string | null }) => {
        const s = get(keyOf(r.property_name));
        if (r.cta_type === "listing_view") s.views++; else if (r.cta_type === "listing_cazare_click") s.cazare++; else s.contact++;
      });
      (br.data ?? []).forEach((r: { property_slug: string | null; source: string | null; utm: Record<string, string> | null }) => {
        const s = get(r.property_slug ?? "—");
        const src = `${r.utm?.utm_source ?? ""} ${r.source ?? ""}`.toLowerCase();
        if (src.includes("airbnb")) s.fromAirbnb++; else if (src.includes("booking")) s.fromBooking++; else s.direct++;
      });
      (pv.data ?? []).forEach((r: { page_path: string | null }) => {
        const src = utmSourceFromPath(r.page_path);
        if (!src) return;
        const slug = /^\/(?:cazare|proprietate)\/([^?]+)/.exec(r.page_path ?? "")?.[1];
        if (!slug) return;
        const s = get(slug);
        if (src === "airbnb") s.visitsAirbnb++; else s.visitsBooking++;
      });
      setStats(m);
    });
  }, [days]);

  const saveUrl = async (id: string, patch: Partial<Pick<Row, "airbnb_url" | "booking_com_url">>) => {
    const { error } = await supabase.from("properties").update(patch).eq("id", id);
    toast(error ? { title: "Nu am putut salva", variant: "destructive" } : { title: "Link salvat" });
    if (!error) setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const totals = useMemo(() => Object.values(stats).reduce((a, s) => ({ views: a.views + s.views, cazare: a.cazare + s.cazare, contact: a.contact + s.contact, rez: a.rez + s.direct + s.fromBooking + s.fromAirbnb, visits: a.visits + s.visitsBooking + s.visitsAirbnb }), { views: 0, cazare: 0, contact: 0, rez: 0, visits: 0 }), [stats]);

  const copyText = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: `${what} copiat` }); }
    catch { toast({ title: "Nu am putut copia", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Raport pe anunțuri și canale</CardTitle>
          <div className="flex gap-1">{[7, 30, 90].map((d) => <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>)}</div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-3">
            Vizitele și clicurile sunt cele de pe realtrust.ro. „Vin din Booking / Airbnb” numără vizitatorii care au deschis apartamentul prin linkul marcat lipit în anunțul de pe platforma respectivă,
            iar „Rezervări” arată câți dintre ei au trimis o cerere — diferența dintre cele două este pierderea pe drum.
            Vizitele din interiorul Booking.com și Airbnb se văd doar în panourile acelor platforme.
          </p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">Apartament</th><th>Vizite</th><th>Clic „Cazare”</th><th>Clic contact</th><th>Rezervări site</th><th>Vin din Booking.com</th><th>Rezervări Booking.com</th><th>Vin din Airbnb</th><th>Rezervări Airbnb</th></tr></thead>
            <tbody>
              {staticProps.map((p) => { const s = stats[p.slug]; return (
                <tr key={p.slug} className="border-t border-border"><td className="py-1">{p.name}</td><td>{s?.views ?? 0}</td><td>{s?.cazare ?? 0}</td><td>{s?.contact ?? 0}</td><td>{s?.direct ?? 0}</td><td>{s?.visitsBooking ?? 0}</td><td>{s?.fromBooking ?? 0}</td><td>{s?.visitsAirbnb ?? 0}</td><td>{s?.fromAirbnb ?? 0}</td></tr>
              ); })}
              <tr className="border-t border-border font-medium"><td className="py-1">Total</td><td>{totals.views}</td><td>{totals.cazare}</td><td>{totals.contact}</td><td colSpan={5}>{totals.rez} cereri de rezervare · {totals.visits} vizite venite din Booking.com și Airbnb</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row gap-3 items-center">
              {r.image_path && <img src={r.image_path} alt={r.name} className="w-20 h-20 object-cover rounded" loading="lazy" />}
              <div className="space-y-2">
                <CardTitle className="text-base">{r.name}</CardTitle>
                <Button size="sm" disabled={busy === r.id} onClick={() => optimize(r.id)}>
                  {busy === r.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Optimizează SEO cu Andrei AI
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs defaultValue="booking">
                <TabsList className="w-full"><TabsTrigger value="booking" className="flex-1">Booking.com</TabsTrigger><TabsTrigger value="airbnb" className="flex-1">Airbnb</TabsTrigger><TabsTrigger value="google" className="flex-1">Google Maps</TabsTrigger></TabsList>
                <TabsContent value="booking"><ChannelTab channel="booking" text={sugg[r.id]?.booking} /></TabsContent>
                <TabsContent value="airbnb"><ChannelTab channel="airbnb" text={sugg[r.id]?.airbnb} /></TabsContent>
                <TabsContent value="google"><ChannelTab channel="google" text={sugg[r.id]?.google} /></TabsContent>
              </Tabs>
              <div className="rounded border border-border p-2 space-y-2">
                <p className="text-xs font-semibold">Linkuri marcate spre realtrust.ro (lipește-le în anunțuri)</p>
                {(["booking", "airbnb"] as const).map((src) => {
                  const url = listingUtmUrl(r.slug, src);
                  return (
                    <div key={src} className="flex items-center gap-2">
                      <code className="text-xs break-all flex-1">{url}</code>
                      <Button size="icon" variant="ghost" aria-label={`Copiază linkul pentru ${src}`} onClick={() => copyText(url, "Linkul")}><Copy className="w-3 h-3" /></Button>
                      <Button asChild size="icon" variant="outline" aria-label="Deschide linkul marcat"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a></Button>
                    </div>
                  );
                })}
              </div>
              {(["booking_com_url", "airbnb_url"] as const).map((f) => {
                const val = r[f] ?? (f === "booking_com_url" && r.booking_url?.includes("booking.com") ? r.booking_url : "");
                return (
                  <div key={f} className="flex gap-2 items-center">
                    <Input defaultValue={val ?? ""} placeholder={f === "airbnb_url" ? "Link anunț real Airbnb" : "Link anunț real Booking.com"} aria-label={f === "airbnb_url" ? "Link Airbnb" : "Link Booking.com"}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (r[f] ?? "") && (!v || /^https:\/\//.test(v))) saveUrl(r.id, { [f]: v || null }); }} />
                    {val && <Button asChild size="icon" variant="outline" aria-label="Deschide anunțul real"><a href={val} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
