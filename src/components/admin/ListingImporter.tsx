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
  Sparkles, RefreshCw, Copy, Check, Phone, User, Mail
} from "lucide-react";
import ImageOptimizationPanel from "./ImageOptimizationPanel";

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

const ListingImporter = () => {
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

  // Step 1: Preview / extract
  const handlePreview = async () => {
    if (!url.trim()) {
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
        body: { url: url.trim(), listing_type: listingType, mode: "preview" },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Extracție eșuată");

      setExtracted(data.extracted);
      setEditData({ ...data.extracted });
      setAllOriginalImages([...(data.extracted.images || [])]);
      if (data.extracted.listing_type_hint) {
        setListingType(data.extracted.listing_type_hint);
      }
      toast({ title: "✅ Date extrase!", description: "Verifică și editează înainte de salvare." });
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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

  // Step 2: Save
  const handleSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("scrape-listing", {
        body: { url: url.trim(), listing_type: listingType, mode: "save", editedData: editData },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Salvare eșuată");

      setSaveResult(data);
      toast({
        title: "✅ Anunț importat!",
        description: `„${data.property.name}" — ${data.images_uploaded} imagini încărcate.`,
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

  return (
    <div className="space-y-6">
      {/* Step 1: URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Import Anunț din URL
          </CardTitle>
          <CardDescription>
            Lipește un link de pe OLX, Imobiliare.ro, Storia sau orice site.
            Datele vor fi extrase automat — le poți verifica și edita înainte de salvare.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL Anunț</Label>
            <Input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setExtracted(null); setEditData(null); setSaveResult(null); setRewritten(null); }}
              placeholder="https://www.olx.ro/d/oferta/..."
              className="mt-1"
              disabled={isLoading || isSaving}
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
                  disabled={isLoading || isSaving}
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
            onClick={handlePreview}
            disabled={isLoading || !url.trim() || isSaving}
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

      {/* Error */}
      {error && !editData && (
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

      {/* Step 2: Preview & Edit */}
      {editData && !saveResult && (
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
              Datele de mai jos au fost extrase automat. Editează ce e necesar, apoi salvează.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main fields */}
            {renderFieldRow(<Building2 className="w-4 h-4" />, "Titlu / Nume", "title", "text", "Apartament 2 camere...")}
            {renderFieldRow(<MapPin className="w-4 h-4" />, "Locație", "location", "text", "Timișoara, Zona Centrală")}

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

            {/* Contact info (private) */}
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

            {/* ========== AI REWRITE SECTION ========== */}
            <div className="border-t pt-4 mt-2">
              <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Generator Text Premium AI
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rescrie automat titlul și descrierile cu limbaj profesionist de marketing imobiliar,
                    adaptat tipului de listing. Include termeni economici, analiză ROI, și call-to-action RealTrust.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tone selector */}
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
                    <Button
                      onClick={handleRewrite}
                      disabled={isRewriting}
                      className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                    >
                      {isRewriting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se generează textul premium...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Generează Text Premium</>
                      )}
                    </Button>
                    {rewritten && (
                      <Button
                        variant="outline"
                        onClick={handleRewrite}
                        disabled={isRewriting}
                        title="Regenerează cu alt rezultat"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Rewrite preview */}
                  {rewritten && (
                    <div className="space-y-3 mt-2">
                      <div className="rounded-lg border bg-background p-4 space-y-3">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold">Titlu Optimizat</Label>
                          <p className="font-semibold text-sm mt-1">{rewritten.title}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold">Descriere Scurtă (SEO)</Label>
                          <p className="text-sm text-muted-foreground mt-1">{rewritten.description_short}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-primary font-semibold">Descriere Completă</Label>
                          <div className="text-sm mt-1 whitespace-pre-wrap max-h-64 overflow-y-auto border rounded-md p-3 bg-muted/30">
                            {rewritten.description_full}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={applyRewrite}
                        disabled={appliedRewrite}
                        className="w-full"
                        variant={appliedRewrite ? "outline" : "default"}
                      >
                        {appliedRewrite ? (
                          <><Check className="w-4 h-4 mr-2 text-green-600" />Text Aplicat în Câmpuri ✓</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-2" />Aplică Textul Premium în Câmpuri</>
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
                  <Badge key={i} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))}
                {(!editData.features || editData.features.length === 0) && (
                  <span className="text-xs text-muted-foreground">Nicio facilitate detectată</span>
                )}
              </div>
            </div>

            {/* Images — Premium Optimization Panel */}
            {editData.images && editData.images.length > 0 && (
              <ImageOptimizationPanel
                images={editData.images}
                onImagesChange={(newImages) => updateField("images", newImages)}
              />
            )}

            {/* Save button */}
            <div className="flex gap-3 pt-4 border-t mt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Se salvează și se încarcă imaginile...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Salvează Anunțul pe RealTrust</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setExtracted(null); setEditData(null); setError(null); setRewritten(null); }}
              >
                Anulează
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Success */}
      {saveResult && (
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
                <Badge>{LISTING_TYPES.find(o => o.value === saveResult.listing_type)?.label}</Badge>
                <Badge variant="outline">{saveResult.extracted?.source_platform}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {saveResult.extracted?.location && (
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{saveResult.extracted.location}</div>
              )}
              {saveResult.extracted?.price && (
                <div className="flex items-center gap-2"><BadgeEuro className="w-4 h-4 text-muted-foreground" />{saveResult.extracted.price.toLocaleString()} {saveResult.extracted.currency || '€'}</div>
              )}
              {saveResult.extracted?.size && (
                <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-muted-foreground" />{saveResult.extracted.size} m²</div>
              )}
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                {saveResult.images_uploaded} imagini încărcate
              </div>
            </div>

            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Anunțul este <strong>inactiv</strong>. Verifică-l în Proprietăți și activează-l când ești gata.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setUrl(""); setExtracted(null); setEditData(null); setSaveResult(null); setError(null); setRewritten(null); }}
              >
                Import Nou
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")}>
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
