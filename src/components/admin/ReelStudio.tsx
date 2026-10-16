import { useEffect, useState } from "react";
import { Loader2, Film, Send, Sparkles, Upload, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { renderReelFromImages } from "@/lib/reelVideo";
import { resolvePropertyImageUrl } from "@/utils/resolvePropertyImageUrl";

type Prop = { id: string; name: string; location: string | null; images: string[] };
const MAX = 4;

async function fnError(error: unknown) {
  const ctx = (error as { context?: Response })?.context;
  if (ctx?.json) { try { return (await ctx.json())?.error ?? "Eroare"; } catch { /* ignore */ } }
  return error instanceof Error ? error.message : "Eroare";
}

export default function ReelStudio() {
  const [props, setProps] = useState<Prop[]>([]);
  const [propId, setPropId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<"" | "script" | "upload" | "render" | "send">("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.from("properties").select("id,name,location,images,image_path").eq("is_active", true).eq("listing_type", "cazare").order("display_order").limit(60)
      .then(({ data }) => setProps((data ?? []).map((p: any) => ({
        id: p.id, name: p.name, location: p.location,
        images: [p.image_path, ...(p.images ?? [])].map((x: string) => resolvePropertyImageUrl(x)).filter((x): x is string => !!x).filter((x, i, a) => a.indexOf(x) === i),
      }))));
  }, []);

  const current = props.find((p) => p.id === propId);
  const toggle = (url: string) => setSelected((s) => s.includes(url) ? s.filter((x) => x !== url) : s.length >= MAX ? s : [...s, url]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("upload");
    try {
      for (const f of Array.from(files).slice(0, MAX - selected.length)) {
        const path = `reel-studio/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("property-images").upload(path, f, { contentType: f.type });
        if (error) throw error;
        const url = supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
        setSelected((s) => s.length >= MAX ? s : [...s, url]);
      }
    } catch (e) { toast({ title: "Încărcarea a eșuat", description: e instanceof Error ? e.message : "", variant: "destructive" }); }
    setBusy("");
  };

  const genScript = async () => {
    setBusy("script");
    const { data, error } = await supabase.functions.invoke("reel-studio", { body: { action: "script", context: current ? `${current.name}, ${current.location ?? "Timișoara"}` : "" } });
    if (error) toast({ title: "Textul nu a putut fi generat", description: await fnError(error), variant: "destructive" });
    else { setTitle(data.title); setCaption(data.caption); }
    setBusy("");
  };

  const renderAndSend = async () => {
    setDone(false);
    try {
      setBusy("render");
      const blob = await renderReelFromImages(selected, 2.5, 3);
      const path = `reel-studio/${Date.now()}.mp4`;
      const { error: upErr } = await supabase.storage.from("social-reels").upload(path, blob, { contentType: "video/mp4" });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("social-reels").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (sErr || !signed) throw sErr ?? new Error("Link video indisponibil");
      setBusy("send");
      const { error } = await supabase.functions.invoke("reel-studio", { body: { action: "send", sourceUrl: signed.signedUrl, caption } });
      if (error) throw new Error(await fnError(error));
      setDone(true);
      toast({ title: "Reel trimis cu succes către Instagram & Facebook!" });
    } catch (e) {
      toast({ title: "Reel-ul nu a fost trimis", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
    setBusy("");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2"><Film className="h-6 w-6 text-primary" />Generator Reels ApArt</h2>
        <p className="text-sm text-muted-foreground">Alege 3–4 poze, generează textul și trimite clipul 9:16 către Instagram & Facebook prin Make.com.</p>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium">1. Poze ({selected.length}/{MAX})</h3>
        <select className="w-full h-12 rounded-md border bg-background px-3" value={propId} onChange={(e) => setPropId(e.target.value)} aria-label="Alege apartamentul">
          <option value="">Alege un apartament ApArt…</option>
          {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {current && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {current.images.slice(0, 20).map((url) => (
              <button key={url} type="button" onClick={() => toggle(url)} aria-pressed={selected.includes(url)} aria-label="Selectează poza"
                className={`relative aspect-[9/16] overflow-hidden rounded-md border-2 ${selected.includes(url) ? "border-primary" : "border-transparent"}`}>
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {selected.includes(url) && <span className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground text-xs h-6 w-6 grid place-items-center">{selected.indexOf(url) + 1}</span>}
              </button>
            ))}
          </div>
        )}
        <label className="inline-flex items-center gap-2 min-h-12 cursor-pointer text-sm text-primary">
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Sau încarcă poze noi
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={selected.length >= MAX} />
        </label>
        {selected.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Golește selecția</Button>}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">2. Titlu și descriere</h3>
          <Button variant="outline" onClick={genScript} disabled={!!busy}>
            {busy === "script" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generează cu AI
          </Button>
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlu pe ecran (max. 5 cuvinte)" aria-label="Titlu" />
        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={8} placeholder="Descrierea pentru Instagram & Facebook" aria-label="Descriere" />
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium">3. Generează și trimite</h3>
        <Button className="w-full h-12" onClick={renderAndSend} disabled={!!busy || selected.length < 3 || !caption.trim()}>
          {busy === "render" || busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy === "render" ? "Se creează video-ul 9:16…" : busy === "send" ? "Se trimite către Make.com…" : "Creează Reel și trimite"}
        </Button>
        {selected.length < 3 && <p className="text-xs text-muted-foreground">Alege cel puțin 3 poze.</p>}
        {done && <p className="flex items-center gap-2 text-sm text-primary" role="status"><CheckCircle2 className="h-4 w-4" />Reel trimis cu succes către Instagram & Facebook!</p>}
      </Card>
    </div>
  );
}
