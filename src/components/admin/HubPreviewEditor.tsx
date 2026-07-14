import { useMemo, useState } from "react";
import { BLOG_CATEGORIES } from "@/lib/blogCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Eye, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * HubPreviewEditor — live SEO preview for blog category "hub" pages.
 *
 * Blog category metadata (hubIntro + hubKeywords) is source-controlled in
 * `src/lib/blogCategories.ts`. This editor lets an admin prototype changes
 * for a selected hub and see, in real time, exactly how the paragraph and
 * keyword chips will render on `/blog/categorie/:slug` — mirroring the
 * markup of BlogCategory.tsx. Use "Copy TS snippet" to paste the refined
 * copy back into the source file.
 */
const HubPreviewEditor = () => {
  const [slug, setSlug] = useState<string>(BLOG_CATEGORIES[0]?.slug ?? "");
  const current = useMemo(
    () => BLOG_CATEGORIES.find((c) => c.slug === slug) ?? BLOG_CATEGORIES[0],
    [slug],
  );

  const [hubIntro, setHubIntro] = useState<string>(current?.hubIntro ?? "");
  const [hubKeywordsRaw, setHubKeywordsRaw] = useState<string>(
    (current?.hubKeywords ?? []).join(", "),
  );

  // Reset local state when a different category is selected.
  const onSelectSlug = (next: string) => {
    setSlug(next);
    const c = BLOG_CATEGORIES.find((x) => x.slug === next);
    setHubIntro(c?.hubIntro ?? "");
    setHubKeywordsRaw((c?.hubKeywords ?? []).join(", "));
  };

  const keywords = hubKeywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const introChars = hubIntro.length;
  const introOk = introChars >= 240 && introChars <= 900;

  const tsSnippet = `hubIntro:\n  "${hubIntro.replace(/"/g, '\\"')}",\nhubKeywords: [\n${keywords
    .map((k) => `  "${k.replace(/"/g, '\\"')}"`)
    .join(",\n")}\n],`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tsSnippet);
      toast({ title: "Snippet TS copiat în clipboard" });
    } catch {
      toast({ title: "Nu am putut copia", variant: "destructive" });
    }
  };

  if (!current) return null;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-serif font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Live Preview — Hub SEO
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Prototipează <code className="text-xs">hubIntro</code> și{" "}
              <code className="text-xs">hubKeywords</code> pentru fiecare
              pilon de conținut. Copiază snippet-ul TS și lipește-l în{" "}
              <code className="text-xs">src/lib/blogCategories.ts</code>.
            </p>
          </div>
          <Select value={slug} onValueChange={onSelectSlug}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selectează categoria" />
            </SelectTrigger>
            <SelectContent>
              {BLOG_CATEGORIES.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="hub-intro">Hub intro (paragraf SEO)</Label>
                <span
                  className={`text-xs ${introOk ? "text-muted-foreground" : "text-destructive"}`}
                >
                  {introChars} caractere · recomandat 240–900
                </span>
              </div>
              <Textarea
                id="hub-intro"
                rows={8}
                value={hubIntro}
                onChange={(e) => setHubIntro(e.target.value)}
                placeholder="Paragraf introductiv de tip content-pillar…"
              />
            </div>

            <div>
              <Label htmlFor="hub-keywords">
                Hub keywords (separă cu virgulă · 3–5 recomandat)
              </Label>
              <Input
                id="hub-keywords"
                value={hubKeywordsRaw}
                onChange={(e) => setHubKeywordsRaw(e.target.value)}
                placeholder="restaurante Timișoara 2026, evenimente Timișoara, …"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {keywords.length} keyword{keywords.length === 1 ? "" : "s"}
              </p>
            </div>

            <Button variant="outline" onClick={handleCopy} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copiază snippet TS pentru blogCategories.ts
            </Button>
          </div>

          {/* Live public-facing preview — mirrors BlogCategory.tsx markup */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              Preview identic cu <code>/blog/categorie/{current.slug}</code>
            </div>
            <section
              aria-labelledby="hub-preview-heading"
              className="rounded-2xl border border-border bg-muted/20 p-6"
            >
              <Badge variant="secondary" className="mb-3">
                {current.name}
              </Badge>
              <h2
                id="hub-preview-heading"
                className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-3"
              >
                Despre acest hub de conținut
              </h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {hubIntro || (
                  <em className="opacity-60">
                    Adaugă un paragraf pentru a-l vedea aici…
                  </em>
                )}
              </p>
              {keywords.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HubPreviewEditor;
