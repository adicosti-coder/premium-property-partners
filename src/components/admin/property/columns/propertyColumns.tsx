import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import type { PropertyRow } from "../hooks/useProperties";

interface Labels {
  active: string;
  inactive: string;
  deleteTitle: string;
  deleteDescription: string;
  cancel: string;
  delete: string;
}

interface Props {
  property: PropertyRow;
  labels: Labels;
  isDeleting: boolean;
  onEdit: (p: PropertyRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (p: PropertyRow) => void;
}

export function PropertyTableRow({
  property,
  labels,
  isDeleting,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  return (
    <TableRow className={!property.is_active ? "opacity-50" : ""}>
      <TableCell className="text-muted-foreground">{property.display_order}</TableCell>
      <TableCell className="font-medium max-w-[200px] truncate">{property.name}</TableCell>
      <TableCell className="text-muted-foreground max-w-[150px] truncate">
        {property.location}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {property.base_price_per_night ? `${property.base_price_per_night}€` : "–"}
      </TableCell>
      <TableCell className="text-muted-foreground">{property.capacity ?? "–"}</TableCell>
      <TableCell className="text-muted-foreground">{property.bedrooms ?? "–"}</TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {property.capital_necesar ? `${property.capital_necesar.toLocaleString()}€` : "–"}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {property.roi_percentage || "–"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {property.contact_name || property.contact_phone ? (
          <div className="text-xs space-y-0.5">
            {property.contact_name && <div className="font-medium">{property.contact_name}</div>}
            {property.contact_phone && (
              <a href={`tel:${property.contact_phone}`} className="text-primary hover:underline">
                {property.contact_phone}
              </a>
            )}
          </div>
        ) : (
          "–"
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {property.source_url ? (
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs max-w-[100px] truncate block"
          >
            {property.source_platform || "Link"}
          </a>
        ) : (
          property.source_platform || "–"
        )}
      </TableCell>
      <TableCell>
        {property.tag && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {property.tag}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(property)}
          className={property.is_active ? "text-green-600" : "text-gray-400"}
        >
          {property.is_active ? (
            <>
              <Eye className="w-4 h-4 mr-1" />
              {labels.active}
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 mr-1" />
              {labels.inactive}
            </>
          )}
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(property)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{labels.deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(property.id)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {labels.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
