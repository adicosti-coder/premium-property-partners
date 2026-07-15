import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Loader2,
  Image as ImageIcon,
  TrendingUp,
  Languages,
  Sparkles,
  Brain,
} from "lucide-react";
import PropertyImageGallery from "../../PropertyImageGallery";
import PropertyPricingManager from "../../PropertyPricingManager";
import PropertyBookingsCalendar from "../../PropertyBookingsCalendar";
import PropertyPremiumFields, {
  PremiumFieldsData,
  defaultPremiumFields,
} from "../../PropertyPremiumFields";
import MapLocationPicker from "../../MapLocationPicker";

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
  expert_insight_ro: string;
  expert_insight_en: string;
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
  expert_insight_ro: "",
  expert_insight_en: "",
};

export interface PropertyEditorProps {
  open: boolean;
  mode: "add" | "edit";
  /** Required when mode === "edit". */
  propertyId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/**
 * Extracted from PropertyManager — owns all form + premium + images + translations
 * state. Behavior is preserved 1:1 from the original inline dialogs.
 */
export function PropertyEditor({ open, mode, propertyId, onOpenChange, onSaved }: PropertyEditorProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [premiumFields, setPremiumFields] = useState<PremiumFieldsData>({ ...defaultPremiumFields });
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingLong, setIsTranslatingLong] = useState(false);
  const [isTranslatingInsight, setIsTranslatingInsight] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const isCazare = formData.listing_type === "cazare";
  const isVanzare = formData.listing_type === "vanzare";
  const isInchiriere = formData.listing_type === "inchiriere";
  const isInvestitie = formData.listing_type === "investitie";
  const showBookingFields = isCazare || isInvestitie;
  const showInvestmentFields = isVanzare || isInvestitie || isInchiriere;

  const resetLocal = useCallback(() => {
    setFormData(initialFormData);
    setPremiumFields({ ...defaultPremiumFields });
    setPropertyImages([]);
    setEditingProperty(null);
    setSaveSuccess(false);
  }, []);

  // Load full property when opening in edit mode.
  useEffect(() => {
    if (!open) return;
    if (mode === "add") {
      resetLocal();
      return;
    }
    if (mode === "edit" && propertyId) {
      let cancelled = false;
      (async () => {
        setIsLoadingProperty(true);
        try {
          const { data: property, error } = await supabase
            .from("properties")
            .select("*")
            .eq("id", propertyId)
            .single();
          if (error) throw error;

          const { data: contactRow } = await supabase
            .from("property_contact_details" as any)
            .select("contact_name, contact_phone, contact_email")
            .eq("property_id", propertyId)
            .maybeSingle();
          const contact: any = contactRow || {};

          const { data: images } = await supabase
            .from("property_images")
            .select("*")
            .eq("property_id", propertyId)
            .order("display_order", { ascending: true });

          if (cancelled) return;
          setEditingProperty(property);
          setPropertyImages(images || []);
          setFormData({
            name: property.name,
            location: property.location,
            description_ro: property.description_ro ?? "",
            description_en: property.description_en ?? "",
            features: (property.features || []).join(", "),
            booking_url: property.booking_url ?? "",
            tag: property.tag ?? "",
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
            contact_name: contact.contact_name || "",
            contact_phone: contact.contact_phone || "",
            contact_email: contact.contact_email || "",
            source_url: property.source_url || "",
            source_platform: property.source_platform || "",
            capacity: property.capacity?.toString() || "",
            bedrooms: property.bedrooms?.toString() || "",
            latitude: property.latitude?.toString() || "",
            longitude: property.longitude?.toString() || "",
            expert_insight_ro: property.expert_insight_ro || "",
            expert_insight_en: property.expert_insight_en || "",
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
            rooms: property.rooms,
            kitchens: property.kitchens,
            comfort_level: property.comfort_level,
            property_subtype: property.property_subtype,
            height_regime: property.height_regime,
            destination: property.destination,
          });
        } catch (err) {
          console.error("Error loading property:", err);
          toast({
            title: t.admin.error,
            description: "Nu s-a putut încărca proprietatea",
            variant: "destructive",
          });
        } finally {
          if (!cancelled) setIsLoadingProperty(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [open, mode, propertyId, resetLocal, t.admin.error]);

  // Auto-calc ROI on investitie
  const calculateROI = useCallback((fd: PropertyFormData): { roi: string; revenue: string } | null => {
    const rate = fd.base_price_per_night ? parseFloat(fd.base_price_per_night) : 0;
    const capital = fd.capital_necesar ? parseFloat(fd.capital_necesar) : 0;
    if (!rate || !capital || capital <= 0) return null;
    const occupancy = 0.75;
    const monthlyGross = rate * 30 * occupancy;
    const annualGross = monthlyGross * 12;
    const netFactor = 1 - 0.2 - 0.07;
    const annualNet = annualGross * netFactor;
    const roi = (annualNet / capital) * 100;
    return {
      roi: `${roi.toFixed(1)}%`,
      revenue: `${Math.round(monthlyGross * netFactor)}–${Math.round(monthlyGross)} €/lună`,
    };
  }, []);

  useEffect(() => {
    if (formData.listing_type !== "investitie") return;
    const result = calculateROI(formData);
    if (result && (result.roi !== formData.roi_percentage || result.revenue !== formData.estimated_revenue)) {
      setFormData((prev) => ({ ...prev, roi_percentage: result.roi, estimated_revenue: result.revenue }));
    }
  }, [formData.base_price_per_night, formData.capital_necesar, formData.listing_type, calculateROI, formData]);

  const savePropertyContactDetails = async (pid: string, data: PropertyFormData) => {
    const hasContact = data.contact_name || data.contact_phone || data.contact_email;
    const contactPayload = {
      property_id: pid,
      contact_name: data.contact_name || null,
      contact_phone: data.contact_phone || null,
      contact_email: data.contact_email || null,
    };
    if (hasContact) {
      const { error } = await supabase
        .from("property_contact_details" as any)
        .upsert(contactPayload as any, { onConflict: "property_id" });
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from("property_contact_details" as any)
      .delete()
      .eq("property_id", pid);
    if (error) throw error;
  };

  const getRequiredFields = (listingType: string) => {
    const base = ["name", "location"] as const;
    if (listingType === "cazare")
      return { fields: [...base, "booking_url"] as const, label: "Nume, Locație și URL Rezervare" };
    return { fields: [...base] as const, label: "Nume și Locație" };
  };

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
        setFormData((prev) => ({ ...prev, description_en: data.translated }));
        toast({ title: "✅ Descriere tradusă în engleză!" });
      } else throw new Error("No translation returned");
    } catch (err: any) {
      toast({ title: "Eroare la traducere", description: err.message, variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const buildPropertyPayload = (imagePath: string | null | undefined) => ({
    name: formData.name,
    location: formData.location,
    latitude: formData.latitude ? parseFloat(formData.latitude) : null,
    longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    description_ro: formData.description_ro,
    description_en: formData.description_en,
    features: formData.features.split(",").map((f) => f.trim()).filter((f) => f.length > 0),
    booking_url: formData.booking_url || "-",
    tag: formData.tag,
    ...(imagePath !== undefined ? { image_path: imagePath } : {}),
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
    source_url: formData.source_url || null,
    source_platform: formData.source_platform || null,
    capacity: formData.capacity ? parseInt(formData.capacity) : null,
    bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
    expert_insight_ro: formData.expert_insight_ro || null,
    expert_insight_en: formData.expert_insight_en || null,
    ...premiumFields,
  });

  const handleSave = async () => {
    const { fields, label } = getRequiredFields(formData.listing_type);
    const missing = fields.some((f) => !formData[f]);
    if (missing || (mode === "edit" && !editingProperty)) {
      toast({
        title: "Completează câmpurile obligatorii",
        description: `${label} sunt obligatorii.`,
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "add") {
        const { data: inserted, error } = await supabase
          .from("properties")
          .insert(buildPropertyPayload(undefined) as any)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted?.id) await savePropertyContactDetails(inserted.id, formData);
        toast({ title: "✅ Proprietate adăugată cu succes!" });
      } else {
        const primaryImage = propertyImages.find((img) => img.is_primary);
        const imagePath = primaryImage?.image_path || (propertyImages[0]?.image_path ?? null);
        const { error } = await supabase
          .from("properties")
          .update(buildPropertyPayload(imagePath) as any)
          .eq("id", editingProperty.id);
        if (error) throw error;
        await savePropertyContactDetails(editingProperty.id, formData);
        toast({ title: "✅ Proprietate actualizată cu succes!" });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onOpenChange(false);
        resetLocal();
        onSaved();
      }, 1200);
    } catch (err) {
      console.error("Error saving property:", err);
      toast({
        title: t.admin.error,
        description:
          mode === "add"
            ? t.admin.properties?.addError || "Could not add property"
            : t.admin.properties?.editError || "Could not update property",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const showGallery = mode === "edit" && !!editingProperty;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetLocal();
      }}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add"
              ? t.admin.properties?.addProperty || "Add Property"
              : t.admin.properties?.editProperty || "Edit Property"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? t.admin.properties?.addDescription || "Add a new property to the portfolio"
              : t.admin.properties?.editDescription || "Update the property details"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingProperty ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Listing Type */}
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
                    onChange={(e) =>
                      setFormData({ ...formData, listing_type: e.target.value, status_operativ: e.target.value })
                    }
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

            {/* Basic info */}
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

            {/* Map */}
            <div className="p-4 bg-accent/10 rounded-xl border-2 border-primary/30 space-y-2">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                📍 Map Location Picker — Alege poziția pe hartă
              </h3>
              <p className="text-xs text-muted-foreground">
                Click pe hartă sau caută o adresă pentru a seta coordonatele GPS precise.
              </p>
              <MapLocationPicker
                latitude={formData.latitude ? parseFloat(formData.latitude) : null}
                longitude={formData.longitude ? parseFloat(formData.longitude) : null}
                onLocationChange={(lat, lng) =>
                  setFormData((prev) => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }))
                }
                locationText={formData.location}
              />
            </div>

            {/* Capacity + Bedrooms */}
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

            {/* Contact proprietar */}
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
                  {isTranslating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Languages className="w-3 h-3" />
                  )}
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

            {/* Expert Insight */}
            <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-foreground">Expert Insight</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Generează automat sau completează manual textul Expert Insight (The Advisor).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["ro", "en"] as const).map((lang) => (
                  <Button
                    key={lang}
                    type="button"
                    onClick={async () => {
                      if (!formData.name) {
                        toast({ title: "Completează numele proprietății", variant: "destructive" });
                        return;
                      }
                      setIsGeneratingInsight(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("generate-advisor-content", {
                          body: {
                            propertyName: formData.name,
                            propertySlug: editingProperty?.slug || formData.name,
                            location: formData.location,
                            size: premiumFields.usable_area || premiumFields.built_area,
                            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
                            bathrooms: null,
                            capacity: formData.capacity ? parseInt(formData.capacity) : null,
                            floor: premiumFields.floor,
                            pricePerNight: formData.base_price_per_night
                              ? parseFloat(formData.base_price_per_night)
                              : null,
                            amenities: formData.features
                              ? formData.features.split(",").map((f) => f.trim())
                              : [],
                            listingType: formData.listing_type || "cazare",
                            yearBuilt: premiumFields.renovation_year,
                            energyClass: premiumFields.energy_class,
                            roi: formData.roi_percentage,
                            language: lang,
                            forceRegenerate: true,
                          },
                        });
                        if (error) throw error;
                        const insight = data?.expertInsight || "";
                        setFormData((prev) => ({
                          ...prev,
                          ...(lang === "ro"
                            ? { expert_insight_ro: insight }
                            : { expert_insight_en: insight }),
                        }));
                        toast({ title: `✅ Expert Insight ${lang.toUpperCase()} generat!` });
                      } catch (err: any) {
                        toast({
                          title: "Eroare la generare",
                          description: err.message,
                          variant: "destructive",
                        });
                      } finally {
                        setIsGeneratingInsight(false);
                      }
                    }}
                    disabled={isGeneratingInsight}
                    className={
                      lang === "ro"
                        ? "w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
                        : "w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                    }
                  >
                    {isGeneratingInsight ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se generează...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generează Expert Insight ({lang.toUpperCase()})
                      </>
                    )}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Expert Insight (RO)</Label>
                <Textarea
                  value={formData.expert_insight_ro}
                  onChange={(e) => setFormData({ ...formData, expert_insight_ro: e.target.value })}
                  placeholder="Text personalizat pentru Expert Insight în română..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Expert Insight (EN)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!formData.expert_insight_ro) {
                        toast({
                          title: "Completează mai întâi Expert Insight (RO)",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsTranslatingInsight(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("translate-text", {
                          body: {
                            text: formData.expert_insight_ro,
                            sourceLang: "Romanian",
                            targetLang: "English",
                          },
                        });
                        if (error) throw new Error(error.message);
                        if (data?.translated) {
                          setFormData((prev) => ({ ...prev, expert_insight_en: data.translated }));
                          toast({ title: "✅ Expert Insight tradus în engleză!" });
                        } else throw new Error("No translation returned");
                      } catch (err: any) {
                        toast({
                          title: "Eroare la traducere",
                          description: err.message,
                          variant: "destructive",
                        });
                      } finally {
                        setIsTranslatingInsight(false);
                      }
                    }}
                    disabled={isTranslatingInsight || !formData.expert_insight_ro}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {isTranslatingInsight ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Languages className="w-3 h-3" />
                    )}
                    Traducere Auto
                  </Button>
                </div>
                <Textarea
                  value={formData.expert_insight_en}
                  onChange={(e) => setFormData({ ...formData, expert_insight_en: e.target.value })}
                  placeholder="Custom Expert Insight text in English..."
                  rows={4}
                />
              </div>
            </div>

            {/* CAZARE / INVESTITIE booking-related fields */}
            {showBookingFields && (
              <>
                <div className="space-y-2">
                  <Label>URL Rezervare {isCazare ? "*" : ""}</Label>
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
                        onChange={(e) =>
                          setFormData({ ...formData, booking_review_count: e.target.value })
                        }
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
                      onChange={(e) =>
                        setFormData({ ...formData, base_price_per_night: e.target.value })
                      }
                      placeholder="45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preț weekend / noapte (€)</Label>
                    <Input
                      type="number"
                      value={formData.weekend_price_per_night}
                      onChange={(e) =>
                        setFormData({ ...formData, weekend_price_per_night: e.target.value })
                      }
                      placeholder="55"
                    />
                  </div>
                </div>
              </>
            )}

            {/* VANZARE / INCHIRIERE / INVESTITIE */}
            {showInvestmentFields && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-foreground">
                    {isVanzare ? "Date Vânzare" : isInchiriere ? "Date Închiriere" : "Date Investiție"}
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
                    {isInchiriere ? "Chirie lunară în EUR" : "Prețul total în EUR"}
                  </p>
                </div>

                {isInvestitie && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Venit Estimat (€/lună)</Label>
                      <Input
                        value={formData.estimated_revenue}
                        onChange={(e) =>
                          setFormData({ ...formData, estimated_revenue: e.target.value })
                        }
                        placeholder="1.450"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ROI (%)</Label>
                      <Input
                        value={formData.roi_percentage}
                        onChange={(e) =>
                          setFormData({ ...formData, roi_percentage: e.target.value })
                        }
                        placeholder="9.4"
                      />
                    </div>
                  </div>
                )}

                {isInvestitie && (
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

            {/* Pricing manager */}
            {showGallery && isCazare && (
              <PropertyPricingManager
                propertyId={editingProperty.id}
                basePricePerNight={
                  formData.base_price_per_night ? parseFloat(formData.base_price_per_night) : null
                }
                weekendPricePerNight={
                  formData.weekend_price_per_night ? parseFloat(formData.weekend_price_per_night) : null
                }
                onBasePriceChange={(val) => setFormData({ ...formData, base_price_per_night: val })}
                onWeekendPriceChange={(val) => setFormData({ ...formData, weekend_price_per_night: val })}
              />
            )}

            {/* Calendar */}
            {showGallery && isCazare && (
              <PropertyBookingsCalendar
                propertyId={editingProperty.id}
                propertyName={editingProperty.name}
              />
            )}

            {/* Gallery */}
            {showGallery && (
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
              onChange={(key, value) => setPremiumFields((prev) => ({ ...prev, [key]: value }))}
              isTranslatingLong={isTranslatingLong}
              onTranslateLongToEN={async () => {
                if (!premiumFields.long_description_ro) {
                  toast({
                    title: "Completează mai întâi Descrierea detaliată RO",
                    variant: "destructive",
                  });
                  return;
                }
                setIsTranslatingLong(true);
                try {
                  const { data, error } = await supabase.functions.invoke("translate-text", {
                    body: {
                      text: premiumFields.long_description_ro,
                      sourceLang: "Romanian",
                      targetLang: "English",
                    },
                  });
                  if (error) throw new Error(error.message);
                  if (data?.translated) {
                    setPremiumFields((prev) => ({ ...prev, long_description_en: data.translated }));
                    toast({ title: "✅ Descriere detaliată tradusă în engleză!" });
                  } else throw new Error("No translation returned");
                } catch (err: any) {
                  toast({
                    title: "Eroare la traducere",
                    description: err.message,
                    variant: "destructive",
                  });
                } finally {
                  setIsTranslatingLong(false);
                }
              }}
            />

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>{t.admin.properties?.isActive || "Activă"}</Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.admin.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || saveSuccess || isLoadingProperty}
            className={saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saveSuccess
              ? "✅ Salvat!"
              : isSaving
              ? "Se salvează..."
              : t.admin.properties?.save || "Salvează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PropertyEditor;
