import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { ComparableItem } from "@/contexts/CompareContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, GitCompareArrows } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const parseFloor = (floor: number | string): string => {
  if (typeof floor === "string") {
    if (floor === "0" || floor.toLowerCase() === "parter") return "Parter";
    return `Etaj ${floor}`;
  }
  return floor === 0 ? "Parter" : `Etaj ${floor}`;
};

const estimateMonthlyRent = (item: ComparableItem): number => {
  const map: Record<number, number> = { 1: 300, 2: 400, 3: 520 };
  return map[item.rooms] ?? 350;
};

const estimateHotelRevenue = (item: ComparableItem): number => {
  if (item.estimatedRevenue) {
    const parsed = parseInt(item.estimatedRevenue.replace(/[^\d]/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const map: Record<number, number> = { 1: 1350, 2: 1800, 3: 2250 };
  return map[item.rooms] ?? 1500;
};

const bestIndex = (values: number[], mode: "min" | "max"): number => {
  if (values.length === 0) return -1;
  let bestIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (mode === "min" ? values[i] < values[bestIdx] : values[i] > values[bestIdx]) bestIdx = i;
  }
  return bestIdx;
};

const SharedComparison = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [items, setItems] = useState<ComparableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shareCode) return;
    const load = async () => {
      const { data } = await supabase
        .rpc("get_shared_comparison", { p_share_code: shareCode });
      const row = Array.isArray(data) ? data[0] : null;
      if (row?.items) {
        setItems(row.items as unknown as ComparableItem[]);
      } else {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [shareCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Comparația nu a fost găsită sau a expirat.</p>
        <Link to="/cartiere">
          <Button><ArrowLeft className="w-4 h-4 mr-2" />Înapoi la proprietăți</Button>
        </Link>
      </div>
    );
  }

  const rents = items.map(estimateMonthlyRent);
  const rois = items.map((l, i) => ((rents[i] * 12) / l.price) * 100);
  const hotelRevs = items.map(estimateHotelRevenue);
  const hotelRois = items.map((l, i) => ((hotelRevs[i] * 12) / l.price) * 100);

  const priceBest = bestIndex(items.map((l) => l.price), "min");
  const priceSqmBest = bestIndex(items.map((l) => l.pricePerSqm), "min");
  const roiBest = bestIndex(rois, "max");
  const rentBest = bestIndex(rents, "max");
  const surfaceBest = bestIndex(items.map((l) => l.surface), "max");
  const hotelRevBest = bestIndex(hotelRevs, "max");
  const hotelRoiBest = bestIndex(hotelRois, "max");

  const highlight = (idx: number, bestIdx: number) =>
    idx === bestIdx ? "text-green-600 font-bold" : "";

  const rows = [
    { label: "Preț", render: (l: ComparableItem, idx: number) => <span className={highlight(idx, priceBest)}>{l.price.toLocaleString("ro-RO")} €</span> },
    { label: "Preț/mp", render: (l: ComparableItem, idx: number) => <span className={highlight(idx, priceSqmBest)}>{l.pricePerSqm.toLocaleString("ro-RO")} €/mp</span> },
    { label: "Suprafață", render: (l: ComparableItem, idx: number) => <span className={highlight(idx, surfaceBest)}>{l.surface} mp</span> },
    { label: "Etaj", render: (l: ComparableItem) => parseFloor(l.floor) },
    { label: "Camere", render: (l: ComparableItem) => `${l.rooms}` },
    { label: "Chirie clasică", render: (_l: ComparableItem, idx: number) => <span className={cn("font-semibold", highlight(idx, rentBest))}>{rents[idx]} € / lună</span> },
    { label: "ROI clasic", render: (_l: ComparableItem, idx: number) => <span className={cn("font-semibold", highlight(idx, roiBest))}>{rois[idx].toFixed(1)}%</span> },
    { label: "Chirie regim hotelier", render: (_l: ComparableItem, idx: number) => <span className={cn("font-semibold text-primary", highlight(idx, hotelRevBest))}>{hotelRevs[idx].toLocaleString("ro-RO")} € / lună</span> },
    { label: "ROI regim hotelier", render: (_l: ComparableItem, idx: number) => <span className={cn("font-bold text-primary", highlight(idx, hotelRoiBest))}>{hotelRois[idx].toFixed(1)}%</span> },
    {
      label: "Recomandat",
      render: (l: ComparableItem) =>
        l.badge === "administrare" || l.badge === "investitie" ? (
          <div className="flex items-center gap-1">
            <span className="text-amber-500">✓</span>
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] leading-tight whitespace-normal">
              Administrare RealTrust‑ApArt Hotel
            </Badge>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">Standard</Badge>
        ),
    },
  ];

  const openWhatsApp = (item: ComparableItem) => {
    const msg = encodeURIComponent(
      `Bună ziua, sunt interesat de proprietatea "${item.title}" văzută pe realtrust.ro`
    );
    window.open(`https://wa.me/40744488844?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center gap-3 mb-6">
          <GitCompareArrows className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Comparație proprietăți
          </h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Această comparație a fost partajată de pe realtrust.ro
        </p>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px] sticky left-0 z-10 bg-card">Criteriu</TableHead>
                {items.map((item) => (
                  <TableHead key={item.id} className="min-w-[160px]">
                    <span className="text-xs font-medium">{item.title}</span>
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
              <TableRow>
                <TableCell className="sticky left-0 z-10 bg-card" />
                {items.map((item) => (
                  <TableCell key={item.id}>
                    <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => openWhatsApp(item)}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      Rezervă Vizionare
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="mt-8 text-center">
          <Link to="/cartiere">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Vezi toate proprietățile
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SharedComparison;
