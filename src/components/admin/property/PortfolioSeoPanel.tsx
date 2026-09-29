import { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2, Star, Shuffle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChannelTab from "./ChannelTab";

interface Img { id: string; image_path: string; is_primary: boolean; is_cover_candidate: boolean; is_published: boolean; display_order: number }
interface Prop {
  id: string; name: string; description_ro: string; long_description_ro: string | null;
  features: string[] | null; amenities: string[] | null; image_path: string | null;
}
interface ChannelText { titles: string[]; description: string }
interface Sugg { property_id: string; titles: string[]; descriptions: string[]; keywords: string[]; applied_at: string | null; channels?: { airbnb?: ChannelText; booking?: ChannelText; og?: { title: string; description: string } } }

const imgUrl = (path: string) =>
  path.startsWith("http") ? path : supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;

/** Listing Health Score: 40 pct poze (≥15), 30 pct facilități (≥12), 30 pct descriere SEO (≥600 caractere). */
export const listingHealth = (p: Prop, imgCount: number, seoApplied: boolean) => {
  const photos = Math.min(imgCount / 15, 1) * 40;
  const facilities = Math.min(((p.amenities?.length ?? 0) + (p.features?.length ?? 0)) / 12, 1) * 30;
  const descLen = (p.long_description_ro || p.description_ro || "").length;
  const desc = seoApplied ? 30 : Math.min(descLen / 600, 1) * 30;
  return Math.round(photos + facilities + desc);
};

const scoreCls = (s: number) =>
  s >= 85 ? "bg-primary/15 text-primary" : s >= 60 ? "bg-gold/15 text-gold" : "bg-destructive/15 text-destructive";

export default function PortfolioSeoPanel() {
  const [open, setOpen] = useState(true);
  const [props, setProps] = useState<Prop[]>([]);
  const [imgs, setImgs] = useState<Record<string, Img[]>>({});
  const [sugg, setSugg] = useState<Record<string, Sugg>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from("properties")
      .select("id, name, description_ro, long_description_ro, features, amenities, image_path")
      .eq("listing_type", "cazare")
      .eq("is_active", true)
      .order("display_order");
    const list = (p ?? []) as Prop[];
    setProps(list);
    const ids = list.map((x) => x.id);
    if (!ids.length) return;
    const [{ data: im }, { data: sg }] = await Promise.all([
      supabase.from("property_images")
        .select("id, property_id, image_path, is_primary, is_cover_candidate, is_published, display_order")
        .in("property_id", ids).order("display_order"),
      supabase.from("property_seo_suggestions").select("property_id, titles, descriptions, keywords, applied_at, channels").in("property_id", ids),
    ]);
    const byP: Record<string, Img[]> = {};
    (im ?? []).forEach((r: Img & { property_id: string }) => { (byP[r.property_id] ||= []).push(r); });
    setImgs(byP);
    const s: Record<string, Sugg> = {};
    (sg ?? []).forEach((r) => { s[r.property_id] = r as unknown as Sugg; });
    setSugg(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("andrei-listing-seo", { body: { property_id: id } });
    if (error || !data?.success) throw new Error(data?.error || "Generare eșuată");
    setSugg((s) => ({ ...s, [id]: { property_id: id, titles: data.titles, descriptions: data.descriptions, keywords: data.keywords, channels: data.channels, applied_at: null } }));
  };

  const runAll = async () => {
    setRunning(true); setDone(0);
    let fails = 0;
    for (const p of props) {
      try { await generate(p.id); } catch (e) {
        fails++;
        const msg = (e as Error).message;
        if (/credit|blocat/i.test(msg)) { toast({ title: "Andrei AI oprit", description: msg, variant: "destructive" }); break; }
      }
      setDone((d) => d + 1);
    }
    setRunning(false);
    toast({ title: "Optimizare SEO finalizată", description: fails ? `${fails} apartamente nu au putut fi procesate.` : "Variantele sunt gata de aplicat." });
  };

  const applyField = async (id: string, patch: { seo_title?: string; seo_description?: string; long_description_ro?: string; og_title?: string; og_description?: string }) => {
    setBusyId(id);
    const { error } = await supabase.from("properties").update(patch).eq("id", id);
    if (!error) await supabase.from("property_seo_suggestions").update({ applied_at: new Date().toISOString() }).eq("property_id", id);
    setBusyId(null);
    if (error) { toast({ title: "Eroare", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Aplicat pe anunț" });
    load();
  };

  const toggleCandidate = async (img: Img) => {
    await supabase.from("property_images").update({ is_cover_candidate: !img.is_cover_candidate }).eq("id", img.id);
    load();
  };

  const setCover = async (propId: string, img: Img) => {
    setBusyId(propId);
    await supabase.from("property_images").update({ is_primary: false }).eq("property_id", propId);
    await supabase.from("property_images").update({ is_primary: true, is_cover_candidate: true }).eq("id", img.id);
    await supabase.from("properties").update({ image_path: img.image_path }).eq("id", propId);
    setBusyId(null);
    toast({ title: "Coperta a fost schimbată" });
    load();
  };

  const rotate = (propId: string) => {
    const list = (imgs[propId] ?? []).filter((i) => i.is_cover_candidate || i.is_primary);
    if (list.length < 2) { toast({ title: "Marchează cel puțin 2 poze candidate pentru copertă" }); return; }
    const cur = list.findIndex((i) => i.is_primary);
    setCover(propId, list[(cur + 1) % list.length]);
  };

  return (
    <div className="bg-card rounded-xl border border-border mb-6">
      <div className="flex items-center justify-between gap-3 p-4 flex-wrap">
        <button type="button" className="flex items-center gap-2 font-semibold text-foreground min-h-12" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Optimizare SEO, titluri & coperți — apartamente regim hotelier ({props.length})
        </button>
        <Button onClick={runAll} disabled={running || !props.length} className="min-h-12">
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Optimizează toate cu Andrei AI
        </Button>
      </div>
      {running && <div className="px-4 pb-3"><Progress value={(done / Math.max(props.length, 1)) * 100} /><p className="text-xs text-muted-foreground mt-1">{done}/{props.length} apartamente</p></div>}
      {open && (
        <div className="grid gap-4 p-4 pt-0 md:grid-cols-2">
          {props.map((p) => {
            const list = (imgs[p.id] ?? []).filter((i) => i.is_published);
            const s = sugg[p.id];
            const score = listingHealth(p, list.length, !!s?.applied_at);
            const isOpen = expanded === p.id;
            return (
              <div key={p.id} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-foreground line-clamp-2">{p.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${scoreCls(score)}`}>{score}% Optimizat</span>
                </div>
                <Progress value={score} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {list.length} poze · {(p.amenities?.length ?? 0) + (p.features?.length ?? 0)} facilități · descriere SEO {s?.applied_at ? "activă" : "neaplicată"}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" disabled={busyId === p.id} onClick={async () => {
                    setBusyId(p.id);
                    try { await generate(p.id); setExpanded(p.id); } catch (e) { toast({ title: "Andrei AI", description: (e as Error).message, variant: "destructive" }); }
                    setBusyId(null);
                  }}>
                    {busyId === p.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Optimizează SEO cu Andrei AI
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : p.id)}>
                    {isOpen ? "Ascunde" : "Variante & coperți"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => rotate(p.id)}>
                    <Shuffle className="w-3 h-3 mr-1" /> Rotește coperta
                  </Button>
                </div>
                {isOpen && (
                  <div className="space-y-3 text-sm">
                    {s ? (
                      <Tabs defaultValue="site">
                        <TabsList className="w-full">
                          <TabsTrigger value="site" className="flex-1">Site propriu</TabsTrigger>
                          <TabsTrigger value="airbnb" className="flex-1">Airbnb</TabsTrigger>
                          <TabsTrigger value="booking" className="flex-1">Booking.com</TabsTrigger>
                          <TabsTrigger value="og" className="flex-1">Preview link</TabsTrigger>
                        </TabsList>
                        <TabsContent value="site" className="space-y-3">
                      <>
                        {s.titles.map((t) => (
                          <div key={t} className="flex items-center justify-between gap-2 rounded border border-border p-2">
                            <span>{t}</span>
                            <Button size="sm" variant="ghost" onClick={() => applyField(p.id, { seo_title: t })}>Aplică titlul</Button>
                          </div>
                        ))}
                        {s.descriptions.map((d, i) => (
                          <div key={i} className="rounded border border-border p-2 space-y-2">
                            <p className="whitespace-pre-line text-muted-foreground">{d}</p>
                            <Button size="sm" variant="ghost" onClick={() => applyField(p.id, { seo_description: d.split("\n")[0], long_description_ro: d })}>Aplică descrierea</Button>
                          </div>
                        ))}
                        {s.keywords.length > 0 && <p className="text-xs text-muted-foreground">Cuvinte-cheie: {s.keywords.join(", ")}</p>}
                      </>
                        </TabsContent>
                        <TabsContent value="airbnb"><ChannelTab channel="airbnb" text={s.channels?.airbnb} /></TabsContent>
                        <TabsContent value="booking"><ChannelTab channel="booking" text={s.channels?.booking} /></TabsContent>
                        <TabsContent value="og">
                          {s.channels?.og?.title ? (
                            <div className="rounded border border-border p-2 space-y-2">
                              <p className="text-xs text-muted-foreground">Open Graph / Twitter (Facebook, WhatsApp, X)</p>
                              <p className="font-medium text-foreground">{s.channels.og.title}</p>
                              <p className="text-muted-foreground">{s.channels.og.description}</p>
                              <Button size="sm" variant="ghost" onClick={() => applyField(p.id, { og_title: s.channels!.og!.title, og_description: s.channels!.og!.description })}>Aplică preview-ul</Button>
                            </div>
                          ) : <p className="text-xs text-muted-foreground py-2">Regenerează cu Andrei AI pentru metadatele de preview.</p>}
                        </TabsContent>
                      </Tabs>
                    ) : <p className="text-xs text-muted-foreground">Nu există încă variante generate.</p>}
                    <div>
                      <p className="text-xs uppercase text-muted-foreground mb-2">Coperți A/B (★ = coperta actuală; bifă = candidată)</p>
                      <div className="grid grid-cols-4 gap-2">
                        {list.slice(0, 16).map((img) => (
                          <div key={img.id} className={`relative rounded overflow-hidden border-2 ${img.is_primary ? "border-gold" : img.is_cover_candidate ? "border-primary" : "border-border"}`}>
                            <img src={imgUrl(img.image_path)} alt="" loading="lazy" className="w-full h-16 object-cover" />
                            <div className="flex">
                              <button type="button" className="flex-1 text-[10px] py-1 bg-muted hover:bg-accent" onClick={() => toggleCandidate(img)} aria-label="Marchează candidată copertă">
                                {img.is_cover_candidate ? "✓ A/B" : "+ A/B"}
                              </button>
                              <button type="button" className="px-1 bg-muted hover:bg-accent" onClick={() => setCover(p.id, img)} aria-label="Setează copertă">
                                <Star className={`w-3 h-3 ${img.is_primary ? "fill-current text-gold" : ""}`} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
