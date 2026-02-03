import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { compressImage } from "@/utils/imageCompression";
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
  Play,
  Image as ImageIcon
} from "lucide-react";

interface SiteSettings {
  hero_video_url: string | null;
  hero_video_filename: string | null;
  hero_image_url: string | null;
  hero_image_filename: string | null;
}

const HeroVideoManager = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("hero_video_url, hero_video_filename, hero_image_url, hero_image_filename")
        .eq("id", "default")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setSettings(data || { 
        hero_video_url: null, 
        hero_video_filename: null,
        hero_image_url: null,
        hero_image_filename: null
      });
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

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Format invalid",
        description: "Te rugăm să încarci un fișier video (MP4, WebM, etc.)",
        variant: "destructive",
      });
      return;
    }

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format invalid",
        description: "Te rugăm să încarci un fișier imagine (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă este de 10MB",
        variant: "destructive",
      });
      return;
    }

    await uploadImage(file);
  };

  const uploadVideo = async (file: File) => {
    setIsUploadingVideo(true);
    setVideoUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `hero-video-${Date.now()}.${fileExt}`;

      if (settings?.hero_video_filename && settings.hero_video_filename !== "hero-video.mp4") {
        await supabase.storage
          .from("hero-videos")
          .remove([settings.hero_video_filename]);
      }

      const progressInterval = setInterval(() => {
        setVideoUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("hero-videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("hero-videos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          hero_video_url: urlData.publicUrl,
          hero_video_filename: fileName,
        });

      if (updateError) throw updateError;

      setVideoUploadProgress(100);
      setSettings(prev => prev ? {
        ...prev,
        hero_video_url: urlData.publicUrl,
        hero_video_filename: fileName,
      } : null);

      toast({
        title: "Video încărcat cu succes!",
        description: "Noul video hero a fost salvat.",
      });

      setTimeout(() => setVideoUploadProgress(0), 1500);
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca video-ul. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  };

  const uploadImage = async (file: File) => {
    setIsUploadingImage(true);
    setImageUploadProgress(0);

    try {
      // Compress image to WebP for better performance
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.90,
        outputType: 'image/webp',
      });

      const fileName = `hero-image-${Date.now()}.webp`;

      // Delete old image if exists and is not default
      if (settings?.hero_image_filename) {
        await supabase.storage
          .from("hero-videos")
          .remove([settings.hero_image_filename]);
      }

      const progressInterval = setInterval(() => {
        setImageUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 150);

      const { error: uploadError } = await supabase.storage
        .from("hero-videos")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("hero-videos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          hero_image_url: urlData.publicUrl,
          hero_image_filename: fileName,
        });

      if (updateError) throw updateError;

      setImageUploadProgress(100);
      setSettings(prev => prev ? {
        ...prev,
        hero_image_url: urlData.publicUrl,
        hero_image_filename: fileName,
      } : null);

      toast({
        title: "Imagine încărcată cu succes!",
        description: "Noua imagine de fallback a fost salvată.",
      });

      setTimeout(() => setImageUploadProgress(0), 1500);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Eroare la încărcare",
        description: "Nu s-a putut încărca imaginea. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleResetVideo = async () => {
    try {
      if (settings?.hero_video_filename && settings.hero_video_filename !== "hero-video.mp4") {
        await supabase.storage
          .from("hero-videos")
          .remove([settings.hero_video_filename]);
      }

      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          hero_video_url: "/hero-video.mp4",
          hero_video_filename: "hero-video.mp4",
        });

      if (error) throw error;

      setSettings(prev => prev ? {
        ...prev,
        hero_video_url: "/hero-video.mp4",
        hero_video_filename: "hero-video.mp4",
      } : null);

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

  const handleResetImage = async () => {
    try {
      if (settings?.hero_image_filename) {
        await supabase.storage
          .from("hero-videos")
          .remove([settings.hero_image_filename]);
      }

      const { error } = await supabase
        .from("site_settings")
        .upsert({
          id: "default",
          hero_image_url: null,
          hero_image_filename: null,
        });

      if (error) throw error;

      setSettings(prev => prev ? {
        ...prev,
        hero_image_url: null,
        hero_image_filename: null,
      } : null);

      toast({
        title: "Imagine resetată",
        description: "S-a revenit la imaginea implicită.",
      });
    } catch (error) {
      console.error("Error resetting image:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut reseta imaginea.",
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
  const hasCustomImage = !!settings?.hero_image_url;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Video Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Hero
          </CardTitle>
          <CardDescription>
            Video-ul de fundal din secțiunea hero.
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
                  <span>Video implicit</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="truncate">{settings?.hero_video_filename}</span>
                </>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <Label>Încarcă video nou</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                disabled={isUploadingVideo}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingVideo}
              >
                {isUploadingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {videoUploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Încarcă
                  </>
                )}
              </Button>
            </div>
            {isUploadingVideo && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${videoUploadProgress}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              MP4, WebM, MOV. Max 100MB. Recomandat: 1920x1080.
            </p>
          </div>

          {/* Reset Button */}
          {!isDefaultVideo && (
            <Button
              variant="destructive"
              onClick={handleResetVideo}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Resetează video
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Image Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Imagine Fallback
          </CardTitle>
          <CardDescription>
            Imagine afișată până la încărcarea video-ului sau pe conexiuni lente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Image Preview */}
          <div className="space-y-3">
            <Label>Imagine curentă</Label>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border">
              {hasCustomImage ? (
                <img
                  src={settings.hero_image_url!}
                  alt="Hero fallback"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Imagine implicită (apt-01.jpg)</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {!hasCustomImage ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Imagine implicită</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="truncate">{settings?.hero_image_filename}</span>
                </>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <Label>Încarcă imagine nouă</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={isUploadingImage}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {imageUploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Încarcă
                  </>
                )}
              </Button>
            </div>
            {isUploadingImage && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${imageUploadProgress}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP. Max 10MB. Recomandat: 1920x1080.
            </p>
          </div>

          {/* Reset Button */}
          {hasCustomImage && (
            <Button
              variant="destructive"
              onClick={handleResetImage}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Resetează imagine
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroVideoManager;