import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Users } from "lucide-react";

type Row = {
  phone: string; name: string | null; title: string | null; zone: string | null;
  consent: string | null; publishedPropertyId: string | null; dnc: string | null;
  score: number | null; outcome: string | null; calls: number;
};
const last9 = (p: string | null | undefined) => (p || "").replace(/\D/g, "").slice(-9);
const CONSENT: Record<string, string> = { requested: "Cerut", consented: "Acord DA", published: "Publicat", revoked: "Retras" };
type Filter = "toate" | "dnc" | "activi";

/** Proprietarii contactați pe WhatsApp: acord, anunț publicat, DNC și notele analizelor post-apel. */
export default function OwnersWhatsappStatus() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("toate");

  const load = async () => {
    setRows(null);
    const [{ data: consents }, { data: dnc }, { data: analyses }] = await Promise.all([
      supabase.from("wa_publish_consents").select("phone_normalized, status, property_id, prospect_listing_id, updated_at").order("updated_at", { ascending: false }).limit(500),
      supabase.from("wa_dnc_list").select("phone_normalized, label, reason").limit(2000),
      supabase.from("voice_call_analyses").select("to_number, score, outcome, created_at").not("to_number", "is", null).order("created_at", { ascending: false }).limit(1000),
    ]);
    const ids = [...new Set((consents ?? []).map((c) => c.prospect_listing_id).filter(Boolean))] as string[];
    const { data: listings } = ids.length
      ? await supabase.from("prospect_listings").select("id, title, zone, contact_name").in("id", ids)
      : { data: [] as any[] };
    const L = new Map((listings ?? []).map((l: any) => [l.id, l]));
    const D = new Map((dnc ?? []).map((d) => [last9(d.phone_normalized), d.label || d.reason || "DNC"]));
    const A = new Map<string, { score: number | null; outcome: string | null; calls: number }>();
    for (const a of analyses ?? []) {
      const k = last9(a.to_number); if (!k) continue;
      const cur = A.get(k);
      if (cur) cur.calls++; else A.set(k, { score: a.score, outcome: a.outcome, calls: 1 });
    }
    const byPhone = new Map<string, Row>();
    for (const c of consents ?? []) {
      const k = last9(c.phone_normalized);
      if (byPhone.has(k)) continue;
      const l: any = c.prospect_listing_id ? L.get(c.prospect_listing_id) : null;
      const a = A.get(k);
      byPhone.set(k, {
        phone: c.phone_normalized, name: l?.contact_name ?? null, title: l?.title ?? null, zone: l?.zone ?? null,
        consent: c.status, publishedPropertyId: c.status !== "revoked" ? c.property_id : null,
        dnc: D.get(k) ?? null, score: a?.score ?? null, outcome: a?.outcome ?? null, calls: a?.calls ?? 0,
      });
    }
    setRows([...byPhone.values()]);
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (filter === "toate" || (filter === "dnc" ? !!r.dnc : !r.dnc)) &&
    (!q || `${r.phone} ${r.name ?? ""} ${r.title ?? ""} ${r.zone ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, filter]);
  const dncCount = (rows ?? []).filter((r) => r.dnc).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Proprietari pe WhatsApp — acord și DNC</CardTitle>
        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={load} aria-label="Reîncarcă lista"><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută telefon, nume, anunț, zonă" aria-label="Caută proprietar" />
          <div className="flex gap-2">
            {([["toate", `Toți (${rows?.length ?? 0})`], ["dnc", `În DNC (${dncCount})`], ["activi", `Contactabili (${(rows?.length ?? 0) - dncCount})`]] as [Filter, string][]).map(([f, l]) => (
              <Button key={f} variant={filter === f ? "default" : "outline"} className="min-h-[48px] whitespace-nowrap" onClick={() => setFilter(f)}>{l}</Button>
            ))}
          </div>
        </div>
        {rows === null ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : shown.length === 0 ? <p className="text-sm text-muted-foreground">Niciun proprietar.</p> : (
          <div className="space-y-2">
            {shown.map((r) => (
              <div key={r.phone} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{r.name || "Proprietar"} · {r.phone}</div>
                  <div className="flex flex-wrap gap-1">
                    {r.dnc ? <Badge variant="destructive">DNC · {r.dnc}</Badge> : <Badge variant="secondary">Contactabil</Badge>}
                    <Badge variant="outline">{CONSENT[r.consent ?? ""] ?? r.consent ?? "—"}</Badge>
                    {r.publishedPropertyId && <a href={`/proprietati/${r.publishedPropertyId}`} target="_blank" rel="noopener noreferrer"><Badge>Anunț publicat ↗</Badge></a>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{[r.title, r.zone].filter(Boolean).join(" · ") || "Anunț necunoscut"}</div>
                <div className="mt-1 text-xs">
                  {r.calls ? <>Analiză apel: <b>nota {r.score ?? "—"}/10</b> ({r.calls} {r.calls === 1 ? "apel" : "apeluri"}) · {r.outcome}</> : <span className="text-muted-foreground">Fără apel analizat</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
