import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

interface ReviewSettings {
  max_per_hour: number;
  max_per_day: number;
  client_throttle_seconds: number;
  updated_at: string | null;
}

const DEFAULTS: ReviewSettings = {
  max_per_hour: 3,
  max_per_day: 10,
  client_throttle_seconds: 20,
  updated_at: null,
};

/** Admin control for the anti-spam / rate-limiting thresholds on guest POI reviews. */
const PoiReviewSettingsCard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ReviewSettings>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ["poi-review-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poi_review_settings")
        .select("max_per_hour, max_per_day, client_throttle_seconds, updated_at")
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULTS) as ReviewSettings;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (values: ReviewSettings) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("poi_review_settings").upsert(
        {
          id: true,
          max_per_hour: values.max_per_hour,
          max_per_day: values.max_per_day,
          client_throttle_seconds: values.client_throttle_seconds,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poi-review-settings"] });
      toast({ title: "Setări salvate", description: "Limitele pentru recenzii au fost actualizate." });
    },
    onError: (error: Error) =>
      toast({
        title: "Salvarea a eșuat",
        description: error.message,
        variant: "destructive",
      }),
  });

  const invalid =
    form.max_per_hour < 1 ||
    form.max_per_hour > 100 ||
    form.max_per_day < 1 ||
    form.max_per_day > 500 ||
    form.max_per_hour > form.max_per_day ||
    form.client_throttle_seconds < 0 ||
    form.client_throttle_seconds > 600;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Limitare recenzii (anti-spam)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Se încarcă setările…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="poi-max-hour">Maxim recenzii / oră</Label>
                <Input
                  id="poi-max-hour"
                  type="number"
                  min={1}
                  max={100}
                  value={form.max_per_hour}
                  onChange={(e) => setForm({ ...form, max_per_hour: Number(e.target.value) })}
                  aria-label="Număr maxim de recenzii pe oră per utilizator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poi-max-day">Maxim recenzii / zi</Label>
                <Input
                  id="poi-max-day"
                  type="number"
                  min={1}
                  max={500}
                  value={form.max_per_day}
                  onChange={(e) => setForm({ ...form, max_per_day: Number(e.target.value) })}
                  aria-label="Număr maxim de recenzii pe zi per utilizator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poi-throttle">Pauză între trimiteri (sec.)</Label>
                <Input
                  id="poi-throttle"
                  type="number"
                  min={0}
                  max={600}
                  value={form.client_throttle_seconds}
                  onChange={(e) =>
                    setForm({ ...form, client_throttle_seconds: Number(e.target.value) })
                  }
                  aria-label="Pauză minimă în secunde între două trimiteri din browser"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Limitele pe oră și pe zi sunt aplicate server-side (politici RLS), deci nu pot fi
              ocolite din browser. Pauza între trimiteri este un filtru suplimentar pentru boți.
              {form.updated_at
                ? ` Ultima modificare: ${new Date(form.updated_at).toLocaleString("ro-RO")}.`
                : ""}
            </p>
            <Button
              onClick={() => save.mutate(form)}
              disabled={invalid || save.isPending}
              aria-label="Salvează setările de limitare a recenziilor"
            >
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Salvează setările
            </Button>
            {invalid && (
              <p className="text-xs text-destructive">
                Verifică valorile: 1–100 pe oră, 1–500 pe zi (limita orară ≤ limita zilnică), 0–600
                secunde pauză.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PoiReviewSettingsCard;
