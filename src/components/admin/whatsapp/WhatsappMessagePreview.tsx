import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, CheckCheck } from "lucide-react";

export type PreviewItem = {
  id: string;
  phone_normalized: string;
  template_name: string;
  template_language: string;
  template_params: unknown;
  status: string;
};

/** Înlocuiește {{1}}, {{2}}… cu valorile din template_params. */
export function renderTemplateBody(body: string, params: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_m, i) => params[Number(i) - 1] ?? `{{${i}}}`);
}

export function WhatsappMessagePreview({
  item,
  onClose,
}: {
  item: PreviewItem | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setLoading(true);
    setBody(null);
    void (async () => {
      const { data } = await supabase
        .from("wa_templates")
        .select("body_preview")
        .eq("name", item.template_name)
        .maybeSingle();
      if (!cancelled) {
        setBody((data as { body_preview?: string } | null)?.body_preview ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item]);

  const params = Array.isArray(item?.template_params)
    ? (item!.template_params as unknown[]).map(String)
    : [];
  const rendered = body ? renderTemplateBody(body, params) : null;

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Previzualizare mesaj</DialogTitle>
          <DialogDescription>
            Așa va arăta șablonul <strong>{item?.template_name}</strong> pe telefonul proprietarului.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-[6px] border-foreground/80 bg-muted/40 p-3 shadow-lg">
          <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-foreground/30" />
          <div className="rounded-xl bg-background/60 p-3 min-h-[220px] flex flex-col justify-end gap-2">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && (
              <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 border border-primary/25 px-3 py-2">
                <p className="text-[13px] leading-snug whitespace-pre-wrap text-foreground">
                  {rendered ??
                    (params.length
                      ? params.join(" · ")
                      : "Șablonul nu are text salvat local — verifică-l în Meta Business Manager.")}
                </p>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  <span>
                    {new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {item?.status === "sent" ? <Check className="h-3 w-3" /> : null}
                  {item?.status === "replied" ? <CheckCheck className="h-3 w-3 text-primary" /> : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Badge variant="outline">{item?.template_language ?? "ro"}</Badge>
          <Badge variant="secondary">{params.length} variabile</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
