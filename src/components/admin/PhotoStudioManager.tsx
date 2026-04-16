import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { PhotoEnhancer } from "./PhotoEnhancer";

export default function PhotoStudioManager() {
  const [propertyId, setPropertyId] = useState<string>("");
  const [selectedUrl, setSelectedUrl] = useState<string>("");
  const [manualUrl, setManualUrl] = useState<string>("");

  const { data: properties } = useQuery({
    queryKey: ["photostudio-properties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(100);
      return data || [];
    },
  });

  const { data: images } = useQuery({
    queryKey: ["photostudio-images", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("property_images")
        .select("id, image_path, is_primary")
        .eq("property_id", propertyId)
        .order("is_primary", { ascending: false })
        .order("display_order", { ascending: true });
      return data || [];
    },
  });

  const resolveUrl = (path: string) =>
    path.startsWith("http")
      ? path
      : supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;

  const activeUrl = selectedUrl || manualUrl;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Studio Foto AI</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Procesează fotografii de proprietăți cu AI: enhance lumină, virtual staging pentru camere goale, declutter, conversie zi → twilight.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">1. Alege fotografia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Din proprietate</Label>
              <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setSelectedUrl(""); }}>
                <SelectTrigger><SelectValue placeholder="Alege proprietatea…" /></SelectTrigger>
                <SelectContent>
                  {properties?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sau URL direct</Label>
              <Input value={manualUrl} onChange={(e) => { setManualUrl(e.target.value); setSelectedUrl(""); }} placeholder="https://…" />
            </div>
          </div>

          {images && images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
              {images.map((img: any) => {
                const url = resolveUrl(img.image_path);
                return (
                  <button
                    key={img.id}
                    onClick={() => setSelectedUrl(url)}
                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      selectedUrl === url ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {img.is_primary && (
                      <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded">★</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {activeUrl && (
        <PhotoEnhancer imageUrl={activeUrl} />
      )}
    </div>
  );
}
