import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Camera, Loader2, Save } from "lucide-react";
import {
  VISION_SETTINGS_DEFAULTS,
  type PropertyVisionSettings,
} from "./vision/types";

/** Admin controls for the multimodal photo-analysis pipeline (threshold, cache, kill-switch). */
export default function PropertyVisionSettingsCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PropertyVisionSettings>(VISION_SETTINGS_DEFAULTS);

  const { data, isLoading, error } = useQuery({
    queryKey: ["property-vision-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_vision_settings")
        .select(
          "vision_enabled, auto_threshold, cache_enabled, cache_ttl_days, max_images, auto_outbound_enabled, outbound_threshold, outbound_template",
        )
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return { ...VISION_SETTINGS_DEFAULTS, ...(data ?? {}) } as PropertyVisionSettings;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (payload: PropertyVisionSettings) => {
      const { error } = await supabase
        .from("property_vision_settings")
        .update({
          vision_enabled: payload.vision_enabled,
          auto_threshold: payload.auto_threshold,
          cache_enabled: payload.cache_enabled,
          cache_ttl_days: payload.cache_ttl_days,
          max_images: payload.max_images,
          auto_outbound_enabled: payload.auto_outbound_enabled,
          outbound_threshold: payload.outbound_threshold,
          outbound_template: payload.outbound_template,
        })
        .eq("id", 1);
      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-vision-settings"] });
      toast({
        title: "Setări analiză foto salvate",
        description: "Se aplică imediat la următoarele scoruri de prospect.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Salvare eșuată", description: e.message, variant: "destructive" }),
  });

  const clamp = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
          Analiză foto AI (Property Quality Score)
        </CardTitle>
        <CardDescription>
          Prag de declanșare automată, cache pe imagini și număr maxim de poze trimise la model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-32 w-full" />}
        {error && (
          <p className="text-sm text-destructive">
            Nu am putut încărca setările: {(error as Error).message}
          </p>
        )}

        {!isLoading && !error && (
          <>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="vision-enabled">Analiză automată activă</Label>
                <p className="text-xs text-muted-foreground">
                  Dezactivat = analiza rulează doar manual, din fișa prospectului.
                </p>
              </div>
              <Switch
                id="vision-enabled"
                checked={form.vision_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, vision_enabled: v }))}
                aria-label="Activează analiza foto automată"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="cache-enabled">Cache pe imagini</Label>
                <p className="text-xs text-muted-foreground">
                  Reutilizează rezultatul pentru același set de poze (fără cost AI).
                </p>
              </div>
              <Switch
                id="cache-enabled"
                checked={form.cache_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, cache_enabled: v }))}
                aria-label="Activează cache-ul pe imagini"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="auto-threshold">Prag declanșare (scor text)</Label>
                <Input
                  id="auto-threshold"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={form.auto_threshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, auto_threshold: clamp(e.target.value, 0, 100, 70) }))
                  }
                />
                <p className="text-xs text-muted-foreground">Implicit 70.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cache-ttl">Valabilitate cache (zile)</Label>
                <Input
                  id="cache-ttl"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={form.cache_ttl_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cache_ttl_days: clamp(e.target.value, 1, 365, 90) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-images">Poze trimise la model</Label>
                <Input
                  id="max-images"
                  type="number"
                  min={1}
                  max={10}
                  inputMode="numeric"
                  value={form.max_images}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_images: clamp(e.target.value, 1, 10, 5) }))
                  }
                />
                <p className="text-xs text-muted-foreground">Mai multe poze = cost mai mare.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Salvează setările
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
