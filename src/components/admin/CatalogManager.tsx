import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { FileText, Upload, RefreshCw, Copy, ExternalLink, Download, Trash2 } from "lucide-react";
import { exportInvestmentCatalogPdf } from "@/utils/exportInvestmentCatalogPdf";

const CATALOG_FILES = [
  { key: "catalog-investitii-timisoara-2026.pdf", label: "Catalog Investiții 2026 (RO)", language: "ro" as const },
  { key: "investment-catalog-timisoara-2026.pdf", label: "Investment Catalog 2026 (EN)", language: "en" as const },
];

const CatalogManager = () => {
  const [uploading, setUploading] = useState<string | null>(null);
  const [fileStatuses, setFileStatuses] = useState<Record<string, { exists: boolean; url: string; updatedAt?: string }>>({});
  const [loading, setLoading] = useState(true);

  const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage.from("catalogs").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const checkFiles = async () => {
    setLoading(true);
    const statuses: typeof fileStatuses = {};

    for (const file of CATALOG_FILES) {
      const { data } = await supabase.storage.from("catalogs").list("", {
        search: file.key,
      });
      const found = data?.find(f => f.name === file.key);
      statuses[file.key] = {
        exists: !!found,
        url: getPublicUrl(file.key),
        updatedAt: found?.updated_at,
      };
    }

    setFileStatuses(statuses);
    setLoading(false);
  };

  useEffect(() => {
    checkFiles();
  }, []);

  const handleGenerate = async (language: "ro" | "en", fileName: string) => {
    setUploading(fileName);
    try {
      const pdfBlob = await exportInvestmentCatalogPdf({ language, returnBlob: true });
      
      if (!pdfBlob) {
        throw new Error("PDF generation returned no data");
      }

      // Upload to storage (upsert)
      const { error } = await supabase.storage
        .from("catalogs")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (error) throw error;

      toast.success(`${fileName} generat și uploadat cu succes!`);
      await checkFiles();
    } catch (err: any) {
      console.error("Error generating catalog:", err);
      toast.error(`Eroare: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (fileName: string) => {
    const { error } = await supabase.storage.from("catalogs").remove([fileName]);
    if (error) {
      toast.error(`Eroare la ștergere: ${error.message}`);
    } else {
      toast.success("Fișier șters.");
      await checkFiles();
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiat în clipboard!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cataloage PDF</h2>
          <p className="text-muted-foreground text-sm">Generează și gestionează cataloagele de investiții statice pentru campaniile de email marketing.</p>
        </div>
        <Button variant="outline" size="sm" onClick={checkFiles} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATALOG_FILES.map((file) => {
          const status = fileStatuses[file.key];
          const isUploading = uploading === file.key;

          return (
            <Card key={file.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {file.label}
                  </CardTitle>
                  <Badge variant={status?.exists ? "default" : "secondary"}>
                    {status?.exists ? "✓ Activ" : "Lipsă"}
                  </Badge>
                </div>
                {status?.updatedAt && (
                  <CardDescription>
                    Ultima actualizare: {new Date(status.updatedAt).toLocaleString("ro-RO")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {status?.exists && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-xs break-all">
                    <code className="flex-1">{status.url}</code>
                    <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => copyUrl(status.url)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleGenerate(file.language, file.key)}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {status?.exists ? "Regenerează" : "Generează & Upload"}
                  </Button>

                  {status?.exists && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a href={status.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Deschide
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={status.url} download={file.key}>
                          <Download className="w-4 h-4 mr-2" />
                          Descarcă
                        </a>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(file.key)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Șterge
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogManager;
