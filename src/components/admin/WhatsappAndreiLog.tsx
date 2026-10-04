import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Phone } from "lucide-react";

/** Jurnalul conversațiilor cu Andrei: mesaje trimise, răspunsuri, alerte URGENT. */
const URGENT_KINDS = ["owner_viewing", "owner_collab_yes", "owner_call_request"];

type Kind = "all" | "template" | "auto" | "ai" | "admin" | "inbound" | "urgent";
const KIND_LABEL: Record<Exclude<Kind, "all">, string> = {
  template: "Șablon (prim contact)",
  auto: "Răspuns automat",
  ai: "Răspuns AI",
  admin: "Trimis manual",
  inbound: "Mesaj proprietar",
  urgent: "Alertă URGENT",
};

const classify = (m: any): Exclude<Kind, "all">[] => {
  const tags: Exclude<Kind, "all">[] = [];
  const auto = m.tool_call?.auto_reply as string | undefined;
  if (m.direction === "inbound") tags.push("inbound");
  else if (m.template_name) tags.push("template");
  else if (auto) tags.push("auto");
  else if (m.ai_model) tags.push("ai");
  else tags.push("admin");
  if (auto && URGENT_KINDS.includes(auto)) tags.push("urgent");
  return tags;
};

export default function WhatsappAndreiLog() {
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [zone, setZone] = useState("all");
  const [kind, setKind] = useState<Kind>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["wa-andrei-log", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data: msgs } = await (supabase as any)
        .from("wa_messages")
        .select("id, conversation_id, direction, content, template_name, ai_model, tool_call, delivery_status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      const convIds = [...new Set((msgs ?? []).map((m: any) => m.conversation_id).filter(Boolean))];
      const { data: convs } = convIds.length
        ? await (supabase as any).from("wa_conversations")
            .select("id, phone_normalized, wa_profile_name, prospect_id").in("id", convIds)
        : { data: [] };
      const pIds = [...new Set((convs ?? []).map((c: any) => c.prospect_id).filter(Boolean))];
      const { data: prospects } = pIds.length
        ? await (supabase as any).from("prospect_listings").select("id, zone, title").in("id", pIds)
        : { data: [] };
      const pMap = new Map((prospects ?? []).map((p: any) => [p.id, p]));
      const cMap = new Map((convs ?? []).map((c: any) => [c.id, { ...c, prospect: pMap.get(c.prospect_id) }]));
      return (msgs ?? []).map((m: any) => {
        const c: any = cMap.get(m.conversation_id);
        return { ...m, conv: c, zone: (c?.prospect?.zone || "Necunoscută").trim(), tags: classify(m) };
      });
    },
  });

  const zones = useMemo(() => [...new Set((data ?? []).map((m: any) => m.zone))].sort(), [data]);
  const filtered = useMemo(
    () => (data ?? []).filter((m: any) => (zone === "all" || m.zone === zone) && (kind === "all" || m.tags.includes(kind))),
    [data, zone, kind],
  );
  const count = (k: Exclude<Kind, "all">) =>
    (data ?? []).filter((m: any) => (zone === "all" || m.zone === zone) && m.tags.includes(k)).length;

  return (
    <AdminPageShell
      title="Conversații cu Andrei"
      description="Mesajele trimise, răspunsurile proprietarilor și alertele URGENT, cu filtre pe zonă și pe tip de mesaj."
      actions={
        <div className="flex gap-1">
          {([1, 7, 30] as const).map((d) => (
            <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>
              {d === 1 ? "24h" : `${d} zile`}
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        {(Object.keys(KIND_LABEL) as Exclude<Kind, "all">[]).map((k) => (
          <button key={k} onClick={() => setKind(kind === k ? "all" : k)} className="text-left">
            <Card className={kind === k ? "border-primary" : ""}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">{KIND_LABEL[k]}</p>
                <p className={`text-2xl font-bold mt-1 ${k === "urgent" ? "text-destructive" : "text-foreground"}`}>
                  {isLoading ? "…" : count(k)}
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select aria-label="Filtru zonă" className="h-10 rounded-md border bg-background px-3 text-sm" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="all">Toate zonele</option>
          {zones.map((z: string) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select aria-label="Filtru tip mesaj" className="h-10 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="all">Toate tipurile</option>
          {(Object.keys(KIND_LABEL) as Exclude<Kind, "all">[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <span className="self-center text-sm text-muted-foreground">{filtered.length} mesaje</span>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {isLoading ? <Skeleton className="h-40 w-full" /> : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun mesaj pentru filtrele alese.</p>
          ) : filtered.map((m: any) => (
            <div key={m.id} className={`rounded-md border p-3 ${m.direction === "inbound" ? "bg-muted/40" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{new Date(m.created_at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</span>
                <span className="font-medium text-foreground">{m.conv?.wa_profile_name || m.conv?.phone_normalized || "—"}</span>
                <span>· {m.zone}</span>
                {m.tags.map((t: Exclude<Kind, "all">) => (
                  <Badge key={t} variant={t === "urgent" ? "destructive" : t === "inbound" ? "secondary" : "outline"}>{KIND_LABEL[t]}</Badge>
                ))}
                {m.delivery_status && <span>· {m.delivery_status}</span>}
                {m.conv?.phone_normalized && (
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-12">
                      <a href={`tel:${m.conv.phone_normalized.replace(/[^\d+]/g, "")}`} aria-label={`Sună ${m.conv.wa_profile_name || m.conv.phone_normalized}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Sună
                      </a>
                    </Button>
                    <Button asChild size="sm" className="h-12">
                      <a href={`https://wa.me/${m.conv.phone_normalized.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Deschide WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground">{m.content || (m.template_name ? `Șablon: ${m.template_name}` : "—")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
