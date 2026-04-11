import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, LinkIcon, CheckCircle2, ImageIcon, MapPin, Ruler,
  BedDouble, BadgeEuro, AlertCircle, ExternalLink, Eye, Save,
  Bath, Building2, Thermometer, Zap, Sofa, Car, Layers, CalendarDays, PenLine,
  Sparkles, RefreshCw, Copy, Check, Phone, User, Mail, ChevronRight, ChevronLeft,
  TrendingUp, Wallet, Wrench, Database
} from "lucide-react";
import ImageOptimizationPanel from "./ImageOptimizationPanel";
import MapLocationPicker from "./MapLocationPicker";
import { useQuery } from "@tanstack/react-query";

interface ExtractedData {
  title: string | null;
  description_short: string | null;
  description_full: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  size: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  year_built: number | null;
  parking: string | null;
  heating_type: string | null;
  energy_class: string | null;
  furnished: string | null;
  construction_type: string | null;
  compartimentare: string | null;
  features: string[];
  images: string[];
  listing_type_hint: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  source_url: string;
  source_platform: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface RewrittenData {
  title: string;
  description_short: string;
  description_full: string;
}

const LISTING_TYPES = [
  { value: "vanzare", label: "Vânzare" },
  { value: "inchiriere", label: "Închiriere" },
  { value: "cazare", label: "Cazare (regim hotelier)" },
  { value: "investitie", label: "Investiție Premium" },
];

const TONE_OPTIONS = [
  { value: "premium", label: "🏆 Premium", desc: "Sofisticat, exclusivist" },
  { value: "persuasiv", label: "🎯 Persuasiv", desc: "Orientat spre acțiune" },
  { value: "informativ", label: "📊 Informativ", desc: "Factual, analitic" },
];

const STEPS = [
  { label: "Import", icon: <LinkIcon className="w-4 h-4" /> },
  { label: "Editare", icon: <PenLine className="w-4 h-4" /> },
  { label: "Finalizare", icon: <CheckCircle2 className="w-4 h-4" /> },
];

const ListingImporter = () => {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [listingType, setListingType] = useState("vanzare");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [editData, setEditData] = useState<ExtractedData | null>(null);
  const [allOriginalImages, setAllOriginalImages] = useState<string[]>([]);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Rewrite state
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteTone, setRewriteTone] = useState("premium");
  const [rewritten, setRewritten] = useState<RewrittenData | null>(null);
  const [appliedRewrite, setAppliedRewrite] = useState(false);

  // Financial fields for regim hotelier
  const [estimatedMonthlyRevenue, setEstimatedMonthlyRevenue] = useState("");
  const [annualOperatingCosts, setAnnualOperatingCosts] = useState("");
  const [initialSetupCost, setInitialSetupCost] = useState("");

  // Scraper leads for quick pick
  const { data: scraperLeads } = useQuery({
    queryKey: ["scraper-leads-for-import"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scraper_leads" as any)
        .select("id, title, source_url, location, price, rooms, size, lead_score, source_platform")
        .eq("status", "new")
        .order("lead_score", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
  });

  // Step 1: Preview / extract
  const handlePreview = async (targetUrl?: string) => {
    const extractUrl = targetUrl || url.trim();
    if (!extractUrl) {
      toast({ title: "Eroare", description: "Introdu un URL valid", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setExtracted(null);
    setEditData(null);
    setSaveResult(null);
    setError(null);
    setRewritten(null);
    setAppliedRewrite(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("scrape-listing", {
        body: { url: extractUrl, listing_type: listingType, mode: "preview" },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Extracție eșuată");

      setExtracted(data.extracted);
      setEditData({ ...data.extracted });
      setAllOriginalImages([...(data.extracted.images || [])]);
      if (data.extracted.listing_type_hint) {
        setListingType(data.extracted.listing_type_hint);
      }
      setStep(1); // Auto-advance to edit step
      toast({ title: "✅ Date extrase!", description: "Verifică și editează înainte de salvare." });
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickScraperLead = (lead: any) => {
    setUrl(lead.source_url);
    handlePreview(lead.source_url);
  };

  // AI Rewrite
  const handleRewrite = async () => {
    if (!editData) return;
    setIsRewriting(true);
    setRewritten(null);
    setAppliedRewrite(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("rewrite-listing-description", {
        body: {
          propertyData: {
            title: editData.title,
            description_short: editData.description_short,
            description_full: editData.description_full,
            price: editData.price,
            currency: editData.currency,
            location: editData.location,
            size: editData.size,
            rooms: editData.rooms,
            bathrooms: editData.bathrooms,
            floor: editData.floor,
            year_built: editData.year_built,
            parking: editData.parking,
            heating_type: editData.heating_type,
            energy_class: editData.energy_class,
            furnished: editData.furnished,
            construction_type: editData.construction_type,
            compartimentare: editData.compartimentare,
            features: editData.features,
          },
          listingType,
          tone: rewriteTone,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Rescriere eșuată");

      setRewritten(data.rewritten);
      toast({ title: "✨ Text premium generat!", description: "Previzualizează și aplică dacă ești mulțumit." });
    } catch (err: any) {
      toast({ title: "Eroare la rescriere", description: err.message, variant: "destructive" });
    } finally {
      setIsRewriting(false);
    }
  };

  const applyRewrite = () => {
    if (!rewritten || !editData) return;
    setEditData({
      ...editData,
      title: rewritten.title || editData.title,
      description_short: rewritten.description_short || editData.description_short,
      description_full: rewritten.description_full || editData.description_full,
    });
    setAppliedRewrite(true);
    toast({ title: "✅ Text aplicat!", description: "Textul premium a fost aplicat în câmpurile de editare." });
  };

  // Step 3: Save
  const handleSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("scrape-listing", {
        body: { 
          url: url.trim(), 
          listing_type: listingType, 
          mode: "save", 
          editedData: {
            ...editData,
            allOriginalImages,
          },
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Salvare eșuată");

      // If regim hotelier with financials, also save to property_listings
      if (listingType === "cazare" && estimatedMonthlyRevenue) {
        await supabase.from("property_listings").insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: editData.title || "Import",
          property_type: "apartament",
          listing_category: "regim_hotelier",
          location: editData.location,
          size: editData.size,
          rooms: editData.rooms,
          bathrooms: editData.bathrooms,
          price: editData.price,
          estimated_monthly_revenue: parseFloat(estimatedMonthlyRevenue) || 0,
          annual_operating_costs: parseFloat(annualOperatingCosts) || 0,
          initial_setup_cost: parseFloat(initialSetupCost) || 0,
          status: "approved",
        } as any]).then(() => {});
      }

      setSaveResult(data);
      setStep(2); // Advance to success step
      const draftsMsg = data.drafts_saved > 0 ? ` + ${data.drafts_saved} salvate ca draft` : "";
      toast({
        title: "✅ Anunț importat!",
        description: `„${data.property.name}" — ${data.images_uploaded} imagini publicate${draftsMsg}.`,
      });
    } catch (err: any) {
      toast({ title: "Eroare la salvare", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: keyof ExtractedData, value: any) => {
    if (!editData) return;
    setEditData({ ...editData, [key]: value });
  };

  const renderFieldRow = (
    icon: React.ReactNode,
    label: string,
    key: keyof ExtractedData,
    type: "text" | "number" | "textarea" = "text",
    placeholder?: string
  ) => {
    const val = editData?.[key];
    return (
      <div className="flex items-start gap-3">
        <div className="mt-2.5 text-muted-foreground">{icon}</div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          {type === "textarea" ? (
            <Textarea
              value={(val as string) || ""}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="text-sm"
            />
          ) : (
            <Input
              type={type}
              value={val !== null && val !== undefined ? String(val) : ""}
              onChange={(e) => updateField(key, type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
              placeholder={placeholder}
              className="text-sm h-9"
            />
          )}
        </div>
      </div>
    );
  };

  const resetAll = () => {
    setStep(0);
    setUrl("");
    setExtracted(null);
    setEditData(null);
    setSaveResult(null);
    setError(null);
    setRewritten(null);
    setAppliedRewrite(false);
    setEstimatedMonthlyRevenue("");
    setAnnualOperatingCosts("");
    setInitialSetupCost("");
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => { if (i < step) setStep(i); }}
              disabled={i > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                i === step
                  ? "bg-primary text-primary-foreground shadow-md"
                  : i < step
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ═══ STEP 0: IMPORT ═══ */}
      {step === 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Wizard Import Anunț
              </CardTitle>
              <CardDescription>
                Lipește un URL sau alege din lead-urile scraper. Datele sunt extrase automat cu AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL Anunț</Label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setExtracted(null); setEditData(null); }}
                  placeholder="https://www.olx.ro/d/oferta/..."
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label>Tip Listing</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {LISTING_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setListingType(opt.value)}
                      disabled={isLoading}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        listingType === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handlePreview()}
                disabled={isLoading || !url.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se extrag datele... (30-60s)</>
                ) : (
                  <><Eye className="w-4 h-4 mr-2" />Previzualizează &amp; Extrage Date</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick pick from scraper leads */}
          {scraperLeads && scraperLeads.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-4 h-4" />
                  Import Rapid din Oportunități AI
                </CardTitle>
                <CardDescription className="text-xs">
                  Alege un lead din scraper pentru a importa datele direct.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scraperLeads.map((lead: any) => (
                    <button
                      key={lead.id}
                      onClick={() => handlePickScraperLead(lead)}
                      disabled={isLoading}
                      className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.title || "Fără titlu"}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {lead.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.location}</span>}
                          {lead.price && <span className="flex items-center gap-1"><BadgeEuro className="w-3 h-3" />{Number(lead.price).toLocaleString()}€</span>}
                          {lead.rooms && <span>{lead.rooms} cam.</span>}
                          {lead.size && <span>{lead.size}m²</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lead.lead_score > 80 && <Badge className="bg-green-100 text-green-800 text-[10px]">🔥 {lead.lead_score}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{lead.source_platform}</Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Eroare la extragere</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══ STEP 1: EDIT ═══ */}
      {step === 1 && editData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                Verifică &amp; Editează Datele
              </CardTitle>
              <Badge variant="outline">{editData.source_platform}</Badge>
            </div>
            <CardDescription>
              Datele au fost extrase automat. Editează ce e necesar, apoi avansează.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main fields */}
            {renderFieldRow(<Building2 className="w-4 h-4" />, "Titlu / Nume", "title", "text", "Apartament 2 camere...")}
            {renderFieldRow(<MapPin className="w-4 h-4" />, "Locație", "location", "text", "Timișoara, Zona Centrală")}

            {/* Map picker */}
            <MapLocationPicker
              latitude={editData.latitude ?? null}
              longitude={editData.longitude ?? null}
              onLocationChange={(lat, lng) => {
                setEditData((prev) => (prev ? { ...prev, latitude: lat, longitude: lng } : prev));
              }}
              locationText={editData.location || undefined}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderFieldRow(<BadgeEuro className="w-4 h-4" />, "Preț", "price", "number", "75000")}
              {renderFieldRow(<Ruler className="w-4 h-4" />, "Suprafață (m²)", "size", "number", "65")}
              {renderFieldRow(<BedDouble className="w-4 h-4" />, "Camere", "rooms", "number", "2")}
              {renderFieldRow(<Bath className="w-4 h-4" />, "Băi", "bathrooms", "number", "1")}
            </div>

            {/* Extra details */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Detalii Suplimentare</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {renderFieldRow(<Layers className="w-4 h-4" />, "Etaj", "floor", "text", "3 / 8")}
                {renderFieldRow(<CalendarDays className="w-4 h-4" />, "An construcție", "year_built", "number", "2020")}
                {renderFieldRow(<Car className="w-4 h-4" />, "Parcare", "parking", "text", "Garaj inclus")}
                {renderFieldRow(<Thermometer className="w-4 h-4" />, "Încălzire", "heating_type", "text", "Centrală proprie")}
                {renderFieldRow(<Zap className="w-4 h-4" />, "Clasă energetică", "energy_class", "text", "B")}
                {renderFieldRow(<Sofa className="w-4 h-4" />, "Mobilare", "furnished", "text", "Mobilat complet")}
                {renderFieldRow(<Building2 className="w-4 h-4" />, "Tip construcție", "construction_type", "text", "Bloc")}
                {renderFieldRow(<Layers className="w-4 h-4" />, "Compartimentare", "compartimentare", "text", "Decomandat")}
              </div>
            </div>

            {/* Financial fields for cazare/regim hotelier */}
            {(listingType === "cazare" || listingType === "investitie") && (
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-primary mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Date Financiare (Calcul ROI Automat)
                </p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Completează pentru calculul automat al ROI. Anunțurile cu ROI ≥ 70% primesc tag-ul ROI_EXCELENT.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-2.5 text-muted-foreground"><BadgeEuro className="w-4 h-4" /></div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Venit Lunar Estimat (€)</Label>
                      <Input type="number" min="0" value={estimatedMonthlyRevenue} onChange={(e) => setEstimatedMonthlyRevenue(e.target.value)} placeholder="ex. 2500" className="text-sm h-9" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2.5 text-muted-foreground"><Wrench className="w-4 h-4" /></div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Cheltuieli Operare Anuale (€)</Label>
                      <Input type="number" min="0" value={annualOperatingCosts} onChange={(e) => setAnnualOperatingCosts(e.target.value)} placeholder="ex. 5000" className="text-sm h-9" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2.5 text-muted-foreground"><Wallet className="w-4 h-4" /></div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Cost Amenajare Inițial (€)</Label>
                      <Input type="number" min="0" value={initialSetupCost} onChange={(e) => setInitialSetupCost(e.target.value)} placeholder="ex. 35000" className="text-sm h-9" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">🔒 Date Contact Proprietar (nu se afișează public)</p>
              <p className="text-xs text-muted-foreground mb-3">Aceste date sunt salvate doar pentru uz intern.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderFieldRow(<User className="w-4 h-4" />, "Nume proprietar", "contact_name", "text", "Ion Popescu")}
                {renderFieldRow(<Phone className="w-4 h-4" />, "Telefon proprietar", "contact_phone", "text", "0721 123 456")}
                {renderFieldRow(<Mail className="w-4 h-4" />, "Email proprietar", "contact_email", "text", "email@exemplu.ro")}
              </div>
            </div>

            {/* Description */}
            <div className="border-t pt-4 mt-2">
              {renderFieldRow(<PenLine className="w-4 h-4" />, "Descriere scurtă", "description_short", "textarea", "Rezumat scurt al anunțului...")}
              {renderFieldRow(<PenLine className="w-4 h-4" />, "Descriere completă", "description_full", "textarea", "Descrierea detaliată a proprietății...")}
            </div>

            {/* AI Rewrite */}
            <div className="border-t pt-4 mt-2">
              <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Generator Text Premium AI
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rescrie automat titlul și descrierile cu limbaj profesionist de marketing imobiliar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Tonul textului</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {TONE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setRewriteTone(t.value)}
                          disabled={isRewriting}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all text-left ${
                            rewriteTone === t.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="font-medium block">{t.label}</span>
                          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleRewrite} disabled={isRewriting} className="flex-1 bg-gradient-to-r from-primary to-primary/80">
                      {isRewriting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se generează...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Generează Text Premium</>
                      )}
                    </Button>
                    {rewritten && (
                      <Button variant="outline" onClick={handleRewrite} disabled={isRewriting} title="Regenerează">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {rewritten && (
                    <div className="space-y-3 mt-2">
                      <div className="rounded-lg border bg-background p-4 space-y-3">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold">Titlu Optimizat</Label>
                          <p className="font-semibold text-sm mt-1">{rewritten.title}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold">Descriere Scurtă</Label>
                          <p className="text-sm text-muted-foreground mt-1">{rewritten.description_short}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold">Descriere Completă</Label>
                          <div className="text-sm mt-1 whitespace-pre-wrap max-h-64 overflow-y-auto border rounded-md p-3 bg-muted/30">
                            {rewritten.description_full}
                          </div>
                        </div>
                      </div>
                      <Button onClick={applyRewrite} disabled={appliedRewrite} className="w-full" variant={appliedRewrite ? "outline" : "default"}>
                        {appliedRewrite ? (
                          <><Check className="w-4 h-4 mr-2 text-green-600" />Text Aplicat ✓</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-2" />Aplică Textul Premium</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="border-t pt-4 mt-2">
              <Label className="text-xs text-muted-foreground">Facilități detectate ({editData.features?.length || 0})</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {editData.features?.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                ))}
                {(!editData.features || editData.features.length === 0) && (
                  <span className="text-xs text-muted-foreground">Nicio facilitate detectată</span>
                )}
              </div>
            </div>

            {/* Images */}
            {editData.images && editData.images.length > 0 && (
              <ImageOptimizationPanel
                images={editData.images}
                onImagesChange={(newImages) => updateField("images", newImages)}
              />
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4 border-t mt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Înapoi
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-1">
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Se salvează...</>
                ) : (
                  <><Save className="w-4 h-4" />Salvează &amp; Publică</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 2: SUCCESS ═══ */}
      {step === 2 && saveResult && (
        <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              Import Reușit!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{saveResult.property.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{LISTING_TYPES.find(o => o.value === listingType)?.label}</Badge>
                <Badge variant="outline">{extracted?.source_platform}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {extracted?.location && (
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{extracted.location}</div>
              )}
              {extracted?.price && (
                <div className="flex items-center gap-2"><BadgeEuro className="w-4 h-4 text-muted-foreground" />{extracted.price.toLocaleString()} {extracted.currency || '€'}</div>
              )}
              {extracted?.size && (
                <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-muted-foreground" />{extracted.size} m²</div>
              )}
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                {saveResult.images_uploaded} imagini
              </div>
            </div>

            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Anunțul este <strong>inactiv</strong>. Verifică-l în Proprietăți și activează-l când ești gata.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetAll}>
                Import Nou
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="w-3 h-3 mr-1" />Vezi Original
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListingImporter;
