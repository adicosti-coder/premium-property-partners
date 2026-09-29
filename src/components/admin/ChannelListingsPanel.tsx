import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { properties as staticProps } from "@/data/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ChannelTab from "@/components/admin/property/ChannelTab";

type Ch = { titles: string[]; description: string };
type Row = { id: string; slug: string; name: string; image_path: string | null; airbnb_url: string | null; booking_com_url: string | null; booking_url: string | null };
type Stat = { views: number; cazare: number; contact: number; direct: number; fromBooking: number; fromAirbnb: number };

const cazareSlugs = new Set(staticProps.map((p) => p.slug));

export default function ChannelListingsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sugg, setSugg] = useState<Record<string, { airbnb?: Ch; booking?: Ch }>>({});
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [days, setDays] = useState(30);

  useEffect(() => {
    supabase.from("properties").select("id, slug, name, image_path, airbnb_url, booking_com_url, booking_url").eq("is_active", true)
      .then(({ data }) => setRows(((data ?? []) as Row[]).filter((r) => cazareSlugs.has(r.slug) || /apart|residence|suite|studio/i.test(r.slug))));
    supabase.from("property_seo_suggestions").select("property_id, channels, created_at").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => {
        const m: Record<string, { airbnb?: Ch; booking?: Ch }> = {};
        (data ?? []).forEach((s: { property_id: string; channels: { airbnb?: Ch; booking?: Ch } | null }) => { if (!m[s.property_id] && s.channels) m[s.property_id] = s.channels; });
        setSugg(m);
      });
  }, []);

  useEffect(() => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    Promise.all([
      supabase.from("cta_analytics").select("cta_type, property_name").in("cta_type", ["listing_view", "listing_cazare_click", "listing_contact_click"]).gte("created_at", since).limit(10000),
      supabase.from("booking_requests").select("property_slug, source, utm").gte("created_at", since).limit(5000),
    ]).then(([cta, br]) => {
      const m: Record<string, Stat> = {};
      const keyOf = (n: string | null) => {
        const sp = staticProps.find((p) => p.slug === n || p.name === n);
        return sp?.slug ?? n ?? "—";
      };
      const get = (k: string) => (m[k] ||= { views: 0, cazare: 0, contact: 0, direct: 0, fromBooking: 0, fromAirbnb: 0 });
      (cta.data ?? []).forEach((r: { cta_type: string; property_name: string | null }) => {
        const s = get(keyOf(r.property_name));
        if (r.cta_type === "listing_view") s.views++; else if (r.cta_type === "listing_cazare_click") s.cazare++; else s.contact++;
      });
      (br.data ?? []).forEach((r: { property_slug: string | null; source: string | null; utm: Record<string, string> | null }) => {
        const s = get(r.property_slug ?? "—");
        const src = `${r.utm?.utm_source ?? ""} ${r.source ?? ""}`.toLowerCase();
        if (src.includes("airbnb")) s.fromAirbnb++; else if (src.includes("booking")) s.fromBooking++; else s.direct++;
      });
      setStats(m);
    });
  }, [days]);

  const saveUrl = async (id: string, patch: Partial<Pick<Row, "airbnb_url" | "booking_com_url">>) => {
    const { error } = await supabase.from("properties").update(patch).eq("id", id);
    toast(error ? { title: "Nu am putut salva", variant: "destructive" } : { title: "Link salvat" });
    if (!error) setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const totals = useMemo(() => Object.values(stats).reduce((a, s) => ({ views: a.views + s.views, cazare: a.cazare + s.cazare, contact: a.contact + s.contact, rez: a.rez + s.direct + s.fromBooking + s.fromAirbnb }), { views: 0, cazare: 0, contact: 0, rez: 0 }), [stats]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Raport pe anunțuri și canale</CardTitle>
          <div className="flex gap-1">{[7, 30, 90].map((d) => <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>)}</div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-3">
            Vizitele și clicurile sunt cele de pe realtrust.ro. Coloanele Booking.com / Airbnb arată rezervările directe venite prin linkuri marcate cu sursa respectivă (utm_source=booking / airbnb).
            Vizitele din interiorul Booking.com și Airbnb se văd doar în panourile acelor platforme.
          </p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">Apartament</th><th>Vizite</th><th>Clic „Cazare”</th><th>Clic contact</th><th>Rezervări site</th><th>Din Booking.com</th><th>Din Airbnb</th></tr></thead>
            <tbody>
              {staticProps.map((p) => { const s = stats[p.slug]; return (
                <tr key={p.slug} className="border-t border-border"><td className="py-1">{p.name}</td><td>{s?.views ?? 0}</td><td>{s?.cazare ?? 0}</td><td>{s?.contact ?? 0}</td><td>{s?.direct ?? 0}</td><td>{s?.fromBooking ?? 0}</td><td>{s?.fromAirbnb ?? 0}</td></tr>
              ); })}
              <tr className="border-t border-border font-medium"><td className="py-1">Total</td><td>{totals.views}</td><td>{totals.cazare}</td><td>{totals.contact}</td><td colSpan={3}>{totals.rez} cereri de rezervare</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row gap-3 items-center">
              {r.image_path && <img src={r.image_path} alt={r.name} className="w-20 h-20 object-cover rounded" loading="lazy" />}
              <CardTitle className="text-base">{r.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs defaultValue="booking">
                <TabsList className="w-full"><TabsTrigger value="booking" className="flex-1">Booking.com</TabsTrigger><TabsTrigger value="airbnb" className="flex-1">Airbnb</TabsTrigger></TabsList>
                <TabsContent value="booking"><ChannelTab channel="booking" text={sugg[r.id]?.booking} /></TabsContent>
                <TabsContent value="airbnb"><ChannelTab channel="airbnb" text={sugg[r.id]?.airbnb} /></TabsContent>
              </Tabs>
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
