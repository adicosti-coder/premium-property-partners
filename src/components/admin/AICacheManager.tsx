import { useState, useEffect } from "react";
import { supabase, supabaseConfig } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Trash2, Sparkles, Brain, Languages, Image, PenLine,
  RefreshCw, CheckCircle2, AlertCircle, Zap, Eye, Play,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PropertyInfo {
  slug: string;
  name: string;
  images: string[];
}

interface CoverageData {
  advisor: { cached: string[]; missing: string[]; total: number };
  captions: { cached: number; total: number; missingProperties: string[] };
  translations: { cached: number };
  rewrite: { cached: number };
}

interface FullPropertyData extends PropertyInfo {
  location?: string | null;
  size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  capacity?: number | null;
  floor?: number | null;
  base_price_per_night?: number | null;
  amenities?: string[] | null;
  listing_type?: string | null;
  year_built?: number | null;
  energy_class?: string | null;
  roi_percentage?: number | null;
}

const AICacheManager = () => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const analyzeCoverage = async () => {
    setAnalyzing(true);
    try {
      // Fetch all properties
      const { data: propsData } = await supabase
        .from("properties" as any)
        .select("slug, name, images")
        .order("name");

      const props: PropertyInfo[] = (propsData || []).map((p: any) => ({
        slug: p.slug || "",
        name: p.name || "Fără nume",
        images: Array.isArray(p.images) ? p.images : [],
      }));
      setProperties(props);

      // Fetch advisor cache entries
      const { data: advisorData } = await supabase
        .from("advisor_cache")
        .select("property_slug");

      const advisorSlugs = new Set((advisorData || []).map((a: any) => a.property_slug));
      const propsWithSlug = props.filter((p) => p.slug);
      const advisorCached = propsWithSlug.filter((p) => advisorSlugs.has(p.slug)).map((p) => p.slug);
      const advisorMissing = propsWithSlug.filter((p) => !advisorSlugs.has(p.slug)).map((p) => p.slug);

      // Fetch image caption cache
      const { data: captionData } = await supabase
        .from("image_caption_cache")
        .select("image_url, property_name");

      const captionUrls = new Set((captionData || []).map((c: any) => c.image_url));
      const totalImages = props.reduce((sum, p) => sum + p.images.length, 0);
      // Properties that have images but none cached
      const captionMissingProps = props
        .filter((p) => p.images.length > 0 && !p.images.some((img) => captionUrls.has(img)))
        .map((p) => p.name);

      // Translation + rewrite counts
      const [{ count: transCount }, { count: rewriteCount }] = await Promise.all([
        supabase.from("translation_cache").select("*", { count: "exact", head: true }),
        supabase.from("rewrite_cache").select("*", { count: "exact", head: true }),
      ]);

      setCoverage({
        advisor: { cached: advisorCached, missing: advisorMissing, total: propsWithSlug.length },
        captions: { cached: captionData?.length || 0, total: totalImages, missingProperties: captionMissingProps },
        translations: { cached: transCount || 0 },
        rewrite: { cached: rewriteCount || 0 },
      });
    } catch (err) {
      console.error("Coverage analysis error:", err);
      toast({ title: "Eroare la analiză", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    analyzeCoverage();
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const normalizeImageUrl = (imagePath: string) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    return `${supabaseConfig.url}/storage/v1/object/public/property-images/${imagePath}`;
  };

  const clearCache = async (table: string, label: string) => {
    setLoading((prev) => ({ ...prev, [table]: true }));
    try {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .gte("created_at", "1970-01-01");
      if (error) throw error;
      toast({ title: `✅ Cache „${label}" golit` });
      analyzeCoverage();
    } catch (err: any) {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    } finally {
      setLoading((prev) => ({ ...prev, [table]: false }));
    }
  };


  const generateMissing = async (type: "advisor" | "captions" | "all") => {
    setGenerating((prev) => ({ ...prev, [type]: true }));
    const label = type === "advisor" ? "Advisor" : type === "captions" ? "Caption-uri" : "Tot";
    toast({ title: `⏳ Se generează ${label}...`, description: "Procesul poate dura câteva minute. Nu închide pagina." });

    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties" as any)
        .select("slug, name, location, size, bedrooms, bathrooms, capacity, floor, base_price_per_night, amenities, listing_type, year_built, energy_class, roi_percentage, images")
        .eq("is_active", true)
        .order("name");

      if (propertiesError) throw propertiesError;

      const allProperties: FullPropertyData[] = (propertiesData || []).map((property: any) => ({
        slug: property.slug || "",
        name: property.name || "Fără nume",
        location: property.location,
        size: property.size,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        capacity: property.capacity,
        floor: property.floor,
        base_price_per_night: property.base_price_per_night,
        amenities: Array.isArray(property.amenities) ? property.amenities : [],
        listing_type: property.listing_type,
        year_built: property.year_built,
        energy_class: property.energy_class,
        roi_percentage: property.roi_percentage,
        images: Array.isArray(property.images) ? property.images : [],
      }));

      let generated = 0;
      let errors = 0;

      if (type === "advisor" || type === "all") {
        const missingAdvisor = allProperties.filter((property) => property.slug && coverage?.advisor.missing.includes(property.slug));

        for (const property of missingAdvisor) {
          const { error } = await supabase.functions.invoke("generate-advisor-content", {
            body: {
              propertyName: property.name,
              propertySlug: property.slug,
              location: property.location,
              size: property.size,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              capacity: property.capacity,
              floor: property.floor,
              pricePerNight: property.base_price_per_night,
              amenities: property.amenities,
              listingType: property.listing_type,
              yearBuilt: property.year_built,
              energyClass: property.energy_class,
              roi: property.roi_percentage ? `${property.roi_percentage}%` : null,
              language: "ro",
            },
          });

          if (error) {
            errors += 1;
            console.error("Advisor generate error:", property.name, error);
          } else {
            generated += 1;
          }

          await sleep(250);
        }
      }

      if (type === "captions" || type === "all") {
        const { data: cachedCaptions, error: captionsError } = await supabase
          .from("image_caption_cache")
          .select("image_url")
          .eq("language", "ro");

        if (captionsError) throw captionsError;

        const cachedCaptionUrls = new Set((cachedCaptions || []).map((entry: any) => entry.image_url));

        for (const property of allProperties) {
          const missingImages = property.images
            .map(normalizeImageUrl)
            .filter((imageUrl) => imageUrl && !cachedCaptionUrls.has(imageUrl));

          for (const imageUrl of missingImages) {
            const { error } = await supabase.functions.invoke("generate-image-caption", {
              body: {
                imageUrl,
                propertyName: property.name,
                language: "ro",
              },
            });

            if (error) {
              errors += 1;
              console.error("Caption generate error:", property.name, imageUrl, error);
            } else {
              cachedCaptionUrls.add(imageUrl);
              generated += 1;
            }

            await sleep(150);
          }
        }
      }

      toast({
        title: `✅ ${label} generat!`,
        description: `${generated} elemente generate, ${errors} erori.`,
      });
      analyzeCoverage();
    } catch (err: any) {
      toast({ title: "Eroare la generare", description: err.message, variant: "destructive" });
    } finally {
      setGenerating((prev) => ({ ...prev, [type]: false }));
    }
  };

  const getPropertyName = (slug: string) => {
    return properties.find((p) => p.slug === slug)?.name || slug;
  };

  const pct = (cached: number, total: number) => (total === 0 ? 100 : Math.round((cached / total) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-xl font-serif">AI Cache Manager</CardTitle>
                <CardDescription>
                  Analizează acoperirea AI și regenerează doar ce lipsește — economisind credite.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={analyzeCoverage} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Re-analizează
            </Button>
          </div>
        </CardHeader>
      </Card>

      {analyzing && !coverage && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Se analizează acoperirea AI...
        </div>
      )}

      {coverage && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Advisor */}
          <CoverageCard
            icon={<Brain className="w-5 h-5 text-purple-500" />}
            label="The Advisor"
            description="Analize premium per proprietate"
            cached={coverage.advisor.cached.length}
            total={coverage.advisor.total}
            loading={!!loading["advisor_cache"]}
            onClear={() => clearCache("advisor_cache", "The Advisor")}
            expanded={expandedSection === "advisor"}
            onToggle={() => setExpandedSection(expandedSection === "advisor" ? null : "advisor")}
          >
            {coverage.advisor.missing.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {coverage.advisor.missing.length} proprietăți fără analiză AI:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-5 list-disc">
                  {coverage.advisor.missing.map((slug) => (
                    <li key={slug}>{getPropertyName(slug)}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={() => generateMissing("advisor")}
                  disabled={!!generating.advisor}
                >
                  {generating.advisor ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  Generează cele {coverage.advisor.missing.length} lipsă
                </Button>
                <p className="text-xs text-muted-foreground italic mt-1">
                  💡 Sau se vor genera automat când cineva vizitează pagina.
                </p>
              </div>
            ) : (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Toate proprietățile au analiză AI!
              </p>
            )}
          </CoverageCard>

          {/* Image Captions */}
          <CoverageCard
            icon={<Image className="w-5 h-5 text-blue-500" />}
            label="Descrieri Imagini"
            description="Caption-uri AI per fotografie"
            cached={coverage.captions.cached}
            total={coverage.captions.total}
            loading={!!loading["image_caption_cache"]}
            onClear={() => clearCache("image_caption_cache", "Descrieri Imagini")}
            expanded={expandedSection === "captions"}
            onToggle={() => setExpandedSection(expandedSection === "captions" ? null : "captions")}
          >
            {coverage.captions.missingProperties.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {coverage.captions.missingProperties.length} proprietăți fără caption-uri:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-5 list-disc">
                  {coverage.captions.missingProperties.slice(0, 10).map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                  {coverage.captions.missingProperties.length > 10 && (
                    <li className="italic">...și alte {coverage.captions.missingProperties.length - 10}</li>
                  )}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={() => generateMissing("captions")}
                  disabled={!!generating.captions}
                >
                  {generating.captions ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  Generează caption-uri lipsă
                </Button>
              </div>
            ) : (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Toate imaginile au caption-uri!
              </p>
            )}
          </CoverageCard>

          {/* Translations */}
          <CoverageCard
            icon={<Languages className="w-5 h-5 text-green-500" />}
            label="Traduceri"
            description="Traduceri AI (RO ↔ EN)"
            cached={coverage.translations.cached}
            total={null}
            loading={!!loading["translation_cache"]}
            onClear={() => clearCache("translation_cache", "Traduceri")}
            expanded={expandedSection === "translations"}
            onToggle={() => setExpandedSection(expandedSection === "translations" ? null : "translations")}
          >
            <p className="text-xs text-muted-foreground">
              {coverage.translations.cached === 0
                ? "Nicio traducere în cache. Se generează on-demand la schimbarea limbii."
                : `${coverage.translations.cached} traduceri stocate. Golirea va forța re-traducerea la accesare.`}
            </p>
          </CoverageCard>

          {/* Rewrite */}
          <CoverageCard
            icon={<PenLine className="w-5 h-5 text-amber-500" />}
            label="Rewrite Descrieri"
            description="Descrieri rescrise pentru anunțuri"
            cached={coverage.rewrite.cached}
            total={null}
            loading={!!loading["rewrite_cache"]}
            onClear={() => clearCache("rewrite_cache", "Rewrite Descrieri")}
            expanded={expandedSection === "rewrite"}
            onToggle={() => setExpandedSection(expandedSection === "rewrite" ? null : "rewrite")}
          >
            <p className="text-xs text-muted-foreground">
              {coverage.rewrite.cached === 0
                ? "Nicio descriere rescrisă în cache. Se generează la import/editare anunț."
                : `${coverage.rewrite.cached} descrieri rescrise stocate. Golirea va forța re-generarea.`}
            </p>
          </CoverageCard>
        </div>
      )}

      {/* Summary + Clear All */}
      {coverage && (
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Sumar economie credite AI
                </h3>
                <p className="text-xs text-muted-foreground">
                  {coverage.advisor.cached.length + coverage.captions.cached + coverage.translations.cached + coverage.rewrite.cached} texte servite din cache (0 credite consumate).
                  {coverage.advisor.missing.length > 0 && (
                    <> Doar {coverage.advisor.missing.length} analize Advisor + {coverage.captions.missingProperties.length} seturi caption-uri vor consuma credite la accesare.</>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(coverage.advisor.missing.length > 0 || coverage.captions.missingProperties.length > 0) && (
                  <Button
                    size="sm"
                    onClick={() => generateMissing("all")}
                    disabled={!!generating.all}
                  >
                    {generating.all ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    Generează tot ce lipsește
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* Reusable coverage card */
interface CoverageCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  cached: number;
  total: number | null;
  loading: boolean;
  onClear: () => void;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CoverageCard({ icon, label, description, cached, total, loading, onClear, expanded, onToggle, children }: CoverageCardProps) {
  const percentage = total !== null ? (total === 0 ? 100 : Math.round((cached / total) * 100)) : null;
  const statusColor = percentage === null
    ? "text-muted-foreground"
    : percentage === 100
      ? "text-green-600"
      : percentage >= 50
        ? "text-amber-600"
        : "text-red-500";

  return (
    <Card className="border border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={loading || cached === 0}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Golește cache"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          {total !== null ? (
            <>
              <Progress value={percentage!} className="flex-1 h-2" />
              <span className={`text-xs font-mono font-semibold ${statusColor} shrink-0`}>
                {cached}/{total}
              </span>
            </>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {cached} intrări
            </Badge>
          )}
        </div>

        {/* Expandable details */}
        <Collapsible open={expanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-muted-foreground">
              <Eye className="w-3.5 h-3.5 mr-1" />
              {expanded ? "Ascunde detalii" : "Vezi detalii"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 border-t border-border/50 mt-2">
            {children}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default AICacheManager;
