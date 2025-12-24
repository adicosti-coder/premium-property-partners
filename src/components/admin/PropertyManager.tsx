import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  Home,
  MapPin,
  Eye,
  EyeOff,
  GripVertical
} from "lucide-react";

interface Property {
  id: string;
  name: string;
  location: string;
  description_ro: string;
  description_en: string;
  features: string[];
  booking_url: string;
  tag: string;
  image_path: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface PropertyFormData {
  name: string;
  location: string;
  description_ro: string;
  description_en: string;
  features: string;
  booking_url: string;
  tag: string;
  image_path: string;
  is_active: boolean;
  display_order: number;
}

const initialFormData: PropertyFormData = {
  name: "",
  location: "",
  description_ro: "",
  description_en: "",
  features: "",
  booking_url: "",
  tag: "",
  image_path: "",
  is_active: true,
  display_order: 0,
};

export default function PropertyManager() {
  const { t, language } = useLanguage();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.loadError || "Could not load properties",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAddProperty = async () => {
    if (!formData.name || !formData.location || !formData.booking_url) {
      toast({
        title: t.admin.error,
        description: t.admin.properties?.fillRequired || "Fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const featuresArray = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const { error } = await supabase.from("properties").insert({
        name: formData.name,
        location: formData.location,
        description_ro: formData.description_ro,
        description_en: formData.description_en,
        features: featuresArray,
        booking_url: formData.booking_url,
        tag: formData.tag,
        image_path: formData.image_path || null,
        is_active: formData.is_active,
        display_order: formData.display_order,
      });

      if (error) throw error;

      toast({ title: t.admin.properties?.addSuccess || "Property added!" });
      setIsAddOpen(false);
      setFormData(initialFormData);
      fetchProperties();
    } catch (error) {
      console.error("Error adding property:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.addError || "Could not add property",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProperty = async () => {
    if (!editingProperty || !formData.name || !formData.location || !formData.booking_url) {
      return;
    }

    setIsSaving(true);
    try {
      const featuresArray = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const { error } = await supabase
        .from("properties")
        .update({
          name: formData.name,
          location: formData.location,
          description_ro: formData.description_ro,
          description_en: formData.description_en,
          features: featuresArray,
          booking_url: formData.booking_url,
          tag: formData.tag,
          image_path: formData.image_path || null,
          is_active: formData.is_active,
          display_order: formData.display_order,
        })
        .eq("id", editingProperty.id);

      if (error) throw error;

      toast({ title: t.admin.properties?.editSuccess || "Property updated!" });
      setIsEditOpen(false);
      setEditingProperty(null);
      setFormData(initialFormData);
      fetchProperties();
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.editError || "Could not update property",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;

      setProperties(properties.filter((p) => p.id !== id));
      toast({ title: t.admin.properties?.deleteSuccess || "Property deleted!" });
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.deleteError || "Could not delete property",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const togglePropertyActive = async (property: Property) => {
    try {
      const { error } = await supabase
        .from("properties")
        .update({ is_active: !property.is_active })
        .eq("id", property.id);

      if (error) throw error;

      setProperties(
        properties.map((p) =>
          p.id === property.id ? { ...p, is_active: !p.is_active } : p
        )
      );
      toast({
        title: property.is_active
          ? t.admin.properties?.deactivated || "Property deactivated"
          : t.admin.properties?.activated || "Property activated",
      });
    } catch (error) {
      console.error("Error toggling property:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.toggleError || "Could not update property",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      location: property.location,
      description_ro: property.description_ro,
      description_en: property.description_en,
      features: property.features.join(", "),
      booking_url: property.booking_url,
      tag: property.tag,
      image_path: property.image_path || "",
      is_active: property.is_active,
      display_order: property.display_order,
    });
    setIsEditOpen(true);
  };

  const PropertyFormFields = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.admin.properties?.name || "Name"} *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Apartament Central"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.admin.properties?.location || "Location"} *</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Timișoara, Centru"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.admin.properties?.descriptionRo || "Description (Romanian)"}</Label>
        <Textarea
          value={formData.description_ro}
          onChange={(e) => setFormData({ ...formData, description_ro: e.target.value })}
          placeholder="Descriere în română..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t.admin.properties?.descriptionEn || "Description (English)"}</Label>
        <Textarea
          value={formData.description_en}
          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
          placeholder="Description in English..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t.admin.properties?.features || "Features"}</Label>
        <Input
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="WiFi, AC, Parking (comma separated)"
        />
        <p className="text-xs text-muted-foreground">
          {t.admin.properties?.featuresHint || "Separate features with commas"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.admin.properties?.tag || "Tag"}</Label>
          <Input
            value={formData.tag}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
            placeholder="Premium, New, etc."
          />
        </div>
        <div className="space-y-2">
          <Label>{t.admin.properties?.displayOrder || "Display Order"}</Label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.admin.properties?.bookingUrl || "Booking URL"} *</Label>
        <Input
          value={formData.booking_url}
          onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
          placeholder="https://booking.com/..."
        />
      </div>

      <div className="space-y-2">
        <Label>{t.admin.properties?.imagePath || "Image Path"}</Label>
        <Input
          value={formData.image_path}
          onChange={(e) => setFormData({ ...formData, image_path: e.target.value })}
          placeholder="/apt-01.jpg"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>{t.admin.properties?.isActive || "Active"}</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.admin.properties?.title || "Properties Management"}
          </h2>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t.admin.properties?.addProperty || "Add Property"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t.admin.properties?.addProperty || "Add Property"}</DialogTitle>
              <DialogDescription>
                {t.admin.properties?.addDescription || "Add a new property to the portfolio"}
              </DialogDescription>
            </DialogHeader>
            <PropertyFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {t.admin.cancel}
              </Button>
              <Button onClick={handleAddProperty} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.admin.properties?.save || "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{properties.length}</p>
              <p className="text-sm text-muted-foreground">{t.admin.properties?.totalProperties || "Total Properties"}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Eye className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {properties.filter((p) => p.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">{t.admin.properties?.activeProperties || "Active"}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-500/10">
              <EyeOff className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {properties.filter((p) => !p.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">{t.admin.properties?.inactiveProperties || "Inactive"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Home className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t.admin.properties?.noProperties || "No properties yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t.admin.properties?.noPropertiesDescription || "Add your first property to get started"}
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t.admin.properties?.addProperty || "Add Property"}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"><GripVertical className="w-4 h-4" /></TableHead>
                <TableHead><Home className="w-4 h-4 inline mr-1" />{t.admin.properties?.name || "Name"}</TableHead>
                <TableHead><MapPin className="w-4 h-4 inline mr-1" />{t.admin.properties?.location || "Location"}</TableHead>
                <TableHead>{t.admin.properties?.tag || "Tag"}</TableHead>
                <TableHead>{t.admin.properties?.status || "Status"}</TableHead>
                <TableHead className="w-[120px]">{t.admin.tableHeaders.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id} className={!property.is_active ? "opacity-50" : ""}>
                  <TableCell className="text-muted-foreground">
                    {property.display_order}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {property.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{property.location}</TableCell>
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
                      onClick={() => togglePropertyActive(property)}
                      className={property.is_active ? "text-green-600" : "text-gray-400"}
                    >
                      {property.is_active ? (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          {t.admin.properties?.active || "Active"}
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          {t.admin.properties?.inactive || "Inactive"}
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(property)}
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
                            {deletingId === property.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.admin.properties?.deleteProperty || "Delete property?"}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.admin.properties?.deleteDescription || "This action cannot be undone."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.admin.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProperty(property.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.admin.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t.admin.properties?.editProperty || "Edit Property"}</DialogTitle>
            <DialogDescription>
              {t.admin.properties?.editDescription || "Update the property details"}
            </DialogDescription>
          </DialogHeader>
          <PropertyFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t.admin.cancel}
            </Button>
            <Button onClick={handleEditProperty} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.admin.properties?.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}