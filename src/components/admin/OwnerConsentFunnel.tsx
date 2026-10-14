import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BellRing, Loader2, Timer } from "lucide-react";

type Row = { status: string; created_at: string; requested_at: string | null; consented_at: string | null; published_at: string | null; reminder_sent_at: string | null };
type Eligible = { id: string; phone: string; title: string | null; zone: string | null; requested_at: string; text: string };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const dur = (ms: number | null) =>
  ms == null ? "—" : ms < 3600_000 ? `${Math.max(1, Math.round(ms / 60_000))} min` : ms < 864e5 ? `${(ms / 3600_000).toFixed(1)} h` : `${(ms / 864e5).toFixed(1)} zile`;
const diff = (a: string | null, b: string | null) => (a && b ? new Date(b).getTime() - new Date(a).getTime() : null);

/** Timpii fluxului de acord și mementoul unic pentru proprietarii care n-au răspuns. */
export default function OwnerConsentFunnel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [eligible, setEligible] = useState<Eligible[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("wa_publish_consents")
      .select("status, created_at, requested_at, consented_at, published_at, reminder_sent_at")
      .order("created_at", { ascending: false }).limit(500);
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toConsent = rows.map((r) => diff(r.requested_at, r.consented_at)).filter((x): x is number => x != null && x > 0);
  const toPublish = rows.map((r) => diff(r.consented_at, r.published_at)).filter((x): x is number => x != null && x > 0);
  const waiting = rows.filter((r) => r.status === "requested");
  const reminded = rows.filter((r) => r.reminder_sent_at).length;
  const stuck = waiting.filter((r) => r.requested_at && Date.now() - new Date(r.requested_at).getTime() > 48 * 3600_000).length;
  const answered = rows.filter((r) => r.requested_at && (r.consented_at || r.status === "revoked")).length;
  const rate = rows.length ? Math.round((rows.filter((r) => r.consented_at).length / rows.length) * 100) : 0;
  const bottleneck = (median(toConsent) ?? 0) > (median(toPublish) ?? 0) ? "Așteptarea răspunsului proprietarului" : "Publicarea după acord";

  const preview = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wa-consent-reminder", { body: { action: "preview" } });
    setBusy(false);
    if (error) { toast.error("Lista pentru memento nu s-a putut încărca."); return; }
    const list = (data as { eligible?: Eligible[] })?.eligible ?? [];
    setEligible(list);
    setSelected(new Set(list.map((e) => e.id)));
  };

  const send = async () => {
    if (!selected.size) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wa-consent-reminder", { body: { action: "send", consent_ids: [...selected] } });
    setBusy(false);
    if (error) { toast.error("Mementourile nu au putut fi trimise."); return; }
    const res = (data as { results?: { status: string }[] })?.results ?? [];
    const ok = res.filter((r) => r.status === "sent" || r.status === "queued").length;
    toast.success(`${ok} din ${res.length} mementouri trimise sau puse în coada WhatsApp.`);
    setEligible(null);
    void load();
  };

  const stats: [string, string][] = [
    ["Cerere → acord (median)", dur(median(toConsent))],
    ["Acord → publicat (median)", dur(median(toPublish))],
    ["Rată de acord", `${rate}%`],
    ["Așteaptă răspuns", `${waiting.length} (${stuck} peste 48h)`],
    ["Au răspuns", String(answered)],
    ["Mementouri trimise", String(reminded)],
  ];

  return (
    <section className="space-y-4 rounded-lg border p-4" aria-label="Timpii fluxului de acord">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold"><Timer className="h-4 w-4" /> Viteza fluxului: cerere → acord → publicat</h3>
        <Badge variant="outline">Blocaj principal: {bottleneck}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Memento unic, doar pentru cererile de peste 48h fără niciun răspuns, fără STOP. Nimic nu pleacă până nu apeși „Trimite”.
        </p>
        {eligible == null ? (
          <Button className="min-h-12" variant="outline" onClick={preview} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}Pregătește mementourile
          </Button>
        ) : eligible.length === 0 ? (
          <p className="text-sm">Nu există cereri eligibile pentru memento acum.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {eligible.map((e) => (
                <li key={e.id} className="flex gap-3 rounded-md border p-3 text-sm">
                  <input type="checkbox" className="mt-1 h-5 w-5" aria-label={`Include ${e.title ?? e.phone}`}
                    checked={selected.has(e.id)}
                    onChange={() => setSelected((s) => { const n = new Set(s); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })} />
                  <div className="min-w-0">
                    <p className="font-medium">{e.title ?? "Anunț"} {e.zone ? `· ${e.zone}` : ""}</p>
                    <p className="text-muted-foreground">{e.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-12" onClick={send} disabled={busy || !selected.size}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Trimite {selected.size} mementouri
              </Button>
              <Button className="min-h-12" variant="ghost" onClick={() => setEligible(null)}>Renunță</Button>
            </div>
            <p className="text-xs text-muted-foreground">În afara ferestrei de 24h, WhatsApp permite doar șablonul aprobat de cerere de acord, nu textul de mai sus.</p>
          </>
        )}
      </div>
    </section>
  );
}
