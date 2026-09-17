import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

interface Row {
  id: string;
  title: string | null;
  zone: string | null;
  price: number | null;
  rooms: number | null;
  source_platform: string | null;
  source_url: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  last_seen_at: string | null;
  scraped_at: string | null;
  is_active: boolean | null;
  lifecycle_status: string | null;
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AnunturiGasite() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["anunturi-gasite"],
    enabled: isAdmin,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select(
          "id, title, zone, price, rooms, source_platform, source_url, contact_phone, contact_name, last_seen_at, scraped_at, is_active, lifecycle_status",
        )
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const platforms = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((r) => r.source_platform && s.add(r.source_platform));
    return Array.from(s).sort();
  }, [data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (platform !== "all" && r.source_platform !== platform) return false;
      if (!needle) return true;
      return [r.title, r.zone, r.contact_phone, r.contact_name, r.source_platform]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [data, q, platform]);

  const withPhone = rows.filter((r) => !!r.contact_phone).length;

  if (!authReady || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Acces restrâns" description="Zonă internă RealTrust." noindex />
        <Header />
        <main className="container mx-auto px-4 py-24 max-w-lg text-center space-y-4">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Zonă internă</h1>
          <p className="text-muted-foreground">
            Anunțurile găsite și datele de contact ale proprietarilor sunt date personale, așa că pagina
            este disponibilă doar echipei RealTrust, după autentificare.
          </p>
          <Button onClick={() => navigate("/auth")}>Autentificare</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Anunțuri găsite — intern RealTrust" description="Zonă internă RealTrust." noindex />
      <Header />
      <main className="container mx-auto px-4 py-24 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Anunțuri găsite</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sursa, data ultimei vizualizări și telefonul proprietarului, pentru fiecare anunț preluat automat.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Reîmprospătează
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Anunțuri afișate</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rows.length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Cu telefon</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{withPhone}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Surse</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{platforms.length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{rows.filter((r) => r.is_active).length}</CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Caută după titlu, zonă, telefon…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
            aria-label="Caută în anunțurile găsite"
          />
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[220px]" aria-label="Filtrează după sursă">
              <SelectValue placeholder="Toate sursele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate sursele</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anunț</TableHead>
                  <TableHead>Sursă</TableHead>
                  <TableHead>Zonă</TableHead>
                  <TableHead>Preț</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Ultima vizualizare</TableHead>
                  <TableHead>Preluat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Nu există anunțuri pentru filtrul selectat.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[260px]">
                      <div className="flex items-start gap-2">
                        <span className="line-clamp-2 text-sm">{r.title || "Fără titlu"}</span>
                        {r.source_url && (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Deschide anunțul original"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {r.rooms ? <span className="text-xs text-muted-foreground">{r.rooms} camere</span> : null}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.source_platform || "Necunoscut"}</Badge></TableCell>
                    <TableCell className="text-sm">{r.zone || "—"}</TableCell>
                    <TableCell className="text-sm">{r.price ? `${Number(r.price).toLocaleString("ro-RO")} €` : "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.contact_phone ? (
                        <a href={`tel:${r.contact_phone}`} className="hover:underline">{r.contact_phone}</a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.last_seen_at)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.scraped_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
