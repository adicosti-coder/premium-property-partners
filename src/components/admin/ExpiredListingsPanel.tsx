/**
 * „Anunțuri expirate" — anunțurile care nu mai sunt active pe platforme
 * (dezactivate, marcate expirate sau nevăzute de peste 21 de zile), cu prețul
 * ultim cunoscut, data expirării și linkul original, pentru urmărire.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ExternalLink, Download } from "lucide-react";
import { downloadCsv, csvFileName } from "@/utils/exportCsv";
import { toast } from "sonner";
import { EXPIRY_DAYS } from "./SavedListingsPanel";

interface Row {
  id: string;
  title: string | null;
  price: number | null;
  price_per_sqm: number | null;
  contact_phone: string | null;
  source_url: string | null;
  source_platform: string | null;
  zone: string | null;
  is_active: boolean | null;
  expiry_check_status: string | null;
  last_expiry_check_at: string | null;
  last_seen_at: string | null;
  created_at: string | null;
}

const eur = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} €`);

const dateRo = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Data la care anunțul a ieșit din piață: verificarea de expirare sau ultima vizualizare. */
const expiredAt = (r: Row) => r.last_expiry_check_at || r.last_seen_at || null;

export default function ExpiredListingsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - EXPIRY_DAYS * 86_400_000).toISOString();
    const columns =
      "id,title,price,price_per_sqm,contact_phone,source_url,source_platform,zone,is_active,expiry_check_status,last_expiry_check_at,last_seen_at,created_at";
    const { data, error } = await supabase
      .from("prospect_listings")
      .select(columns)
      .not("source_url", "is", null)
      .or(`is_active.eq.false,expiry_check_status.eq.expired,last_seen_at.lt.${cutoff}`)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) toast.error("Nu am putut încărca anunțurile expirate");
    setRows(((data || []) as unknown as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const exportCsv = () => {
    downloadCsv(
      csvFileName("anunturi-expirate"),
      ["Titlu", "Platformă", "Zonă", "Preț (€)", "€/mp", "Data expirării", "Telefon", "Link"],
      filtered.map((r) => [
        r.title,
        r.source_platform,
        r.zone,
        r.price,
        r.price_per_sqm,
        dateRo(expiredAt(r)),
        r.contact_phone,
        r.source_url,
      ]),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Anunțuri expirate</CardTitle>
          <CardDescription>
            {filtered.length} anunțuri ieșite din piață — preț ultim cunoscut, data expirării și link
          </CardDescription>
        </div>
        <div className="flex gap-2">
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
          {filtered.map((r) => (
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
                <Badge variant="destructive">expirat</Badge>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>Preț: <strong className="text-foreground">{eur(r.price)}</strong></span>
                <span>€/mp: {r.price_per_sqm ? Math.round(Number(r.price_per_sqm)).toLocaleString("ro-RO") : "—"}</span>
                <span>Expirat la: {dateRo(expiredAt(r))}</span>
                <span>Publicat: {dateRo(r.created_at)}</span>
              </div>
              {r.source_url && (
                <Button asChild size="sm" variant="ghost">
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Deschide anunțul
                  </a>
                </Button>
              )}
            </div>
          ))}
          {!loading && !filtered.length && (
            <p className="text-sm text-muted-foreground">Nu există anunțuri expirate pentru filtrele alese.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
