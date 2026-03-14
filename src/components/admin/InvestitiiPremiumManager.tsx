import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  TrendingUp, Edit, Star, Euro, Users, Bed, Maximize2, ExternalLink,
  Eye, EyeOff, MapPin, Plus, Save, Loader2, Trash2, Bath, Languages,
  Phone, User, Mail, Link2, Filter, Search, RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import PropertyImageGallery from "./PropertyImageGallery";
import { Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

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
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  source_url: string | null;
  source_platform: string | null;
  created_at: string;
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
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  source_url: null,
  source_platform: null,
  created_at: new Date().toISOString(),
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

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState<string>("all");
  const [filterPriceRange, setFilterPriceRange] = useState<string>("all");
  const [filterCapacity, setFilterCapacity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterContact, setFilterContact] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterRoiMin, setFilterRoiMin] = useState<string>("");
  const [filterCapitalMin, setFilterCapitalMin] = useState<string>("");
  const [filterCapitalMax, setFilterCapitalMax] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true);

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
        contact_name: d.contact_name ?? null,
        contact_phone: d.contact_phone ?? null,
        contact_email: d.contact_email ?? null,
        source_url: d.source_url ?? null,
        source_platform: d.source_platform ?? null,
        created_at: d.created_at ?? new Date().toISOString(),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchProperties(); }, []);

  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          properties
            .map((p) => p.source_platform?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, "ro", { sensitivity: "base" })),
    [properties]
  );

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matches =
          p.name.toLowerCase().includes(term) ||
          p.location.toLowerCase().includes(term) ||
          (p.contact_name && p.contact_name.toLowerCase().includes(term)) ||
          (p.contact_phone && p.contact_phone.includes(term)) ||
          (p.contact_email && p.contact_email.toLowerCase().includes(term)) ||
          (p.source_platform && p.source_platform.toLowerCase().includes(term)) ||
          (p.source_url && p.source_url.toLowerCase().includes(term));

        if (!matches) return false;
      }

      if (filterBedrooms !== "all") {
        if (filterBedrooms === "4plus") {
          if (p.bedrooms < 4) return false;
        } else if (p.bedrooms !== Number.parseInt(filterBedrooms, 10)) {
          return false;
        }
      }

      if (filterCapacity !== "all" && p.capacity < Number.parseInt(filterCapacity, 10)) return false;

      const capital = p.capital_necesar || 0;
      if (filterPriceRange !== "all") {
        if (filterPriceRange === "under100k" && capital >= 100000) return false;
        if (filterPriceRange === "100k-150k" && (capital < 100000 || capital > 150000)) return false;
        if (filterPriceRange === "150k-200k" && (capital < 150000 || capital > 200000)) return false;
        if (filterPriceRange === "over200k" && capital < 200000) return false;
      }

      if (filterCapitalMin && capital < Number.parseInt(filterCapitalMin, 10)) return false;
      if (filterCapitalMax && capital > Number.parseInt(filterCapitalMax, 10)) return false;

      if (filterStatus === "active" && !p.is_active) return false;
      if (filterStatus === "inactive" && p.is_active) return false;

      const hasContact = Boolean(p.contact_name || p.contact_phone || p.contact_email);
      if (filterContact === "with" && !hasContact) return false;
      if (filterContact === "without" && hasContact) return false;

      if (filterSource === "manual" && p.source_url) return false;
      if (filterSource !== "all" && filterSource !== "manual") {
        const normalizedSource = p.source_platform?.trim().toLowerCase() || "";
        if (normalizedSource !== filterSource.toLowerCase()) return false;
      }

      if (filterRoiMin) {
        const roiValue = Number.parseFloat((p.roi_percentage || "").replace(",", ".").replace("%", "").trim());
        if (Number.isNaN(roiValue) || roiValue < Number.parseFloat(filterRoiMin)) return false;
      }

      return true;
    });
  }, [
    properties,
    searchTerm,
    filterBedrooms,
    filterPriceRange,
    filterCapacity,
    filterStatus,
    filterContact,
    filterSource,
    filterRoiMin,
    filterCapitalMin,
    filterCapitalMax,
  ]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        searchTerm ||
          filterBedrooms !== "all" ||
          filterPriceRange !== "all" ||
          filterCapacity !== "all" ||
          filterStatus !== "all" ||
          filterContact !== "all" ||
          filterSource !== "all" ||
          filterRoiMin ||
          filterCapitalMin ||
          filterCapitalMax
      ),
    [
      searchTerm,
      filterBedrooms,
      filterPriceRange,
      filterCapacity,
      filterStatus,
      filterContact,
      filterSource,
      filterRoiMin,
      filterCapitalMin,
      filterCapitalMax,
    ]
  );

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterBedrooms("all");
    setFilterPriceRange("all");
    setFilterCapacity("all");
    setFilterStatus("all");
    setFilterContact("all");
    setFilterSource("all");
    setFilterRoiMin("");
    setFilterCapitalMin("");
    setFilterCapitalMax("");
  }, []);


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
    setPropertyImages([]);
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
      contact_name: editingProperty.contact_name,
      contact_phone: editingProperty.contact_phone,
      contact_email: editingProperty.contact_email,
      source_url: editingProperty.source_url,
      source_platform: editingProperty.source_platform,
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

  const calculateROI = useCallback((property: InvestProperty): InvestProperty => {
    const rate = property.base_price_per_night;
    const capital = property.capital_necesar;
    if (!rate || !capital || capital <= 0) return property;

    const occupancy = 0.75;
    const monthlyGross = rate * 30 * occupancy;
    const annualGross = monthlyGross * 12;
    const netFactor = 1 - 0.20 - 0.07;
    const annualNet = annualGross * netFactor;
    const roi = (annualNet / capital) * 100;

    return {
      ...property,
      roi_percentage: `${roi.toFixed(1)}%`,
      estimated_revenue: `${Math.round(monthlyGross * netFactor)}–${Math.round(monthlyGross)} €/lună`,
    };
  }, []);

  useEffect(() => {
    if (!editingProperty) return;
    const { base_price_per_night, capital_necesar } = editingProperty;
    if (!base_price_per_night || !capital_necesar || capital_necesar <= 0) return;
    
    const updated = calculateROI(editingProperty);
    if (updated.roi_percentage !== editingProperty.roi_percentage || 
        updated.estimated_revenue !== editingProperty.estimated_revenue) {
      setEditingProperty(updated);
    }
  }, [editingProperty?.base_price_per_night, editingProperty?.capital_necesar, calculateROI]);

  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslateToEN = async () => {
    if (!editingProperty?.description_ro) {
      toast({ title: "Completează mai întâi Descrierea RO", variant: "destructive" });
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text: editingProperty.description_ro, sourceLang: "Romanian", targetLang: "English" },
      });
      if (error) throw new Error(error.message);
      if (data?.translated) {
        setEditingProperty(prev => prev ? { ...prev, description_en: data.translated } : prev);
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

  const updateField = <K extends keyof InvestProperty>(key: K, value: InvestProperty[K]) => {
    if (!editingProperty) return;
    const updated = { ...editingProperty, [key]: value };
    setEditingProperty(updated);
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

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută după nume, locație, contact, telefon, email, platformă..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg border border-border">
            <div>
              <Label className="text-xs mb-1">Camere</Label>
              <Select value={filterBedrooms} onValueChange={setFilterBedrooms}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="1">1 cameră</SelectItem>
                  <SelectItem value="2">2 camere</SelectItem>
                  <SelectItem value="3">3 camere</SelectItem>
                  <SelectItem value="4plus">4+ camere</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1">Capital (interval)</Label>
              <Select value={filterPriceRange} onValueChange={setFilterPriceRange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="under100k">&lt; 100.000 €</SelectItem>
                  <SelectItem value="100k-150k">100–150k €</SelectItem>
                  <SelectItem value="150k-200k">150–200k €</SelectItem>
                  <SelectItem value="over200k">&gt; 200.000 €</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1">Capacitate minimă</Label>
              <Select value={filterCapacity} onValueChange={setFilterCapacity}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="2">2+ persoane</SelectItem>
                  <SelectItem value="4">4+ persoane</SelectItem>
                  <SelectItem value="6">6+ persoane</SelectItem>
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

            <div>
              <Label className="text-xs mb-1">Capital minim (€)</Label>
              <Input
                type="number"
                min={0}
                value={filterCapitalMin}
                onChange={(e) => setFilterCapitalMin(e.target.value)}
                placeholder="ex: 100000"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs mb-1">Capital maxim (€)</Label>
              <Input
                type="number"
                min={0}
                value={filterCapitalMax}
                onChange={(e) => setFilterCapitalMax(e.target.value)}
                placeholder="ex: 180000"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs mb-1">ROI minim (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={filterRoiMin}
                onChange={(e) => setFilterRoiMin(e.target.value)}
                placeholder="ex: 8"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs mb-1">Date contact</Label>
              <Select value={filterContact} onValueChange={setFilterContact}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="with">Cu contact</SelectItem>
                  <SelectItem value="without">Fără contact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <Label className="text-xs mb-1">Platformă sursă</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Toate sursele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate sursele</SelectItem>
                  <SelectItem value="manual">Manual (fără sursă)</SelectItem>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
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
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Proprietate</TableHead>
              <TableHead className="min-w-[120px]">Locație</TableHead>
              <TableHead className="min-w-[100px] text-center">Preț/Noapte</TableHead>
              <TableHead className="text-center min-w-[60px]">Capacitate</TableHead>
              <TableHead className="text-center min-w-[60px]">Camere</TableHead>
              <TableHead className="text-center min-w-[60px]">ROI</TableHead>
              <TableHead className="text-center min-w-[100px]">Capital</TableHead>
              <TableHead className="min-w-[140px]">Contact</TableHead>
              <TableHead className="min-w-[100px]">Sursă</TableHead>
              <TableHead className="min-w-[80px]">Adăugat</TableHead>
              <TableHead className="text-center min-w-[70px]">Status</TableHead>
              <TableHead className="w-[100px]">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProperties.map((property) => (
              <TableRow key={property.id} className={!property.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {property.image_path && (
                      <img src={property.image_path} alt={property.name} className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate max-w-[200px]">{property.name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />{property.location.split(",")[0]}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{property.base_price_per_night ? `${property.base_price_per_night} €` : "–"}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{property.capacity ?? "–"}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{property.bedrooms}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-sm text-primary">{property.roi_percentage ?? "–"}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">{property.capital_necesar ? `${property.capital_necesar.toLocaleString()} €` : "–"}</span>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 min-w-0">
                    {property.contact_name && (
                      <p className="text-xs font-medium text-foreground flex items-center gap-1 truncate">
                        <User className="w-3 h-3 shrink-0" />{property.contact_name}
                      </p>
                    )}
                    {property.contact_phone && (
                      <a href={`tel:${property.contact_phone}`} className="text-xs text-green-600 flex items-center gap-1 hover:underline">
                        <Phone className="w-3 h-3 shrink-0" />{property.contact_phone}
                      </a>
                    )}
                    {property.contact_email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />{property.contact_email}
                      </p>
                    )}
                    {!property.contact_name && !property.contact_phone && !property.contact_email && (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {property.source_url ? (
                    <a href={property.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />{property.source_platform || "Link"}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(property.created_at), "dd MMM yyyy", { locale: ro })}
                  </span>
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

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Date Contact Proprietar
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">Aceste date sunt vizibile doar în panoul admin, nu sunt publice.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><User className="w-3 h-3" />Nume proprietar</Label>
                    <Input value={editingProperty.contact_name || ""} onChange={(e) => updateField("contact_name", e.target.value || null)} placeholder="Ion Popescu" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Phone className="w-3 h-3" />Telefon proprietar</Label>
                    <Input value={editingProperty.contact_phone || ""} onChange={(e) => updateField("contact_phone", e.target.value || null)} placeholder="0721 123 456" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Mail className="w-3 h-3" />Email proprietar</Label>
                    <Input value={editingProperty.contact_email || ""} onChange={(e) => updateField("contact_email", e.target.value || null)} placeholder="email@exemplu.ro" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><Link2 className="w-3 h-3" />Link anunț original</Label>
                    <Input value={editingProperty.source_url || ""} onChange={(e) => updateField("source_url", e.target.value || null)} placeholder="https://olx.ro/..." />
                  </div>
                  <div>
                    <Label>Platformă sursă</Label>
                    <Input value={editingProperty.source_platform || ""} onChange={(e) => updateField("source_platform", e.target.value || null)} placeholder="OLX, Imobiliare.ro, etc." />
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
                    <div className="flex items-center justify-between mb-1">
                      <Label>Descriere EN</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateToEN}
                        disabled={isTranslating || !editingProperty.description_ro}
                        className="h-7 text-xs gap-1"
                      >
                        {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                        {isTranslating ? "Se traduce..." : "Traducere Auto"}
                      </Button>
                    </div>
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

              {/* Image Gallery */}
              {!isNew && editingProperty.id ? (
                <PropertyImageGallery
                  propertyId={editingProperty.id}
                  images={propertyImages}
                  onImagesChange={setPropertyImages}
                />
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-5 h-5" />
                    <p className="text-sm">Galeria de imagini va fi disponibilă după salvarea proprietății</p>
                  </div>
                </div>
              )}
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
