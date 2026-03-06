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
  TrendingUp, Edit, Star, Euro, Users, Bed, Maximize2, ExternalLink,
  Eye, EyeOff, MapPin, Plus, Save, Loader2, Trash2, Bath,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import PropertyImageGallery from "./PropertyImageGallery";
import { Image as ImageIcon } from "lucide-react";

interface InvestProperty {
  id: string;
  name: string;
  slug: string | null;
  location: string;
  description_ro: string;
  description_en: string;
  long_description_ro: string | null;
  long_description_en: string | null;
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
  estimated_revenue: string | null;
  roi_percentage: string | null;
  capital_necesar: number | null;
}

const emptyProperty: Omit<InvestProperty, "id"> = {
  name: "",
  slug: "",
  location: "",
  description_ro: "",
  description_en: "",
  long_description_ro: "",
  long_description_en: "",
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
  estimated_revenue: null,
  roi_percentage: null,
  capital_necesar: null,
};

export default function InvestitiiPremiumManager() {
  const [properties, setProperties] = useState<InvestProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingProperty, setEditingProperty] = useState<InvestProperty | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [propertyImages, setPropertyImages] = useState<any[]>([]);

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("listing_type", "investitie")
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

  const fetchPropertyImages = async (propertyId: string) => {
    const { data } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("display_order", { ascending: true });
    setPropertyImages(data || []);
  };

  const openEdit = (property: InvestProperty) => {
    setEditingProperty({ ...property });
    setIsNew(false);
    setIsEditOpen(true);
    fetchPropertyImages(property.id);
  };

  const openNew = () => {
    setEditingProperty({ ...emptyProperty, id: "" } as InvestProperty);
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
      estimated_revenue: editingProperty.estimated_revenue,
      roi_percentage: editingProperty.roi_percentage,
      capital_necesar: editingProperty.capital_necesar,
      listing_type: "investitie",
      tag: "Premium",
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
      toast({ title: isNew ? "✅ Proprietate adăugată cu succes!" : "✅ Proprietate actualizată cu succes!" });
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditOpen(false);
        fetchProperties();
      }, 1200);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur vrei să ștergi această proprietate?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      toast({ title: "Eroare la ștergere", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proprietate ștearsă" });
      fetchProperties();
    }
  };

  const updateField = <K extends keyof InvestProperty>(key: K, value: InvestProperty[K]) => {
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
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Investiții Premium</h2>
            <p className="text-sm text-muted-foreground">Gestionare apartamente investiție premium cu randament și ROI</p>
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
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-4 h-4 text-primary" /></div>
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
              <TableHead>Proprietate</TableHead>
              <TableHead className="hidden md:table-cell">Locație</TableHead>
              <TableHead className="text-center">Rating</TableHead>
              <TableHead className="text-center">ROI</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Capital</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[100px]">Acțiuni</TableHead>
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
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-sm text-primary">{property.roi_percentage ?? "–"}</span>
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <span className="text-sm">{property.capital_necesar ? `${property.capital_necesar.toLocaleString()} €` : "–"}</span>
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(property.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {isNew ? "Adaugă Investiție Premium" : "Editează Investiție Premium"}
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
                    <Input value={editingProperty.slug || ""} onChange={(e) => updateField("slug", e.target.value)} placeholder="investitie-slug" />
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

              {/* Investment Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Date Investiție</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>ROI (%)</Label>
                    <Input value={editingProperty.roi_percentage || ""} onChange={(e) => updateField("roi_percentage", e.target.value)} placeholder="ex: 8.5%" />
                  </div>
                  <div>
                    <Label>Capital Necesar (€)</Label>
                    <Input type="number" value={editingProperty.capital_necesar || ""} onChange={(e) => updateField("capital_necesar", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>Venit Estimat</Label>
                    <Input value={editingProperty.estimated_revenue || ""} onChange={(e) => updateField("estimated_revenue", e.target.value)} placeholder="ex: 800-1200 €/lună" />
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
                    <Label className="flex items-center gap-1"><Maximize2 className="w-3 h-3" />Suprafață (mp)</Label>
                    <Input type="number" value={editingProperty.size} onChange={(e) => updateField("size", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Prețuri</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Preț/Noapte (€)</Label>
                    <Input type="number" value={editingProperty.base_price_per_night || ""} onChange={(e) => updateField("base_price_per_night", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>Preț Weekend (€)</Label>
                    <Input type="number" value={editingProperty.weekend_price_per_night || ""} onChange={(e) => updateField("weekend_price_per_night", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>Rating Booking</Label>
                    <Input type="number" step="0.1" value={editingProperty.booking_rating || ""} onChange={(e) => updateField("booking_rating", e.target.value ? Number(e.target.value) : null)} />
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Descrieri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Descriere RO</Label>
                    <Textarea value={editingProperty.description_ro} onChange={(e) => updateField("description_ro", e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Descriere EN</Label>
                    <Textarea value={editingProperty.description_en} onChange={(e) => updateField("description_en", e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Imagini Suplimentare</h3>
                <Textarea
                  value={editingProperty.images.join("\n")}
                  onChange={(e) => updateField("images", e.target.value.split("\n").filter(Boolean))}
                  rows={3}
                  placeholder="Un URL pe linie"
                />
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Facilități</h3>
                <Textarea
                  value={editingProperty.features.join("\n")}
                  onChange={(e) => updateField("features", e.target.value.split("\n").filter(Boolean))}
                  rows={3}
                  placeholder="O facilitate pe linie"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Anulează</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || saveSuccess}
              className={`gap-2 ${saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? null : <Save className="w-4 h-4" />}
              {saveSuccess ? "✅ Salvat!" : saving ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
