import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandLoading,
} from "@/components/ui/command";
import { Users, Flame, Building2, Search as SearchIcon } from "lucide-react";
import { ADMIN_GROUPS } from "./adminNavConfig";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
  pinned: string[];
  onTogglePin: (value: string) => void;
}

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Căutare cross-tabel admin: tab-uri + leads + prospect_listings + properties.
 * - debounce 250ms, min 2 caractere
 * - shortcut ⌘K / Ctrl+K (la fel ca paleta veche)
 * - rezultatele deschid ruta corectă (ex. /admin/leads, /admin/properties)
 */
export function AdminGlobalSearch({
  open, onOpenChange, onSelect, pinned, onTogglePin,
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);
  const enabled = open && debounced.length >= 2;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const like = `%${debounced}%`;

  const { data: leads = [], isFetching: leadsLoading } = useQuery({
    queryKey: ["admin-search:leads", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id,name,email,phone,created_at")
        .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: prospects = [], isFetching: prospectsLoading } = useQuery({
    queryKey: ["admin-search:prospects", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("prospect_listings")
        .select("id,title,contact_name,contact_phone,lead_score")
        .or(`title.ilike.${like},contact_name.ilike.${like},contact_phone.ilike.${like}`)
        .order("lead_score", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: properties = [], isFetching: propertiesLoading } = useQuery({
    queryKey: ["admin-search:properties", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id,name,is_active")
        .ilike("name", like)
        .limit(5);
      return data ?? [];
    },
  });

  const loading = enabled && (leadsLoading || prospectsLoading || propertiesLoading);

  const tabsFiltered = useMemo(() => {
    if (!query.trim()) return ADMIN_GROUPS;
    return ADMIN_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        const hay = `${it.label} ${(it.keywords ?? []).join(" ")} ${g.label}`.toLowerCase();
        return hay.includes(query.trim().toLowerCase());
      }),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Caută: secțiuni, lead-uri, prospecți, proprietăți…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && <CommandLoading>Caut în baza de date…</CommandLoading>}
        {!loading && enabled && leads.length + prospects.length + properties.length === 0 && tabsFiltered.length === 0 && (
          <CommandEmpty>Niciun rezultat pentru „{debounced}”.</CommandEmpty>
        )}
        {!enabled && tabsFiltered.length === 0 && (
          <CommandEmpty>Nicio secțiune găsită.</CommandEmpty>
        )}

        {enabled && leads.length > 0 && (
          <>
            <CommandGroup heading="Lead-uri">
              {leads.map((l: any) => (
                <CommandItem
                  key={`lead-${l.id}`}
                  value={`lead ${l.name ?? ""} ${l.email ?? ""} ${l.phone ?? ""} ${l.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate(`/admin/leads?focus=${l.id}`);
                  }}
                >
                  <Users className="mr-2 h-4 w-4 text-red-500" />
                  <span className="flex-1 truncate">
                    {l.name || l.email || l.phone || "Lead"}
                  </span>
                  <span className="ml-2 text-[10px] text-muted-foreground truncate max-w-[160px]">
                    {l.email || l.phone}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {enabled && prospects.length > 0 && (
          <>
            <CommandGroup heading="Prospecți">
              {prospects.map((p: any) => (
                <CommandItem
                  key={`prospect-${p.id}`}
                  value={`prospect ${p.title ?? ""} ${p.contact_name ?? ""} ${p.contact_phone ?? ""} ${p.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate(`/admin/prospect-listings?focus=${p.id}`);
                  }}
                >
                  <Flame className="mr-2 h-4 w-4 text-orange-500" />
                  <span className="flex-1 truncate">{p.title || p.contact_name || "Prospect"}</span>
                  {typeof p.lead_score === "number" && (
                    <span className="ml-2 text-[10px] font-semibold text-orange-600">
                      {p.lead_score}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {enabled && properties.length > 0 && (
          <>
            <CommandGroup heading="Proprietăți">
              {properties.map((p: any) => (
                <CommandItem
                  key={`prop-${p.id}`}
                  value={`property ${p.name ?? ""} ${p.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate(`/admin/properties?focus=${p.id}`);
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4 text-emerald-600" />
                  <span className="flex-1 truncate">{p.name || "Proprietate"}</span>
                  <span className={`ml-2 text-[10px] ${p.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {p.is_active ? "activă" : "inactivă"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {tabsFiltered.map((group, idx) => (
          <div key={group.id}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((tab) => {
                const Icon = tab.icon;
                const isPinned = pinned.includes(tab.value);
                return (
                  <CommandItem
                    key={tab.value}
                    value={`tab ${tab.label} ${(tab.keywords ?? []).join(" ")} ${group.label}`}
                    onSelect={() => {
                      onOpenChange(false);
                      if (tab.externalRoute) navigate(tab.externalRoute);
                      else onSelect(tab.value);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="flex-1">{tab.label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(tab.value);
                      }}
                      className="ml-2 text-xs text-muted-foreground hover:text-amber-500"
                      title={isPinned ? "Unpin" : "Pin la favorite"}
                    >
                      {isPinned ? "★" : "☆"}
                    </button>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}

        {!enabled && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <SearchIcon className="h-3 w-3" /> Tastează ≥ 2 caractere pentru căutare cross-tabel.
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default AdminGlobalSearch;
