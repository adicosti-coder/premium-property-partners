import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  B2C_AVAILABLE_TAGS,
  B2C_PLATFORMS,
  type B2CTemplate,
} from "./b2cOutreach";

/**
 * B2C outreach template editor — cross-pollination of the PM Leads template
 * editor for FSBO / proprietar leads in the Pipeline Prospecți panel.
 */
export default function OutreachTemplatesPanelB2C() {
  const [templates, setTemplates] = useState<B2CTemplate[]>([]);
  const [draft, setDraft] = useState<Record<string, B2CTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("outreach_templates")
      .select("*")
      .in("platform", B2C_PLATFORMS as unknown as string[])
      .order("platform");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as B2CTemplate[]) || [];
    setTemplates(list);
    const map: Record<string, B2CTemplate> = {};
    list.forEach((t) => (map[t.id] = { ...t }));
    setDraft(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const insertTag = (id: string, tag: string) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], body: (prev[id]?.body || "") + " " + tag },
    }));
  };

  const save = async (id: string) => {
    const t = draft[id];
    if (!t) return;
    setSaving(id);
    const { error } = await supabase
      .from("outreach_templates")
      .update({
        name: t.name,
        subject: t.subject,
        body: t.body,
        is_active: t.is_active,
      })
      .eq("id", id);
    setSaving(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Șablon salvat");
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Se încarcă șabloanele...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-5 h-5" /> Șabloane outreach proprietari (FSBO)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Folosite de butonul „Abordează” din lista de Lead-uri Scorate. Tag-uri disponibile:{" "}
            {B2C_AVAILABLE_TAGS.map((t) => (
              <code key={t} className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs">
                {t}
              </code>
            ))}
          </p>
        </CardHeader>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Niciun șablon FSBO disponibil. Rulează migrarea pentru a popula default-urile.
          </CardContent>
        </Card>
      ) : (
        templates.map((t) => {
          const d = draft[t.id] || t;
          return (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="uppercase">
                      {t.platform.replace("fsbo_", "")}
                    </Badge>
                    <Input
                      className="w-full max-w-md"
                      value={d.name}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, [t.id]: { ...d, name: e.target.value } }))
                      }
                    />
                  </div>
                  <Button size="sm" onClick={() => save(t.id)} disabled={saving === t.id}>
                    {saving === t.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Salvează
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Subiect email</label>
                  <Input
                    value={d.subject}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [t.id]: { ...d, subject: e.target.value } }))
                    }
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                    <label className="text-xs font-medium">Corp mesaj</label>
                    <div className="flex flex-wrap gap-1">
                      {B2C_AVAILABLE_TAGS.map((tag) => (
                        <Button
                          key={tag}
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => insertTag(t.id, tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={d.body}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [t.id]: { ...d, body: e.target.value } }))
                    }
                    rows={Math.max(10, d.body.split("\n").length + 1)}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
