import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Type,
  Loader2, 
  Save,
  RotateCcw,
  Languages
} from "lucide-react";

interface HeroTextSettings {
  hero_title_ro: string | null;
  hero_title_en: string | null;
  hero_highlight_ro: string | null;
  hero_highlight_en: string | null;
  hero_subtitle_ro: string | null;
  hero_subtitle_en: string | null;
  hero_badge_ro: string | null;
  hero_badge_en: string | null;
}

const defaultTexts = {
  hero_title_ro: "Transformă-ți apartamentul într-o sursă de",
  hero_title_en: "Transform your apartment into a source of",
  hero_highlight_ro: "venit pasiv",
  hero_highlight_en: "passive income",
  hero_subtitle_ro: "Administrăm proprietăți în regim hotelier în Brașov, oferind proprietarilor venituri maximizate și oaspeților experiențe de neuitat.",
  hero_subtitle_en: "We manage short-term rental properties in Brașov, offering owners maximized income and guests unforgettable experiences.",
  hero_badge_ro: "Premium Property Management",
  hero_badge_en: "Premium Property Management",
};

const HeroTextManager = () => {
  const [settings, setSettings] = useState<HeroTextSettings>({
    hero_title_ro: null,
    hero_title_en: null,
    hero_highlight_ro: null,
    hero_highlight_en: null,
    hero_subtitle_ro: null,
    hero_subtitle_en: null,
    hero_badge_ro: null,
    hero_badge_en: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("ro");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("hero_title_ro, hero_title_en, hero_highlight_ro, hero_highlight_en, hero_subtitle_ro, hero_subtitle_en, hero_badge_ro, hero_badge_en")
        .eq("id", "default")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings({
          hero_title_ro: data.hero_title_ro,
          hero_title_en: data.hero_title_en,
          hero_highlight_ro: data.hero_highlight_ro,
          hero_highlight_en: data.hero_highlight_en,
          hero_subtitle_ro: data.hero_subtitle_ro,
          hero_subtitle_en: data.hero_subtitle_en,
          hero_badge_ro: data.hero_badge_ro,
          hero_badge_en: data.hero_badge_en,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca setările",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          ...settings,
        });

      if (error) throw error;

      toast({
        title: "Salvat cu succes!",
        description: "Textele hero au fost actualizate.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut salva setările.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (lang: "ro" | "en") => {
    const newSettings = { ...settings };
    
    if (lang === "ro") {
      newSettings.hero_title_ro = null;
      newSettings.hero_highlight_ro = null;
      newSettings.hero_subtitle_ro = null;
      newSettings.hero_badge_ro = null;
    } else {
      newSettings.hero_title_en = null;
      newSettings.hero_highlight_en = null;
      newSettings.hero_subtitle_en = null;
      newSettings.hero_badge_en = null;
    }

    setSettings(newSettings);

    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          ...newSettings,
        });

      if (error) throw error;

      toast({
        title: "Resetat",
        description: `Textele ${lang === "ro" ? "română" : "engleză"} au fost resetate la valorile implicite.`,
      });
    } catch (error) {
      console.error("Error resetting:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut reseta.",
        variant: "destructive",
      });
    }
  };

  const updateField = (field: keyof HeroTextSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value || null,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="w-5 h-5 text-primary" />
          Text Hero
        </CardTitle>
        <CardDescription>
          Personalizează textele din secțiunea hero a paginii principale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ro" className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Română
            </TabsTrigger>
            <TabsTrigger value="en" className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              English
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ro" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="badge_ro">Badge (text mic deasupra titlului)</Label>
              <Input
                id="badge_ro"
                value={settings.hero_badge_ro || ""}
                onChange={(e) => updateField("hero_badge_ro", e.target.value)}
                placeholder={defaultTexts.hero_badge_ro}
              />
              <p className="text-xs text-muted-foreground">
                Implicit: {defaultTexts.hero_badge_ro}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title_ro">Titlu principal</Label>
              <Input
                id="title_ro"
                value={settings.hero_title_ro || ""}
                onChange={(e) => updateField("hero_title_ro", e.target.value)}
                placeholder={defaultTexts.hero_title_ro}
              />
              <p className="text-xs text-muted-foreground">
                Implicit: {defaultTexts.hero_title_ro}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highlight_ro">Text evidențiat (gradient auriu)</Label>
              <Input
                id="highlight_ro"
                value={settings.hero_highlight_ro || ""}
                onChange={(e) => updateField("hero_highlight_ro", e.target.value)}
                placeholder={defaultTexts.hero_highlight_ro}
              />
              <p className="text-xs text-muted-foreground">
                Implicit: {defaultTexts.hero_highlight_ro}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle_ro">Subtitlu</Label>
              <Textarea
                id="subtitle_ro"
                value={settings.hero_subtitle_ro || ""}
                onChange={(e) => updateField("hero_subtitle_ro", e.target.value)}
                placeholder={defaultTexts.hero_subtitle_ro}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Implicit: {defaultTexts.hero_subtitle_ro}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => handleReset("ro")}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetează la textele implicite (RO)
            </Button>
          </TabsContent>

          <TabsContent value="en" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="badge_en">Badge (small text above title)</Label>
              <Input
                id="badge_en"
                value={settings.hero_badge_en || ""}
                onChange={(e) => updateField("hero_badge_en", e.target.value)}
                placeholder={defaultTexts.hero_badge_en}
              />
              <p className="text-xs text-muted-foreground">
                Default: {defaultTexts.hero_badge_en}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title_en">Main title</Label>
              <Input
                id="title_en"
                value={settings.hero_title_en || ""}
                onChange={(e) => updateField("hero_title_en", e.target.value)}
                placeholder={defaultTexts.hero_title_en}
              />
              <p className="text-xs text-muted-foreground">
                Default: {defaultTexts.hero_title_en}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highlight_en">Highlighted text (golden gradient)</Label>
              <Input
                id="highlight_en"
                value={settings.hero_highlight_en || ""}
                onChange={(e) => updateField("hero_highlight_en", e.target.value)}
                placeholder={defaultTexts.hero_highlight_en}
              />
              <p className="text-xs text-muted-foreground">
                Default: {defaultTexts.hero_highlight_en}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle_en">Subtitle</Label>
              <Textarea
                id="subtitle_en"
                value={settings.hero_subtitle_en || ""}
                onChange={(e) => updateField("hero_subtitle_en", e.target.value)}
                placeholder={defaultTexts.hero_subtitle_en}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Default: {defaultTexts.hero_subtitle_en}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => handleReset("en")}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to default texts (EN)
            </Button>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Se salvează...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvează modificările
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HeroTextManager;