import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Upload, 
  Video, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Play
} from "lucide-react";

interface SiteSettings {
  hero_video_url: string | null;
  hero_video_filename: string | null;
}

const HeroVideoManager = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("hero_video_url, hero_video_filename")
        .eq("id", "default")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setSettings(data || { hero_video_url: null, hero_video_filename: null });
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Format invalid",
        description: "Te rugăm să încarci un fișier video (MP4, WebM, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă este de 100MB",
        variant: "destructive",
      });
      return;
    }

    await uploadVideo(file);
  };

  const uploadVideo = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `hero-video-${Date.now()}.${fileExt}`;

      // Delete old video if exists
      if (settings?.hero_video_filename && settings.hero_video_filename !== "hero-video.mp4") {
        await supabase.storage
          .from("hero-videos")
          .remove([settings.hero_video_filename]);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload new video
      const { error: uploadError } = await supabase.storage
        .from("hero-videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("hero-videos")
        .getPublicUrl(fileName);

      // Update settings in database
      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          hero_video_url: urlData.publicUrl,
          hero_video_filename: fileName,
        });

      if (updateError) throw updateError;

      setUploadProgress(100);
      setSettings({
        hero_video_url: urlData.publicUrl,
        hero_video_filename: fileName,
      });

      toast({
        title: "Video încărcat cu succes!",
        description: "Noul video hero a fost salvat.",
      });

      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1500);
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca video-ul. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleResetToDefault = async () => {
    try {
      // Delete current video from storage if it's not the default
      if (settings?.hero_video_filename && settings.hero_video_filename !== "hero-video.mp4") {
        await supabase.storage
          .from("hero-videos")
          .remove([settings.hero_video_filename]);
      }

      // Reset to default video
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          hero_video_url: "/hero-video.mp4",
          hero_video_filename: "hero-video.mp4",
        });

      if (error) throw error;

      setSettings({
        hero_video_url: "/hero-video.mp4",
        hero_video_filename: "hero-video.mp4",
      });

      toast({
        title: "Video resetat",
        description: "S-a revenit la video-ul implicit.",
      });
    } catch (error) {
      console.error("Error resetting video:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut reseta video-ul.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDefaultVideo = settings?.hero_video_filename === "hero-video.mp4" || !settings?.hero_video_url;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Hero
          </CardTitle>
          <CardDescription>
            Gestionează video-ul de fundal din secțiunea hero a paginii principale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Video Preview */}
          <div className="space-y-3">
            <Label>Video curent</Label>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border">
              {settings?.hero_video_url ? (
                <video
                  src={settings.hero_video_url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  loop
                >
                  <source src={settings.hero_video_url} type="video/mp4" />
                </video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Niciun video încărcat</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isDefaultVideo ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Video implicit (din fișierele locale)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Video personalizat: {settings?.hero_video_filename}</span>
                </>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <Label>Încarcă video nou</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Încarcă
                  </>
                )}
              </Button>
            </div>
            {isUploading && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Formate acceptate: MP4, WebM, MOV. Dimensiune maximă: 100MB.
              Recomandare: video 1920x1080 pentru calitate optimă.
            </p>
          </div>

          {/* Reset Button */}
          {!isDefaultVideo && (
            <Button
              variant="destructive"
              onClick={handleResetToDefault}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Resetează la video-ul implicit
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroVideoManager;