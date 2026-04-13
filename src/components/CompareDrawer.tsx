import { useState } from "react";
import { useCompare, type ComparableItem } from "@/contexts/CompareContext";
import { X, GitCompareArrows, ChevronDown, ChevronUp, MessageCircle, Save, Share2, Link2, Mail, Facebook, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const parseFloor = (floor: number | string): string => {
  if (typeof floor === "string") {
    if (floor === "0" || floor.toLowerCase() === "parter") return "Parter";
    return `Etaj ${floor}`;
  }
  return floor === 0 ? "Parter" : `Etaj ${floor}`;
};

const floorNumber = (floor: number | string): number => {
  if (typeof floor === "number") return floor;
  const n = parseInt(floor, 10);
  return isNaN(n) ? 0 : n;
};

const estimateMonthlyRent = (item: ComparableItem): number => {
  const map: Record<number, number> = { 1: 300, 2: 400, 3: 520 };
  return map[item.rooms] ?? 350;
};

/** Parse Romanian-formatted number like "1.314,18" or "1.350 €" */
const parseRomanianNumber = (str: string): number => {
  const cleaned = str.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

const estimateHotelRevenue = (item: ComparableItem): number => {
  if (item.estimatedRevenue) {
    const parsed = parseRomanianNumber(item.estimatedRevenue);
    if (parsed > 0 && parsed < 100000) return Math.round(parsed);
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

/** Save comparison to DB and return share code */
const saveComparison = async (items: ComparableItem[], sharedVia: string): Promise<string | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    const sessionId = window.sessionStorage.getItem("compare_session") || crypto.randomUUID();
    window.sessionStorage.setItem("compare_session", sessionId);

    const { data, error } = await supabase
      .from("saved_comparisons")
      .insert({
        items: items as any,
        user_id: user?.user?.id || null,
        session_id: sessionId,
        shared_via: [sharedVia],
      })
      .select("share_code")
      .single();

    if (error) throw error;
    return data?.share_code || null;
  } catch (err) {
    console.error("Failed to save comparison:", err);
    return null;
  }
};

const getShareUrl = (code: string) => {
  const base = window.location.origin;
  return `${base}/comparatie/${code}`;
};

const CompareDrawer = () => {
  const { items, remove, clear } = useCompare();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const ensureSaved = async (via: string): Promise<string | null> => {
    if (savedCode) return savedCode;
    setSaving(true);
    const code = await saveComparison(items, via);
    setSaving(false);
    if (code) {
      setSavedCode(code);
      return code;
    }
    toast.error("Nu s-a putut salva comparația");
    return null;
  };

  const handleSave = async () => {
    const code = await ensureSaved("saved");
    if (code) {
      toast.success("Comparație salvată!", { description: "Linkul a fost generat." });
      if (typeof window.gtag === "function") {
        window.gtag("event", "save_comparison", { share_code: code });
      }
    }
  };

  const handleCopyLink = async () => {
    const code = await ensureSaved("link");
    if (!code) return;
    const url = getShareUrl(code);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiat!");
    setTimeout(() => setCopied(false), 2000);
    if (typeof window.gtag === "function") {
      window.gtag("event", "share_comparison", { method: "copy_link", share_code: code });
    }
  };

  const handleWhatsAppShare = async () => {
    const code = await ensureSaved("whatsapp");
    if (!code) return;
    const url = getShareUrl(code);
    const titles = items.map((i) => i.title).join(", ");
    const msg = encodeURIComponent(
      `Comparație proprietăți RealTrust: ${titles}\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    if (typeof window.gtag === "function") {
      window.gtag("event", "share_comparison", { method: "whatsapp", share_code: code });
    }
  };

  const handleFacebookShare = async () => {
    const code = await ensureSaved("facebook");
    if (!code) return;
    const url = getShareUrl(code);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=400");
    if (typeof window.gtag === "function") {
      window.gtag("event", "share_comparison", { method: "facebook", share_code: code });
    }
  };

  const handleEmailShare = async () => {
    const code = await ensureSaved("email");
    if (!code) return;
    const url = getShareUrl(code);
    const titles = items.map((i) => i.title).join(", ");
    const subject = encodeURIComponent("Comparație proprietăți - RealTrust");
    const body = encodeURIComponent(
      `Am comparat aceste proprietăți pe RealTrust:\n\n${titles}\n\nVezi comparația: ${url}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    if (typeof window.gtag === "function") {
      window.gtag("event", "share_comparison", { method: "email", share_code: code });
    }
  };

  const effectiveItems = items.map((item) => ({
    ...item,
    pricePerSqm: item.pricePerSqm > 0 ? item.pricePerSqm : (item.surface > 0 ? Math.round(item.price / item.surface) : 0),
  }));

  const rents = effectiveItems.map(estimateMonthlyRent);
  const rois = effectiveItems.map((l, i) => ((rents[i] * 12) / l.price) * 100);
  const hotelRevs = effectiveItems.map(estimateHotelRevenue);
  const hotelRois = effectiveItems.map((l, i) => ((hotelRevs[i] * 12) / l.price) * 100);

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

  const priceBest = bestIndex(effectiveItems.map((l) => l.price), "min");
  const priceSqmBest = bestIndex(effectiveItems.map((l) => l.pricePerSqm), "min");
  const roiBest = bestIndex(rois, "max");
  const rentBest = bestIndex(rents, "max");
  const surfaceBest = bestIndex(effectiveItems.map((l) => l.surface), "max");
  const hotelRevBest = bestIndex(hotelRevs, "max");
  const hotelRoiBest = bestIndex(hotelRois, "max");

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
      label: "Chirie clasică estimată",
      render: (_l: ComparableItem, idx: number) => (
        <span className={cn("font-semibold", highlight(idx, rentBest))}>
          {rents[idx]} € / lună
        </span>
      ),
    },
    {
      label: "ROI chirie clasică",
      render: (_l: ComparableItem, idx: number) => (
        <span className={cn("font-semibold", highlight(idx, roiBest))}>
          {rois[idx].toFixed(1)}%
        </span>
      ),
    },
    {
      label: "Chirie regim hotelier",
      render: (_l: ComparableItem, idx: number) => (
        <span className={cn("font-semibold text-primary", highlight(idx, hotelRevBest))}>
          {hotelRevs[idx].toLocaleString("ro-RO")} € / lună
        </span>
      ),
    },
    {
      label: "ROI regim hotelier",
      render: (_l: ComparableItem, idx: number) => (
        <span className={cn("font-bold text-primary", highlight(idx, hotelRoiBest))}>
          {hotelRois[idx].toFixed(1)}%
        </span>
      ),
    },
    {
      label: "Recomandat",
      render: (l: ComparableItem) =>
        l.badge === "administrare" || l.badge === "investitie" ? (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-amber-500">✓</span>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] leading-tight whitespace-normal">
                Administrare RealTrust‑ApArt Hotel
              </Badge>
            </div>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">Standard</Badge>
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-foreground text-lg">
                Analiză comparativă investiții
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Save */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1.5 text-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
                  {savedCode ? "Salvat" : "Salvează"}
                </Button>

                {/* Share dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={saving}>
                      <Share2 className="w-3.5 h-3.5" />
                      Partajează
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                      Copiază linkul
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleWhatsAppShare} className="gap-2">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleFacebookShare} className="gap-2">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEmailShare} className="gap-2">
                      <Mail className="w-4 h-4 text-orange-500" />
                      Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear */}
                <button
                  onClick={() => { clear(); setExpanded(false); setSavedCode(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Șterge tot
                </button>
              </div>
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
                            onClick={() => { remove(item.id); setSavedCode(null); }}
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
