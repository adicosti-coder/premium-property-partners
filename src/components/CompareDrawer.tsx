import { useState } from "react";
import { useCompare, type ComparableItem } from "@/contexts/CompareContext";
import { X, GitCompareArrows, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Parse floor to display string */
const parseFloor = (floor: number | string): string => {
  if (typeof floor === "string") {
    if (floor === "0" || floor.toLowerCase() === "parter") return "Parter";
    return `Etaj ${floor}`;
  }
  return floor === 0 ? "Parter" : `Etaj ${floor}`;
};

/** Parse floor to number for comparison */
const floorNumber = (floor: number | string): number => {
  if (typeof floor === "number") return floor;
  const n = parseInt(floor, 10);
  return isNaN(n) ? 0 : n;
};

/** Estimate monthly rent (classic) based on room count */
const estimateMonthlyRent = (item: ComparableItem): number => {
  const map: Record<number, number> = { 1: 300, 2: 400, 3: 520 };
  return map[item.rooms] ?? 350;
};

/** Estimate monthly revenue in hotel regime based on room count */
const estimateHotelRevenue = (item: ComparableItem): number => {
  if (item.estimatedRevenue) {
    const parsed = parseInt(item.estimatedRevenue.replace(/[^\d]/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Fallback: Timișoara market averages
  const map: Record<number, number> = { 1: 1350, 2: 1800, 3: 2250 };
  return map[item.rooms] ?? 1500;
};

/** Find the best (min or max) value index among items */
const bestIndex = (values: number[], mode: "min" | "max"): number => {
  if (values.length === 0) return -1;
  let bestIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (mode === "min" ? values[i] < values[bestIdx] : values[i] > values[bestIdx]) {
      bestIdx = i;
    }
  }
  return bestIdx;
};

const CompareDrawer = () => {
  const { items, remove, clear } = useCompare();
  const [expanded, setExpanded] = useState(false);
  const isOpen = items.length > 0;

  if (!isOpen) return null;

  const canCompare = items.length >= 2;

  const handleToggle = () => {
    if (!canCompare) return;
    const next = !expanded;
    setExpanded(next);
    if (next && typeof window.gtag === "function") {
      window.gtag("event", "view_comparison", {
        items_count: items.length,
        page_path: window.location.pathname,
      });
    }
  };

  const rents = items.map(estimateMonthlyRent);
  const rois = items.map((l, i) => ((rents[i] * 12) / l.price) * 100);

  const openWhatsApp = (item: ComparableItem) => {
    const msg = encodeURIComponent(
      `Bună ziua, sunt interesat de proprietatea "${item.title}" văzută pe realtrust.ro`
    );
    window.open(`https://wa.me/40744488844?text=${msg}`, "_blank");
    if (typeof window.gtag === "function") {
      window.gtag("event", "contact_click", {
        method: "whatsapp",
        property_name: item.title,
        page_path: window.location.pathname,
      });
    }
  };

  // Highlight helpers per row
  const priceBest = bestIndex(items.map((l) => l.price), "min");
  const priceSqmBest = bestIndex(items.map((l) => l.pricePerSqm), "min");
  const roiBest = bestIndex(rois, "max");
  const rentBest = bestIndex(rents, "max");
  const surfaceBest = bestIndex(items.map((l) => l.surface), "max");

  const highlight = (idx: number, bestIdx: number) =>
    idx === bestIdx ? "text-green-600 font-bold" : "";

  const rows = [
    {
      label: "Preț",
      render: (l: ComparableItem, idx: number) => (
        <span className={highlight(idx, priceBest)}>
          {l.price.toLocaleString("ro-RO")} €
        </span>
      ),
    },
    {
      label: "Preț/mp",
      render: (l: ComparableItem, idx: number) => (
        <span className={highlight(idx, priceSqmBest)}>
          {l.pricePerSqm.toLocaleString("ro-RO")} €/mp
        </span>
      ),
    },
    {
      label: "Suprafață",
      render: (l: ComparableItem, idx: number) => (
        <span className={highlight(idx, surfaceBest)}>{l.surface} mp</span>
      ),
    },
    {
      label: "Etaj",
      render: (l: ComparableItem) => parseFloor(l.floor),
    },
    { label: "Camere", render: (l: ComparableItem) => `${l.rooms}` },
    {
      label: "Venit lunar estimat",
      render: (_l: ComparableItem, idx: number) => (
        <span className={cn("font-semibold", highlight(idx, rentBest))}>
          {rents[idx]} € / lună
        </span>
      ),
    },
    {
      label: "Randament anual (ROI)",
      render: (_l: ComparableItem, idx: number) => (
        <span className={cn("font-semibold", highlight(idx, roiBest))}>
          {rois[idx].toFixed(1)}%
        </span>
      ),
    },
    {
      label: "Administrare RealTrust",
      render: (l: ComparableItem) =>
        l.badge === "administrare" || l.badge === "investitie" ? (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-amber-500">✓</span>
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-xs">Da</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              Management Complet Inclus
            </p>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">Nu</Badge>
        ),
    },
  ];

  return (
    <>
      {/* Sticky pill */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-[60] transition-all",
          expanded ? "bottom-[calc(60vh+8px)] md:bottom-[calc(60vh+8px)]" : "bottom-[70px] md:bottom-6",
          "bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-lg",
          "flex items-center gap-2 text-sm font-medium",
          !canCompare && "opacity-70 cursor-default"
        )}
        aria-label={expanded ? "Închide comparație" : "Deschide comparație"}
      >
        <GitCompareArrows className="w-4 h-4" />
        Compară ({items.length}/3)
        {canCompare && (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)}
      </button>

      {/* Comparison Table Drawer */}
      {expanded && canCompare && (
        <div className="fixed inset-x-0 bottom-0 z-[55] bg-card border-t border-border shadow-2xl rounded-t-2xl max-h-[60vh] overflow-auto animate-in slide-in-from-bottom duration-300 pb-[70px] md:pb-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">
                Analiză comparativă investiții
              </h3>
              <button
                onClick={() => { clear(); setExpanded(false); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Șterge tot
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[110px] sticky left-0 z-10 bg-card">Criteriu</TableHead>
                    {items.map((item) => (
                      <TableHead key={item.id} className="min-w-[140px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="line-clamp-1 text-xs">{item.title}</span>
                          <button
                            onClick={() => remove(item.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium text-muted-foreground text-sm sticky left-0 z-10 bg-card">
                        {row.label}
                      </TableCell>
                      {items.map((item, idx) => (
                        <TableCell key={item.id} className="text-sm">
                          {row.render(item, idx)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* CTA Row */}
                  <TableRow>
                    <TableCell className="sticky left-0 z-10 bg-card" />
                    {items.map((item) => (
                      <TableCell key={item.id}>
                        <Button
                          size="sm"
                          className="w-full gap-1.5 text-xs"
                          onClick={() => openWhatsApp(item)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Rezervă Vizionare
                        </Button>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompareDrawer;
