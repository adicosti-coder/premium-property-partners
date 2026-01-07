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
  Building2,
  MapPin,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";

interface Complex {
  id: string;
  name: string;
  location: string;
  description_ro: string;
  description_en: string;
  property_count: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ComplexImage {
  id: string;
  complex_id: string;
  image_path: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface FormData {
  name: string;
  location: string;
  description_ro: string;
  description_en: string;
  property_count: number;
  is_active: boolean;
  display_order: number;
}

const initialFormData: FormData = {
  name: "",
  location: "",
  description_ro: "",
  description_en: "",
  property_count: 0,
  is_active: true,
  display_order: 0,
};

export default function ComplexManager() {
  const { t, language } = useLanguage();

  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingComplex, setEditingComplex] = useState<Complex | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [complexImages, setComplexImages] = useState<ComplexImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const translations = {
    ro: {
      title: "Gestiune Complexe Rezidențiale",
      addComplex: "Adaugă Complex",
      editComplex: "Editează Complex",
      addDescription: "Adaugă un nou complex rezidențial",
      editDescription: "Editează detaliile complexului",
      name: "Nume",
      location: "Locație",
      descriptionRo: "Descriere (Română)",
      descriptionEn: "Descriere (Engleză)",
      propertyCount: "Număr Proprietăți",
      displayOrder: "Ordine Afișare",
      isActive: "Activ",
      save: "Salvează",
      cancel: "Anulează",
      delete: "Șterge",
      deleteConfirm: "Ești sigur că vrei să ștergi acest complex?",
      deleteDescription: "Această acțiune nu poate fi anulată.",
      totalComplexes: "Total Complexe",
      activeComplexes: "Active",
      inactiveComplexes: "Inactive",
      images: "Imagini",
      uploadImage: "Încarcă Imagine",
      noImages: "Nicio imagine",
      setPrimary: "Setează ca primară",
      error: "Eroare",
      loadError: "Nu s-au putut încărca complexele",
      addSuccess: "Complex adăugat!",
      addError: "Nu s-a putut adăuga complexul",
      editSuccess: "Complex actualizat!",
      editError: "Nu s-a putut actualiza complexul",
      deleteSuccess: "Complex șters!",
      deleteError: "Nu s-a putut șterge complexul",
      activated: "Complex activat",
      deactivated: "Complex dezactivat",
    },
    en: {
      title: "Residential Complexes Management",
      addComplex: "Add Complex",
      editComplex: "Edit Complex",
      addDescription: "Add a new residential complex",
      editDescription: "Edit complex details",
      name: "Name",
      location: "Location",
      descriptionRo: "Description (Romanian)",
      descriptionEn: "Description (English)",
      propertyCount: "Property Count",
      displayOrder: "Display Order",
      isActive: "Active",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      deleteConfirm: "Are you sure you want to delete this complex?",
      deleteDescription: "This action cannot be undone.",
      totalComplexes: "Total Complexes",
      activeComplexes: "Active",
      inactiveComplexes: "Inactive",
      images: "Images",
      uploadImage: "Upload Image",
      noImages: "No images",
      setPrimary: "Set as primary",
      error: "Error",
      loadError: "Could not load complexes",
      addSuccess: "Complex added!",
      addError: "Could not add complex",
      editSuccess: "Complex updated!",
      editError: "Could not update complex",
      deleteSuccess: "Complex deleted!",
      deleteError: "Could not delete complex",
      activated: "Complex activated",
      deactivated: "Complex deactivated",
    },
  };

  const text = translations[language as keyof typeof translations] || translations.ro;

  const fetchComplexes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("residential_complexes")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setComplexes(data || []);
    } catch (error) {
      console.error("Error fetching complexes:", error);
      toast({
        title: text.error,
        description: text.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComplexImages = async (complexId: string) => {
    try {
      const { data, error } = await supabase
        .from("complex_images")
        .select("*")
        .eq("complex_id", complexId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setComplexImages(data || []);
    } catch (error) {
      console.error("Error fetching complex images:", error);
      setComplexImages([]);
    }
  };

  useEffect(() => {
    fetchComplexes();
  }, []);

  const handleAddComplex = async () => {
    if (!formData.name || !formData.location) {
      toast({
        title: text.error,
        description: "Fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("residential_complexes").insert({
        name: formData.name,
        location: formData.location,
        description_ro: formData.description_ro,
        description_en: formData.description_en,
        property_count: formData.property_count,
        is_active: formData.is_active,
        display_order: formData.display_order,
      });

      if (error) throw error;

      toast({ title: text.addSuccess });
      setIsAddOpen(false);
      resetForm();
      fetchComplexes();
    } catch (error) {
      console.error("Error adding complex:", error);
      toast({
        title: text.error,
        description: text.addError,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditComplex = async () => {
    if (!editingComplex || !formData.name || !formData.location) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("residential_complexes")
        .update({
          name: formData.name,
          location: formData.location,
          description_ro: formData.description_ro,
          description_en: formData.description_en,
          property_count: formData.property_count,
          is_active: formData.is_active,
          display_order: formData.display_order,
        })
        .eq("id", editingComplex.id);

      if (error) throw error;

      toast({ title: text.editSuccess });
      setIsEditOpen(false);
      setEditingComplex(null);
      resetForm();
      fetchComplexes();
    } catch (error) {
      console.error("Error updating complex:", error);
      toast({
        title: text.error,
        description: text.editError,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComplex = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("residential_complexes").delete().eq("id", id);
      if (error) throw error;

      setComplexes(complexes.filter((c) => c.id !== id));
      toast({ title: text.deleteSuccess });
    } catch (error) {
      console.error("Error deleting complex:", error);
      toast({
        title: text.error,
        description: text.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleComplexActive = async (complex: Complex) => {
    try {
      const { error } = await supabase
        .from("residential_complexes")
        .update({ is_active: !complex.is_active })
        .eq("id", complex.id);

      if (error) throw error;

      setComplexes(
        complexes.map((c) =>
          c.id === complex.id ? { ...c, is_active: !c.is_active } : c
        )
      );
      toast({
        title: complex.is_active ? text.deactivated : text.activated,
      });
    } catch (error) {
      console.error("Error toggling complex:", error);
      toast({
        title: text.error,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = async (complex: Complex) => {
    setEditingComplex(complex);
    setFormData({
      name: complex.name,
      location: complex.location,
      description_ro: complex.description_ro,
      description_en: complex.description_en,
      property_count: complex.property_count,
      is_active: complex.is_active,
      display_order: complex.display_order,
    });
    await fetchComplexImages(complex.id);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setComplexImages([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !editingComplex) return;

    const file = e.target.files[0];
    setIsUploadingImage(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${editingComplex.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("complex_images").insert({
        complex_id: editingComplex.id,
        image_path: urlData.publicUrl,
        display_order: complexImages.length,
        is_primary: complexImages.length === 0,
      });

      if (insertError) throw insertError;

      await fetchComplexImages(editingComplex.id);
      toast({ title: "Imagine încărcată!" });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: text.error,
        description: "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase.from("complex_images").delete().eq("id", imageId);
      if (error) throw error;
      setComplexImages(complexImages.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!editingComplex) return;

    try {
      // Reset all images to non-primary
      await supabase
        .from("complex_images")
        .update({ is_primary: false })
        .eq("complex_id", editingComplex.id);

      // Set the selected image as primary
      await supabase.from("complex_images").update({ is_primary: true }).eq("id", imageId);

      await fetchComplexImages(editingComplex.id);
    } catch (error) {
      console.error("Error setting primary image:", error);
    }
  };

  const FormFields = ({ showGallery = false }: { showGallery?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{text.name} *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Iosefin Residence"
          />
        </div>
        <div className="space-y-2">
          <Label>{text.location} *</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Iosefin, Timișoara"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{text.descriptionRo}</Label>
        <Textarea
          value={formData.description_ro}
          onChange={(e) => setFormData({ ...formData, description_ro: e.target.value })}
          placeholder="Descriere în română..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{text.descriptionEn}</Label>
        <Textarea
          value={formData.description_en}
          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
          placeholder="Description in English..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{text.propertyCount}</Label>
          <Input
            type="number"
            value={formData.property_count}
            onChange={(e) =>
              setFormData({ ...formData, property_count: parseInt(e.target.value) || 0 })
            }
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label>{text.displayOrder}</Label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) =>
              setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      {showGallery && editingComplex && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {text.images}
          </Label>

          <div className="grid grid-cols-3 gap-3">
            {complexImages.map((img) => (
              <div
                key={img.id}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  img.is_primary ? "border-primary" : "border-border"
                }`}
              >
                <img
                  src={img.image_path}
                  alt=""
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.is_primary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetPrimaryImage(img.id)}
                      className="text-xs"
                    >
                      Primary
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7"
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {img.is_primary && (
                  <div className="absolute top-1 left-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                    Primary
                  </div>
                )}
              </div>
            ))}

            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
              />
              {isUploadingImage ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{text.uploadImage}</span>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      {!showGallery && (
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-5 h-5" />
            <p className="text-sm">
              {text.images}: Disponibilă după salvarea complexului
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>{text.isActive}</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{text.title}</h2>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {text.addComplex}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{text.addComplex}</DialogTitle>
              <DialogDescription>{text.addDescription}</DialogDescription>
            </DialogHeader>
            <FormFields showGallery={false} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {text.cancel}
              </Button>
              <Button onClick={handleAddComplex} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {text.save}
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
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{complexes.length}</p>
              <p className="text-sm text-muted-foreground">{text.totalComplexes}</p>
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
                {complexes.filter((c) => c.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">{text.activeComplexes}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {complexes.filter((c) => !c.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">{text.inactiveComplexes}</p>
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
        ) : complexes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Niciun complex adăugat
            </h3>
            <p className="text-muted-foreground">
              Adaugă primul complex rezidențial
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Locație</TableHead>
                <TableHead>Proprietăți</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complexes.map((complex) => (
                <TableRow key={complex.id}>
                  <TableCell className="font-medium">{complex.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {complex.location}
                    </div>
                  </TableCell>
                  <TableCell>{complex.property_count}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComplexActive(complex)}
                      className={
                        complex.is_active
                          ? "text-green-600 hover:text-green-700"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    >
                      {complex.is_active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(complex)}
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
                            {deletingId === complex.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{text.deleteConfirm}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {text.deleteDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteComplex(complex.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {text.delete}
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
            <DialogTitle>{text.editComplex}</DialogTitle>
            <DialogDescription>{text.editDescription}</DialogDescription>
          </DialogHeader>
          <FormFields showGallery={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {text.cancel}
            </Button>
            <Button onClick={handleEditComplex} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {text.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
