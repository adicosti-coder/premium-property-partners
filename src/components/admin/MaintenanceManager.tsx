import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Plus, Trash2, Wrench, Upload, Image, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";

interface MaintenanceRecord {
  id: string;
  property_id: string;
  title: string;
  description: string | null;
  cost: number;
  date: string;
  image_url: string | null;
  invoice_url: string | null;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
}

const translations = {
  ro: {
    title: "Mentenanță Proprietăți",
    description: "Gestionează înregistrările de mentenanță și reparații",
    addRecord: "Adaugă Înregistrare",
    editRecord: "Editează Înregistrare",
    selectProperty: "Selectează Proprietatea",
    recordTitle: "Titlu",
    recordDescription: "Descriere",
    cost: "Cost (€)",
    date: "Data",
    photo: "Fotografie",
    invoice: "Factură",
    uploadPhoto: "Încarcă Fotografie",
    uploadInvoice: "Încarcă Factură",
    save: "Salvează",
    cancel: "Anulează",
    property: "Proprietate",
    actions: "Acțiuni",
    deleteRecord: "Șterge înregistrarea",
    deleteDescription: "Această acțiune nu poate fi anulată.",
    noRecords: "Nu există înregistrări",
    noRecordsDescription: "Adaugă prima înregistrare de mentenanță.",
    recordAdded: "Înregistrare adăugată cu succes",
    recordUpdated: "Înregistrare actualizată cu succes",
    recordDeleted: "Înregistrare ștearsă cu succes",
    error: "Eroare",
    loadError: "Nu s-au putut încărca înregistrările",
    saveError: "Nu s-a putut salva înregistrarea",
    deleteError: "Nu s-a putut șterge înregistrarea",
    uploadError: "Nu s-a putut încărca fișierul",
    viewPhoto: "Vezi fotografia",
    viewInvoice: "Vezi factura",
    allProperties: "Toate proprietățile",
  },
  en: {
    title: "Property Maintenance",
    description: "Manage maintenance and repair records",
    addRecord: "Add Record",
    editRecord: "Edit Record",
    selectProperty: "Select Property",
    recordTitle: "Title",
    recordDescription: "Description",
    cost: "Cost (€)",
    date: "Date",
    photo: "Photo",
    invoice: "Invoice",
    uploadPhoto: "Upload Photo",
    uploadInvoice: "Upload Invoice",
    save: "Save",
    cancel: "Cancel",
    property: "Property",
    actions: "Actions",
    deleteRecord: "Delete record",
    deleteDescription: "This action cannot be undone.",
    noRecords: "No records",
    noRecordsDescription: "Add the first maintenance record.",
    recordAdded: "Record added successfully",
    recordUpdated: "Record updated successfully",
    recordDeleted: "Record deleted successfully",
    error: "Error",
    loadError: "Could not load records",
    saveError: "Could not save record",
    deleteError: "Could not delete record",
    uploadError: "Could not upload file",
    viewPhoto: "View photo",
    viewInvoice: "View invoice",
    allProperties: "All properties",
  },
};

const MaintenanceManager = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const dateLocale = language === "ro" ? ro : enUS;

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [formData, setFormData] = useState({
    property_id: "",
    title: "",
    description: "",
    cost: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recordsRes, propertiesRes] = await Promise.all([
        supabase
          .from("maintenance_records")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("properties")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (recordsRes.error) throw recordsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;

      setRecords(recordsRes.data || []);
      setProperties(propertiesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t.error,
        description: t.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("maintenance-files")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data } = supabase.storage
      .from("maintenance-files")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleOpenDialog = (record?: MaintenanceRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        property_id: record.property_id,
        title: record.title,
        description: record.description || "",
        cost: record.cost.toString(),
        date: record.date,
      });
      setPhotoPreview(record.image_url);
    } else {
      setEditingRecord(null);
      setFormData({
        property_id: "",
        title: "",
        description: "",
        cost: "",
        date: new Date().toISOString().split("T")[0],
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
    setInvoiceFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.property_id || !formData.title || !formData.cost) return;

    setIsSaving(true);
    try {
      let imageUrl = editingRecord?.image_url || null;
      let invoiceUrl = editingRecord?.invoice_url || null;

      if (photoFile) {
        imageUrl = await uploadFile(photoFile, "photos");
      }
      if (invoiceFile) {
        invoiceUrl = await uploadFile(invoiceFile, "invoices");
      }

      const recordData = {
        property_id: formData.property_id,
        title: formData.title,
        description: formData.description || null,
        cost: parseFloat(formData.cost),
        date: formData.date,
        image_url: imageUrl,
        invoice_url: invoiceUrl,
      };

      if (editingRecord) {
        const { data, error } = await supabase
          .from("maintenance_records")
          .update(recordData)
          .eq("id", editingRecord.id)
          .select()
          .single();

        if (error) throw error;
        setRecords(records.map((r) => (r.id === editingRecord.id ? data : r)));
        toast({ title: t.recordUpdated });
      } else {
        const { data, error } = await supabase
          .from("maintenance_records")
          .insert(recordData)
          .select()
          .single();

        if (error) throw error;
        setRecords([data, ...records]);
        toast({ title: t.recordAdded });
      }

      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving record:", error);
      toast({
        title: t.error,
        description: t.saveError,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("maintenance_records")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setRecords(records.filter((r) => r.id !== id));
      toast({ title: t.recordDeleted });
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: t.error,
        description: t.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    return property?.name || propertyId;
  };

  const filteredRecords = filterPropertyId === "all"
    ? records
    : records.filter((r) => r.property_id === filterPropertyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filterPropertyId} onValueChange={setFilterPropertyId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t.selectProperty} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allProperties}</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addRecord}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? t.editRecord : t.addRecord}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t.selectProperty}</Label>
                  <Select
                    value={formData.property_id}
                    onValueChange={(v) => setFormData({ ...formData, property_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectProperty} />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.recordTitle}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t.recordTitle}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.recordDescription}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t.recordDescription}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.cost}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.date}</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label>{t.photo}</Label>
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">{t.uploadPhoto}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  )}
                </div>

                {/* Invoice Upload */}
                <div className="space-y-2">
                  <Label>{t.invoice}</Label>
                  {invoiceFile ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm flex-1 truncate">{invoiceFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setInvoiceFile(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : editingRecord?.invoice_url ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <a
                        href={editingRecord.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex-1"
                      >
                        {t.viewInvoice}
                      </a>
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t.uploadInvoice}</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t.cancel}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!formData.property_id || !formData.title || !formData.cost || isSaving}
                  >
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t.save}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Wrench className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">{t.noRecords}</h3>
            <p className="text-muted-foreground">{t.noRecordsDescription}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.property}</TableHead>
                <TableHead>{t.recordTitle}</TableHead>
                <TableHead>{t.cost}</TableHead>
                <TableHead>{t.photo}</TableHead>
                <TableHead>{t.invoice}</TableHead>
                <TableHead className="w-[100px]">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(record.date), "d MMM yyyy", { locale: dateLocale })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getPropertyName(record.property_id)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{record.title}</span>
                      {record.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {record.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {record.cost.toLocaleString()} €
                  </TableCell>
                  <TableCell>
                    {record.image_url ? (
                      <a
                        href={record.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Image className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.invoice_url ? (
                      <a
                        href={record.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(record)}
                      >
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === record.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteRecord}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.deleteDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(record.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.deleteRecord}
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
    </div>
  );
};

export default MaintenanceManager;
