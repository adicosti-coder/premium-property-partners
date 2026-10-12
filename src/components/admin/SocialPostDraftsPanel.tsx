import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Draft = { id: string; title: string | null; post_text: string; images: string[]; status: string; created_at: string };

export default function SocialPostDraftsPanel() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["social_post_drafts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_post_drafts")
        .select("id,title,post_text,images,status,created_at").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []) as Draft[];
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("social_post_drafts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Nu s-a salvat");
    qc.invalidateQueries({ queryKey: ["social_post_drafts"] });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("social_post_drafts").delete().eq("id", id);
    if (error) return toast.error("Nu s-a șters");
    qc.invalidateQueries({ queryKey: ["social_post_drafts"] });
  };
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Text copiat");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Postări Facebook / Instagram</CardTitle>
        <CardDescription>Drafturi create automat la publicarea cu acord. Copiezi textul, descarci pozele și postezi tu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : !data.length ? (
          <p className="text-sm text-muted-foreground">Încă nu există drafturi. Apar la următorul anunț publicat cu acord.</p>
        ) : data.map((d) => (
          <div key={d.id} className="rounded-lg border p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-foreground line-clamp-1">{d.title}</p>
              <Badge variant={d.status === "posted" ? "default" : "secondary"}>{d.status === "posted" ? "Postat" : "Draft"}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {d.images.map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer" aria-label="Deschide poza la rezoluție mare">
                  <img src={src} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" />
                </a>
              ))}
            </div>
            <pre className="whitespace-pre-wrap break-words rounded bg-muted/40 p-2 text-xs text-foreground font-sans">{d.post_text}</pre>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="min-h-12" onClick={() => copy(d.post_text)}><Copy className="h-4 w-4 mr-1" />Copiază textul</Button>
              {d.status !== "posted" && <Button size="sm" variant="outline" className="min-h-12" onClick={() => setStatus(d.id, "posted")}><Check className="h-4 w-4 mr-1" />Marchează postat</Button>}
              <Button size="sm" variant="ghost" className="min-h-12" onClick={() => remove(d.id)} aria-label="Șterge draftul"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
