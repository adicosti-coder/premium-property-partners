/**
 * „Anunțuri salvate" — toate anunțurile active din baza de prospectare, cu preț,
 * durata petrecută pe sursă, telefon și link direct, ca să poată fi comparate
 * într-un singur loc. Include alertă pentru anunțurile aproape de expirare
 * (nevăzute pe platformă de peste 14 zile; la 21 de zile sunt considerate expirate).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ExternalLink, Phone, MessageCircle, Download, AlertTriangle, Clock } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import { toast } from "sonner";

export const EXPIRY_DAYS = 21;
export const EXPIRY_WARNING_DAYS = 14;

interface Row {
  id: string;
  title: string | null;
  price: number | null;
  price_per_sqm: number | null;
  price_checked_at: string | null;
  contact_phone: string | null;
  source_url: string | null;
  source_platform: string | null;
  zone: string | null;
  rooms: number | null;
  created_at: string | null;
  last_seen_at: string | null;
}

const eur = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`);

const dateRo = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const daysSince = (v: string | null): number | null =>
  v ? Math.max(0, Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000)) : null;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^\d]/g, "")}`;

export default function SavedListingsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prospect_listings")
      .select(
        "id,title,price,price_per_sqm,price_checked_at,contact_phone,source_url,source_platform,zone,rooms,created_at,last_seen_at",
      )
      .eq("is_active", true)
      .not("source_url", "is", null)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) toast.error("Nu am putut încărca anunțurile salvate");
    setRows(((data || []) as unknown as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshPrices = async () => {
    setRefreshing(true);
    const { error } = await supabase.functions.invoke("refresh-published-prices", {
      body: { limit: 60 },
    });
    setRefreshing(false);
    if (error) {
      toast.error("Actualizarea prețurilor nu a putut porni");
      return;
    }
    toast.success("Prețurile au fost verificate din nou");
    load();
  };

  const platforms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source_platform || "necunoscut"))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (platform !== "all" && (r.source_platform || "necunoscut") !== platform) return false;
      if (!terms.length) return true;
      const hay = norm(`${r.title || ""} ${r.zone || ""} ${r.contact_phone || ""}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, q, platform]);

  /** Cea mai recentă reverificare automată a prețurilor. */
  const lastPriceCheck = useMemo(() => {
    const times = rows
      .map((r) => (r.price_checked_at ? new Date(r.price_checked_at).getTime() : null))
      .filter((t): t is number => t != null && Number.isFinite(t));
    if (!times.length) return "încă niciodată";
    const d = new Date(Math.max(...times));
    return d.toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [rows]);

  const expiringSoon = useMemo(
    () =>
      filtered.filter((r) => {
        const d = daysSince(r.last_seen_at);
        return d != null && d >= EXPIRY_WARNING_DAYS && d < EXPIRY_DAYS;
      }),
    [filtered],
  );

  const exportCsv = () => {
    downloadCsv(
      csvFileName("anunturi-salvate"),
      ["Titlu", "Platformă", "Zonă", "Camere", "Preț (€)", "€/mp", "Zile pe sursă", "Ultima verificare preț", "Telefon", "Link"],
      filtered.map((r) => [
        r.title,
        r.source_platform,
        r.zone,
        r.rooms,
        r.price,
        r.price_per_sqm,
        daysSince(r.created_at),
        dateRo(r.price_checked_at),
        r.contact_phone,
        r.source_url,
      ]),
    );
  };

  return (
    <div className="space-y-4">
      {expiringSoon.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{expiringSoon.length} anunțuri se apropie de expirare</AlertTitle>
          <AlertDescription>
            Nu au mai fost văzute pe platformă de peste {EXPIRY_WARNING_DAYS} zile. După {EXPIRY_DAYS} zile
            dispar din căutări. Verifică-le acum:{" "}
            {expiringSoon.slice(0, 5).map((r, i) => (
              <span key={r.id}>
                {i > 0 && ", "}
                <a
                  href={r.source_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  {r.title || "anunț"}
                </a>
              </span>
            ))}
            {expiringSoon.length > 5 && ` și încă ${expiringSoon.length - 5}`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Anunțuri salvate</CardTitle>
            <CardDescription>
              {filtered.length} anunțuri active — preț, durata pe sursă, telefon și link direct
              <br />
              Prețurile se reverifică automat o dată la 24 de ore. Ultima reverificare:{" "}
              <span className="font-medium text-foreground">{lastPriceCheck}</span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={refreshPrices} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Actualizează prețurile
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Caută după titlu, zonă sau telefon…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Platformă" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate platformele</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filtered.map((r) => {
              const dSource = daysSince(r.created_at);
              const dSeen = daysSince(r.last_seen_at);
              const warn = dSeen != null && dSeen >= EXPIRY_WARNING_DAYS;
              return (
                <div key={r.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.source_url ? (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {r.title || "Anunț fără titlu"}
                      </a>
                    ) : (
                      <span className="font-medium">{r.title || "Anunț fără titlu"}</span>
                    )}
                    <Badge variant="secondary">{r.source_platform || "necunoscut"}</Badge>
                    {r.zone && <Badge variant="outline">{r.zone}</Badge>}
                    {warn && (
                      <Badge variant="destructive" className="gap-1">
                        <Clock className="w-3 h-3" /> aproape de expirare
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>Preț: <strong className="text-foreground">{eur(r.price)}</strong></span>
                    <span>€/mp: {r.price_per_sqm ? Math.round(Number(r.price_per_sqm)).toLocaleString("ro-RO") : "—"}</span>
                    <span>Pe sursă: {dSource == null ? "—" : `${dSource} zile`}</span>
                    <span>Văzut ultima dată: {dateRo(r.last_seen_at)}</span>
                    <span>Preț verificat: {dateRo(r.price_checked_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.contact_phone && (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <a href={`tel:${r.contact_phone}`} aria-label={`Sună ${r.contact_phone}`}>
                            <Phone className="w-4 h-4 mr-2" /> {r.contact_phone}
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={waLink(r.contact_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Trimite mesaj WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                          </a>
                        </Button>
                      </>
                    )}
                    {r.source_url && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" /> Deschide anunțul
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && !filtered.length && (
              <p className="text-sm text-muted-foreground">Nu există anunțuri salvate pentru filtrele alese.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
