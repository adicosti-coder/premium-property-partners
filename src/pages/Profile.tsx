import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, Save, Trash2, User as UserIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Profile = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const t = {
    ro: {
      title: "Profilul meu",
      subtitle: "Vizualizează și editează informațiile contului tău",
      email: "Email",
      emailDescription: "Adresa de email nu poate fi modificată",
      fullName: "Nume complet",
      fullNamePlaceholder: "Introdu numele tău",
      avatar: "Avatar",
      changeAvatar: "Schimbă avatar",
      save: "Salvează modificările",
      saving: "Se salvează...",
      back: "Înapoi",
      success: "Profil actualizat cu succes!",
      error: "Eroare la actualizarea profilului",
      uploadError: "Eroare la încărcarea imaginii",
      deleteAvatar: "Șterge avatar",
      deleteAvatarConfirm: "Ești sigur că vrei să ștergi avatarul?",
      deleteAvatarDescription: "Avatarul tău va fi resetat la imaginea implicită.",
      cancel: "Anulează",
      confirm: "Șterge",
      avatarDeleted: "Avatar șters cu succes!",
      deleteError: "Eroare la ștergerea avatarului",
      notLoggedIn: "Trebuie să fii autentificat pentru a accesa această pagină",
    },
    en: {
      title: "My Profile",
      subtitle: "View and edit your account information",
      email: "Email",
      emailDescription: "Email address cannot be changed",
      fullName: "Full Name",
      fullNamePlaceholder: "Enter your name",
      avatar: "Avatar",
      changeAvatar: "Change avatar",
      save: "Save changes",
      saving: "Saving...",
      back: "Back",
      success: "Profile updated successfully!",
      error: "Error updating profile",
      uploadError: "Error uploading image",
      deleteAvatar: "Delete avatar",
      deleteAvatarConfirm: "Are you sure you want to delete your avatar?",
      deleteAvatarDescription: "Your avatar will be reset to the default image.",
      cancel: "Cancel",
      confirm: "Delete",
      avatarDeleted: "Avatar deleted successfully!",
      deleteError: "Error deleting avatar",
      notLoggedIn: "You must be logged in to access this page",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type - only images allowed
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(language === "ro" 
          ? "Doar fișiere imagine sunt permise (JPG, PNG, GIF, WEBP)" 
          : "Only image files are allowed (JPG, PNG, GIF, WEBP)");
        return;
      }
      
      // Validate file size - max 2MB
      const maxSizeBytes = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSizeBytes) {
        toast.error(language === "ro" 
          ? "Fișierul este prea mare. Dimensiunea maximă este 2MB." 
          : "File is too large. Maximum size is 2MB.");
        return;
      }
      
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      // Also update in database
      await supabase
        .from("profiles")
        .upsert({
          id: user?.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      toast.success(text.success);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(text.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !avatarUrl) return;

    try {
      setDeleting(true);

      // Extract file path from URL
      const urlParts = avatarUrl.split("/avatars/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("avatars").remove([filePath]);
      }

      // Update profile to remove avatar
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setAvatarUrl(null);
      toast.success(text.avatarDeleted);
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error(text.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(text.success);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(text.error);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-24 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {text.back}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              {text.title}
            </CardTitle>
            <CardDescription>{text.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName || "Avatar"} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{text.changeAvatar}</p>
                {avatarUrl && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{text.deleteAvatarConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {text.deleteAvatarDescription}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteAvatar}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {text.confirm}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">{text.email}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">{text.emailDescription}</p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{text.fullName}</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={text.fullNamePlaceholder}
              />
            </div>

            {/* Save Button */}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {text.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {text.save}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
