import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pencil, Search } from "lucide-react";
import { PropertyEditor } from "./property/dialogs/PropertyEditor";
import { consentDate, consentPhone, consentPhoneVariants } from "./autoConsentedListingUtils";

type Conv = { id: string; phone_normalized: string; wa_profile_name: string | null; last_inbound_at: string | null };
type Msg = { id: string; direction: string; content: string | null; template_name: string | null; created_at: string };
type Prop = { id: string; name: string | null; slug: string | null; is_active: boolean | null; price: number | null; location: string | null };

/** Editează anunțul proprietarului direct din conversația WhatsApp, fără căutare în Proprietăți. */
export default function WhatsappEditListing() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conv | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const convs = useQuery({
    queryKey: ["wa-edit-convs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wa_conversations")
        .select("id, phone_normalized, wa_profile_name, last_inbound_at")
        .order("updated_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Conv[];
    },
  });

  const detail = useQuery({
    queryKey: ["wa-edit-detail", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const variants = consentPhoneVariants(selected!.phone_normalized);
      const [msgRes, consentRes, contactRes] = await Promise.all([
        supabase.from("wa_messages").select("id, direction, content, template_name, created_at")
          .eq("conversation_id", selected!.id).order("created_at", { ascending: false }).limit(30),
        (supabase.from("wa_publish_consents") as any).select("property_id").in("phone_normalized", variants),
        supabase.from("property_contact_details").select("property_id").in("contact_phone", variants),
      ]);
      const ids = [...new Set([...(consentRes.data ?? []), ...(contactRes.data ?? [])].map((r: any) => r.property_id).filter(Boolean))] as string[];
      let props: Prop[] = [];
      if (ids.length) {
        const { data } = await (supabase.from("properties") as any).select("id, name, slug, is_active, price, location").in("id", ids);
        props = data ?? [];
      }
      return { messages: ((msgRes.data ?? []) as Msg[]).reverse(), props };
    },
  });

  const text = search.trim().toLowerCase();
  const digits = search.replace(/\D/g, "").replace(/^0/, "");
  const list = (convs.data ?? []).filter((c) => !text
    || (c.wa_profile_name ?? "").toLowerCase().includes(text)
    || (digits && c.phone_normalized.replace(/\D/g, "").includes(digits)));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Editează din WhatsApp</h2>
        <p className="text-sm text-muted-foreground">Alege conversația cu proprietarul, citește mesajele și editează anunțul lui direct de aici.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border bg-card">
          <div className="p-3 border-b relative">
            <Search aria-hidden="true" className="absolute left-6 top-7 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nume sau telefon…" aria-label="Caută conversație" className="pl-9 h-12" />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {convs.isLoading ? <p className="p-3 text-sm text-muted-foreground">Se încarcă…</p>
              : list.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nicio conversație.</p>
              : list.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full text-left p-3 min-h-12 border-b last:border-0 hover:bg-muted ${selected?.id === c.id ? "bg-muted" : ""}`}>
                  <span className="block font-medium text-sm">{c.wa_profile_name || "Fără nume"}</span>
                  <span className="block text-xs text-muted-foreground">{consentPhone(c.phone_normalized)} · {consentDate(c.last_inbound_at)}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          {!selected ? <p className="text-sm text-muted-foreground">Selectează o conversație din stânga.</p>
            : detail.isLoading ? <p className="text-sm text-muted-foreground">Se încarcă…</p>
            : (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Anunțurile proprietarului</h3>
                  {(detail.data?.props ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground">Niciun anunț legat de acest număr.</p>
                    : (
                      <div className="space-y-2">
                        {detail.data!.props.map((p) => (
                          <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                            <div className="flex-1 min-w-48">
                              <span className="block text-sm font-medium">{p.name || "Fără titlu"}</span>
                              <span className="text-xs text-muted-foreground">{p.location || "—"}{p.price ? ` · ${Number(p.price).toLocaleString("ro-RO")} €` : ""}</span>
                            </div>
                            <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Publicat" : "Inactiv"}</Badge>
                            {p.is_active && p.slug && (
                              <Button size="sm" variant="outline" className="min-h-12" asChild>
                                <a href={`https://realtrust.ro/proprietate/${p.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Vezi pe site</a>
                              </Button>
                            )}
                            <Button size="sm" className="min-h-12" onClick={() => setEditId(p.id)}><Pencil className="h-4 w-4 mr-1" />Editează</Button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Ultimele mesaje</h3>
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {(detail.data?.messages ?? []).map((m) => (
                      <div key={m.id} className={`rounded-md p-2 text-sm max-w-[85%] ${m.direction === "inbound" ? "bg-muted" : "bg-primary/10 ml-auto"}`}>
                        <p className="whitespace-pre-wrap">{m.content || (m.template_name ? `[șablon ${m.template_name}]` : "—")}</p>
                        <span className="text-[10px] text-muted-foreground">{consentDate(m.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
        </div>
      </div>
      <PropertyEditor open={!!editId} mode="edit" propertyId={editId ?? undefined} onOpenChange={(o) => { if (!o) setEditId(null); }} onSaved={() => detail.refetch()} />
    </div>
  );
}
