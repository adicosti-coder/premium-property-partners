import { useState } from "react";
import { Sparkles, Loader2, X, RefreshCw, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { GalleryImage } from "@/lib/socialGallery";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { streamImage } from "@/lib/streamImage";
import { socialImageDimensions, type SocialImageRatio } from "../../../../supabase/functions/social-post-image/prompt";

export default function EditorImageGenerator({ postId, title, description, story, disabled, images, onImages, onBusy }: {
  postId?: string; title: string; description: string; story: boolean; disabled?: boolean;
  images: GalleryImage[]; onImages: (images: GalleryImage[]) => void; onBusy: (busy: boolean) => void;
}) {
  const [ratio, setRatio] = useState<SocialImageRatio>("1:1");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; final: boolean } | null>(null);
  const [error, setError] = useState("");
  const generate = async (count: number, replaceIndex?: number) => {
    if (busy) return;
    setBusy(true); onBusy(true); setError(""); setPreview(null);
    const selectedRatio = story ? "9:16" : ratio;
    let next = [...images];
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sesiunea a expirat. Autentifică-te din nou.");
      for (let index = 0; index < count; index++) {
      let finalImage = "";
      await streamImage(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-post-image`,
        { mode: "editor", post_id: postId, title, description, ratio: selectedRatio, frame: replaceIndex ?? next.length },
        (url, final) => { setPreview({ url, final }); if (final) finalImage = url; }, undefined,
        { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY });
      if (!finalImage) throw new Error("Imaginea nu a fost finalizată.");
      const img = new Image(); img.src = finalImage; await img.decode();
      const { width, height } = socialImageDimensions(selectedRatio);
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Imaginea nu poate fi exportată.");
      // The generator uses this exact ratio; normalize pixel dimensions without cropping.
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Exportul imaginii a eșuat.")), "image/jpeg", 0.94));
      const path = `social-ai/editor-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("property-images").upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const item = { url: supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl, selected: true };
      if (replaceIndex !== undefined) next[replaceIndex] = item; else next.push(item);
      onImages([...next]);
      }
      setPreview(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Generarea a eșuat."); setPreview(null); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="space-y-2">
    {!story && <Select value={ratio} disabled={busy || disabled} onValueChange={value => { setRatio(value as SocialImageRatio); onImages([]); }}>
      <SelectTrigger aria-label="Format imagine AI" className="min-h-12"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="1:1">Feed pătrat 1:1</SelectItem><SelectItem value="4:5">Feed portret 4:5</SelectItem></SelectContent>
    </Select>}
    <Button className="w-full min-h-12 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => generate(3)} disabled={disabled || busy || title.trim().length < 2 || description.trim().length < 2}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {busy ? "Se generează imaginea…" : "Generează 3 Imagini AI"}
    </Button>
    <p className="text-xs text-muted-foreground">Minim 3 pentru publicare · {images.filter(image => image.selected).length} selectate</p>
    <div className="grid grid-cols-3 gap-2">
      {images.map((image, index) => <div key={image.url} className="min-w-0 space-y-1">
        <img src={image.url} alt={`Cadru AI ${index + 1}`} className="w-full aspect-square object-contain rounded-md border border-border bg-muted" />
        <div className="flex flex-wrap items-center justify-between gap-1">
          <Checkbox aria-label={`Selectează imaginea ${index + 1}`} checked={image.selected} disabled={busy} onCheckedChange={value => onImages(images.map((item, i) => i === index ? { ...item, selected: value === true } : item))} />
          <Button variant="ghost" size="icon" className="min-h-12 min-w-12" title="Regenerează imaginea" aria-label={`Regenerează imaginea ${index + 1}`} disabled={busy || disabled} onClick={() => generate(1, index)}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="min-h-12 min-w-12" title="Șterge imaginea" aria-label={`Șterge imaginea ${index + 1}`} disabled={busy} onClick={() => onImages(images.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
        </div>
      </div>)}
    </div>
    {images.length > 0 && <Button variant="outline" className="min-h-12 w-full" disabled={busy || disabled} onClick={() => generate(1)}><Plus className="mr-2 h-4 w-4" />Adaugă o imagine AI</Button>}
    {preview && <img src={preview.url} alt="Imagine AI în curs" className={`w-full max-h-72 object-contain ${preview.final ? "" : "blur-lg"}`} />}
    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
  </div>;
}