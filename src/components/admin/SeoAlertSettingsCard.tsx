import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, SlidersHorizontal } from "lucide-react";

interface SeoAlertSettings {
  min_404_hits: number;
  min_indexing_issues: number;
  webhook_min_severity: "warning" | "error";
  email_enabled: boolean;
  webhook_enabled: boolean;
  auto_reindex_on_alert: boolean;
  updated_at: string | null;
}

const DEFAULTS: SeoAlertSettings = {
  min_404_hits: 5,
  min_indexing_issues: 1,
  webhook_min_severity: "warning",
  email_enabled: true,
  webhook_enabled: true,
  auto_reindex_on_alert: false,
  updated_at: null,
};

/** Praguri și canale de notificare pentru monitorul de alerte SEO. */
export const SeoAlertSettingsCard = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<SeoAlertSettings>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ["seo-alert-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_alert_settings")
        .select(
          "min_404_hits, min_indexing_issues, webhook_min_severity, email_enabled, webhook_enabled, auto_reindex_on_alert, updated_at",
        )
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULTS) as SeoAlertSettings;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (values: SeoAlertSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("seo_alert_settings").upsert({
        id: true,
        min_404_hits: Math.min(1000, Math.max(2, Math.round(values.min_404_hits))),
        min_indexing_issues: Math.min(10000, Math.max(1, Math.round(values.min_indexing_issues))),
        webhook_min_severity: values.webhook_min_severity,
        email_enabled: values.email_enabled,
        webhook_enabled: values.webhook_enabled,
        auto_reindex_on_alert: values.auto_reindex_on_alert,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Setări salvate", description: "Pragurile de alertare SEO au fost actualizate." });
      qc.invalidateQueries({ queryKey: ["seo-alert-settings"] });
    },
    onError: (e: Error) => toast({ title: "Salvarea a eșuat", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          Praguri alertare SEO
        </CardTitle>
        <CardDescription>
          Controlează când se declanșează alertele și webhook-ul (WhatsApp/Make) pentru erori 404 și pagini
          neindexate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă setările…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="seo-min-404">Minim accesări 404 (24h)</Label>
                <Input
                  id="seo-min-404"
                  type="number"
                  min={2}
                  max={1000}
                  value={form.min_404_hits}
                  onChange={(e) => setForm({ ...form, min_404_hits: Number(e.target.value) })}
                  aria-label="Prag minim de accesări 404 înainte de alertă"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seo-min-index">Minim pagini neindexate</Label>
                <Input
                  id="seo-min-index"
                  type="number"
                  min={1}
                  max={10000}
                  value={form.min_indexing_issues}
                  onChange={(e) => setForm({ ...form, min_indexing_issues: Number(e.target.value) })}
                  aria-label="Prag minim de pagini neindexate înainte de alertă"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seo-severity">Severitate minimă webhook</Label>
                <Select
                  value={form.webhook_min_severity}
                  onValueChange={(v) => setForm({ ...form, webhook_min_severity: v as "warning" | "error" })}
                >
                  <SelectTrigger id="seo-severity" aria-label="Severitate minimă pentru trimiterea webhook-ului">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Avertisment (toate)</SelectItem>
                    <SelectItem value="error">Doar erori critice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: "email_enabled" as const, label: "Trimite e-mail digest la alerte noi" },
                { key: "webhook_enabled" as const, label: "Trimite webhook (WhatsApp / Make.com)" },
                {
                  key: "auto_reindex_on_alert" as const,
                  label: "Reindexare automată a URL-urilor din alerte",
                },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <Label htmlFor={`seo-${row.key}`} className="text-sm font-normal">
                    {row.label}
                  </Label>
                  <Switch
                    id={`seo-${row.key}`}
                    checked={form[row.key]}
                    onCheckedChange={(v) => setForm({ ...form, [row.key]: v })}
                    aria-label={row.label}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="gap-2">
                {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvează pragurile
              </Button>
              {form.updated_at && (
                <span className="text-xs text-muted-foreground">
                  Ultima actualizare: {new Date(form.updated_at).toLocaleString("ro-RO")}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoAlertSettingsCard;
