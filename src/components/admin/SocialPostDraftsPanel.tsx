import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check, Trash2, Download, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { describeSocialImage, facebookPostOptimization, instagramPostDescription, readableSocialPost } from "@/lib/socialDraftContent";
import { resolvePropertyImageUrl } from "@/utils/resolvePropertyImageUrl";

type Draft = { id: string; property_id: string; title: string | null; post_text: string; images: string[]; status: string; created_at: string };

export default function SocialPostDraftsPanel() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["social_post_drafts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_post_drafts")
        .select("id,property_id,title,post_text,images,status,created_at").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      const drafts = (data ?? []) as Draft[];
      if (!drafts.length) return [];
      const ids = [...new Set(drafts.map((draft) => draft.property_id))];
      const [{ data: gallery, error: galleryError }, { data: props }] = await Promise.all([
        supabase.from("property_images")
          .select("property_id,image_path,original_url,caption,alt_text")
          .in("property_id", ids).eq("is_published", true).order("display_order"),
        supabase.from("properties").select("id,name,slug,description_ro").in("id", ids),
      ]);
      if (galleryError) throw galleryError;
      const propMap = new Map((props ?? []).map((p: any) => [p.id, p]));
      return drafts.map((draft) => {
        const prop: any = propMap.get(draft.property_id);
        const title = prop?.name || draft.title || "Proprietate RealTrust";
        const photos = draft.images.map((src, index) => ({
          src: resolvePropertyImageUrl(src) || src,
          ...describeSocialImage(src, (gallery ?? []).filter((image) => image.property_id === draft.property_id), title, index),
        }));
        const listing = {
          link: prop?.slug ? `https://realtrust.ro/proprietate/${prop.slug}` : "",
          description: String(prop?.description_ro || "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim().slice(0, 300),
        };
        return { ...draft, title, photos, listing, readableText: readableSocialPost(draft.post_text, photos.map((photo) => photo.caption)) };
      });
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("social_post_drafts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Nu s-a salvat");
    qc.invalidateQueries({ queryKey: ["social_post_drafts"] });
  };
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const publishNow = async (draft: Draft) => {
    setPublishingId(draft.id);
    try {
      const { data, error } = await supabase.functions.invoke("social-autopost-drain", { body: { draft_id: draft.id } });
      if (error) throw error;
      const results = (data?.results ?? []) as { platform: string; ok: boolean; error?: string }[];
      if (results.length && results.every((r) => r.ok)) {
        toast.success("Postarea a fost publicată pe Facebook și Instagram.");
      } else if (results.length) {
        toast.error(`Postare eșuată: ${results.filter((r) => !r.ok).map((r) => `${r.platform}: ${r.error}`).join(" | ")}`);
      } else {
        toast.info(data?.skipped ? `Sărit: ${data.skipped}` : "Postarea nu a putut fi trimisă.");
      }
    } catch {
      toast.error("Publicarea nu a putut fi pornită. Încearcă din nou.");
    } finally {
      setPublishingId(null);
      qc.invalidateQueries({ queryKey: ["social_post_drafts"] });
    }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("social_post_drafts").delete().eq("id", id);
    if (error) return toast.error("Nu s-a șters");
    qc.invalidateQueries({ queryKey: ["social_post_drafts"] });
  };
  const download = async (src: string, name: string) => {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
      toast.info("Imaginea s-a deschis într-un tab nou — salveaz-o de acolo.");
    }
  };
  const downloadAll = async (photos: { src: string }[], title: string) => {
    for (let i = 0; i < photos.length; i++) {
      await download(photos[i].src, `${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "realtrust"}-foto-${i + 1}.jpg`);
      await new Promise((r) => setTimeout(r, 400));
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Text copiat");
    } catch {
      toast.error("Textul nu a putut fi copiat. Încearcă din nou.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Postări Facebook / Instagram</CardTitle>
        <CardDescription>Drafturi create automat la publicarea cu acord. Copiezi textul, descarci pozele și postezi tu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p role="status" className="text-sm text-muted-foreground">Se încarcă…</p> : isError ? (
          <p role="alert" className="text-sm text-destructive">Postările și descrierile fotografiilor nu au putut fi încărcate.</p>
        ) : !data.length ? (
          <p className="text-sm text-muted-foreground">Încă nu există drafturi. Apar la următorul anunț publicat cu acord.</p>
        ) : data.map((d) => (
          <article key={d.id} aria-labelledby={`social-title-${d.id}`} className="min-w-0 rounded-lg border p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`social-title-${d.id}`} className="min-w-0 break-words font-medium text-foreground">{d.title}</h3>
              <Badge variant={d.status === "posted" ? "default" : "secondary"}>{d.status === "posted" ? "Postat" : d.status === "queued" ? "Programat" : d.status === "posting" ? "Se postează" : "Draft"}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {d.photos.map((photo, index) => (
                <figure key={`${photo.src}-${index}`} className="min-w-0 space-y-2">
                  <a className="block min-h-12 min-w-12" href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`Deschide fotografia ${index + 1}: ${photo.alt}`}>
                    <img src={photo.src} alt={photo.alt} loading="lazy" width={400} height={400} className="aspect-square w-full rounded object-cover" />
                  </a>
                  <figcaption className="break-words text-sm text-muted-foreground">{photo.caption || photo.alt}</figcaption>
                  <Button size="sm" variant="outline" className="min-h-12 w-full whitespace-normal" aria-label={`Copiază textul alternativ pentru fotografia ${index + 1} din ${d.title}`} onClick={() => copy(photo.alt)}>
                    <Copy className="mr-2 h-4 w-4 shrink-0" />Copiază descrierea foto
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-12 w-full whitespace-normal" aria-label={`Descarcă fotografia ${index + 1} din ${d.title}`} onClick={() => download(photo.src, `${d.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "realtrust"}-foto-${index + 1}.jpg`)}>
                    <Download className="mr-2 h-4 w-4 shrink-0" />Descarcă imaginea
                  </Button>
                </figure>
              ))}
            </div>
            <p className="whitespace-pre-wrap break-words rounded bg-muted/40 p-3 text-sm leading-relaxed text-foreground">{d.readableText}</p>
            {(() => {
              const fb = facebookPostOptimization(d.title, d.readableText);
              const ig = instagramPostDescription(d.readableText, fb.hashtags);
              const fields: { label: string; value: string; hint?: string }[] = [
                { label: "Titlu", value: fb.title },
                { label: "Descriere", value: d.listing.description || fb.description },
                { label: "Instagram", value: ig, hint: `${ig.length}/2.200 caractere` },
                { label: "Hashtag-uri", value: fb.hashtags },
                { label: "Link anunț", value: d.listing.link || fb.link },
              ];
              return (
                <section aria-label={`Optimizare postare Facebook și Instagram pentru ${d.title}`} className="space-y-2 rounded-lg border border-dashed p-3">
                  <h4 className="text-sm font-medium text-foreground">Optimizare Facebook &amp; Instagram</h4>
                  {fields.map((field) => (
                    <div key={field.label} className="flex flex-wrap items-start gap-2">
                      <span className="w-24 shrink-0 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</span>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words rounded bg-muted/40 p-2 text-sm text-foreground">{field.value || "—"}</p>
                        {field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}
                      </div>
                      <Button size="sm" variant="outline" className="min-h-12 shrink-0" disabled={!field.value}
                        aria-label={`Copiază ${field.label.toLowerCase()} pentru ${d.title}`} onClick={() => copy(field.value)}>
                        <Copy className="mr-1 h-4 w-4" />Copiază
                      </Button>
                    </div>
                  ))}
                </section>
              );
            })()}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="min-h-12" aria-label={`Copiază postarea pentru ${d.title}`} onClick={() => copy(d.readableText)}><Copy className="h-4 w-4 mr-1" />Copiază textul</Button>
              <Button size="sm" variant="outline" className="min-h-12" aria-label={`Descarcă toate fotografiile pentru ${d.title}`} onClick={() => downloadAll(d.photos, d.title)}><Download className="h-4 w-4 mr-1" />Descarcă toate pozele</Button>
              {d.status !== "posted" && <Button size="sm" variant="outline" className="min-h-12" onClick={() => setStatus(d.id, "posted")}><Check className="h-4 w-4 mr-1" />Marchează postat</Button>}
              <Button size="sm" variant="ghost" className="min-h-12" onClick={() => remove(d.id)} aria-label="Șterge draftul"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
