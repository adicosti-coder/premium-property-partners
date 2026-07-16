import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Plus,
  Loader2,
  Home,
  MapPin,
  Eye,
  EyeOff,
  GripVertical,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";
import { AdminPagination } from "./shared/AdminPagination";
import { AdminPageShell } from "./shared/AdminPageShell";
import {
  useProperties,
  type PropertyRow,
  type PropertyStatusFilter,
} from "./property/hooks/useProperties";
import { PropertyTableRow } from "./property/columns/propertyColumns";
import { PropertyEditor } from "./property/dialogs/PropertyEditor";

export default function PropertyManager() {
  const { t } = useLanguage();

  // Filters (server-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterListingType, setFilterListingType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<PropertyStatusFilter>("all");
  const [showFilters, setShowFilters] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const {
    rows,
    total,
    pageCount,
    isLoading,
    isFetching,
    stats,
    refetch,
    deleteProperty,
    isDeletingId,
    toggleActive,
  } = useProperties({
    page,
    pageSize,
    search: searchTerm,
    listingType: filterListingType,
    status: filterStatus,
  });

  const hasActiveFilters =
    Boolean(searchTerm) || filterListingType !== "all" || filterStatus !== "all";

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterListingType("all");
    setFilterStatus("all");
    setPage(0);
  }, []);

  const openAdd = () => {
    setEditorMode("add");
    setEditingId(undefined);
    setEditorOpen(true);
  };

  const openEdit = (p: PropertyRow) => {
    setEditorMode("edit");
    setEditingId(p.id);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProperty(id);
      toast({ title: t.admin.properties?.deleteSuccess || "Property deleted!" });
    } catch (err) {
      console.error("Error deleting property:", err);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.deleteError || "Could not delete property",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (p: PropertyRow) => {
    try {
      await toggleActive({ id: p.id, is_active: p.is_active });
      toast({
        title: p.is_active
          ? t.admin.properties?.deactivated || "Property deactivated"
          : t.admin.properties?.activated || "Property activated",
      });
    } catch (err) {
      console.error("Error toggling property:", err);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.toggleError || "Could not update property",
        variant: "destructive",
      });
    }
  };

  const rowLabels = {
    active: t.admin.properties?.active || "Active",
    inactive: t.admin.properties?.inactive || "Inactive",
    deleteTitle: t.admin.properties?.deleteProperty || "Delete property?",
    deleteDescription: t.admin.properties?.deleteDescription || "This action cannot be undone.",
    cancel: t.admin.cancel,
    delete: t.admin.delete,
  };

  const statsBlock = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Home className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">
              {t.admin.properties?.totalProperties || "Total Properties"}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Eye className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">{stats.active}</p>
            <p className="text-sm text-muted-foreground">
              {t.admin.properties?.activeProperties || "Active"}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-500/10">
            <EyeOff className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">{stats.inactive}</p>
            <p className="text-sm text-muted-foreground">
              {t.admin.properties?.inactiveProperties || "Inactive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const filtersBlock = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Caută după nume, locație, etichetă, sursă..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" /> {showFilters ? "Ascunde filtre" : "Arată filtre"}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Resetează
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg border border-border">
          <div>
            <Label className="text-xs mb-1">Tip listing</Label>
            <Select
              value={filterListingType}
              onValueChange={(v) => {
                setFilterListingType(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="vanzare">🏠 Vânzare</SelectItem>
                <SelectItem value="inchiriere">📋 Închiriere</SelectItem>
                <SelectItem value="investitie">📈 Investiție</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1">Status</Label>
            <Select
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v as PropertyStatusFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <AdminPageShell
        icon={Home}
        title={t.admin.properties?.title || "Properties Management"}
        actions={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {t.admin.properties?.addProperty || "Add Property"}
          </Button>
        }
        stats={statsBlock}
        filters={filtersBlock}
      >
        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Home className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t.admin.properties?.noProperties || "No properties yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t.admin.properties?.noPropertiesDescription ||
                  "Add your first property to get started"}
              </p>
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" />
                {t.admin.properties?.addProperty || "Add Property"}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <GripVertical className="w-4 h-4" />
                    </TableHead>
                    <TableHead>
                      <Home className="w-4 h-4 inline mr-1" />
                      {t.admin.properties?.name || "Name"}
                    </TableHead>
                    <TableHead>
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {t.admin.properties?.location || "Location"}
                    </TableHead>
                    <TableHead>Preț/n</TableHead>
                    <TableHead>Cap.</TableHead>
                    <TableHead>Dorm.</TableHead>
                    <TableHead>Capital</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Sursă</TableHead>
                    <TableHead>{t.admin.properties?.tag || "Tag"}</TableHead>
                    <TableHead>{t.admin.properties?.status || "Status"}</TableHead>
                    <TableHead className="w-[120px]">{t.admin.tableHeaders.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((property) => (
                    <PropertyTableRow
                      key={property.id}
                      property={property}
                      labels={rowLabels}
                      isDeleting={isDeletingId === property.id}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="border-t border-border">
            <AdminPagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(s) => {
                setPageSize(s);
                setPage(0);
              }}
              isFetching={isFetching}
            />
          </div>
        </div>
      </AdminPageShell>

      <PropertyEditor
        open={editorOpen}
        mode={editorMode}
        propertyId={editingId}
        onOpenChange={setEditorOpen}
        onSaved={refetch}
      />
    </>
  );
}
