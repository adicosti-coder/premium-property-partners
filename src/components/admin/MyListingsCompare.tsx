/**
 * „Anunțurile mele" — introduc propriile anunțuri, le compar cu prețul mediu din
 * zonă (din anunțurile găsite) și pregătesc publicarea pe platforme.
 *
 * Notă: OLX / Storia / imobiliare.ro / Publi24 / BursaImobiliara nu oferă un API
 * public de postare, deci publicarea nu poate fi 100% automată. Aici se pregătește
 * textul anunțului, se copiază cu un clic, se deschide pagina de adăugare a
 * platformei și se marchează platformele pe care anunțul a fost publicat.
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
import { Plus, RefreshCw, Trash2, Copy, ExternalLink, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";

interface MyListing {
  id: string;
  title: string;
  zone: string | null;
  property_type: string | null;
  rooms: number | null;
  size: number | null;
  price: number | null;
  description: string | null;
  contact_phone: string | null;
  listing_url: string | null;
  publish_status: Record<string, unknown> | null;
  created_at: string | null;
}

const PLATFORMS: Array<{ name: string; addUrl: string }> = [
  { name: "OLX", addUrl: "https://www.olx.ro/adauga/" },
  { name: "Storia.ro", addUrl: "https://www.storia.ro/ro/adauga-anunt" },
  { name: "imobiliare.ro", addUrl: "https://www.imobiliare.ro/adauga-anunt" },
  { name: "Publi24", addUrl: "https://www.publi24.ro/adauga-anunt.html" },
  { name: "BursaImobiliara.ro", addUrl: "https://www.bursaimobiliara.ro/adauga-anunt" },
];

const TYPES = ["apartament", "garsoniera", "casa", "teren", "comercial"];

const eur = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`;

const emptyForm = {
  title: "",
  zone: "",
  property_type: "apartament",
  rooms: "",
  size: "",
  price: "",
  description: "",
  contact_phone: "",
};

export default function MyListingsCompare() {
  const [rows, setRows] = useState<MyListing[]>([]);
  const [market, setMarket] = useState<Record<string, { avg: number; avgSqm: number | null; n: number }>>({});
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mine, zones] = await Promise.all([
      supabase.from("my_listings").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.rpc("get_zone_price_report", { p_days: 90, p_type: null }),
    ]);
    setRows(((mine.data || []) as unknown as MyListing[]));
    const map: Record<string, { avg: number; avgSqm: number | null; n: number }> = {};
    for (const z of (zones.data || []) as any[]) {
      const key = `${String(z.zone).toLowerCase()}|${String(z.property_type).toLowerCase()}`;
      map[key] = { avg: Number(z.avg_price) || 0, avgSqm: z.avg_price_sqm ? Number(z.avg_price_sqm) : null, n: Number(z.samples) || 0 };
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

  const togglePublished = async (r: MyListing, platform: string) => {
    const status = { ...(r.publish_status || {}) } as Record<string, string | null>;
    status[platform] = status[platform] ? null : new Date().toISOString();
    const { error } = await supabase.from("my_listings").update({ publish_status: status }).eq("id", r.id);
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

  const summary = useMemo(() => rows.length, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">Anunțurile mele & publicare</CardTitle>
          <CardDescription>
            Adaugă anunțurile tale, compară prețul cu media din zonă și pregătește publicarea pe cele 5 platforme.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{summary} anunțuri</Badge>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
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
            <Label>Descriere</Label>
            <Textarea rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalii despre imobil, dotări, disponibilitate..." />
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
            const status = (r.publish_status || {}) as Record<string, string | null>;
            return (
              <div key={r.id} className="rounded-lg border border-border/50 p-3 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.zone, r.property_type, r.rooms ? `${r.rooms} cam` : null, r.size ? `${r.size} mp` : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{eur(r.price)}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => void remove(r.id)}>
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
                  {PLATFORMS.map((p) => {
                    const published = !!status[p.name];
                    return (
                      <span key={p.name} className="inline-flex items-center gap-1">
                        <Button
                          variant={published ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => {
                            void copyAd(r);
                            window.open(p.addUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> {p.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Marchează ${r.title} ca publicat pe ${p.name}`}
                          onClick={() => void togglePublished(r, p.name)}
                        >
                          <CheckCircle2 className={`h-4 w-4 ${published ? "text-green-600" : "text-muted-foreground"}`} />
                        </Button>
                      </span>
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

        <p className="text-xs text-muted-foreground">
          OLX, Storia, imobiliare.ro, Publi24 și BursaImobiliara nu permit postarea automată din exterior
          (nu oferă acces public pentru publicare). De aceea textul se copiază automat și se deschide direct
          formularul platformei — publicarea rămâne un singur clic de confirmare la ei.
        </p>
      </CardContent>
    </Card>
  );
}
