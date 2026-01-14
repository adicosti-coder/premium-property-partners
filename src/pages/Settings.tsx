import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ArrowLeft, Bell, Globe, Key, Loader2, Settings as SettingsIcon, Trash2, Shield, ShieldCheck, ShieldOff, Copy, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  
  // 2FA states
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

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
      
      // 2FA section
      twoFactorSection: "Autentificare în doi pași (2FA)",
      twoFactorDescription: "Adaugă un nivel suplimentar de securitate contului tău",
      twoFactorEnabled: "2FA este activat",
      twoFactorDisabled: "2FA nu este activat",
      enable2FA: "Activează 2FA",
      disable2FA: "Dezactivează 2FA",
      scanQRCode: "Scanează codul QR cu aplicația de autentificare",
      orEnterManually: "Sau introdu manual acest cod în aplicație:",
      enterVerificationCode: "Introdu codul de verificare",
      verificationCodePlaceholder: "Cod din 6 cifre",
      verify: "Verifică și activează",
      verifying: "Se verifică...",
      cancel: "Anulează",
      twoFactorSuccess: "2FA a fost activat cu succes!",
      twoFactorDisableSuccess: "2FA a fost dezactivat!",
      twoFactorError: "Eroare la configurarea 2FA",
      invalidCode: "Cod invalid. Încearcă din nou.",
      copiedToClipboard: "Copiat în clipboard!",
      copySecret: "Copiază codul",
      
      // Notifications section
      notificationsSection: "Notificări",
      notificationsDescription: "Controlează cum primești notificările",
      emailNotifications: "Notificări email",
      emailNotificationsDesc: "Primește actualizări prin email despre rezervări și proprietăți",
      notificationsSaved: "Preferințele de notificare au fost salvate!",
      
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
      
      // 2FA section
      twoFactorSection: "Two-Factor Authentication (2FA)",
      twoFactorDescription: "Add an extra layer of security to your account",
      twoFactorEnabled: "2FA is enabled",
      twoFactorDisabled: "2FA is not enabled",
      enable2FA: "Enable 2FA",
      disable2FA: "Disable 2FA",
      scanQRCode: "Scan the QR code with your authenticator app",
      orEnterManually: "Or manually enter this code in your app:",
      enterVerificationCode: "Enter verification code",
      verificationCodePlaceholder: "6-digit code",
      verify: "Verify and enable",
      verifying: "Verifying...",
      cancel: "Cancel",
      twoFactorSuccess: "2FA has been enabled successfully!",
      twoFactorDisableSuccess: "2FA has been disabled!",
      twoFactorError: "Error configuring 2FA",
      invalidCode: "Invalid code. Please try again.",
      copiedToClipboard: "Copied to clipboard!",
      copySecret: "Copy code",
      
      // Notifications section
      notificationsSection: "Notifications",
      notificationsDescription: "Control how you receive notifications",
      emailNotifications: "Email Notifications",
      emailNotificationsDesc: "Receive email updates about bookings and properties",
      notificationsSaved: "Notification preferences saved!",
      
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
        checkMfaStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkMfaStatus = async () => {
    try {
      setMfaLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const verifiedFactor = data.totp.find(factor => factor.status === 'verified');
      setMfaEnabled(!!verifiedFactor);
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
    } finally {
      setMfaLoading(false);
    }
  };

  const startMfaEnrollment = async () => {
    try {
      setMfaEnrolling(true);
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      
      if (error) throw error;
      
      setQrCode(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      console.error("Error starting MFA enrollment:", error);
      toast.error(text.twoFactorError);
      setMfaEnrolling(false);
    }
  };

  const cancelMfaEnrollment = async () => {
    if (factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch (error) {
        console.error("Error canceling enrollment:", error);
      }
    }
    setMfaEnrolling(false);
    setQrCode(null);
    setTotpSecret(null);
    setFactorId(null);
    setVerifyCode("");
  };

  const verifyAndEnableMfa = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    
    try {
      setVerifying(true);
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode
      });
      
      if (error) {
        toast.error(text.invalidCode);
        return;
      }
      
      toast.success(text.twoFactorSuccess);
      setMfaEnabled(true);
      setMfaEnrolling(false);
      setQrCode(null);
      setTotpSecret(null);
      setVerifyCode("");
    } catch (error: any) {
      console.error("Error verifying MFA:", error);
      toast.error(text.invalidCode);
    } finally {
      setVerifying(false);
    }
  };

  const disableMfa = async () => {
    if (!factorId) return;
    
    try {
      setMfaLoading(true);
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) throw error;
      
      toast.success(text.twoFactorDisableSuccess);
      setMfaEnabled(false);
      setFactorId(null);
    } catch (error: any) {
      console.error("Error disabling MFA:", error);
      toast.error(text.twoFactorError);
    } finally {
      setMfaLoading(false);
    }
  };

  const copySecretToClipboard = async () => {
    if (totpSecret) {
      await navigator.clipboard.writeText(totpSecret);
      setSecretCopied(true);
      toast.success(text.copiedToClipboard);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const fetchSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notifications_enabled")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching settings:", error);
      }

      if (data) {
        setNotificationsEnabled(data.notifications_enabled || false);
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

          {/* 2FA Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                {text.twoFactorSection}
              </CardTitle>
              <CardDescription>{text.twoFactorDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mfaLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : mfaEnrolling ? (
                <div className="space-y-4">
                  {qrCode && (
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm text-muted-foreground text-center">
                        {text.scanQRCode}
                      </p>
                      <div className="p-4 bg-white rounded-lg">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                      </div>
                      
                      {totpSecret && (
                        <div className="w-full space-y-2">
                          <p className="text-sm text-muted-foreground text-center">
                            {text.orEnterManually}
                          </p>
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <code className="flex-1 text-sm font-mono break-all">
                              {totpSecret}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={copySecretToClipboard}
                              className="shrink-0"
                            >
                              {secretCopied ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="w-full space-y-2">
                        <Label htmlFor="verifyCode">{text.enterVerificationCode}</Label>
                        <Input
                          id="verifyCode"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                          placeholder={text.verificationCodePlaceholder}
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          onClick={cancelMfaEnrollment}
                          className="flex-1"
                        >
                          {text.cancel}
                        </Button>
                        <Button
                          onClick={verifyAndEnableMfa}
                          disabled={verifying || verifyCode.length !== 6}
                          className="flex-1"
                        >
                          {verifying ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {text.verifying}
                            </>
                          ) : (
                            text.verify
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : mfaEnabled ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium">{text.twoFactorEnabled}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ShieldOff className="w-4 h-4 mr-2" />
                        {text.disable2FA}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{text.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {language === 'ro' 
                            ? 'Dezactivarea 2FA va reduce securitatea contului tău. Ești sigur?' 
                            : 'Disabling 2FA will reduce your account security. Are you sure?'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{text.deleteCancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={disableMfa}>
                          {text.disable2FA}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldOff className="w-5 h-5" />
                    <span>{text.twoFactorDisabled}</span>
                  </div>
                  <Button onClick={startMfaEnrollment}>
                    <Shield className="w-4 h-4 mr-2" />
                    {text.enable2FA}
                  </Button>
                </div>
              )}
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
    </div>
  );
};

export default Settings;
