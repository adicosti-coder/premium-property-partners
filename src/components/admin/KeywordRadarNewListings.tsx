import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ExternalLink, Download, MessageCircle, Sparkles, BellRing } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import ProspectManualImport from "./ProspectManualImport";
import ProspectPriceHistory from "./ProspectPriceHistory";

interface NewListing {
  id: string;
  title: string | null;
  zone: string | null;
  price: number | null;
  rooms: number | null;
  surface: number | null;
  source_platform: string | null;
  source_url: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  scraped_at: string | null;
  created_at: string | null;
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const fmtPrice = (p: number | null) => (p ? `${Number(p).toLocaleString("ro-RO")} €` : "—");

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^\d]/g, "")}`;

const WINDOWS: Record<string, number> = { "24": 24, "72": 72, "168": 168, "720": 720 };

const SEEN_KEY = "rt_new_listings_seen_at";

export const PROSPECT_REFRESH_EVENT = "prospect-listings-refresh";

export default function KeywordRadarNewListings() {
  const [rows, setRows] = useState<NewListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [hours, setHours] = useState("24");
  const [onlyPhone, setOnlyPhone] = useState(false);
  const [q, setQ] = useState("");
  const [seenAt, setSeenAt] = useState<string | null>(() => localStorage.getItem(SEEN_KEY));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - (WINDOWS[hours] || 24) * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("prospect_listings")
        .select(
          "id,title,zone,price,rooms,surface,source_platform,source_url,contact_phone,contact_name,scraped_at,created_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setRows((data || []) as unknown as NewListing[]);
    } catch (e: unknown) {
      toast({ title: "Eroare raport anunțuri", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => { load(); }, [load]);

  // Reîmprospătare automată după o căutare sau un import manual
  useEffect(() => {
    const handler = () => { load(); };
    window.addEventListener(PROSPECT_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PROSPECT_REFRESH_EVENT, handler);
  }, [load]);

  // Realtime: anunțurile noi apar fără reîncărcare
  useEffect(() => {
    const channel = supabase
      .channel("prospect-listings-new")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prospect_listings" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyPhone && !r.contact_phone) return false;
      if (!needle) return true;
      return [r.title, r.zone, r.contact_phone, r.contact_name, r.source_platform]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, onlyPhone]);

  // Anunțuri necitite, grupate pe platformă
  const unseenByPlatform = useMemo(() => {
    if (!seenAt) return [];
    const map = new Map<string, number>();
    for (const r of rows) {
      const at = r.created_at || r.scraped_at;
      if (!at || at <= seenAt) continue;
      const key = r.source_platform || "Necunoscut";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows, seenAt]);

  const unseenTotal = unseenByPlatform.reduce((s, [, n]) => s + n, 0);

  const markSeen = () => {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  };

  // Notificare inițială: setează reperul la prima deschidere
  useEffect(() => {
    if (!seenAt && rows.length > 0) {
      const now = new Date().toISOString();
      localStorage.setItem(SEEN_KEY, now);
      setSeenAt(now);
    }
  }, [rows, seenAt]);

  const sendAlert = async () => {
    setNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-new-listings-alert", {
        body: { force: true },
      });
      if (error) throw error;
      const count = (data as { new_listings?: number })?.new_listings ?? 0;
      const platforms = (data as { platforms?: Record<string, number> })?.platforms || {};
      toast({
        title: count ? `Alertă trimisă: ${count} anunțuri` : "Niciun anunț nou de raportat",
        description: Object.entries(platforms).map(([p, n]) => `${p}: ${n}`).join(" · ") || undefined,
      });
    } catch (e: unknown) {
      toast({ title: "Eroare alertă", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setNotifying(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      csvFileName("anunturi-noi"),
      ["Titlu", "Zonă", "Camere", "Suprafață", "Preț", "Telefon", "Proprietar", "Sursă", "Link", "Găsit la"],
      filtered.map((r) => [
        r.title,
        r.zone,
        r.rooms,
        r.surface,
        r.price,
        r.contact_phone,
        r.contact_name,
        r.source_platform,
        r.source_url,
        fmtDate(r.created_at || r.scraped_at),
      ]),
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-4 rounded-lg border-2 border-emerald-500/30 bg-background/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Anunțuri noi găsite — preț, telefon, link
            <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger className="w-[150px] min-h-[44px] sm:min-h-0" aria-label="Perioadă">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">Ultimele 24 ore</SelectItem>
                <SelectItem value="72">Ultimele 3 zile</SelectItem>
                <SelectItem value="168">Ultimele 7 zile</SelectItem>
                <SelectItem value="720">Ultimele 30 zile</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={onlyPhone ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyPhone((v) => !v)}
              className="min-h-[44px] sm:min-h-0"
            >
              Doar cu telefon
            </Button>
            <ProspectManualImport onImported={load} />
            <Button variant="outline" size="sm" onClick={sendAlert} disabled={notifying} className="min-h-[44px] sm:min-h-0">
              {notifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
              Trimite-mi pe email
            </Button>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Reîmprospătează anunțurile noi" className="min-h-[44px] sm:min-h-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="min-h-[44px] sm:min-h-0">
              <Download className="h-4 w-4 mr-2" />
              Descarcă
            </Button>
          </div>
        </div>

        {unseenTotal > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
            <BellRing className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs flex-1">
              <span className="font-medium">{unseenTotal} anunțuri noi</span>{" "}
              <span className="text-muted-foreground">
                {unseenByPlatform.map(([p, n]) => `${p}: ${n}`).join(" · ")}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={markSeen} className="min-h-[40px] sm:min-h-0">
              Am văzut
            </Button>
          </div>
        )}

        <Input
          placeholder="Caută după titlu, zonă, telefon…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Caută în anunțurile noi"
          className="max-w-sm"
        />

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {loading ? "Se încarcă…" : "Niciun anunț nou în perioada selectată."}
          </p>
        ) : (
          <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto">
            {filtered.map((r) => (
              <div key={r.id} className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium line-clamp-2">{r.title || "Fără titlu"}</span>
                  <span className="text-sm font-semibold whitespace-nowrap">{fmtPrice(r.price)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  {r.zone && <Badge variant="outline" className="text-[10px]">{r.zone}</Badge>}
                  {r.rooms ? <span>{r.rooms} camere</span> : null}
                  {r.surface ? <span>{r.surface} m²</span> : null}
                  <Badge variant="secondary" className="text-[10px]">{r.source_platform || "Necunoscut"}</Badge>
                  <span>{fmtDate(r.created_at || r.scraped_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {r.contact_phone ? (
                    <>
                      <a href={`tel:${r.contact_phone}`} className="hover:underline font-medium">{r.contact_phone}</a>
                      <a
                        href={waLink(r.contact_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Scrie pe WhatsApp proprietarului"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Fără telefon</span>
                  )}
                  {r.source_url && !r.source_url.startsWith("manual:") && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Deschide anunțul original"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Anunț
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProspectPriceHistory />
    </div>
  );
}
