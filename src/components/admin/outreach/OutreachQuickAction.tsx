import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  B2C_PLATFORMS,
  renderB2CTemplate,
  type B2CLeadLike,
  type B2CTemplate,
} from "./b2cOutreach";

// Tiny in-memory cache so each row doesn't re-fetch.
let cache: B2CTemplate[] | null = null;
let cachePromise: Promise<B2CTemplate[]> | null = null;

const loadTemplates = async (): Promise<B2CTemplate[]> => {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const { data, error } = await supabase
      .from("outreach_templates")
      .select("*")
      .in("platform", B2C_PLATFORMS as unknown as string[])
      .eq("is_active", true)
      .order("platform");
    if (error) {
      cachePromise = null;
      throw error;
    }
    cache = (data as B2CTemplate[]) || [];
    return cache;
  })();
  return cachePromise;
};

export const invalidateB2COutreachCache = () => {
  cache = null;
  cachePromise = null;
};

interface Props {
  lead: B2CLeadLike & { contact_email?: string | null };
  size?: "sm" | "icon";
  className?: string;
}

/**
 * Quick "Abordează" outreach action shown on each B2C lead row.
 * Lets the user pick a template; opens mailto: with rendered subject + body.
 */
export default function OutreachQuickAction({ lead, size = "sm", className }: Props) {
  const [templates, setTemplates] = useState<B2CTemplate[] | null>(cache);
  const [loading, setLoading] = useState(false);

  const ensureLoaded = async () => {
    if (templates) return templates;
    setLoading(true);
    try {
      const list = await loadTemplates();
      setTemplates(list);
      return list;
    } catch (e: any) {
      toast.error(e?.message || "Eroare la încărcarea șabloanelor");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Warm cache on hover/mount cheaply
    if (!templates && !loading) {
      ensureLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = (tpl: B2CTemplate) => {
    const subject = renderB2CTemplate(tpl.subject, lead);
    const body = renderB2CTemplate(tpl.body, lead) +
      (lead.url ? `\n\n— Sursă anunț —\n${lead.url}` : "");
    const to = (lead.contact_email && lead.contact_email.trim()) || "";
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "icon" ? "icon" : "sm"}
          className={
            className ||
            "h-8 w-8 p-0 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
          }
          title="Abordează (template outreach)"
          onClick={(e) => {
            e.stopPropagation();
            ensureLoaded();
          }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="text-xs">Trimite mesaj din șablon</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!templates || templates.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            {loading ? "Se încarcă..." : "Niciun șablon FSBO activ"}
          </DropdownMenuItem>
        ) : (
          templates.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => handlePick(t)}>
              <Mail className="w-4 h-4 mr-2" /> {t.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
