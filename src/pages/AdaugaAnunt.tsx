import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, ImagePlus, Sparkles, Loader2, CheckCircle2, Home, MapPin, Ruler, BedDouble, Bath, Euro, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const MAX_IMAGES = 15;

interface AIAnalysis {
  title: string;
  description: string;
  rooms_detected: string[];
  features_detected: string[];
  condition: string;
  style: string;
  score: number;
}

const AdaugaAnunt = () => {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("apartament");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [price, setPrice] = useState("");
  const [listingType, setListingType] = useState("inchiriere");

  const t = language === "en" ? {
    pageTitle: "Add Listing",
    pageSubtitle: "Upload photos and let AI generate your listing",
    upload: "Add Photos",
    hint: `JPG, PNG · Max 5MB/photo · Max ${MAX_IMAGES} photos`,
    dragHint: "or drag photos here",
    count: (n: number) => `${n}/${MAX_IMAGES} photos`,
    analyzeBtn: "Analyze with AI",
    analyzingText: "AI is analyzing your photos...",
    analysisComplete: "AI Analysis Complete",
    autoFilled: "Title and description auto-filled by AI",
    titleLabel: "Title",
    titlePlaceholder: "e.g. Modern 2-Room Apartment in City Center",
    descLabel: "Description",
    descPlaceholder: "Detailed property description...",
    typeLabel: "Property Type",
    locationLabel: "Location",
    locationPlaceholder: "e.g. Timișoara, Centru",
    sizeLabel: "Size (m²)",
    roomsLabel: "Rooms",
    bathroomsLabel: "Bathrooms",
    priceLabel: "Price (€)",
    listingTypeLabel: "Listing Type",
    sale: "Sale",
    rent: "Rent",
    apartment: "Apartment",
    house: "House",
    studio: "Studio",
    penthouse: "Penthouse",
    roomsDetected: "Rooms Detected",
    featuresDetected: "Features Detected",
    condition: "Condition",
    style: "Style",
    score: "Appeal Score",
    submitBtn: "Submit Listing",
  } : {
    pageTitle: "Adaugă Anunț",
    pageSubtitle: "Încarcă fotografii și lasă AI-ul să genereze anunțul",
    upload: "Adaugă Fotografii",
    hint: `JPG, PNG · Max 5MB/fotografie · Max ${MAX_IMAGES} fotografii`,
    dragHint: "sau trage fotografiile aici",
    count: (n: number) => `${n}/${MAX_IMAGES} fotografii`,
    analyzeBtn: "Analizează cu AI",
    analyzingText: "AI-ul analizează fotografiile...",
    analysisComplete: "Analiză AI Completă",
    autoFilled: "Titlul și descrierea au fost completate automat de AI",
    titleLabel: "Titlu",
    titlePlaceholder: "ex. Apartament Modern 2 Camere în Centru",
    descLabel: "Descriere",
    descPlaceholder: "Descriere detaliată a proprietății...",
    typeLabel: "Tip Proprietate",
    locationLabel: "Locație",
    locationPlaceholder: "ex. Timișoara, Centru",
    sizeLabel: "Suprafață (m²)",
    roomsLabel: "Camere",
    bathroomsLabel: "Băi",
    priceLabel: "Preț (€)",
    listingTypeLabel: "Tip Anunț",
    sale: "Vânzare",
    rent: "Închiriere",
    apartment: "Apartament",
    house: "Casă",
    studio: "Garsonieră",
    penthouse: "Penthouse",
    roomsDetected: "Camere Detectate",
    featuresDetected: "Caracteristici Detectate",
    condition: "Stare",
    style: "Stil",
    score: "Scor Atractivitate",
    submitBtn: "Trimite Anunțul",
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(language === "ro" ? `Maximum ${MAX_IMAGES} fotografii` : `Maximum ${MAX_IMAGES} photos`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    const oversized = toProcess.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) {
      toast.error(language === "ro" ? `${oversized.length} fișier(e) depășesc 5MB` : `${oversized.length} file(s) exceed 5MB`);
    }

    const valid = toProcess.filter(f => f.size <= 5 * 1024 * 1024);
    if (!valid.length) return;

    Promise.all(
      valid.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      setImages(prev => [...prev, ...newImages]);
      // Reset analysis when new images are added
      setAnalysis(null);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [images.length, language]);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setAnalysis(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const analyzeImages = async () => {
    if (images.length === 0) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-listing-images", {
        body: { imageUrls: images.slice(0, 5), language },
      });

      if (error) throw error;

      if (data && !data.error) {
        setAnalysis(data);
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        toast.success(t.autoFilled);
      } else {
        throw new Error(data?.error || "Analysis failed");
      }
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      toast.error(language === "ro" ? "Eroare la analiză. Încearcă din nou." : "Analysis error. Try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(language === "ro" ? "Anunțul a fost trimis!" : "Listing submitted!");
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t.pageTitle}</h1>
          <p className="text-muted-foreground mt-2">{t.pageSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Image Upload Section */}
          <section className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4" /> {t.upload}
            </Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group",
                images.length >= MAX_IMAGES
                  ? "border-muted/30 opacity-50 cursor-not-allowed"
                  : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              )}
            >
              <Camera className="w-10 h-10 mx-auto text-primary/40 group-hover:text-primary/60 mb-3 transition-colors" />
              <p className="font-semibold text-foreground text-sm">{t.upload}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.hint}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{t.dragHint}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{t.count(images.length)}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <AnimatePresence>
                    {images.map((img, i) => (
                      <motion.div
                        key={`${i}-${img.slice(-20)}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-xl overflow-hidden group"
                      >
                        <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-0.5 left-0.5 bg-background/80 text-[9px] font-bold px-1 rounded">{i + 1}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/40 transition-colors"
                    >
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI Analyze Button */}
            {images.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  type="button"
                  onClick={analyzeImages}
                  disabled={analyzing}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                    analyzing
                      ? "bg-muted text-muted-foreground cursor-wait"
                      : analysis
                        ? "bg-accent text-accent-foreground border border-border hover:bg-accent/80"
                        : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:scale-[1.01]"
                  )}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.analyzingText}
                    </>
                  ) : analysis ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {t.analysisComplete}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t.analyzeBtn}
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </section>

          {/* AI Analysis Results */}
          <AnimatePresence>
            {analysis && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="w-4 h-4" />
                    {t.analysisComplete}
                  </div>

                  {/* Score */}
                  <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold", scoreColor(analysis.score))}>
                    {t.score}: {analysis.score}/100
                  </div>

                  {/* Detected info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{t.roomsDetected}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.rooms_detected.map((room, i) => (
                          <span key={i} className="bg-background px-2 py-0.5 rounded-full border text-muted-foreground">{room}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{t.featuresDetected}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.features_detected.slice(0, 6).map((feat, i) => (
                          <span key={i} className="bg-background px-2 py-0.5 rounded-full border text-muted-foreground">{feat}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs">
                    <span><strong>{t.condition}:</strong> {analysis.condition}</span>
                    <span><strong>{t.style}:</strong> {analysis.style}</span>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Form Fields */}
          <section className="space-y-4">
            {/* Listing Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> {t.listingTypeLabel}</Label>
              <div className="flex gap-2">
                {[
                  { value: "inchiriere", label: t.rent },
                  { value: "vanzare", label: t.sale },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setListingType(opt.value)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all",
                      listingType === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Home className="w-4 h-4" /> {t.typeLabel}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: "apartament", label: t.apartment },
                  { value: "casa", label: t.house },
                  { value: "garsoniera", label: t.studio },
                  { value: "penthouse", label: t.penthouse },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPropertyType(opt.value)}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                      propertyType === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                {t.titleLabel}
                {analysis && title === analysis.title && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">AI</span>
                )}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                className="rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc" className="flex items-center gap-2">
                {t.descLabel}
                {analysis && description === analysis.description && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">AI</span>
                )}
              </Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descPlaceholder}
                rows={6}
                className="rounded-xl"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {t.locationLabel}</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t.locationPlaceholder}
                className="rounded-xl"
              />
            </div>

            {/* Size, Rooms, Bathrooms, Price */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="size" className="text-xs flex items-center gap-1"><Ruler className="w-3 h-3" /> {t.sizeLabel}</Label>
                <Input id="size" type="number" value={size} onChange={(e) => setSize(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rooms" className="text-xs flex items-center gap-1"><BedDouble className="w-3 h-3" /> {t.roomsLabel}</Label>
                <Input id="rooms" type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bath" className="text-xs flex items-center gap-1"><Bath className="w-3 h-3" /> {t.bathroomsLabel}</Label>
                <Input id="bath" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs flex items-center gap-1"><Euro className="w-3 h-3" /> {t.priceLabel}</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl" />
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-lg"
          >
            {t.submitBtn}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default AdaugaAnunt;
