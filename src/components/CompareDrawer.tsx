import { useCompare } from "@/contexts/CompareContext";
import { X, GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CompareDrawer = () => {
  const { items, remove, clear } = useCompare();
  const isOpen = items.length > 0;

  if (!isOpen) return null;

  const rows = [
    { label: "Preț", render: (l: typeof items[0]) => `${l.price.toLocaleString("ro-RO")} €` },
    { label: "Preț/mp", render: (l: typeof items[0]) => `${l.pricePerSqm.toLocaleString("ro-RO")} €/mp` },
    { label: "Suprafață", render: (l: typeof items[0]) => `${l.surface} mp` },
    { label: "Etaj", render: (l: typeof items[0]) => l.floor === 0 ? "Parter" : `Etaj ${l.floor}` },
    { label: "Camere", render: (l: typeof items[0]) => `${l.rooms}` },
    {
      label: "Administrare RealTrust",
      render: (l: typeof items[0]) =>
        l.badge === "administrare" ? (
          <Badge className="bg-primary text-primary-foreground text-xs">Da</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Nu</Badge>
        ),
    },
  ];

  return (
    <>
      {/* Sticky pill */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <GitCompareArrows className="w-4 h-4" />
          Compară ({items.length}/3)
        </div>
      </div>

      {/* Desktop sticky pill */}
      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <GitCompareArrows className="w-4 h-4" />
          Compară ({items.length}/3)
        </div>
      </div>

      {/* Drawer */}
      {items.length >= 2 && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-card border-t border-border shadow-2xl rounded-t-2xl max-h-[60vh] overflow-auto animate-in slide-in-from-bottom duration-300">
          <div className="overflow-x-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">
                Comparație proprietăți
              </h3>
              <button
                onClick={clear}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Șterge tot
              </button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Criteriu</TableHead>
                    {items.map((item) => (
                      <TableHead key={item.id} className="min-w-[150px]">
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
                      <TableCell className="font-medium text-muted-foreground text-sm">
                        {row.label}
                      </TableCell>
                      {items.map((item) => (
                        <TableCell key={item.id} className="text-sm">
                          {row.render(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
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
