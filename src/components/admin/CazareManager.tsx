import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Hotel, Edit, Star, Euro, Users, Bed, Maximize2, ExternalLink,
  Eye, EyeOff, Calendar, MapPin, Plus, Save, Loader2, Trash2, Bath,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import PropertyBookingsCalendar from "./PropertyBookingsCalendar";

import PropertyPremiumFields, { PremiumFieldsData, defaultPremiumFields } from "./PropertyPremiumFields";

interface CazareProperty extends PremiumFieldsData {
  id: string;
  name: string;
  slug: string | null;
  location: string;
  description_ro: string;
  description_en: string;
  booking_url: string;
  features: string[];
  image_path: string | null;
  images: string[];
  is_active: boolean;
  booking_rating: number | null;
  booking_review_count: number | null;
  base_price_per_night: number | null;
  weekend_price_per_night: number | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  amenities: string[];
  amenities_en: string[];
  house_rules: string[];
  house_rules_en: string[];
  check_in_time: string;
  check_out_time: string;
  display_order: number;
}

const emptyProperty: Omit<CazareProperty, "id"> = {
  ...defaultPremiumFields,
  name: "",
  slug: "",
  location: "",
  description_ro: "",
  description_en: "",
  booking_url: "",
  features: [],
  image_path: null,
  images: [],
  is_active: true,
  booking_rating: null,
  booking_review_count: null,
  base_price_per_night: null,
  weekend_price_per_night: null,
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  size: 40,
  amenities: [],
  amenities_en: [],
  house_rules: [],
  house_rules_en: [],
  check_in_time: "15:00",
  check_out_time: "11:00",
  display_order: 0,
};

export default function CazareManager() {
  const [properties, setProperties] = useState<CazareProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingProperty, setEditingProperty] = useState<CazareProperty | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [calendarPropertyId, setCalendarPropertyId] = useState<string | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("listing_type", "cazare")
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
    } else {
      setProperties((data || []).map((d: any) => ({
        ...d,
        capacity: d.capacity ?? 2,
        bedrooms: d.bedrooms ?? 1,
        bathrooms: d.bathrooms ?? 1,
        size: d.size ?? 40,
        amenities: d.amenities ?? [],
        amenities_en: d.amenities_en ?? [],
        house_rules: d.house_rules ?? [],
        house_rules_en: d.house_rules_en ?? [],
        check_in_time: d.check_in_time ?? "15:00",
        check_out_time: d.check_out_time ?? "11:00",
        images: d.images ?? [],
        features: d.features ?? [],
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, []);

  const openEdit = (property: CazareProperty) => {
    setEditingProperty({ ...property });
    setIsNew(false);
    setIsEditOpen(true);
  };

  const openNew = () => {
    setEditingProperty({ ...emptyProperty, id: "" } as CazareProperty);
    setIsNew(true);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingProperty) return;
    setSaving(true);

    const payload: any = {
      name: editingProperty.name,
      slug: editingProperty.slug || null,
      location: editingProperty.location,
      description_ro: editingProperty.description_ro,
      description_en: editingProperty.description_en,
      long_description_ro: editingProperty.long_description_ro,
      long_description_en: editingProperty.long_description_en,
      booking_url: editingProperty.booking_url,
      features: editingProperty.features,
      image_path: editingProperty.image_path,
      images: editingProperty.images,
      is_active: editingProperty.is_active,
      booking_rating: editingProperty.booking_rating,
      booking_review_count: editingProperty.booking_review_count,
      base_price_per_night: editingProperty.base_price_per_night,
      weekend_price_per_night: editingProperty.weekend_price_per_night,
      capacity: editingProperty.capacity,
      bedrooms: editingProperty.bedrooms,
      bathrooms: editingProperty.bathrooms,
      size: editingProperty.size,
      amenities: editingProperty.amenities,
      amenities_en: editingProperty.amenities_en,
      house_rules: editingProperty.house_rules,
      house_rules_en: editingProperty.house_rules_en,
      check_in_time: editingProperty.check_in_time,
      check_out_time: editingProperty.check_out_time,
      display_order: editingProperty.display_order,
      listing_type: "cazare",
      tag: "Cazare",
      // Premium fields
      balconies: editingProperty.balconies,
      terrace_area: editingProperty.terrace_area,
      has_storage: editingProperty.has_storage,
      has_cellar: editingProperty.has_cellar,
      has_elevator: editingProperty.has_elevator,
      has_ac: editingProperty.has_ac,
      orientation: editingProperty.orientation,
      view_type: editingProperty.view_type,
      intercom_type: editingProperty.intercom_type,
      usable_area: editingProperty.usable_area,
      built_area: editingProperty.built_area,
      land_area: editingProperty.land_area,
      price_per_sqm: editingProperty.price_per_sqm,
      annual_tax: editingProperty.annual_tax,
      monthly_maintenance: editingProperty.monthly_maintenance,
      renovation_year: editingProperty.renovation_year,
      property_condition: editingProperty.property_condition,
      total_building_floors: editingProperty.total_building_floors,
      apartments_in_building: editingProperty.apartments_in_building,
      floor: editingProperty.floor,
      parking: editingProperty.parking,
      heating_type: editingProperty.heating_type,
      energy_class: editingProperty.energy_class,
      furnished: editingProperty.furnished,
      construction_type: editingProperty.construction_type,
      compartimentare: editingProperty.compartimentare,
    };

    let error;
    if (isNew) {
      const res = await supabase.from("properties").insert(payload);
      error = res.error;
    } else {
      const res = await supabase.from("properties").update(payload).eq("id", editingProperty.id);
      error = res.error;
    }

    if (error) {
      toast({ title: "Eroare la salvare", description: error.message, variant: "destructive" });
    } else {
      setSaveSuccess(true);
      toast({ title: isNew ? "✅ Apartament adăugat cu succes!" : "✅ Apartament actualizat cu succes!" });
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditOpen(false);
        fetchProperties();
      }, 1200);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur vrei să ștergi acest apartament?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      toast({ title: "Eroare la ștergere", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Apartament șters" });
      fetchProperties();
    }
  };

  const updateField = <K extends keyof CazareProperty>(key: K, value: CazareProperty[K]) => {
    if (!editingProperty) return;
    setEditingProperty({ ...editingProperty, [key]: value });
  };

  const activeCount = properties.filter((p) => p.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Hotel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Apartamente Regim Hotelier</h2>
            <p className="text-sm text-muted-foreground">Gestionare cazare, prețuri, rating-uri și calendar</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Adaugă
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Hotel className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-xl font-semibold text-foreground">{properties.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Eye className="w-4 h-4 text-green-600" /></div>
            <div>
              <p className="text-xl font-semibold text-foreground">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Star className="w-4 h-4 text-amber-500" /></div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {properties.length > 0 ? (properties.reduce((s, p) => s + (p.booking_rating || 0), 0) / properties.length).toFixed(1) : "–"}
              </p>
              <p className="text-sm text-muted-foreground">Rating Mediu</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Euro className="w-4 h-4 text-blue-500" /></div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {activeCount > 0 ? Math.round(properties.filter(p => p.is_active).reduce((s, p) => s + (p.base_price_per_night || 0), 0) / activeCount) : 0} €
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
              <TableHead className="w-[120px]">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id} className={!property.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {property.image_path && (
                      <img src={property.image_path} alt={property.name} className="w-12 h-12 rounded-lg object-cover hidden sm:block" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate max-w-[200px]">{property.name}</p>
                      <p className="text-xs text-muted-foreground md:hidden truncate">{property.location}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{property.location.split(",")[0]}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-sm">{property.booking_rating ?? "–"}</span>
                    <span className="text-xs text-muted-foreground">({property.booking_review_count ?? 0})</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-sm">{property.base_price_per_night ?? "–"} €</span>
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />{property.capacity}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {!property.is_active ? (
                    <Badge variant="secondary" className="text-xs"><EyeOff className="w-3 h-3 mr-1" />Inactiv</Badge>
                  ) : (
                    <Badge className="text-xs bg-green-500/10 text-green-700 border-green-500/30"><Eye className="w-3 h-3 mr-1" />Activ</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(property)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setCalendarPropertyId(property.id)}><Calendar className="w-4 h-4" /></Button>
                    <a href={property.booking_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Calendar Dialog */}
      <Dialog open={!!calendarPropertyId} onOpenChange={() => setCalendarPropertyId(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Calendar Rezervări
            </DialogTitle>
          </DialogHeader>
          {calendarPropertyId && (
            <PropertyBookingsCalendar
              propertyId={calendarPropertyId}
              propertyName={properties.find(p => p.id === calendarPropertyId)?.name || ""}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Add Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hotel className="w-5 h-5 text-primary" />
              {isNew ? "Adaugă Apartament" : "Editează Apartament"}
            </DialogTitle>
          </DialogHeader>

          {editingProperty && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Informații Generale</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nume</Label>
                    <Input value={editingProperty.name} onChange={(e) => updateField("name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input value={editingProperty.slug || ""} onChange={(e) => updateField("slug", e.target.value)} placeholder="apartament-slug" />
                  </div>
                  <div>
                    <Label>Locație</Label>
                    <Input value={editingProperty.location} onChange={(e) => updateField("location", e.target.value)} />
                  </div>
                  <div>
                    <Label>Booking URL</Label>
                    <Input value={editingProperty.booking_url} onChange={(e) => updateField("booking_url", e.target.value)} />
                  </div>
                  <div>
                    <Label>Imagine Principală (URL)</Label>
                    <Input value={editingProperty.image_path || ""} onChange={(e) => updateField("image_path", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={editingProperty.is_active} onCheckedChange={(v) => updateField("is_active", v)} />
                    <Label>Activ</Label>
                  </div>
                  <div>
                    <Label>Ordine afișare</Label>
                    <Input type="number" value={editingProperty.display_order} onChange={(e) => updateField("display_order", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Specificații</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><Users className="w-3 h-3" />Capacitate</Label>
                    <Input type="number" value={editingProperty.capacity} onChange={(e) => updateField("capacity", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Bed className="w-3 h-3" />Dormitoare</Label>
                    <Input type="number" value={editingProperty.bedrooms} onChange={(e) => updateField("bedrooms", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Bath className="w-3 h-3" />Băi</Label>
                    <Input type="number" value={editingProperty.bathrooms} onChange={(e) => updateField("bathrooms", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Maximize2 className="w-3 h-3" />Suprafață (m²)</Label>
                    <Input type="number" value={editingProperty.size} onChange={(e) => updateField("size", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Pricing & Rating */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Prețuri & Rating</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><Euro className="w-3 h-3" />Preț/Noapte (€)</Label>
                    <Input type="number" value={editingProperty.base_price_per_night ?? ""} onChange={(e) => updateField("base_price_per_night", e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>Preț Weekend (€)</Label>
                    <Input type="number" value={editingProperty.weekend_price_per_night ?? ""} onChange={(e) => updateField("weekend_price_per_night", e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Star className="w-3 h-3" />Rating</Label>
                    <Input type="number" step="0.1" value={editingProperty.booking_rating ?? ""} onChange={(e) => updateField("booking_rating", e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>Nr. Recenzii</Label>
                    <Input type="number" value={editingProperty.booking_review_count ?? ""} onChange={(e) => updateField("booking_review_count", e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                </div>
              </div>

              {/* Check-in/out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in</Label>
                  <Input value={editingProperty.check_in_time} onChange={(e) => updateField("check_in_time", e.target.value)} />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <Input value={editingProperty.check_out_time} onChange={(e) => updateField("check_out_time", e.target.value)} />
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Descrieri Scurte</h3>
                <div>
                  <Label>Descriere scurtă (RO)</Label>
                  <Textarea value={editingProperty.description_ro} onChange={(e) => updateField("description_ro", e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Descriere scurtă (EN)</Label>
                  <Textarea value={editingProperty.description_en} onChange={(e) => updateField("description_en", e.target.value)} rows={2} />
                </div>
              </div>

              {/* Premium Fields */}
              <PropertyPremiumFields
                data={editingProperty}
                onChange={(key, value) => updateField(key, value as any)}
              />

              {/* Features & Amenities */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Facilități</h3>
                <div>
                  <Label>Features (separate prin virgulă)</Label>
                  <Input value={editingProperty.features.join(", ")} onChange={(e) => updateField("features", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
                </div>
                <div>
                  <Label>Amenities RO (separate prin virgulă)</Label>
                  <Textarea value={editingProperty.amenities.join(", ")} onChange={(e) => updateField("amenities", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} rows={2} />
                </div>
                <div>
                  <Label>Amenities EN (separate prin virgulă)</Label>
                  <Textarea value={editingProperty.amenities_en.join(", ")} onChange={(e) => updateField("amenities_en", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} rows={2} />
                </div>
                <div>
                  <Label>Reguli RO (separate prin virgulă)</Label>
                  <Input value={editingProperty.house_rules.join(", ")} onChange={(e) => updateField("house_rules", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
                </div>
                <div>
                  <Label>Reguli EN (separate prin virgulă)</Label>
                  <Input value={editingProperty.house_rules_en.join(", ")} onChange={(e) => updateField("house_rules_en", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
                </div>
              </div>

              {/* Delete */}
              {!isNew && (
                <div className="border-t border-border pt-4">
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => { handleDelete(editingProperty.id); setIsEditOpen(false); }}>
                    <Trash2 className="w-4 h-4" /> Șterge Apartament
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Anulează</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || saveSuccess} 
              className={`gap-2 ${saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? null : <Save className="w-4 h-4" />}
              {saveSuccess ? "✅ Salvat!" : saving ? "Se salvează..." : (isNew ? "Adaugă" : "Salvează")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
