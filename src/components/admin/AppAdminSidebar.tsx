import { useNavigate } from "react-router-dom";
import { Pin, PinOff, Star } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ADMIN_GROUPS, ALL_TABS, findTab, type AdminTab } from "./adminNavConfig";

interface Props {
  activeTab: string;
  onSelect: (value: string) => void;
  pinned: string[];
  onTogglePin: (value: string) => void;
  onOpenCommand: () => void;
  counters: { newLeads: number; newScraper: number; hotProspects: number };
}

function getCount(tab: AdminTab, c: Props["counters"]): number {
  if (!tab.badgeKey) return 0;
  return c[tab.badgeKey] ?? 0;
}

export function AppAdminSidebar({
  activeTab, onSelect, pinned, onTogglePin, onOpenCommand, counters,
}: Props) {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleClick = (tab: AdminTab) => {
    if (tab.externalRoute) {
      navigate(tab.externalRoute);
      return;
    }
    onSelect(tab.value);
  };

  const pinnedTabs = pinned.map(findTab).filter(Boolean) as AdminTab[];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          {!collapsed && (
            <span className="font-serif text-sm font-semibold text-sidebar-foreground">
              Admin
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommand}
            className="ml-auto h-7 gap-1 text-xs"
            title="Caută (⌘K)"
          >
            <span>⌘K</span>
            {!collapsed && <span className="hidden md:inline">Caută</span>}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {pinnedTabs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <Star className="mr-1 h-3 w-3" />
              Favorite
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pinnedTabs.map((tab) => {
                  const Icon = tab.icon;
                  const count = getCount(tab, counters);
                  const isActive = activeTab === tab.value;
                  return (
                    <SidebarMenuItem key={`pin-${tab.value}`}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleClick(tab)}
                        tooltip={tab.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{tab.label}</span>
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge>
                          <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                            {count > 99 ? "99+" : count}
                          </Badge>
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {ADMIN_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          // Build ordered chunks: items grouped by `subgroup` (preserving insertion / subgroupOrder)
          const chunks: Array<{ label: string | null; items: AdminTab[] }> = [];
          if (group.items.some((i) => i.subgroup)) {
            const order =
              group.subgroupOrder ??
              Array.from(new Set(group.items.map((i) => i.subgroup ?? "")));
            for (const sg of order) {
              const items = group.items.filter((i) => (i.subgroup ?? "") === sg);
              if (items.length) chunks.push({ label: sg || null, items });
            }
            // Items without any subgroup (defensive)
            const orphan = group.items.filter(
              (i) => !i.subgroup && !order.includes(""),
            );
            if (orphan.length) chunks.unshift({ label: null, items: orphan });
          } else {
            chunks.push({ label: null, items: group.items });
          }

          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel>
                <GroupIcon className="mr-1 h-3 w-3" />
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {chunks.map((chunk, ci) => (
                  <div key={`${group.id}-chunk-${ci}`}>
                    {chunk.label && !collapsed && (
                      <div className="mt-1 px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                        {chunk.label}
                      </div>
                    )}
                    <SidebarMenu>
                      {chunk.items.map((tab) => {
                    const Icon = tab.icon;
                    const count = getCount(tab, counters);
                    const isActive = activeTab === tab.value;
                    const isPinned = pinned.includes(tab.value);
                    return (
                      <SidebarMenuItem key={tab.value} className="group/item">
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleClick(tab)}
                          tooltip={tab.label}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{tab.label}</span>
                        </SidebarMenuButton>
                        {count > 0 && !collapsed && (
                          <SidebarMenuBadge>
                            <Badge
                              variant="destructive"
                              className="h-4 px-1.5 text-[10px]"
                              title={`${count} noi`}
                            >
                              {count > 99 ? "99+" : count}
                            </Badge>
                          </SidebarMenuBadge>
                        )}
                        {!collapsed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(tab.value);
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 transition group-hover/item:opacity-100 hover:bg-sidebar-accent"
                            title={isPinned ? "Scoate din favorite" : "Adaugă la favorite"}
                            aria-label={isPinned ? "Unpin" : "Pin"}
                          >
                            {isPinned ? (
                              <PinOff className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Pin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
                  </div>
                ))}
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">
            {ALL_TABS.length} secțiuni · ⌘K rapid
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
