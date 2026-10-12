import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_TAGS = "#Timișoara #RealTrust #ImobiliareTimișoara";

export default function SocialAiSettings() {
  const [tone, setTone] = useState("warm");
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("app_settings").select("key,value").in("key", ["caption_tone", "default_hashtags"]).then(({ data }) => {
      for (const r of data ?? []) {
        if (r.key === "caption_tone" && r.value) setTone(r.value);
        if (r.key === "default_hashtags" && r.value) setTags(r.value);
      }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      [{ key: "caption_tone", value: tone }, { key: "default_hashtags", value: tags.trim() || DEFAULT_TAGS }],
      { onConflict: "key" },
    );
    setSaving(false);
    toast(error
      ? { title: "Eroare", description: "Setările AI nu s-au salvat.", variant: "destructive" }
      : { title: "Salvat", description: "Tonul și hashtag-urile se aplică la următoarele descrieri." });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="font-heading font-semibold">Personalizare AI</p>
      <div className="space-y-1.5">
        <Label htmlFor="caption-tone">Ton descrieri (Gemini)</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger id="caption-tone"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="luxury">Luxury / Exclusiv</SelectItem>
            <SelectItem value="investment">Investiție / ROI</SelectItem>
            <SelectItem value="warm">Warm / Prietenos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="default-tags">Hashtag-uri implicite (adăugate la final)</Label>
        <Input id="default-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={DEFAULT_TAGS} />
      </div>
      <Button variant="outline" className="w-full" onClick={save} disabled={saving}>Salvează setările AI</Button>
    </div>
  );
}
