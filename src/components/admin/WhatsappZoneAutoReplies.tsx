import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

/**
 * Răspunsuri automate pe zonă pentru butoanele mesajului v6.
 * Zona „*” = răspunsul implicit pentru orice zonă fără regulă proprie.
 * {zona} se înlocuiește cu zona din mesajul trimis.
 */
const INTENTS = [
  { key: "vanzare", label: "Colaborare vânzare" },
  { key: "clasic", label: "Închiriere clasică" },
  { key: "hotelier", label: "Regim hotelier" },
] as const;

type Rule = { id?: string; zone: string; intent: string; message: string; enabled: boolean };

export default function WhatsappZoneAutoReplies() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Rule>({ zone: "", intent: "vanzare", message: "", enabled: true });

  const { data: rules = [] } = useQuery({
    queryKey: ["wa-zone-replies"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("wa_zone_auto_replies").select("*").order("zone");
      return (data ?? []) as Rule[];
    },
  });

  const save = async (r: Rule) => {
    const zone = r.zone.trim() || "*";
    if (!r.message.trim() || r.message.length > 1500) return toast.error("Scrie un mesaj (max 1500 caractere).");
    const { error } = await (supabase as any).from("wa_zone_auto_replies").upsert(
      { zone, intent: r.intent, message: r.message.trim(), enabled: r.enabled, updated_at: new Date().toISOString() },
      { onConflict: "zone,intent" },
    );
    if (error) return toast.error(error.message);
    toast.success("Salvat");
    qc.invalidateQueries({ queryKey: ["wa-zone-replies"] });
  };

  const remove = async (id?: string) => {
    if (!id) return;
    await (supabase as any).from("wa_zone_auto_replies").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["wa-zone-replies"] });
  };

  return (
    <AdminPageShell
      title="Răspunsuri automate pe zonă"
      description="Când un proprietar apasă un buton din mesajul v6, primește automat textul de aici pentru zona lui. Fără regulă, pleacă răspunsul standard."
    >
      <Card>
        <CardHeader><CardTitle className="text-base">Regulă nouă</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Zonă (ex. Iosefin) — gol = toate zonele" value={draft.zone} maxLength={80}
              onChange={(e) => setDraft({ ...draft, zone: e.target.value })} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.intent}
              onChange={(e) => setDraft({ ...draft, intent: e.target.value })}>
              {INTENTS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>
          <Textarea rows={4} maxLength={1500} placeholder="Ex.: Mulțumim! Pentru apartamentele din {zona} avem cereri active de la..."
            value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
          <p className="text-xs text-muted-foreground">Scrie {"{zona}"} ca să apară numele zonei în mesaj.</p>
          <Button onClick={async () => { await save(draft); setDraft({ ...draft, message: "" }); }}>Salvează regula</Button>
        </CardContent>
      </Card>

      {rules.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {r.zone === "*" ? "Toate zonele" : r.zone} · {INTENTS.find((i) => i.key === r.intent)?.label}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.enabled} onCheckedChange={(v) => save({ ...r, enabled: v })} aria-label="Activ" />
                <Button size="sm" variant="outline" onClick={() => remove(r.id)}>Șterge</Button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{r.message}</p>
          </CardContent>
        </Card>
      ))}
    </AdminPageShell>
  );
}
