import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PropertySort, PropertySortColumn } from "./propertySort";

interface SortableTableHeadProps {
  column: PropertySortColumn;
  sort: PropertySort;
  onSort: (column: PropertySortColumn) => void;
  /** Text folosit în eticheta accesibilă (ex. „Nume”). */
  label: string;
  children: ReactNode;
  className?: string;
}

export function SortableTableHead({ column, sort, onSort, label, children, className }: SortableTableHeadProps) {
  const active = sort.column === column;
  const Icon = !active ? ArrowUpDown : sort.ascending ? ArrowUp : ArrowDown;
  const nextLabel = active
    ? sort.ascending
      ? "descrescător"
      : "crescător"
    : "crescător sau descrescător";

  return (
    <TableHead
      className={cn("p-0", className)}
      aria-sort={active ? (sort.ascending ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Sortează după ${label}, ${nextLabel}`}
        className={cn(
          "inline-flex min-h-12 w-full items-center gap-1 whitespace-nowrap px-4 text-left font-medium transition-colors",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "opacity-50")}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}
