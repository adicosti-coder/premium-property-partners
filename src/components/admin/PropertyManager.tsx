import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  GripVertical,
  Image as ImageIcon,
  TrendingUp,
  Languages,
  Search,
  Filter,
  RotateCcw,
} from "lucide-react";
import PropertyImageGallery from "./PropertyImageGallery";
import PropertyPricingManager from "./PropertyPricingManager";
import PropertyBookingsCalendar from "./PropertyBookingsCalendar";
import PropertyPremiumFields, { PremiumFieldsData, defaultPremiumFields } from "./PropertyPremiumFields";
import MapLocationPicker from "./MapLocationPicker";

interface Property extends PremiumFieldsData {
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
  status_operativ: string | null;
  estimated_revenue: string | null;
  roi_percentage: string | null;
  capital_necesar: number | null;
  listing_type: string | null;
  booking_rating: number | null;
  booking_review_count: number | null;
  base_price_per_night: number | null;
  weekend_price_per_night: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  source_url: string | null;
  source_platform: string | null;
  capacity: number | null;
  bedrooms: number | null;
}

interface PropertyImage {
  id: string;
  property_id: string;
  image_path: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface PropertyFormData {
  name: string;
  location: string;
  description_ro: string;
  description_en: string;
  features: string;
  booking_url: string;
  tag: string;
  is_active: boolean;
  display_order: number;
  status_operativ: string;
  estimated_revenue: string;
  roi_percentage: string;
  capital_necesar: string;
  listing_type: string;
  booking_rating: string;
  booking_review_count: string;
  base_price_per_night: string;
  weekend_price_per_night: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  source_url: string;
  source_platform: string;
  capacity: string;
  bedrooms: string;
  latitude: string;
  longitude: string;
}

const initialFormData: PropertyFormData = {
  name: "",
  location: "",
  description_ro: "",
  description_en: "",
  features: "",
  booking_url: "",
  tag: "",
  is_active: true,
  display_order: 0,
  status_operativ: "cazare",
  estimated_revenue: "",
  roi_percentage: "",
  capital_necesar: "",
  listing_type: "cazare",
  booking_rating: "",
  booking_review_count: "",
  base_price_per_night: "",
  weekend_price_per_night: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  source_url: "",
  source_platform: "",
  capacity: "",
  bedrooms: "",
  latitude: "",
  longitude: "",
};

export default function PropertyManager() {
  const { t } = useLanguage();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [premiumFields, setPremiumFields] = useState<PremiumFieldsData>({ ...defaultPremiumFields });
  const [isTranslating, setIsTranslating] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterListingType, setFilterListingType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);

  // Auto-calculate ROI when price/night and capital change
  const calculateROI = useCallback((fd: PropertyFormData): { roi: string; revenue: string } | null => {
    const rate = fd.base_price_per_night ? parseFloat(fd.base_price_per_night) : 0;
    const capital = fd.capital_necesar ? parseFloat(fd.capital_necesar) : 0;
    if (!rate || !capital || capital <= 0) return null;

    const occupancy = 0.75;
    const monthlyGross = rate * 30 * occupancy;
    const annualGross = monthlyGross * 12;
    const netFactor = 1 - 0.20 - 0.07;
    const annualNet = annualGross * netFactor;
    const roi = (annualNet / capital) * 100;

    return {
      roi: `${roi.toFixed(1)}%`,
      revenue: `${Math.round(monthlyGross * netFactor)}–${Math.round(monthlyGross)} €/lună`,
    };
  }, []);

  useEffect(() => {
    if (formData.listing_type !== 'investitie') return;
    const result = calculateROI(formData);
    if (result && (result.roi !== formData.roi_percentage || result.revenue !== formData.estimated_revenue)) {
      setFormData(prev => ({ ...prev, roi_percentage: result.roi, estimated_revenue: result.revenue }));
    }
  }, [formData.base_price_per_night, formData.capital_necesar, formData.listing_type, calculateROI]);

  const handleTranslateToEN = async () => {
    if (!formData.description_ro) {
      toast({ title: "Completează mai întâi Descrierea RO", variant: "destructive" });
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text: formData.description_ro, sourceLang: "Romanian", targetLang: "English" },
      });
      if (error) throw new Error(error.message);
      if (data?.translated) {
        setFormData(prev => ({ ...prev, description_en: data.translated }));
        toast({ title: "✅ Descriere tradusă în engleză!" });
      } else {
        throw new Error("No translation returned");
      }
    } catch (err: any) {
      toast({ title: "Eroare la traducere", description: err.message, variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .neq("listing_type", "cazare")
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

  const fetchPropertyImages = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPropertyImages(data || []);
    } catch (error) {
      console.error("Error fetching property images:", error);
      setPropertyImages([]);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matches =
          p.name.toLowerCase().includes(term) ||
          p.location.toLowerCase().includes(term) ||
          (p.tag && p.tag.toLowerCase().includes(term)) ||
          (p.listing_type && p.listing_type.toLowerCase().includes(term)) ||
          (p.contact_name && p.contact_name.toLowerCase().includes(term)) ||
          (p.contact_phone && p.contact_phone.toLowerCase().includes(term)) ||
          (p.source_url && p.source_url.toLowerCase().includes(term));
        if (!matches) return false;
      }
      if (filterListingType !== "all" && p.listing_type !== filterListingType) return false;
      if (filterStatus === "active" && !p.is_active) return false;
      if (filterStatus === "inactive" && p.is_active) return false;
      return true;
    });
  }, [properties, searchTerm, filterListingType, filterStatus]);

  const hasActiveFilters = Boolean(searchTerm || filterListingType !== "all" || filterStatus !== "all");

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterListingType("all");
    setFilterStatus("all");
  }, []);

  const getRequiredFields = (listingType: string) => {
    const base = ['name', 'location'] as const;
    switch (listingType) {
      case 'cazare':
        return { fields: [...base, 'booking_url'] as const, label: 'Nume, Locație și URL Rezervare' };
      case 'vanzare':
        return { fields: [...base] as const, label: 'Nume și Locație' };
      case 'inchiriere':
        return { fields: [...base] as const, label: 'Nume și Locație' };
      case 'investitie':
        return { fields: [...base] as const, label: 'Nume și Locație' };
      default:
        return { fields: [...base] as const, label: 'Nume și Locație' };
    }
  };

  const handleAddProperty = async () => {
    const { fields, label } = getRequiredFields(formData.listing_type);
    const missing = fields.some(f => !formData[f]);
    if (missing) {
      toast({
        title: "Completează câmpurile obligatorii",
        description: `${label} sunt obligatorii.`,
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
        booking_url: formData.booking_url || '-',
        tag: formData.tag,
        is_active: formData.is_active,
        display_order: formData.display_order,
        status_operativ: formData.status_operativ,
        estimated_revenue: formData.estimated_revenue || null,
        roi_percentage: formData.roi_percentage || null,
        capital_necesar: formData.capital_necesar ? parseFloat(formData.capital_necesar) : null,
        listing_type: formData.listing_type,
        booking_rating: formData.booking_rating ? parseFloat(formData.booking_rating) : null,
        booking_review_count: formData.booking_review_count ? parseInt(formData.booking_review_count) : null,
        base_price_per_night: formData.base_price_per_night ? parseFloat(formData.base_price_per_night) : null,
        weekend_price_per_night: formData.weekend_price_per_night ? parseFloat(formData.weekend_price_per_night) : null,
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        source_url: formData.source_url || null,
        source_platform: formData.source_platform || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        ...premiumFields,
      });

      if (error) throw error;

      setSaveSuccess(true);
      toast({ title: "✅ Proprietate adăugată cu succes!" });
      setTimeout(() => {
        setSaveSuccess(false);
        setIsAddOpen(false);
        resetForm();
        fetchProperties();
      }, 1200);
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
    const { fields, label } = getRequiredFields(formData.listing_type);
    const missing = !editingProperty || fields.some(f => !formData[f]);
    if (missing) {
      toast({
        title: "Completează câmpurile obligatorii",
        description: `${label} sunt obligatorii.`,
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

      // Get primary image for image_path
      const primaryImage = propertyImages.find(img => img.is_primary);
      const imagePath = primaryImage?.image_path || (propertyImages.length > 0 ? propertyImages[0].image_path : null);

      const { error } = await supabase
        .from("properties")
        .update({
          name: formData.name,
          location: formData.location,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          description_ro: formData.description_ro,
          description_en: formData.description_en,
          features: featuresArray,
          booking_url: formData.booking_url || '-',
          tag: formData.tag,
          image_path: imagePath,
          is_active: formData.is_active,
          display_order: formData.display_order,
          status_operativ: formData.status_operativ,
          estimated_revenue: formData.estimated_revenue || null,
          roi_percentage: formData.roi_percentage || null,
          capital_necesar: formData.capital_necesar ? parseFloat(formData.capital_necesar) : null,
          listing_type: formData.listing_type,
          booking_rating: formData.booking_rating ? parseFloat(formData.booking_rating) : null,
          booking_review_count: formData.booking_review_count ? parseInt(formData.booking_review_count) : null,
          base_price_per_night: formData.base_price_per_night ? parseFloat(formData.base_price_per_night) : null,
          weekend_price_per_night: formData.weekend_price_per_night ? parseFloat(formData.weekend_price_per_night) : null,
          contact_name: formData.contact_name || null,
          contact_phone: formData.contact_phone || null,
          contact_email: formData.contact_email || null,
          source_url: formData.source_url || null,
          source_platform: formData.source_platform || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          ...premiumFields,
        })
        .eq("id", editingProperty.id);

      if (error) throw error;

      setSaveSuccess(true);
      toast({ title: "✅ Proprietate actualizată cu succes!" });
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditOpen(false);
        setEditingProperty(null);
        resetForm();
        fetchProperties();
      }, 1200);
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

  const openEditDialog = async (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      location: property.location,
      description_ro: property.description_ro,
      description_en: property.description_en,
      features: property.features.join(", "),
      booking_url: property.booking_url,
      tag: property.tag,
      is_active: property.is_active,
      display_order: property.display_order,
      status_operativ: property.status_operativ || "cazare",
      estimated_revenue: property.estimated_revenue || "",
      roi_percentage: property.roi_percentage || "",
      capital_necesar: property.capital_necesar?.toString() || "",
      listing_type: property.listing_type || "cazare",
      booking_rating: property.booking_rating?.toString() || "",
      booking_review_count: property.booking_review_count?.toString() || "",
      base_price_per_night: property.base_price_per_night?.toString() || "",
      weekend_price_per_night: property.weekend_price_per_night?.toString() || "",
      contact_name: property.contact_name || "",
      contact_phone: property.contact_phone || "",
      contact_email: property.contact_email || "",
      source_url: property.source_url || "",
      source_platform: property.source_platform || "",
      capacity: property.capacity?.toString() || "",
      bedrooms: property.bedrooms?.toString() || "",
      latitude: (property as any).latitude?.toString() || "",
      longitude: (property as any).longitude?.toString() || "",
    });
    setPremiumFields({
      long_description_ro: property.long_description_ro,
      long_description_en: property.long_description_en,
      balconies: property.balconies,
      terrace_area: property.terrace_area,
      has_storage: property.has_storage,
      has_cellar: property.has_cellar,
      has_elevator: property.has_elevator,
      has_ac: property.has_ac,
      orientation: property.orientation,
      view_type: property.view_type,
      intercom_type: property.intercom_type,
      usable_area: property.usable_area,
      built_area: property.built_area,
      land_area: property.land_area,
      price_per_sqm: property.price_per_sqm,
      annual_tax: property.annual_tax,
      monthly_maintenance: property.monthly_maintenance,
      renovation_year: property.renovation_year,
      property_condition: property.property_condition,
      total_building_floors: property.total_building_floors,
      apartments_in_building: property.apartments_in_building,
      floor: property.floor,
      parking: property.parking,
      heating_type: property.heating_type,
      energy_class: property.energy_class,
      furnished: property.furnished,
      construction_type: property.construction_type,
      compartimentare: property.compartimentare,
    });
    await fetchPropertyImages(property.id);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setPropertyImages([]);
    setPremiumFields({ ...defaultPremiumFields });
  };

  const isCazare = formData.listing_type === 'cazare';
  const isVanzare = formData.listing_type === 'vanzare';
  const isInchiriere = formData.listing_type === 'inchiriere';
  const isInvestitie = formData.listing_type === 'investitie';
  const showBookingFields = isCazare || isInvestitie;
  const showInvestmentFields = isVanzare || isInvestitie || isInchiriere;

  const renderFormFields = (showGallery = false) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* Listing Type selector FIRST - controls visible fields */}
      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Tip Publicare</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tip Listing *</Label>
            <select
              value={formData.listing_type}
              onChange={(e) => setFormData({ ...formData, listing_type: e.target.value, status_operativ: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="cazare">🏨 Cazare (regim hotelier)</option>
              <option value="vanzare">🏠 Vânzare</option>
              <option value="inchiriere">📋 Închiriere</option>
              <option value="investitie">📈 Investiție Premium</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Etichetă</Label>
            <Input
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              placeholder={isCazare ? "Premium, Superhost" : isVanzare ? "De Vânzare, Nou" : "De Închiriat"}
            />
          </div>
        </div>
      </div>

      {/* Basic info - always visible */}
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

      {/* Map Location Picker - prominent section */}
      <div className="p-4 bg-accent/10 rounded-xl border-2 border-primary/30 space-y-2">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2">📍 Map Location Picker — Alege poziția pe hartă</h3>
        <p className="text-xs text-muted-foreground">Click pe hartă sau caută o adresă pentru a seta coordonatele GPS precise.</p>
        <MapLocationPicker
          latitude={formData.latitude ? parseFloat(formData.latitude) : null}
          longitude={formData.longitude ? parseFloat(formData.longitude) : null}
          onLocationChange={(lat, lng) => setFormData({ ...formData, latitude: lat.toString(), longitude: lng.toString() })}
          locationText={formData.location}
        />
      </div>

      {/* Capacity & Bedrooms - always visible */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Capacitate (persoane)</Label>
          <Input
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="4"
          />
        </div>
        <div className="space-y-2">
          <Label>Dormitoare</Label>
          <Input
            type="number"
            value={formData.bedrooms}
            onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
            placeholder="2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ordine Afișare</Label>
          <Input
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
      </div>

      {/* Contact proprietar - private */}
      <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔒</span>
          <h4 className="font-semibold text-foreground">Date Contact Proprietar (privat)</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Nume</Label>
            <Input
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="Ion Popescu"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              placeholder="0722..."
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="email@exemplu.ro"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Platformă sursă</Label>
            <Input
              value={formData.source_platform}
              onChange={(e) => setFormData({ ...formData, source_platform: e.target.value })}
              placeholder="OLX, Storia, Imobiliare.ro"
            />
          </div>
          <div className="space-y-2">
            <Label>URL sursă</Label>
            <Input
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              placeholder="https://olx.ro/..."
            />
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-2">
        <Label>{t.admin.properties?.descriptionRo || "Descriere (Română)"}</Label>
        <Textarea
          value={formData.description_ro}
          onChange={(e) => setFormData({ ...formData, description_ro: e.target.value })}
          placeholder="Descriere în română..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t.admin.properties?.descriptionEn || "Descriere (Engleză)"}</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTranslateToEN}
            disabled={isTranslating || !formData.description_ro}
            className="gap-1.5 h-7 text-xs"
          >
            {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
            Traducere Auto
          </Button>
        </div>
        <Textarea
          value={formData.description_en}
          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
          placeholder="Description in English..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t.admin.properties?.features || "Facilități"}</Label>
        <Input
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="WiFi, AC, Parking (separate prin virgulă)"
        />
        <p className="text-xs text-muted-foreground">Separă facilitățile prin virgulă</p>
      </div>

      {/* === CAZARE: Booking URL + Rating + Pricing === */}
      {showBookingFields && (
        <>
          <div className="space-y-2">
            <Label>URL Rezervare {isCazare ? '*' : ''}</Label>
            <Input
              value={formData.booking_url}
              onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
              placeholder="https://booking.com/..."
            />
          </div>

          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⭐</span>
              <h4 className="font-semibold text-foreground">Rating Booking.com</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notă (ex: 9.4)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.booking_rating}
                  onChange={(e) => setFormData({ ...formData, booking_rating: e.target.value })}
                  placeholder="9.4"
                />
              </div>
              <div className="space-y-2">
                <Label>Nr. recenzii</Label>
                <Input
                  type="number"
                  value={formData.booking_review_count}
                  onChange={(e) => setFormData({ ...formData, booking_review_count: e.target.value })}
                  placeholder="127"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preț / noapte (€)</Label>
              <Input
                type="number"
                value={formData.base_price_per_night}
                onChange={(e) => setFormData({ ...formData, base_price_per_night: e.target.value })}
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label>Preț weekend / noapte (€)</Label>
              <Input
                type="number"
                value={formData.weekend_price_per_night}
                onChange={(e) => setFormData({ ...formData, weekend_price_per_night: e.target.value })}
                placeholder="55"
              />
            </div>
          </div>
        </>
      )}

      {/* === VÂNZARE / ÎNCHIRIERE / INVESTIȚIE: Price & Investment fields === */}
      {showInvestmentFields && (
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">
              {isVanzare ? 'Date Vânzare' : isInchiriere ? 'Date Închiriere' : 'Date Investiție'}
            </h4>
          </div>

          <div className="space-y-2">
            <Label>Preț (€)</Label>
            <Input
              type="number"
              value={formData.capital_necesar}
              onChange={(e) => setFormData({ ...formData, capital_necesar: e.target.value })}
              placeholder={isInchiriere ? "450 (chirie lunară)" : "145000 (preț total)"}
            />
            <p className="text-xs text-muted-foreground">
              {isInchiriere ? 'Chirie lunară în EUR' : 'Prețul total în EUR'}
            </p>
          </div>

          {(isInvestitie) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Venit Estimat (€/lună)</Label>
                <Input
                  value={formData.estimated_revenue}
                  onChange={(e) => setFormData({ ...formData, estimated_revenue: e.target.value })}
                  placeholder="1.450"
                />
              </div>
              <div className="space-y-2">
                <Label>ROI (%)</Label>
                <Input
                  value={formData.roi_percentage}
                  onChange={(e) => setFormData({ ...formData, roi_percentage: e.target.value })}
                  placeholder="9.4"
                />
              </div>
            </div>
          )}

          {(isInvestitie) && (
            <div className="space-y-2">
              <Label>URL Anunț / Sursă</Label>
              <Input
                value={formData.booking_url}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                placeholder="https://olx.ro/... sau https://imobiliare.ro/..."
              />
              <p className="text-xs text-muted-foreground">Link către anunțul original</p>
            </div>
          )}

          {(isVanzare || isInchiriere) && (
            <div className="space-y-2">
              <Label>URL Anunț</Label>
              <Input
                value={formData.booking_url}
                onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                placeholder="https://olx.ro/... sau link sursă"
              />
            </div>
          )}
        </div>
      )}

      {/* Pricing manager - only for cazare with existing properties */}
      {showGallery && editingProperty && isCazare && (
        <PropertyPricingManager
          propertyId={editingProperty.id}
          basePricePerNight={formData.base_price_per_night ? parseFloat(formData.base_price_per_night) : null}
          weekendPricePerNight={formData.weekend_price_per_night ? parseFloat(formData.weekend_price_per_night) : null}
          onBasePriceChange={(val) => setFormData({ ...formData, base_price_per_night: val })}
          onWeekendPriceChange={(val) => setFormData({ ...formData, weekend_price_per_night: val })}
        />
      )}

      {/* Calendar - only for cazare */}
      {showGallery && editingProperty && isCazare && (
        <PropertyBookingsCalendar
          propertyId={editingProperty.id}
          propertyName={editingProperty.name}
        />
      )}

      {/* Image Gallery - all types */}
      {showGallery && editingProperty && (
        <PropertyImageGallery
          propertyId={editingProperty.id}
          images={propertyImages}
          onImagesChange={setPropertyImages}
        />
      )}

      {!showGallery && (
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-5 h-5" />
            <p className="text-sm">Galerie Imagini: Disponibilă după salvarea proprietății</p>
          </div>
        </div>
      )}

      {/* Premium Fields */}
      <PropertyPremiumFields
        data={premiumFields}
        onChange={(key, value) => setPremiumFields(prev => ({ ...prev, [key]: value }))}
      />

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>{t.admin.properties?.isActive || "Activă"}</Label>
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
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{t.admin.properties?.addProperty || "Add Property"}</DialogTitle>
              <DialogDescription>
                {t.admin.properties?.addDescription || "Add a new property to the portfolio"}
              </DialogDescription>
            </DialogHeader>
            {renderFormFields(false)}
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

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută după nume, locație, etichetă..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
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
              <Select value={filterListingType} onValueChange={setFilterListingType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="cazare">🏨 Cazare</SelectItem>
                  <SelectItem value="vanzare">🏠 Vânzare</SelectItem>
                  <SelectItem value="inchiriere">📋 Închiriere</SelectItem>
                  <SelectItem value="investitie">📈 Investiție</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground">{filteredProperties.length} din {properties.length} proprietăți</p>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProperties.length === 0 ? (
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
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"><GripVertical className="w-4 h-4" /></TableHead>
                <TableHead><Home className="w-4 h-4 inline mr-1" />{t.admin.properties?.name || "Name"}</TableHead>
                <TableHead><MapPin className="w-4 h-4 inline mr-1" />{t.admin.properties?.location || "Location"}</TableHead>
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
              {filteredProperties.map((property) => (
                <TableRow key={property.id} className={!property.is_active ? "opacity-50" : ""}>
                  <TableCell className="text-muted-foreground">
                    {property.display_order}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {property.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[150px] truncate">{property.location}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {property.base_price_per_night ? `${property.base_price_per_night}€` : '–'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.capacity ?? '–'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.bedrooms ?? '–'}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {property.capital_necesar ? `${property.capital_necesar.toLocaleString()}€` : '–'}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {property.roi_percentage || '–'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.contact_name || property.contact_phone ? (
                      <div className="text-xs space-y-0.5">
                        {property.contact_name && <div className="font-medium">{property.contact_name}</div>}
                        {property.contact_phone && (
                          <a href={`tel:${property.contact_phone}`} className="text-primary hover:underline">{property.contact_phone}</a>
                        )}
                      </div>
                    ) : '–'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.source_url ? (
                      <a href={property.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs max-w-[100px] truncate block">
                        {property.source_platform || 'Link'}
                      </a>
                    ) : (property.source_platform || '–')}
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
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t.admin.properties?.editProperty || "Edit Property"}</DialogTitle>
            <DialogDescription>
              {t.admin.properties?.editDescription || "Update the property details"}
            </DialogDescription>
          </DialogHeader>
          {renderFormFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t.admin.cancel}
            </Button>
            <Button 
              onClick={handleEditProperty} 
              disabled={isSaving || saveSuccess}
              className={saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saveSuccess ? "✅ Salvat!" : (isSaving ? "Se salvează..." : (t.admin.properties?.save || "Salvează"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
