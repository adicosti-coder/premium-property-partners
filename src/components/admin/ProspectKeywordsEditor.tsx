import { useState, KeyboardEvent } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

interface Props {
  prospectId: string;
  keywords: string[];
  onChange: (next: string[]) => void;
}

/**
 * Inline editor for `prospect_listings.search_keywords`.
 * Shows compact chips for each keyword (the search query that surfaced
 * the listing) and opens a popover to add / remove them.
 */
export function ProspectKeywordsEditor({ prospectId, keywords, onChange }: Props) {
  const list = Array.isArray(keywords) ? keywords : [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const persist = async (next: string[]) => {
    setSaving(true);
    const { error } = await supabase
      .from("prospect_listings")
      .update({ search_keywords: next } as any)
      .eq("id", prospectId);
    setSaving(false);
    if (error) {
      toast({ title: "Eroare la salvare", description: error.message, variant: "destructive" });
      return false;
    }
    onChange(next);
    return true;
  };

  const addKeyword = async () => {
    const kw = draft.trim();
    if (!kw) return;
    if (list.some((k) => k.toLowerCase() === kw.toLowerCase())) {
      setDraft("");
      return;
    }
    const ok = await persist([...list, kw]);
    if (ok) setDraft("");
  };

  const removeKeyword = async (kw: string) => {
    await persist(list.filter((k) => k !== kw));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      <Search className="h-3 w-3 text-muted-foreground shrink-0" />
      {list.length === 0 && (
        <span className="text-[10px] text-muted-foreground italic">fără keywords</span>
      )}
      {list.map((kw) => (
        <Badge
          key={kw}
          variant="secondary"
          className="text-[10px] py-0 px-1.5 font-mono gap-1 max-w-[180px]"
          title={kw}
        >
          <span className="truncate">{kw}</span>
          <button
            type="button"
            onClick={() => removeKeyword(kw)}
            disabled={saving}
            className="hover:text-destructive shrink-0"
            aria-label={`Șterge "${kw}"`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 px-1 rounded hover:bg-muted"
            title="Adaugă keyword de căutare"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2 space-y-2">
          <div className="text-xs font-medium">Adaugă keyword căutare</div>
          <div className="flex gap-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ex: apartament 2 cam Iosefin"
              className="h-8 text-xs font-mono"
            />
            <Button size="sm" onClick={addKeyword} disabled={!draft.trim() || saving} className="h-8">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "+"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Termenii salvați aici reflectă query-ul scraper-ului care a adus anunțul.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
