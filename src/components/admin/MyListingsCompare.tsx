/**
 * „Anunțurile mele" — introduc propriile anunțuri, le compar cu prețul mediu din
 * zonă (din anunțurile găsite), pregătesc publicarea pe platforme, salvez linkul
 * fiecărei publicări și primesc e-mail de confirmare.
 *
 * Notă: OLX / Storia / imobiliare.ro / Publi24 / BursaImobiliara nu oferă un API
 * public de postare, deci publicarea nu poate fi 100% automată. Aici se pregătește
 * textul anunțului, se copiază cu un clic, se deschide pagina de adăugare a
 * platformei și se salvează linkul anunțului publicat.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Plus, RefreshCw, Trash2, Copy, ExternalLink, CheckCircle2, TrendingUp, TrendingDown, Mail,
  ImagePlus, Rocket, Wand2, Loader2,
} from "lucide-react";

interface MyListing {
  id: string;
  title: string;
  zone: string | null;
  property_type: string | null;
  rooms: number | null;
  size: number | null;
  price: number | null;
  description: string | null;
  image_url: string | null;
  contact_phone: string | null;
  listing_url: string | null;
  publish_status: Record<string, unknown> | null;
  created_at: string | null;
}

/** publish_status acceptă atât formatul vechi (dată text) cât și cel nou ({ at, url }). */
interface PublishInfo {
  at: string | null;
  url: string | null;
}

const readPublish = (raw: unknown): PublishInfo | null => {
  if (!raw) return null;
  if (typeof raw === "string") return { at: raw, url: null };
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return { at: typeof o.at === "string" ? o.at : null, url: typeof o.url === "string" ? o.url : null };
  }
  return null;
};

const PLATFORMS: Array<{ name: string; addUrl: string }> = [
  { name: "OLX", addUrl: "https://www.olx.ro/post/" },
  { name: "Storia.ro", addUrl: "https://www.storia.ro/ro/adauga-anunt" },
  { name: "imobiliare.ro", addUrl: "https://www.imobiliare.ro/adauga-anunt" },
  { name: "Publi24", addUrl: "https://www.publi24.ro/adauga-anunt/" },
  { name: "BursaImobiliara.ro", addUrl: "https://www.bursaimobiliara.ro/adauga-anunt" },
];

const TYPES = ["apartament", "garsoniera", "casa", "teren", "comercial"];
const NOTIFY_EMAIL = "info@realtrust.ro";

const eur = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`;

const dateTimeRo = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const emptyForm = {
  title: "",
  zone: "",
  property_type: "apartament",
  rooms: "",
  size: "",
  price: "",
  description: "",
  contact_phone: "",
  image_url: "",
};

export default function MyListingsCompare() {
  const [rows, setRows] = useState<MyListing[]>([]);
  const [market, setMarket] = useState<Record<string, { avg: number; avgSqm: number | null; n: number }>>({});
  const [form, setForm] = useState({ ...emptyForm });
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mine, zones] = await Promise.all([
      supabase.from("my_listings").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.rpc("get_zone_price_report_v2", { p_days: 90, p_type: null }),
    ]);
    setRows(((mine.data || []) as unknown as MyListing[]));
    const map: Record<string, { avg: number; avgSqm: number | null; n: number }> = {};
    for (const z of (zones.data || []) as any[]) {
      const key = `${String(z.zone).toLowerCase()}|${String(z.property_type).toLowerCase()}`;
      map[key] = {
        avg: Number(z.avg_price) || 0,
        avgSqm: z.avg_price_sqm ? Number(z.avg_price_sqm) : null,
        n: Number(z.samples) || 0,
      };
    }
    setMarket(map);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Adaugă un titlu", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("my_listings").insert({
      title: form.title.trim(),
      zone: form.zone.trim() || null,
      property_type: form.property_type || null,
      rooms: form.rooms ? Number(form.rooms) : null,
      size: form.size ? Number(form.size) : null,
      price: form.price ? Number(form.price) : null,
      description: form.description.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      image_url: form.image_url.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Nu s-a putut salva", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ ...emptyForm });
    toast({ title: "Anunț adăugat" });
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("my_listings").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Nu s-a putut șterge", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  };

  /** Încarcă imaginea anunțului în Storage și reține linkul public. */
  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Alege un fișier imagine", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `my-listings/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Imaginea nu s-a încărcat", description: error.message, variant: "destructive" });
      return;
    }
    const url = supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
    setForm((f) => ({ ...f, image_url: url }));
    toast({ title: "Imagine adăugată" });
  };

  /** Descriere gata de publicat, construită din datele anunțului. */
  const suggestDescription = () => {
    const bits: string[] = [];
    const tip = form.property_type || "imobil";
    bits.push(
      `${tip.charAt(0).toUpperCase() + tip.slice(1)}${form.rooms ? ` cu ${form.rooms} camere` : ""}` +
        `${form.size ? `, ${form.size} mp utili` : ""}${form.zone ? `, în zona ${form.zone}, Timișoara` : ", în Timișoara"}.`,
    );
    bits.push(
      "Imobil îngrijit, potrivit atât pentru locuit, cât și pentru investiție cu randament în regim hotelier.",
    );
    if (form.price) bits.push(`Preț: ${Number(form.price).toLocaleString("ro-RO")} € (negociabil în limite rezonabile).`);
    bits.push("Zonă cu acces rapid la transport public, școli, magazine și centru.");
    bits.push("Programări vizionare direct la apartament, în intervalul orar convenit telefonic.");
    setForm((f) => ({ ...f, description: bits.join("\n\n") }));
    toast({ title: "Descriere generată", description: "O poți ajusta înainte de publicare." });
  };

  const adText = (r: MyListing) =>
    [
      r.title,
      "",
      [r.property_type, r.rooms ? `${r.rooms} camere` : null, r.size ? `${r.size} mp` : null, r.zone]
        .filter(Boolean)
        .join(" · "),
      r.price ? `Preț: ${eur(r.price)}` : "",
      "",
      r.description || "",
      r.image_url ? `\nFoto: ${r.image_url}` : "",
      r.contact_phone ? `\nContact: ${r.contact_phone}` : "",
    ]
      .filter((l) => l !== null)
      .join("\n")
      .trim();

  const copyAd = async (r: MyListing) => {
    try {
      await navigator.clipboard.writeText(adText(r));
      toast({ title: "Text copiat", description: "Îl poți lipi direct în formularul platformei." });
    } catch {
      toast({ title: "Copiază manual textul", variant: "destructive" });
    }
  };

  /** Deschide formularul tuturor celor 5 platforme + pagina de pe realtrust.ro. */
  const publishEverywhere = async (r: MyListing) => {
    await copyAd(r);
    let blocked = 0;
    for (const p of PLATFORMS) {
      const w = window.open(p.addUrl, "_blank", "noopener,noreferrer");
      if (!w) blocked++;
    }
    // realtrust.ro: publică dacă nu e deja publicat, apoi deschide linkul paginii
    const site = readPublish((r.publish_status || {})["realtrust.ro"]);
    if (site?.url) {
      if (!window.open(site.url, "_blank", "noopener,noreferrer")) blocked++;
    } else {
      const url = await publishOnSite(r);
      if (url && !window.open(url, "_blank", "noopener,noreferrer")) blocked++;
    }
    toast({
      title: blocked ? "Permite ferestrele pop-up" : "Toate linkurile sunt deschise",
      description: blocked
        ? "Browserul a blocat unele file. Permite pop-up-urile pentru realtrust.ro și reîncearcă."
        : "Textul e în clipboard — lipește-l în fiecare formular; pagina de pe realtrust.ro s-a deschis direct.",
      variant: blocked ? "destructive" : undefined,
    });
  };


  const [publishingSite, setPublishingSite] = useState<string | null>(null);

  /** Publică anunțul direct pe realtrust.ro (creează pagina proprietății). */
  const publishOnSite = async (r: MyListing): Promise<string | null> => {
    if (!r.price) {
      toast({ title: "Adaugă prețul înainte de publicare", variant: "destructive" });
      return null;
    }
    const existing = readPublish((r.publish_status || {})["realtrust.ro"]);
    if (existing) {
      toast({ title: "Anunțul este deja publicat pe realtrust.ro" });
      return existing.url || null;
    }
    setPublishingSite(r.id);
    const slug = `${r.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)}-${r.id.slice(0, 6)}`;

    const { data: prop, error } = await supabase
      .from("properties")
      .insert({
        name: r.title,
        location: r.zone || "Timișoara",
        description_ro: r.description || r.title,
        description_en: r.description || r.title,
        tag: "Anunț proprietar",
        slug,
        capital_necesar: Number(r.price),
        size: r.size ? Number(r.size) : null,
        rooms: r.rooms ? Number(r.rooms) : null,
        images: r.image_url ? [r.image_url] : [],
        is_active: true,
      } as never)
      .select("id, slug")
      .single();

    if (error) {
      setPublishingSite(null);
      toast({ title: "Nu s-a putut publica pe realtrust.ro", description: error.message, variant: "destructive" });
      return null;
    }

    const at = new Date().toISOString();
    const url = `https://realtrust.ro/proprietate/${(prop as { slug: string }).slug}`;
    const status = { ...(r.publish_status || {}), "realtrust.ro": { at, url } };
    await supabase.from("my_listings").update({ publish_status: status as never }).eq("id", r.id);
    setPublishingSite(null);
    await notifyPublished(r, "realtrust.ro", url, at);
    void load();
    return url;
  };

  /** E-mail de confirmare la marcarea publicării, cu linkul platformei. */
  const notifyPublished = async (r: MyListing, platform: string, url: string | null, at: string) => {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "my-listing-published",
        recipientEmail: NOTIFY_EMAIL,
        idempotencyKey: `my-listing-published-${r.id}-${platform}-${at.slice(0, 16)}`,
        templateData: {
          listingTitle: r.title,
          platform,
          platformUrl: url || undefined,
          price: r.price ? eur(r.price) : undefined,
          zone: r.zone || undefined,
          publishedAt: dateTimeRo(at),
        },
      },
    });
    if (error) {
      toast({
        title: "Publicarea a fost salvată, dar e-mailul nu a plecat",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `Publicat pe ${platform}`, description: `Confirmare trimisă la ${NOTIFY_EMAIL}.` });
  };

  const togglePublished = async (r: MyListing, platform: string) => {
    const status = { ...(r.publish_status || {}) } as Record<string, unknown>;
    const existing = readPublish(status[platform]);
    if (existing) {
      status[platform] = null;
    } else {
      const at = new Date().toISOString();
      const url = (urlDraft[`${r.id}|${platform}`] || "").trim() || null;
      status[platform] = { at, url };
      const { error } = await supabase.from("my_listings").update({ publish_status: status as any }).eq("id", r.id);
      if (error) {
        toast({ title: "Nu s-a putut actualiza", description: error.message, variant: "destructive" });
        return;
      }
      await notifyPublished(r, platform, url, at);
      void load();
      return;
    }
    const { error } = await supabase.from("my_listings").update({ publish_status: status as any }).eq("id", r.id);
    if (error) {
      toast({ title: "Nu s-a putut actualiza", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  };

  const compare = (r: MyListing) => {
    const key = `${String(r.zone || "").toLowerCase()}|${String(r.property_type || "").toLowerCase()}`;
    const m = market[key];
    if (!m || !m.avg || !r.price) return null;
    const diff = ((Number(r.price) - m.avg) / m.avg) * 100;
    return { ...m, diff };
  };

  /** Anunțurile publicate, grupate pe platformă. */
  const publishedByPlatform = useMemo(() => {
    const map: Record<string, Array<{ listing: MyListing; info: PublishInfo }>> = {};
    for (const p of PLATFORMS) map[p.name] = [];
    for (const r of rows) {
      const status = (r.publish_status || {}) as Record<string, unknown>;
      for (const [platform, raw] of Object.entries(status)) {
        const info = readPublish(raw);
        if (!info) continue;
        if (!map[platform]) map[platform] = [];
        map[platform].push({ listing: r, info });
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => String(b.info.at || "").localeCompare(String(a.info.at || "")));
    }
    return map;
  }, [rows]);

  const publishedTotal = useMemo(
    () => Object.values(publishedByPlatform).reduce((s, arr) => s + arr.length, 0),
    [publishedByPlatform],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">Anunțurile mele & publicare</CardTitle>
          <CardDescription>
            Adaugă anunțurile tale, compară prețul cu media din zonă și publică-le pe cele 5 platforme.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{rows.length} anunțuri</Badge>
          <Badge variant="secondary">{publishedTotal} publicări</Badge>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}
            aria-label="Reîncarcă anunțurile mele">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formular adăugare */}
        <div className="grid gap-3 rounded-lg border border-border/50 p-3 md:grid-cols-3">
          <div className="md:col-span-3">
            <Label>Titlu</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Apartament 2 camere, Cetate, renovat" />
          </div>
          <div>
            <Label>Zonă</Label>
            <Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="Cetate" />
          </div>
          <div>
            <Label>Tip imobil</Label>
            <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Preț (€)</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <Label>Camere</Label>
            <Input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
          </div>
          <div>
            <Label>Suprafață (mp)</Label>
            <Input type="number" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </div>
          <div>
            <Label>Telefon contact</Label>
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Descriere</Label>
              <Button type="button" variant="outline" size="sm" onClick={suggestDescription}>
                <Wand2 className="mr-1 h-3.5 w-3.5" /> Generează descrierea
              </Button>
            </div>
            <Textarea rows={5} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalii despre imobil, dotări, disponibilitate..." />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="my-listing-image">Imagine anunț</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id="my-listing-image"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                }}
                className="max-w-[280px]"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Imaginea anunțului meu"
                  className="h-16 w-16 rounded-md object-cover"
                  loading="lazy"
                />
              )}
              {form.image_url && (
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => setForm({ ...form, image_url: "" })}>
                  Elimină imaginea
                </Button>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ImagePlus className="h-3.5 w-3.5" /> Imaginea se salvează o dată și o folosești la fiecare publicare.
            </p>
          </div>
          <div className="md:col-span-3">
            <Button onClick={() => void save()} disabled={saving}>
              <Plus className="mr-1 h-4 w-4" /> Adaugă anunțul
            </Button>
          </div>
        </div>

        {/* Lista anunțurilor mele + comparație + publicare */}
        <div className="space-y-3">
          {rows.map((r) => {
            const c = compare(r);
            const status = (r.publish_status || {}) as Record<string, unknown>;
            return (
              <div key={r.id} className="rounded-lg border border-border/50 p-3 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    {r.image_url && (
                      <img src={r.image_url} alt={`Imagine pentru ${r.title}`}
                        className="h-16 w-16 rounded-md object-cover" loading="lazy" />
                    )}
                    <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.zone, r.property_type, r.rooms ? `${r.rooms} cam` : null, r.size ? `${r.size} mp` : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{eur(r.price)}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => void remove(r.id)}
                      aria-label={`Șterge anunțul ${r.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {c ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Media zonei ({c.n} anunțuri): <strong>{eur(c.avg)}</strong>
                      {c.avgSqm ? ` · ${eur(c.avgSqm)}/mp` : ""}
                    </span>
                    <Badge variant={c.diff > 0 ? "destructive" : "secondary"} className="gap-1">
                      {c.diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {c.diff > 0 ? "+" : ""}{c.diff.toFixed(1)}% față de zonă
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nu există încă suficiente anunțuri găsite în această zonă și tip pentru comparație.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void copyAd(r)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copiază textul anunțului
                  </Button>
                  <Button size="sm" onClick={() => void publishEverywhere(r)}>
                    <Rocket className="mr-1 h-3.5 w-3.5" /> Publică pe toate cele 5 platforme
                  </Button>
                  {(() => {
                    const site = readPublish(status["realtrust.ro"]);
                    return site ? (
                      <a
                        href={site.url || "https://realtrust.ro"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                      >
                        publicat pe realtrust.ro {dateTimeRo(site.at)}
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={publishingSite === r.id}
                        onClick={() => void publishOnSite(r)}
                      >
                        {publishingSite === r.id
                          ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          : <Rocket className="mr-1 h-3.5 w-3.5" />}
                        Publică pe realtrust.ro
                      </Button>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  {PLATFORMS.map((p) => {
                    const info = readPublish(status[p.name]);
                    const published = !!info;
                    const key = `${r.id}|${p.name}`;
                    return (
                      <div key={p.name} className="flex flex-wrap items-center gap-2 text-xs">
                        <Button
                          variant={published ? "secondary" : "outline"}
                          size="sm"
                          className="min-w-[150px] justify-start"
                          onClick={() => {
                            void copyAd(r);
                            window.open(p.addUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> {p.name}
                        </Button>
                        {published ? (
                          <>
                            <span className="text-muted-foreground">publicat {dateTimeRo(info!.at)}</span>
                            {info!.url && (
                              <a href={info!.url} target="_blank" rel="noopener noreferrer" className="underline">
                                vezi anunțul
                              </a>
                            )}
                          </>
                        ) : (
                          <Input
                            value={urlDraft[key] || ""}
                            onChange={(e) => setUrlDraft({ ...urlDraft, [key]: e.target.value })}
                            placeholder={`Link anunț pe ${p.name} (opțional)`}
                            className="h-8 max-w-[260px] text-xs"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={published
                            ? `Anulează marcarea publicării pe ${p.name}`
                            : `Marchează ${r.title} ca publicat pe ${p.name}`}
                          onClick={() => void togglePublished(r, p.name)}
                        >
                          <CheckCircle2 className={`h-4 w-4 ${published ? "text-green-600" : "text-muted-foreground"}`} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!rows.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Se încarcă..." : "Niciun anunț adăugat încă."}
            </p>
          )}
        </div>

        {/* Rubrica: anunțurile publicate, pe fiecare platformă */}
        <div className="space-y-3 rounded-lg border border-border/50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Anunțurile publicate, pe platformă
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {PLATFORMS.map((p) => {
              const list = publishedByPlatform[p.name] || [];
              return (
                <div key={p.name} className="rounded-lg border border-border/40 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
                  </div>
                  {list.length ? (
                    <ul className="space-y-1.5">
                      {list.map(({ listing, info }) => (
                        <li key={`${listing.id}-${p.name}`} className="text-xs">
                          <span className="font-medium">{listing.title}</span>
                          <span className="text-muted-foreground"> · {eur(listing.price)} · {dateTimeRo(info.at)}</span>
                          {info.url && (
                            <>
                              {" "}
                              <a href={info.url} target="_blank" rel="noopener noreferrer" className="underline">
                                deschide
                              </a>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Încă niciun anunț publicat aici.</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            La fiecare publicare marcată primești e-mail de confirmare la {NOTIFY_EMAIL}, cu platforma și linkul anunțului.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          OLX, Storia, imobiliare.ro, Publi24 și BursaImobiliara nu permit postarea automată din exterior
          (nu oferă acces public pentru publicare). De aceea textul se copiază automat și se deschide direct
          formularul platformei — publicarea rămâne un singur clic de confirmare la ei.
        </p>
      </CardContent>
    </Card>
  );
}
