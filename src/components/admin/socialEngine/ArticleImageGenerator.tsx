import { useState } from "react";
import { ImagePlus, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { streamImage } from "@/lib/streamImage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ArticlePost = { id: string; title: string; type: string; status: string; source_url: string; image_url: string | null; image_urls?: string[] | null };

export default function ArticleImageGenerator({ posts, onSaved }: { posts: ArticlePost[]; onSaved: () => Promise<void> }) {
  const articles = posts.filter(p => p.type === "blog" && ["draft", "scheduled"].includes(p.status));
  const [selectedId, setSelectedId] = useState("");
  const selected = articles.find(p => p.id === selectedId);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ id: string; url: string; final: boolean } | null>(null);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const existing = selected?.image_url || selected?.image_urls?.[0];
  const visible = preview?.id === selectedId ? preview : null;

  const generate = async () => {
    if (!selected || busy || (existing && !replace)) return;
    const post = selected;
    setBusy(true); setError(""); setPreview(null);
    let completed = "";
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Sesiunea a expirat. Autentifică-te din nou.");
      await streamImage(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-post-image`,
        { post_id: post.id, replace_existing: replace },
        (url, final) => { setPreview({ id: post.id, url, final }); if (final) completed = url; },
        undefined, { Authorization: `Bearer ${session.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY });
      if (!completed) throw new Error("Imaginea nu a fost finalizată.");
      const blob = await (await fetch(completed)).blob();
      const path = `social-ai/${post.id}-${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from("property-images").upload(path, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;
      const url = supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
      const { error: saveError } = await supabase.from("social_posts").update({ image_url: url, image_urls: [url] }).eq("id", post.id);
      if (saveError) { await supabase.storage.from("property-images").remove([path]); throw saveError; }
      setPreview({ id: post.id, url, final: true }); setReplace(false);
      await onSaved();
      toast({ title: "Imagine salvată", description: "Ciorna socială are noua imagine. Nu a fost publicată." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generarea imaginii a eșuat.";
      setError(message); setPreview(null);
      toast({ title: "Imaginea nu a fost salvată", description: message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <section className="space-y-5 py-4" aria-labelledby="article-image-title">
    <h3 id="article-image-title" className="font-heading text-xl font-semibold">Imagini din articole</h3>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <Label htmlFor="article-image-select">Articol din ciornele sociale</Label>
        <Select value={selectedId} disabled={busy} onValueChange={id => { setSelectedId(id); setReplace(false); setError(""); }}>
          <SelectTrigger id="article-image-select" className="min-h-12 h-auto [&>span]:min-w-0 [&>span]:whitespace-normal [&>span]:text-left"><SelectValue placeholder="Alege articolul" /></SelectTrigger>
          <SelectContent>{articles.map(post => <SelectItem key={post.id} value={post.id} className="max-w-[min(600px,85vw)] whitespace-normal">{post.title}</SelectItem>)}</SelectContent>
        </Select>
        {!articles.length && <p className="text-sm text-muted-foreground">Nu există articole în ciornele sociale.</p>}
        {selected && <a className="inline-flex min-h-12 items-center gap-2 text-sm text-accent" href={selected.source_url} target="_blank" rel="noopener noreferrer">Deschide articolul <ExternalLink className="h-4 w-4" /></a>}
        {existing && <Label className="flex min-h-12 items-center gap-3"><Checkbox checked={replace} disabled={busy} onCheckedChange={v => setReplace(v === true)} />Înlocuiește imaginea existentă</Label>}
        <Button className="min-h-12 w-full sm:w-auto" disabled={!selected || busy || Boolean(existing && !replace)} onClick={generate}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : existing ? <RefreshCw className="mr-2 h-4 w-4" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {busy ? "Se generează imaginea…" : "Generează imagine din articol"}
        </Button>
        {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      </div>
      <div className="relative aspect-square min-w-0 overflow-hidden rounded-lg border border-border bg-muted">
        {(visible?.url || existing) ? <img src={visible?.url || existing || ""} alt={selected?.title ?? "Imagine articol"} className={cn("absolute inset-0 h-full w-full object-contain", visible && !visible.final && "blur-lg")} /> : <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><ImagePlus className="h-12 w-12" /></div>}
        {busy && <div role="status" className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-background/95 p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{visible?.final ? "Se salvează imaginea…" : "Se generează imaginea…"}</div>}
      </div>
    </div>
  </section>;
}