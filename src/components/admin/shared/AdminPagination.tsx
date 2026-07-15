import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";

interface Props {
  page: number;               // 0-indexed
  pageCount: number;
  total: number;
  pageSize: PageSize;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
  isFetching?: boolean;
}

export const AdminPagination = ({ page, pageCount, total, pageSize, onPage, onPageSize, isFetching }: Props) => {
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-3 px-1 text-xs">
      <div className="text-muted-foreground">
        {total === 0 ? "0 rezultate" : `${first}–${last} din ${total}`}
        {isFetching && <span className="ml-2 text-primary animate-pulse">actualizare…</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Pe pagină:</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v) as PageSize)}>
          <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onPage(0)} disabled={page === 0} aria-label="Prima pagină">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Pagina anterioară">
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="min-w-[70px] text-center">
          {page + 1} / {pageCount}
        </span>
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} aria-label="Pagina următoare">
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onPage(pageCount - 1)} disabled={page >= pageCount - 1} aria-label="Ultima pagină">
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default AdminPagination;
