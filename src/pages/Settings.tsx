import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "sonner";
import { ArrowLeft, Bell, Globe, Key, Loader2, Settings as SettingsIcon, Trash2, Shield, Volume2, Volume1 } from "lucide-react";
import { useUISound } from "@/hooks/useUISound";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { z } from "zod";

const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Settings = () => {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [shareEmailOnImport, setShareEmailOnImport] = useState(false);
  const [savingShareEmail, setSavingShareEmail] = useState(false);
  
  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('ui-sound-preference');
    return stored !== null ? stored === 'true' : true;
  });
  
  const [soundVolume, setSoundVolume] = useState(() => {
    const stored = localStorage.getItem('ui-sound-volume');
    return stored !== null ? parseFloat(stored) : 0.15;
  });
  
  // Sound hook for preview
  const { playSound } = useUISound({ volume: soundVolume });

  const t = {
    ro: {
      title: "Setări cont",
      subtitle: "Gestionează preferințele și securitatea contului tău",
      back: "Înapoi",
      
      // Password section
      passwordSection: "Schimbă parola",
      passwordDescription: "Actualizează parola contului tău pentru mai multă securitate",
      newPassword: "Parolă nouă",
      newPasswordPlaceholder: "Minim 8 caractere",
      confirmPassword: "Confirmă parola",
      confirmPasswordPlaceholder: "Repetă parola nouă",
      changePassword: "Schimbă parola",
      changingPassword: "Se schimbă...",
      passwordSuccess: "Parola a fost schimbată cu succes!",
      passwordError: "Eroare la schimbarea parolei",
      passwordMismatch: "Parolele nu coincid",
      passwordTooShort: "Parola trebuie să aibă cel puțin 8 caractere",
      
      // Sound section
      soundSection: "Sunete UI",
      soundDescription: "Controlează feedback-ul audio pentru interacțiuni",
      soundEnabled: "Activează sunetele",
      soundEnabledDesc: "Redă sunete subtile pentru acțiuni precum type-ahead și selecții",
      soundSaved: "Preferințele de sunet au fost salvate!",
      soundPreview: "Previzualizare",
      soundVolume: "Volum",
      
      // Notifications section
      notificationsSection: "Notificări",
      notificationsDescription: "Controlează cum primești notificările",
      emailNotifications: "Notificări email",
      emailNotificationsDesc: "Primește email când cineva îți importă locațiile partajate",
      notificationsSaved: "Preferințele de notificare au fost salvate!",
      
      // Privacy section
      privacySection: "Confidențialitate",
      privacyDescription: "Controlează ce informații sunt vizibile pentru alții",
      shareEmailOnImport: "Partajează email la import",
      shareEmailOnImportDesc: "Permite celor care îți partajezi locațiile să vadă email-ul tău când importă",
      privacySaved: "Preferințele de confidențialitate au fost salvate!",
      
      // Language section
      languageSection: "Limbă",
      languageDescription: "Selectează limba preferată pentru interfață",
      selectLanguage: "Selectează limba",
      romanian: "Română",
      english: "English",
      languageSaved: "Limba a fost schimbată!",
      
      // Delete section
      deleteSection: "Șterge contul",
      deleteDescription: "Șterge definitiv contul și toate datele asociate",
      deleteWarning: "Această acțiune este ireversibilă!",
      deleteButton: "Șterge contul",
      deleteConfirmTitle: "Ești sigur?",
      deleteConfirmDescription: "Această acțiune nu poate fi anulată. Contul tău și toate datele asociate vor fi șterse permanent.",
      deleteCancel: "Anulează",
      deleteConfirm: "Da, șterge contul",
      deleteSuccess: "Contul a fost șters cu succes",
      deleteError: "Eroare la ștergerea contului",
      
      notLoggedIn: "Trebuie să fii autentificat pentru a accesa această pagină",
    },
    en: {
      title: "Account Settings",
      subtitle: "Manage your account preferences and security",
      back: "Back",
      
      // Password section
      passwordSection: "Change Password",
      passwordDescription: "Update your account password for better security",
      newPassword: "New Password",
      newPasswordPlaceholder: "Minimum 8 characters",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Repeat the new password",
      changePassword: "Change Password",
      changingPassword: "Changing...",
      passwordSuccess: "Password changed successfully!",
      passwordError: "Error changing password",
      passwordMismatch: "Passwords don't match",
      passwordTooShort: "Password must be at least 8 characters",
      
      // Sound section
      soundSection: "UI Sounds",
      soundDescription: "Control audio feedback for interactions",
      soundEnabled: "Enable sounds",
      soundEnabledDesc: "Play subtle sounds for actions like type-ahead and selections",
      soundSaved: "Sound preferences saved!",
      soundPreview: "Preview",
      soundVolume: "Volume",
      
      // Notifications section
      notificationsSection: "Notifications",
      notificationsDescription: "Control how you receive notifications",
      emailNotifications: "Email Notifications",
      emailNotificationsDesc: "Receive emails when someone imports your shared locations",
      notificationsSaved: "Notification preferences saved!",
      
      // Privacy section
      privacySection: "Privacy",
      privacyDescription: "Control what information is visible to others",
      shareEmailOnImport: "Share email on import",
      shareEmailOnImportDesc: "Allow those you share locations with to see your email when they import",
      privacySaved: "Privacy preferences saved!",
      
      // Language section
      languageSection: "Language",
      languageDescription: "Select your preferred interface language",
      selectLanguage: "Select language",
      romanian: "Română",
      english: "English",
      languageSaved: "Language changed!",
      
      // Delete section
      deleteSection: "Delete Account",
      deleteDescription: "Permanently delete your account and all associated data",
      deleteWarning: "This action is irreversible!",
      deleteButton: "Delete Account",
      deleteConfirmTitle: "Are you sure?",
      deleteConfirmDescription: "This action cannot be undone. Your account and all associated data will be permanently deleted.",
      deleteCancel: "Cancel",
      deleteConfirm: "Yes, delete account",
      deleteSuccess: "Account deleted successfully",
      deleteError: "Error deleting account",
      
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
        fetchSettings(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notifications_enabled, share_email_on_import")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching settings:", error);
      }

      if (data) {
        setNotificationsEnabled(data.notifications_enabled || false);
        setShareEmailOnImport(data.share_email_on_import || false);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordErrors({});
    
    const validation = passwordSchema.safeParse({ newPassword, confirmPassword });
    
    if (!validation.success) {
      const errors: { newPassword?: string; confirmPassword?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === "newPassword") {
          errors.newPassword = err.message;
        }
        if (err.path[0] === "confirmPassword") {
          errors.confirmPassword = err.message;
        }
      });
      setPasswordErrors(errors);
      return;
    }

    try {
      setSavingPassword(true);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(text.passwordSuccess);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(text.passwordError);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    if (!user) return;

    try {
      setSavingNotifications(true);
      setNotificationsEnabled(enabled);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          notifications_enabled: enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(text.notificationsSaved);
    } catch (error) {
      console.error("Error saving notifications:", error);
      setNotificationsEnabled(!enabled);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as "ro" | "en");
    toast.success(text.languageSaved);
  };

  const handleShareEmailChange = async (enabled: boolean) => {
    if (!user) return;

    try {
      setSavingShareEmail(true);
      setShareEmailOnImport(enabled);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          share_email_on_import: enabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(text.privacySaved);
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      setShareEmailOnImport(!enabled);
    } finally {
      setSavingShareEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      setDeleting(true);

      // Delete profile data first
      await supabase.from("profiles").delete().eq("id", user.id);
      
      // Sign out the user
      await supabase.auth.signOut();
      
      toast.success(text.deleteSuccess);
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(text.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: language === "ro" ? "Profil" : "Profile", href: "/profil" },
    { label: text.title }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${text.title} | RealTrust`}
        description={text.subtitle}
        noIndex={true}
      />
      <Header />
      
      <main className="container mx-auto px-4 py-24 max-w-2xl">
        <PageBreadcrumb items={breadcrumbItems} className="mb-6" />
        
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {text.back}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            {text.title}
          </h1>
          <p className="text-muted-foreground mt-2">{text.subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* Password Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5" />
                {text.passwordSection}
              </CardTitle>
              <CardDescription>{text.passwordDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{text.newPassword}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={text.newPasswordPlaceholder}
                  className={passwordErrors.newPassword ? "border-destructive" : ""}
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{text.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={text.confirmPasswordPlaceholder}
                  className={passwordErrors.confirmPassword ? "border-destructive" : ""}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {text.changingPassword}
                  </>
                ) : (
                  text.changePassword
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5" />
                {text.notificationsSection}
              </CardTitle>
              <CardDescription>{text.notificationsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{text.emailNotifications}</Label>
                  <p className="text-sm text-muted-foreground">{text.emailNotificationsDesc}</p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationsChange}
                  disabled={savingNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                {text.privacySection}
              </CardTitle>
              <CardDescription>{text.privacyDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{text.shareEmailOnImport}</Label>
                  <p className="text-sm text-muted-foreground">{text.shareEmailOnImportDesc}</p>
                </div>
                <Switch
                  checked={shareEmailOnImport}
                  onCheckedChange={handleShareEmailChange}
                  disabled={savingShareEmail}
                />
              </div>
            </CardContent>
          </Card>

          {/* Language Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5" />
                {text.languageSection}
              </CardTitle>
              <CardDescription>{text.languageDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={text.selectLanguage} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ro">{text.romanian}</SelectItem>
                  <SelectItem value="en">{text.english}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Sound Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Volume2 className="w-5 h-5" />
                {text.soundSection}
              </CardTitle>
              <CardDescription>{text.soundDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{text.soundEnabled}</Label>
                  <p className="text-sm text-muted-foreground">{text.soundEnabledDesc}</p>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={(enabled) => {
                    setSoundEnabled(enabled);
                    localStorage.setItem('ui-sound-preference', String(enabled));
                    toast.success(text.soundSaved);
                    if (enabled) {
                      // Play a preview sound when enabling
                      setTimeout(() => playSound("success"), 100);
                    }
                  }}
                />
              </div>
              {soundEnabled && (
                <>
                  {/* Volume Slider */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Volume1 className="w-4 h-4" />
                        {text.soundVolume}
                      </span>
                      <span className="font-mono text-sm">{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[soundVolume * 100]}
                      onValueChange={(value) => {
                        const newVolume = value[0] / 100;
                        setSoundVolume(newVolume);
                        localStorage.setItem('ui-sound-volume', String(newVolume));
                      }}
                      onValueCommit={() => {
                        playSound("pop");
                      }}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Preview Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playSound("click")}
                    >
                      Click
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playSound("pop")}
                    >
                      Pop
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playSound("success")}
                    >
                      Success
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2">
                      {text.soundPreview}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Separator className="my-8" />

          {/* Delete Account Section */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <Trash2 className="w-5 h-5" />
                {text.deleteSection}
              </CardTitle>
              <CardDescription>{text.deleteDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive mb-4">{text.deleteWarning}</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {text.deleteButton}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{text.deleteConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {text.deleteConfirmDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{text.deleteCancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {text.deleteConfirm}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <GlobalConversionWidgets showExitIntent={false} showSocialProof={false} />
      <BackToTop />
    </div>
  );
};

export default Settings;
