import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Hotel,
  Edit,
  Star,
  Euro,
  Users,
  Bed,
  Maximize2,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
} from "lucide-react";
import { properties, type Property } from "@/data/properties";
import PropertyBookingsCalendar from "./PropertyBookingsCalendar";

export default function CazareManager() {
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // For now, display all properties from static data
  // In the future, these can be migrated to the database

  const openEdit = (property: Property) => {
    setEditingProperty(property);
    setIsEditOpen(true);
  };

  const activeCount = properties.filter((p) => p.isActive !== false).length;
  const inactiveCount = properties.filter((p) => p.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Hotel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Apartamente Regim Hotelier
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestionare cazare, prețuri, rating-uri și calendar
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Hotel className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{properties.length}</p>
              <p className="text-sm text-muted-foreground">Total Apartamente</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Eye className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {(properties.reduce((sum, p) => sum + p.rating, 0) / properties.length).toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Rating Mediu</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Euro className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {Math.round(properties.filter(p => p.isActive !== false).reduce((sum, p) => sum + p.pricePerNight, 0) / activeCount)} €
              </p>
              <p className="text-sm text-muted-foreground">Preț Mediu/Noapte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apartament</TableHead>
              <TableHead className="hidden md:table-cell">Locație</TableHead>
              <TableHead className="text-center">Rating</TableHead>
              <TableHead className="text-center">Preț/Noapte</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Capacitate</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[80px]">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow
                key={property.id}
                className={property.isActive === false ? "opacity-50" : ""}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-12 h-12 rounded-lg object-cover hidden sm:block"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate max-w-[200px]">
                        {property.name}
                      </p>
                      <p className="text-xs text-muted-foreground md:hidden truncate">
                        {property.location}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {property.location.split(",")[0]}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-sm">{property.rating}</span>
                    <span className="text-xs text-muted-foreground">({property.reviews})</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-sm">{property.pricePerNight} €</span>
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {property.capacity}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {property.isActive === false ? (
                    <Badge variant="secondary" className="text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Inactiv
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                      <Eye className="w-3 h-3 mr-1" />
                      Activ
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(property)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <a
                      href={property.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info banner */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-sm text-foreground">
          <strong>ℹ️ Notă:</strong> Apartamentele în regim hotelier sunt definite în codul sursă ({properties.length} apartamente).
          Pentru a adăuga/modifica/șterge un apartament, editează <code className="bg-muted px-1 rounded text-xs">src/data/properties.ts</code> sau solicită modificarea.
        </p>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-primary" />
              {editingProperty?.name}
            </DialogTitle>
          </DialogHeader>

          {editingProperty && (
            <div className="space-y-6">
              {/* Property Info Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{editingProperty.rating}</p>
                  <p className="text-xs text-muted-foreground">{editingProperty.reviews} recenzii</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Euro className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{editingProperty.pricePerNight} €</p>
                  <p className="text-xs text-muted-foreground">per noapte</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Bed className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{editingProperty.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">dormitoare</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Maximize2 className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{editingProperty.size} m²</p>
                  <p className="text-xs text-muted-foreground">suprafață</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Locație</Label>
                    <p className="text-sm font-medium text-foreground">{editingProperty.location}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Booking URL</Label>
                    <a
                      href={editingProperty.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Deschide <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Facilități</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {editingProperty.amenities.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Check-in / Check-out</Label>
                  <p className="text-sm text-foreground">
                    {editingProperty.checkInTime} – {editingProperty.checkOutTime}
                  </p>
                </div>
              </div>

              {/* Calendar */}
              <PropertyBookingsCalendar
                propertyId={editingProperty.id.toString()}
                propertyName={editingProperty.name}
              />

              {/* Edit notice */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">
                  Pentru a modifica detaliile apartamentului (nume, preț, rating, imagini), solicită modificarea prin chat.
                  Datele sunt stocate în codul sursă pentru performanță optimă.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
