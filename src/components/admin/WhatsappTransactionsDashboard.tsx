import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Home, MessageSquare, RefreshCw, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/**
 * Dashboard de tranzacții WhatsApp: conversații intrate în pasul de tranzacție,
 * apartamentele alese de clienți și anunțurile deschise, cu grafic pe zile.
 */

type TxRow = {
  id: string;
  conversation_id: string | null;
  phone_normalized: string;
  property_id: string | null;
  property_name: string | null;
  property_url: string | null;
  price: number | null;
  event: string;
  status: string;
  error: string | null;
  source: string;
  created_at: string;
};

const DAYS = 14;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
  });

export default function WhatsappTransactionsDashboard() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from("wa_transaction_events")
      .select(
        "id, conversation_id, phone_normalized, property_id, property_name, property_url, price, event, status, error, source, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as TxRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const conversations = new Set(
      rows.filter((r) => r.conversation_id).map((r) => r.conversation_id as string),
    );
    const properties = new Set(
      rows.filter((r) => r.event === "offer_sent" && r.property_id).map((r) => r.property_id as string),
    );
    return {
      conversations: conversations.size,
      offersSent: rows.filter((r) => r.event === "offer_sent").length,
      offersFailed: rows.filter((r) => r.event === "offer_failed").length,
      opened: rows.filter((r) => r.event === "listing_opened").length,
      properties: properties.size,
    };
  }, [rows]);

  const chart = useMemo(() => {
    const buckets = new Map<string, { day: string; trimise: number; deschise: number; esuate: number }>();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString();
      buckets.set(dayKey(d), { day: dayKey(d), trimise: 0, deschise: 0, esuate: 0 });
    }
    for (const r of rows) {
      const b = buckets.get(dayKey(r.created_at));
      if (!b) continue;
      if (r.event === "offer_sent") b.trimise += 1;
      else if (r.event === "listing_opened") b.deschise += 1;
      else if (r.event === "offer_failed") b.esuate += 1;
    }
    return Array.from(buckets.values());
  }, [rows]);

  const topProperties = useMemo(() => {
    const map = new Map<string, { name: string; url: string | null; count: number }>();
    for (const r of rows) {
      if (r.event !== "offer_sent" || !r.property_id) continue;
      const prev = map.get(r.property_id);
      map.set(r.property_id, {
        name: r.property_name || "Apartament",
        url: r.property_url,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [rows]);

  const cards = [
    { label: "Conversații în tranzacție", value: stats.conversations, icon: MessageSquare },
    { label: "Apartamente alese", value: stats.properties, icon: Home },
    { label: "Anunțuri trimise", value: stats.offersSent, icon: TrendingUp },
    { label: "Anunțuri deschise", value: stats.opened, icon: ExternalLink },
  ];

  return (
    <AdminPageShell
      title="Tranzacții WhatsApp"
      description="Conversațiile ajunse la pasul de tranzacție, apartamentele alese de clienți și anunțurile deschise (ultimele 14 zile)."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      }
    >
      {error && <p className="mb-4 text-sm text-destructive">Nu am putut încărca datele: {error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <c.icon className="h-4 w-4" />
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-semibold">{c.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evoluție pe zile</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trimise" name="Anunțuri trimise" fill="hsl(var(--primary))" />
                <Bar dataKey="deschise" name="Anunțuri deschise" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="esuate" name="Eșuate" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Apartamentele cele mai alese</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : topProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun apartament ales încă.</p>
            ) : (
              topProperties.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{p.count}</Badge>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Deschide anunțul ${p.name}`}
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ultimele evenimente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[320px] overflow-y-auto">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio tranzacție încă.</p>
            ) : (
              rows.slice(0, 30).map((r) => (
                <div key={r.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{r.property_name || "—"}</span>
                    <Badge variant={r.event === "offer_failed" ? "destructive" : "secondary"}>
                      {r.event === "offer_sent"
                        ? "anunț trimis"
                        : r.event === "listing_opened"
                          ? "anunț deschis"
                          : "eșuat"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.phone_normalized} · {fmt(r.created_at)} · {r.source}
                  </p>
                  {r.error && <p className="text-xs text-destructive mt-1">{r.error}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
