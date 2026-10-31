import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { streamImage } from "@/lib/streamImage";
import { socialImageDimensions, type SocialImageRatio } from "../../../../supabase/functions/social-post-image/prompt";

export default function EditorImageGenerator({ postId, title, description, story, disabled, onImage, onBusy }: {
  postId?: string; title: string; description: string; story: boolean; disabled?: boolean;
  onImage: (url: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [ratio, setRatio] = useState<SocialImageRatio>("1:1");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; final: boolean } | null>(null);
  const [error, setError] = useState("");
  const generate = async () => {
    if (busy) return;
    setBusy(true); onBusy(true); setError(""); setPreview(null);
    const selectedRatio = story ? "9:16" : ratio;
    let finalImage = "";
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sesiunea a expirat. Autentifică-te din nou.");
      await streamImage(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-post-image`,
        { mode: "editor", post_id: postId, title, description, ratio: selectedRatio },
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
      onImage(supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl);
      setPreview(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Generarea a eșuat."); setPreview(null); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="space-y-2">
    {!story && <Select value={ratio} disabled={busy || disabled} onValueChange={value => setRatio(value as SocialImageRatio)}>
      <SelectTrigger aria-label="Format imagine AI" className="min-h-12"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="1:1">Feed pătrat 1:1</SelectItem><SelectItem value="4:5">Feed portret 4:5</SelectItem></SelectContent>
    </Select>}
    <Button variant="outline" className="w-full min-h-12" onClick={generate} disabled={disabled || busy || title.trim().length < 2 || description.trim().length < 2}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {busy ? "Se generează imaginea…" : "Generează Imagine AI"}
    </Button>
    {preview && <img src={preview.url} alt="Imagine AI în curs" className={`w-full max-h-72 object-contain ${preview.final ? "" : "blur-lg"}`} />}
    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
  </div>;
}