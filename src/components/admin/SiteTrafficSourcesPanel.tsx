import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type View = { session_id: string | null; referrer: string | null; viewed_at: string; page_path: string | null };
type Cta = { cta_type: string; session_id: string | null; created_at: string };

type Bucket = {
  sessions: Set<string>;
  views: number;
  durations: number[];
  contacts: number;
};

const SOURCES = ["Google", "Meta (Facebook/Instagram)", "Booking.com / Airbnb", "Alte site-uri", "Direct"] as const;
type Source = (typeof SOURCES)[number];

const classify = (referrer: string | null, path: string | null): Source => {
  const utm = (path || "").toLowerCase();
  if (utm.includes("utm_source=airbnb") || utm.includes("utm_source=booking")) return "Booking.com / Airbnb";
  const r = (referrer || "").toLowerCase();
  if (!r) return "Direct";
  if (/google\.|googleusercontent|gstatic/.test(r)) return "Google";
  if (/facebook\.|instagram\.|fb\.me|meta\./.test(r)) return "Meta (Facebook/Instagram)";
  if (/booking\.com|airbnb\./.test(r)) return "Booking.com / Airbnb";
  return "Alte site-uri";
};

const CONTACT_CTAS = new Set(["whatsapp", "call", "email", "form_submit", "listing_contact_click", "booking_request"]);

/** Raport trafic realtrust.ro: de unde vin vizitatorii, cât stau și câți ajung la contact. */
export default function SiteTrafficSourcesPanel() {
  const [days, setDays] = useState(30);
  const [views, setViews] = useState<View[]>([]);
  const [ctas, setCtas] = useState<Cta[]>([]);

  useEffect(() => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    supabase.from("property_views").select("session_id, referrer, viewed_at, page_path").gte("viewed_at", since).limit(20000)
      .then(({ data }) => setViews((data ?? []) as View[]));
    supabase.from("cta_analytics").select("cta_type, session_id, created_at").gte("created_at", since).limit(20000)
      .then(({ data }) => setCtas((data ?? []) as Cta[]));
  }, [days]);

  const rows = useMemo(() => {
    const bySession = new Map<string, View[]>();
    views.forEach((v) => {
      const key = v.session_id || `anon-${v.viewed_at}`;
      const arr = bySession.get(key) ?? [];
      arr.push(v);
      bySession.set(key, arr);
    });

    const contactSessions = new Set(ctas.filter((c) => CONTACT_CTAS.has(c.cta_type) && c.session_id).map((c) => c.session_id as string));

    const buckets = new Map<Source, Bucket>();
    SOURCES.forEach((s) => buckets.set(s, { sessions: new Set(), views: 0, durations: [], contacts: 0 }));

    bySession.forEach((list, sessionId) => {
      const sorted = [...list].sort((a, b) => a.viewed_at.localeCompare(b.viewed_at));
      const first = sorted[0];
      const src = classify(first.referrer, first.page_path);
      const b = buckets.get(src)!;
      b.sessions.add(sessionId);
      b.views += sorted.length;
      if (sorted.length > 1) {
        const ms = new Date(sorted[sorted.length - 1].viewed_at).getTime() - new Date(first.viewed_at).getTime();
        if (ms > 0 && ms < 2 * 3600 * 1000) b.durations.push(ms / 1000);
      }
      if (contactSessions.has(sessionId)) b.contacts++;
    });

    return SOURCES.map((s) => {
      const b = buckets.get(s)!;
      const sessions = b.sessions.size;
      const avg = b.durations.length ? Math.round(b.durations.reduce((a, x) => a + x, 0) / b.durations.length) : 0;
      return {
        source: s,
        sessions,
        views: b.views,
        avgSeconds: avg,
        contacts: b.contacts,
        rate: sessions ? Math.round((b.contacts / sessions) * 1000) / 10 : 0,
      };
    });
  }, [views, ctas]);

  const total = useMemo(() => rows.reduce((a, r) => ({
    sessions: a.sessions + r.sessions,
    views: a.views + r.views,
    contacts: a.contacts + r.contacts,
  }), { sessions: 0, views: 0, contacts: 0 }), [rows]);

  const fmt = (s: number) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : "—");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Trafic pe realtrust.ro: sursă, durată, conversie</CardTitle>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>{d} zile</Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto space-y-3">
        <p className="text-xs text-muted-foreground">
          Datele sunt măsurate direct pe site. Sursa e stabilită la prima pagină deschisă în vizită.
          Durata se calculează doar pentru vizitele cu cel puțin două pagini deschise, deci este o estimare minimă.
          „Ajung la contact” numără vizitele în care s-a apăsat WhatsApp, telefon, e-mail sau s-a trimis un formular.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Sursă</th><th>Vizite</th><th>Pagini deschise</th><th>Durată medie</th><th>Ajung la contact</th><th>Rată</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source} className="border-t border-border">
                <td className="py-1">{r.source}</td>
                <td>{r.sessions}</td>
                <td>{r.views}</td>
                <td>{fmt(r.avgSeconds)}</td>
                <td>{r.contacts}</td>
                <td>{r.rate}%</td>
              </tr>
            ))}
            <tr className="border-t border-border font-medium">
              <td className="py-1">Total</td>
              <td>{total.sessions}</td>
              <td>{total.views}</td>
              <td>—</td>
              <td>{total.contacts}</td>
              <td>{total.sessions ? Math.round((total.contacts / total.sessions) * 1000) / 10 : 0}%</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
