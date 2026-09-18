import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ConsentRow = {
  id: string;
  phone_normalized: string;
  prospect_listing_id: string | null;
  property_id: string | null;
  status: string;
  consent_text: string | null;
  requested_at: string | null;
  consented_at: string | null;
  revoked_at: string | null;
  published_at: string | null;
};

type Prospect = {
  id: string;
  title: string | null;
  zone: string | null;
  rooms: number | null;
  price: number | null;
  phone_normalized: string | null;
  source_platform: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  requested: "Acord cerut",
  granted: "Acord primit",
  published: "Publicat pe site",
  revoked: "Acord retras",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—";

/**
 * Acordurile proprietarilor, date pe WhatsApp, pentru preluarea anunțului pe
 * realtrust.ro. Nimic nu se publică fără un acord valid înregistrat aici.
 */
const WaPublishConsents = () => {
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cRows }, { data: pRows }] = await Promise.all([
      supabase
        .from("wa_publish_consents")
        .select(
          "id, phone_normalized, prospect_listing_id, property_id, status, consent_text, requested_at, consented_at, revoked_at, published_at",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("prospect_listings")
        .select("id, title, zone, rooms, price, phone_normalized, source_platform")
        .eq("category", "vanzare")
        .not("phone_normalized", "is", null)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const rows = (cRows ?? []) as ConsentRow[];
    setConsents(rows);
    setProspects((pRows ?? []) as Prospect[]);

    const propIds = rows.map((r) => r.property_id).filter(Boolean) as string[];
    if (propIds.length) {
      const { data: props } = await supabase
        .from("properties")
        .select("id, slug")
        .in("id", propIds);
      const map: Record<string, string> = {};
      for (const p of props ?? []) if (p.slug) map[p.id] = p.slug;
      setSlugs(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const requestConsent = async (prospectId: string) => {
    setSending(prospectId);
    const { data, error } = await supabase.functions.invoke("wa-request-publish-consent", {
      body: { prospect_ids: [prospectId] },
    });
    setSending(null);
    if (error) {
      toast.error("Cererea nu a putut fi trimisă.");
      return;
    }
    const status = (data as { results?: { status: string }[] })?.results?.[0]?.status;
    if (status === "sent") toast.success("Cererea de acord a plecat pe WhatsApp.");
    else if (status === "queued") toast.success("Cererea intră în coada de mesaje WhatsApp.");
    else if (status === "invalid_phone") toast.error("Anunțul nu are un număr de mobil valid.");
    else if (status === "express_opt_out") toast.error("Proprietarul a cerut să nu fie contactat.");
    else toast.error("Cererea nu a putut fi trimisă.");
    void load();
  };

  const consentByProspect = new Map(
    consents.filter((c) => c.prospect_listing_id).map((c) => [c.prospect_listing_id!, c]),
  );

  const q = search.trim().toLowerCase();
  const visible = prospects.filter((p) =>
    !q ||
    (p.title || "").toLowerCase().includes(q) ||
    (p.zone || "").toLowerCase().includes(q) ||
    (p.phone_normalized || "").includes(q)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4" /> Acorduri de publicare (WhatsApp)
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Proprietarul primește pe WhatsApp întrebarea dacă putem prelua anunțul pe realtrust.ro.
          Răspunsul „DA PUBLIC” înregistrează acordul și pornește preluarea; „RETRAG” scoate
          imediat anunțul de pe site. Fără acord, niciun anunț nu ajunge pe site.
        </p>

        <div>
          <p className="text-sm font-medium mb-2">Anunțuri de proprietari — cere acordul</p>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după titlu, zonă sau telefon"
            className="mb-3 min-h-[44px]"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground">Niciun anunț de proprietar găsit.</p>
            )}
            {visible.map((p) => {
              const c = consentByProspect.get(p.id);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.title || "Anunț fără titlu"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.zone, p.rooms ? `${p.rooms} camere` : null, p.source_platform]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c && <Badge variant="secondary">{STATUS_LABEL[c.status] || c.status}</Badge>}
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px]"
                      disabled={sending === p.id}
                      onClick={() => void requestConsent(p.id)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Cere acordul pe WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Acorduri înregistrate</p>
          <div className="space-y-2">
            {consents.length === 0 && (
              <p className="text-sm text-muted-foreground">Încă nu există acorduri înregistrate.</p>
            )}
            {consents.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span className="text-sm font-medium">{c.phone_normalized}</span>
                  <Badge variant={c.status === "revoked" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[c.status] || c.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cerut: {fmt(c.requested_at)} · Acord: {fmt(c.consented_at)} · Publicat:{" "}
                  {fmt(c.published_at)}
                  {c.revoked_at ? ` · Retras: ${fmt(c.revoked_at)}` : ""}
                </p>
                {c.consent_text && (
                  <p className="text-xs italic text-muted-foreground">„{c.consent_text}”</p>
                )}
                {c.property_id && slugs[c.property_id] && (
                  <a
                    href={`https://realtrust.ro/proprietate/${slugs[c.property_id]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Vezi pagina de pe site
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaPublishConsents;
