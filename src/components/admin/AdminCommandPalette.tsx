import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_GROUPS } from "./adminNavConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
  pinned: string[];
  onTogglePin: (value: string) => void;
}

export function AdminCommandPalette({
  open, onOpenChange, onSelect, pinned, onTogglePin,
}: Props) {
  const navigate = useNavigate();

  // Global ⌘K / Ctrl+K shortcut
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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Caută secțiune... (Enter pentru a deschide)" />
      <CommandList>
        <CommandEmpty>Nicio secțiune găsită.</CommandEmpty>
        {ADMIN_GROUPS.map((group, idx) => (
          <div key={group.id}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((tab) => {
                const Icon = tab.icon;
                const isPinned = pinned.includes(tab.value);
                return (
                  <CommandItem
                    key={tab.value}
                    value={`${tab.label} ${tab.keywords?.join(" ") ?? ""} ${group.label} ${tab.subgroup ?? ""}`}
                    onSelect={() => {
                      onOpenChange(false);
                      if (tab.externalRoute) {
                        navigate(tab.externalRoute);
                      } else {
                        onSelect(tab.value);
                      }
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
      </CommandList>
    </CommandDialog>
  );
}
