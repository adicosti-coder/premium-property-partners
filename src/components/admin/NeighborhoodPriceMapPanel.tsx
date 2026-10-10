import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GoogleMapEmbed from "@/components/maps/GoogleMapEmbed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Same district reference points as listing-market-score (approximate centers).
const ZONES = [
  { keys: ["cetate", "centru", "unirii", "victoriei"], label: "Centru / Cetate", lat: 45.7557, lng: 21.229 },
  { keys: ["elisabetin"], label: "Elisabetin", lat: 45.747, lng: 21.227 },
  { keys: ["iosefin"], label: "Iosefin", lat: 45.747, lng: 21.207 },
  { keys: ["fabric"], label: "Fabric", lat: 45.758, lng: 21.252 },
  { keys: ["complex stud", "circumval", "iulius", "lipovei", "torontal", "aradului", "bucovina", "ronat"], label: "Nord / Aradului", lat: 45.774, lng: 21.225 },
  { keys: ["dumbr"], label: "Dumbrăvița", lat: 45.796, lng: 21.242 },
  { keys: ["giroc", "martirilor", "soarelui", "judetean", "dambovi", "braytim", "sagului", "freidorf"], label: "Sud", lat: 45.727, lng: 21.238 },
  { keys: ["mosnita", "ghiroda", "sacalaz", "chisoda"], label: "Periurban", lat: 45.73, lng: 21.3 },
];
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const zoneOf = (s: string) => { const n = norm(s); return ZONES.findIndex((z) => z.keys.some((k) => n.includes(k))); };
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const W = 640, H = 520, LAT = [45.715, 45.805], LNG = [21.19, 21.315];
const xy = (lat: number, lng: number) => ({ x: ((lng - LNG[0]) / (LNG[1] - LNG[0])) * W, y: H - ((lat - LAT[0]) / (LAT[1] - LAT[0])) * H });

type Analysed = { id: string; zone: number; ppm: number; title: string; url: string; q: string; lat?: number; lng?: number };

export default function NeighborhoodPriceMapPanel() {
  const [medians, setMedians] = useState<{ ppm: number; n: number }[]>([]);
  const [analysed, setAnalysed] = useState<Analysed[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [cityPpm, setCityPpm] = useState(0);
  const [pin, setPin] = useState<Analysed | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 180 * 86400_000).toISOString();
      const [{ data: sale }, { data: an }] = await Promise.all([
        (supabase.from("prospect_listings") as any).select("zone, price, size").eq("category", "vanzare")
          .gte("created_at", since).gte("price", 20000).lte("price", 1500000).gte("size", 15).limit(3000),
        (supabase.from("analyzed_listings") as any).select("id, url, extracted_data").order("created_at", { ascending: false }).limit(200),
      ]);
      const buckets: number[][] = ZONES.map(() => []);
      const all: number[] = [];
      for (const r of sale ?? []) {
        const z = zoneOf(r.zone || ""); const ppm = Number(r.price) / Number(r.size);
        if (ppm > 600 && ppm < 6000) all.push(ppm);
        if (z >= 0 && ppm > 600 && ppm < 6000) buckets[z].push(ppm);
      }
      setCityPpm(Math.round(median(all)));
      setMedians(buckets.map((b) => ({ ppm: Math.round(median(b)), n: b.length })));
      const seen = new Set<string>();
      setAnalysed((an ?? []).flatMap((r: any) => {
        if (seen.has(r.url)) return []; seen.add(r.url);
        const d = r.extracted_data || {}; const ppm = Number(d.pret_listare) / Number(d.suprafata);
        const z = zoneOf([d.zona, d.titlu].filter(Boolean).join(" "));
        return z >= 0 && ppm > 0 && Number.isFinite(ppm) ? [{ id: r.id, zone: z, ppm: Math.round(ppm), title: d.titlu || "Anunț", url: r.url, q: [d.adresa, d.strada, d.zona].filter(Boolean).join(", ") || ZONES[z].label, lat: Number(d.latitude ?? d.lat) || undefined, lng: Number(d.longitude ?? d.lng) || undefined }] : [];
      }));
    })();
  }, []);

  const range = useMemo(() => {
    const v = medians.filter((m) => m.n >= 5).map((m) => m.ppm);
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
  }, [medians]);
  // Low → primary at low intensity, high → accent (semantic tokens only).
  const intensity = (p: number) => 0.25 + 0.75 * ((p - range[0]) / Math.max(1, range[1] - range[0]));
  const list = sel === null ? analysed : analysed.filter((a) => a.zone === sel);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hartă prețuri Timișoara (€/m², vânzare, 6 luni){cityPpm ? ` · media orașului ${cityPpm.toLocaleString("ro-RO")} €/m²` : ""}</CardTitle>
        <p className="text-sm text-muted-foreground">Mediana pe cartier din anunțurile scraperului, comparată cu anunțurile analizate. Apasă un cartier pentru detalii.</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-muted/30" role="img" aria-label="Hartă prețuri pe cartiere Timișoara">
          {ZONES.map((z, i) => {
            const m = medians[i]; const { x, y } = xy(z.lat, z.lng); const ok = m && m.n >= 5;
            const pins = analysed.filter((a) => a.zone === i);
            return (
              <g key={z.label} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer">
                <circle cx={x} cy={y} r={ok ? 34 + Math.min(m.n, 200) / 10 : 26} className={ok ? "fill-primary" : "fill-muted-foreground"}
                  fillOpacity={ok ? intensity(m.ppm) : 0.2} stroke="hsl(var(--foreground))" strokeWidth={sel === i ? 3 : 0} />
                <text x={x} y={y - 4} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">{z.label}</text>
                <text x={x} y={y + 13} textAnchor="middle" className="fill-foreground text-[12px]">{ok ? `${m.ppm.toLocaleString("ro-RO")} €/m²` : "date puține"}</text>
                {pins.slice(0, 6).map((p, k) => (
                  <circle key={p.id} cx={x + 30 + k * 9} cy={y - 26} r={5}
                    className={p.ppm > (ok ? m.ppm : cityPpm) ? "fill-destructive" : "fill-accent"} stroke="hsl(var(--background))" strokeWidth={1.5} />
                ))}
              </g>
            );
          })}
          <text x={10} y={H - 10} className="fill-muted-foreground text-[11px]">● roșu = anunț peste mediana cartierului · ● auriu = sub mediană</text>
        </svg>
        <div className="space-y-2 text-sm max-h-[520px] overflow-y-auto">
          <div className="font-medium">{sel === null ? "Toate anunțurile analizate" : ZONES[sel].label} ({list.length})</div>
          {list.map((a) => {
            const m = medians[a.zone]; const zoneOk = !!m && m.n >= 5;
            const ref = zoneOk ? m.ppm : cityPpm; const diff = ref ? Math.round(((a.ppm - ref) / ref) * 100) : null;
            return (
              <div key={a.id} role="button" tabIndex={0} onClick={() => setPin(a)} onKeyDown={(e) => e.key === "Enter" && setPin(a)} className={`block cursor-pointer rounded-md border p-2 hover:bg-muted ${pin?.id === a.id ? "border-primary" : ""}`}>
                <div className="truncate font-medium">{a.title} <a href={a.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary underline">sursă</a></div>
                <div className="text-xs text-muted-foreground">
                  {ZONES[a.zone].label} · {a.ppm.toLocaleString("ro-RO")} €/m²
                  {diff !== null && <> · <span className={diff > 0 ? "text-destructive" : "text-primary"}>{diff > 0 ? "+" : ""}{diff}% față de mediana {zoneOk ? "cartierului" : "orașului"}</span></>}
                </div>
              </div>
            );
          })}
          {!list.length && <p className="text-muted-foreground">Niciun anunț analizat în această zonă.</p>}
        </div>
        <div className="lg:col-span-2">
          {pin ? (
            <GoogleMapEmbed key={pin.id} latitude={pin.lat} longitude={pin.lng} query={pin.q} title={`${pin.title} — ${pin.q}`} className="h-96" />
          ) : <p className="text-sm text-muted-foreground">Apasă un anunț din listă ca să-l vezi pe harta Google, la adresa extrasă din anunț.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
