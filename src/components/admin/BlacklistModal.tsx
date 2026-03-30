import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Search, Phone, Ban, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BlacklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PhoneIntelEntry {
  phone_number: string;
  category: string | null;
  is_blacklisted: boolean;
  last_seen: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  proprietar: { label: "🏠 Proprietar", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
  agentie: { label: "🏢 Agenție", color: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
  dezvoltator: { label: "🏗️ Dezvoltator", color: "bg-violet-500/15 text-violet-600 border-violet-500/20" },
};

export function BlacklistModal({ open, onOpenChange }: BlacklistModalProps) {
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["phone-intelligence-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_intelligence" as any)
        .select("*")
        .order("last_seen", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as PhoneIntelEntry[];
    },
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = search
    ? entries.filter((e) => e.phone_number?.includes(search))
    : entries;

  const blacklistedCount = entries.filter((e) => e.is_blacklisted).length;

  const toggleBlacklist = async (phone: string, current: boolean) => {
    setToggling(phone);
    const { error } = await supabase
      .from("phone_intelligence" as any)
      .update({ is_blacklisted: !current } as any)
      .eq("phone_number", phone);
    if (error) {
      toast.error("Eroare la actualizare");
    } else {
      toast.success(!current ? `☠️ ${phone} blocat` : `✅ ${phone} deblocat`);
      queryClient.invalidateQueries({ queryKey: ["phone-intelligence-list"] });
      queryClient.invalidateQueries({ queryKey: ["phone-intel-count"] });
    }
    setToggling(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Gestionare Blacklist
            <Badge variant="secondary" className="ml-auto text-xs">
              {blacklistedCount} blocate / {entries.length} total
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Caută după număr de telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {search ? "Niciun rezultat." : "Nicio intrare în baza de date."}
            </p>
          ) : (
            <div className="space-y-1 pr-2">
              {filtered.map((entry) => (
                <div
                  key={entry.phone_number}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                    entry.is_blacklisted
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium truncate">{entry.phone_number}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {entry.category && CATEGORY_LABELS[entry.category] && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${CATEGORY_LABELS[entry.category].color}`}>
                            {CATEGORY_LABELS[entry.category].label}
                          </Badge>
                        )}
                        {entry.is_blacklisted && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-500/15 text-red-500 border-red-500/20">
                            <Ban className="w-2.5 h-2.5 mr-0.5" /> Blocat
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {new Date(entry.last_seen).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                    </span>
                    {toggling === entry.phone_number ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Switch
                        checked={entry.is_blacklisted}
                        onCheckedChange={() => toggleBlacklist(entry.phone_number, entry.is_blacklisted)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
