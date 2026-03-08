import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, LinkIcon, CheckCircle2, ImageIcon, MapPin, Ruler, BedDouble, BadgeEuro, AlertCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImportResult {
  property: { id: string; slug: string; name: string };
  scraped: {
    title: string;
    location: string;
    price: number | null;
    currency: string | null;
    size: number | null;
    rooms: number | null;
    features_count: number;
    images_found: number;
    images_uploaded: number;
  };
  listing_type: string;
}

const ListingImporter = () => {
  const [url, setUrl] = useState("");
  const [listingType, setListingType] = useState("vanzare");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      toast({ title: "Eroare", description: "Introdu un URL valid", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("scrape-listing", {
        body: { url: url.trim(), listing_type: listingType },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Import eșuat");

      setResult(data);
      toast({
        title: "✅ Import reușit!",
        description: `„${data.property.name}" a fost creat cu ${data.scraped.images_uploaded} imagini.`,
      });
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message);
      toast({
        title: "Eroare la import",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const listingTypeOptions = [
    { value: "vanzare", label: "Vânzare", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    { value: "inchiriere", label: "Închiriere", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    { value: "cazare", label: "Cazare (regim hotelier)", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
    { value: "investitie", label: "Investiție Premium", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Import Anunț din URL
          </CardTitle>
          <CardDescription>
            Lipește un link de anunț de pe OLX, Imobiliare.ro, Storia sau orice site de anunțuri imobiliare.
            Sistemul va prelua automat titlul, descrierea, prețul, suprafața, facilitățile și toate fotografiile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL Anunț</Label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.olx.ro/d/oferta/..."
              className="mt-1"
              disabled={isImporting}
            />
          </div>

          <div>
            <Label>Tip Listing</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {listingTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setListingType(opt.value)}
                  disabled={isImporting}
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
            onClick={handleImport}
            disabled={isImporting || !url.trim()}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se importă... (poate dura 30-60s)
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" />
                Importă Anunț
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Eroare la import</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              Import Reușit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{result.property.name}</h3>
              <Badge className="mt-1">
                {listingTypeOptions.find(o => o.value === result.listing_type)?.label || result.listing_type}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {result.scraped.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {result.scraped.location}
                </div>
              )}
              {result.scraped.price && (
                <div className="flex items-center gap-2 text-sm">
                  <BadgeEuro className="w-4 h-4 text-muted-foreground" />
                  {result.scraped.price.toLocaleString()} {result.scraped.currency || '€'}
                </div>
              )}
              {result.scraped.size && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  {result.scraped.size} m²
                </div>
              )}
              {result.scraped.rooms && (
                <div className="flex items-center gap-2 text-sm">
                  <BedDouble className="w-4 h-4 text-muted-foreground" />
                  {result.scraped.rooms} camere
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                {result.scraped.images_uploaded}/{result.scraped.images_found} imagini încărcate
              </span>
              <span>{result.scraped.features_count} facilități detectate</span>
            </div>

            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Anunțul a fost creat ca <strong>inactiv</strong>. Verifică datele în secțiunea Proprietăți și activează-l când ești gata.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUrl("");
                  setResult(null);
                }}
              >
                Import Nou
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Vezi Original
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListingImporter;
