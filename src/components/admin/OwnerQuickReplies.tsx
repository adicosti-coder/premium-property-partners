import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, MessageSquareReply, Send, ExternalLink } from "lucide-react";

/** Răspunsuri rapide aprobate de Admin pentru proprietarii care au răspuns fără acord clar. */
const REPLIES: { consentId: string; label: string; text: string }[] = [
  { consentId: "d87d2d0d-e551-4743-9550-ce8b84ad9c56", label: "„Dacă nu am costuri este ok”",
    text: "Bună ziua! Publicarea anunțului dumneavoastră pe site-ul nostru și promovarea sunt 100% gratuite, nu există niciun fel de cost sau comision ascuns pentru publicare. Pentru a putea activa anunțul conform legii, vă rugăm să ne răspundeți la acest mesaj cu textul CONFIRM. Vă mulțumim!" },
  { consentId: "4ffe6497-3395-4822-8378-921379788c21", label: "„Colaborare vânzare”",
    text: "Bună ziua! Vă mulțumim pentru interesul acordat unei colaborări pentru vânzarea proprietății. Unul dintre consultanții noștri imobiliari vă va contacta în cel mai scurt timp pentru a stabili detaliile. O zi excelentă!" },
  { consentId: "4b0fd110-a388-4c34-aae9-429dd8f3bdd8", label: "„Cât este comisionul de vânzare?”",
    text: "Bună ziua! Comisionul nostru standard pentru serviciile de reprezentare și intermediere la vânzare este între 2% și 4%, în funcție de pachetul de servicii ales și de proprietate. Publicarea simplă a anunțului pe platforma noastră rămâne însă complet gratuită. Dacă doriți să vă promovăm proprietatea gratuit pe site, vă rugăm să ne răspundeți cu CONFIRM." },
  { consentId: "f261c802-094a-4c26-8710-c46be4330f06", label: "„Aștept anunțurile”",
    text: "Bună ziua! Dorim să clarificăm: noi vă oferim posibilitatea de a vă promova și publica anunțul proprietății dumneavoastră pe platforma noastră RealTrust, complet gratuit. Dacă sunteți de acord să vă preluăm și să vă afișăm anunțul pentru a găsi cumpărători/chiriași, vă rugăm să ne răspundeți cu CONFIRM." },
];

type Info = { phone: string; status: string; convId: string | null; windowOpen: boolean };

export default function OwnerQuickReplies() {
  const [info, setInfo] = useState<Record<string, Info>>({});
  const [texts, setTexts] = useState(() => Object.fromEntries(REPLIES.map((r) => [r.consentId, r.text])));
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from("wa_publish_consents")
      .select("id, phone_normalized, status").in("id", REPLIES.map((r) => r.consentId));
    const next: Record<string, Info> = {};
    for (const r of rows ?? []) {
      const { data: conv } = await supabase.from("wa_conversations").select("id, window_expires_at")
        .eq("phone_normalized", r.phone_normalized).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      next[r.id] = {
        phone: r.phone_normalized, status: r.status, convId: conv?.id ?? null,
        windowOpen: !!conv?.window_expires_at && new Date(conv.window_expires_at).getTime() > Date.now(),
      };
    }
    setInfo(next);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const sendApi = async (id: string) => {
    const i = info[id];
    if (!i?.convId) return;
    setBusy(id);
    const { error } = await supabase.functions.invoke("wa-admin-send-text", { body: { conversation_id: i.convId, text: texts[id] } });
    setBusy(null);
    if (error) { toast.error("Mesajul nu a putut fi trimis. Folosește WhatsApp Web."); return; }
    setSent((s) => new Set(s).add(id));
    toast.success("Răspuns trimis pe WhatsApp.");
  };

  const waWeb = (id: string) =>
    `https://wa.me/${(info[id]?.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(texts[id])}`;

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="Răspunsuri rapide pentru proprietari">
      <h3 className="flex items-center gap-2 font-semibold"><MessageSquareReply className="h-4 w-4" /> Răspunsuri rapide</h3>
      <p className="text-sm text-muted-foreground">
        Proprietari care au răspuns fără un „CONFIRM” clar. Poți edita textul înainte de trimitere.
      </p>
      <ul className="space-y-3">
        {REPLIES.map((r) => {
          const i = info[r.consentId];
          const done = sent.has(r.consentId) || i?.status === "consented";
          return (
            <li key={r.consentId} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">…{i?.phone.slice(-4) ?? "—"}</span>
                <span className="text-muted-foreground">{r.label}</span>
                {i && <Badge variant="outline">{i.windowOpen ? "Fereastra 24h deschisă" : "Fereastra 24h închisă"}</Badge>}
                {done && <Badge>Trimis</Badge>}
              </div>
              <Textarea rows={4} value={texts[r.consentId]} aria-label={`Mesaj pentru …${i?.phone.slice(-4) ?? ""}`}
                onChange={(e) => setTexts((t) => ({ ...t, [r.consentId]: e.target.value }))} />
              <div className="flex flex-wrap gap-2">
                {i?.windowOpen && i.convId ? (
                  <Button className="min-h-12" onClick={() => sendApi(r.consentId)} disabled={busy === r.consentId || done}>
                    {busy === r.consentId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Trimite răspuns
                  </Button>
                ) : (
                  <Button asChild className="min-h-12" disabled={!i}>
                    <a href={i ? waWeb(r.consentId) : undefined} target="_blank" rel="noopener noreferrer"
                      onClick={() => setSent((s) => new Set(s).add(r.consentId))}>
                      <ExternalLink className="mr-2 h-4 w-4" />Trimite răspuns (WhatsApp Web)
                    </a>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Când fereastra de 24h e închisă, WhatsApp nu permite trimiterea automată a unui text liber. Mesajul se deschide gata completat în WhatsApp Web și îl trimiți tu de acolo.
      </p>
    </section>
  );
}
