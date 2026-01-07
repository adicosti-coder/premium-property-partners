import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowLeft, Key, Building2 } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

type AuthMode = "login" | "signup" | "reset";

const OwnerAuth = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerCode, setOwnerCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const translations = {
    ro: {
      title: "Portal Proprietari",
      loginTitle: "Autentificare Proprietar",
      signupTitle: "Înregistrare cu Cod",
      resetTitle: "Recuperare Parolă",
      loginSubtitle: "Accesează dashboard-ul proprietății tale",
      signupSubtitle: "Înregistrează-te folosind codul primit de la RealTrust",
      resetSubtitle: "Vei primi un email cu link-ul de resetare",
      email: "Email",
      emailPlaceholder: "email@exemplu.com",
      password: "Parolă",
      ownerCode: "Cod Proprietar",
      ownerCodePlaceholder: "Introdu codul primit",
      login: "Autentificare",
      signup: "Înregistrare",
      sendResetLink: "Trimite link",
      processing: "Se procesează...",
      forgotPassword: "Ai uitat parola?",
      noAccount: "Ai un cod de proprietar? Înregistrează-te",
      hasAccount: "Ai deja cont? Autentifică-te",
      backToLogin: "Înapoi la autentificare",
      backToSite: "Înapoi la site",
      invalidEmail: "Email invalid",
      invalidEmailMessage: "Te rugăm să introduci un email valid.",
      invalidPassword: "Parolă invalidă",
      invalidPasswordMessage: "Parola trebuie să aibă minim 6 caractere.",
      invalidCode: "Cod invalid",
      invalidCodeMessage: "Codul introdus nu este valid sau a fost deja folosit.",
      error: "Eroare",
      genericError: "A apărut o eroare. Te rugăm să încerci din nou.",
      invalidCredentials: "Email sau parolă incorectă.",
      alreadyRegistered: "Acest email este deja înregistrat.",
      emailNotConfirmed: "Te rugăm să confirmi emailul.",
      loginSuccess: "Autentificare reușită!",
      signupSuccess: "Cont creat cu succes!",
      signupSuccessMessage: "Poți accesa acum dashboard-ul.",
      resetEmailSent: "Email trimis!",
      resetEmailSentMessage: "Verifică inbox-ul pentru link-ul de resetare.",
    },
    en: {
      title: "Owner Portal",
      loginTitle: "Owner Login",
      signupTitle: "Register with Code",
      resetTitle: "Password Recovery",
      loginSubtitle: "Access your property dashboard",
      signupSubtitle: "Register using the code received from RealTrust",
      resetSubtitle: "You will receive an email with the reset link",
      email: "Email",
      emailPlaceholder: "email@example.com",
      password: "Password",
      ownerCode: "Owner Code",
      ownerCodePlaceholder: "Enter the code received",
      login: "Login",
      signup: "Register",
      sendResetLink: "Send link",
      processing: "Processing...",
      forgotPassword: "Forgot password?",
      noAccount: "Have an owner code? Register",
      hasAccount: "Already have an account? Login",
      backToLogin: "Back to login",
      backToSite: "Back to site",
      invalidEmail: "Invalid email",
      invalidEmailMessage: "Please enter a valid email.",
      invalidPassword: "Invalid password",
      invalidPasswordMessage: "Password must be at least 6 characters.",
      invalidCode: "Invalid code",
      invalidCodeMessage: "The code entered is invalid or has already been used.",
      error: "Error",
      genericError: "An error occurred. Please try again.",
      invalidCredentials: "Invalid email or password.",
      alreadyRegistered: "This email is already registered.",
      emailNotConfirmed: "Please confirm your email.",
      loginSuccess: "Login successful!",
      signupSuccess: "Account created successfully!",
      signupSuccessMessage: "You can now access the dashboard.",
      resetEmailSent: "Email sent!",
      resetEmailSentMessage: "Check your inbox for the reset link.",
    },
  };

  const t = translations[language] || translations.ro;

  const emailSchema = z.string().email(t.invalidEmailMessage);
  const passwordSchema = z.string().min(6, t.invalidPasswordMessage);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Check if user is an owner
          const { data: ownerData } = await supabase
            .from("owner_properties")
            .select("id")
            .eq("user_id", session.user.id)
            .limit(1);

          if (ownerData && ownerData.length > 0) {
            navigate("/portal-proprietar");
          }
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: ownerData } = await supabase
          .from("owner_properties")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);

        if (ownerData && ownerData.length > 0) {
          navigate("/portal-proprietar");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: t.invalidEmail,
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: t.resetEmailSent,
        description: t.resetEmailSentMessage,
      });
      setMode("login");
      setEmail("");
    } catch {
      toast({
        title: t.error,
        description: t.genericError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "reset") {
      return handlePasswordReset(e);
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: t.invalidEmail,
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: t.invalidPassword,
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check if user is an owner
        const { data: ownerData } = await supabase
          .from("owner_properties")
          .select("id")
          .eq("user_id", authData.user.id)
          .limit(1);

        if (!ownerData || ownerData.length === 0) {
          await supabase.auth.signOut();
          toast({
            title: t.error,
            description: t.invalidCredentials,
            variant: "destructive",
          });
          return;
        }

        toast({ title: t.loginSuccess });
        navigate("/portal-proprietar");
      } else {
        // Verify owner code first
        const { data: codeData, error: codeError } = await supabase
          .from("owner_codes")
          .select("id, property_id")
          .eq("code", ownerCode.trim().toUpperCase())
          .eq("is_used", false)
          .maybeSingle();

        if (codeError || !codeData) {
          toast({
            title: t.invalidCode,
            description: t.invalidCodeMessage,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Create user account
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal-proprietar`,
          },
        });
        if (signupError) throw signupError;

        if (authData.user) {
          // Mark code as used
          await supabase
            .from("owner_codes")
            .update({ is_used: true, used_by: authData.user.id })
            .eq("id", codeData.id);

          // Link property to owner
          await supabase
            .from("owner_properties")
            .insert({
              user_id: authData.user.id,
              property_id: codeData.property_id,
            });

          // Add owner role
          await supabase
            .from("user_roles")
            .insert({
              user_id: authData.user.id,
              role: "owner" as any,
            });
        }

        toast({
          title: t.signupSuccess,
          description: t.signupSuccessMessage,
        });
        navigate("/portal-proprietar");
      }
    } catch (error: any) {
      let message = t.genericError;
      if (error.message?.includes("Invalid login credentials")) {
        message = t.invalidCredentials;
      } else if (error.message?.includes("User already registered")) {
        message = t.alreadyRegistered;
      } else if (error.message?.includes("Email not confirmed")) {
        message = t.emailNotConfirmed;
      }
      toast({
        title: t.error,
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login":
        return t.loginTitle;
      case "signup":
        return t.signupTitle;
      case "reset":
        return t.resetTitle;
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "login":
        return t.loginSubtitle;
      case "signup":
        return t.signupSubtitle;
      case "reset":
        return t.resetSubtitle;
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {t.processing}
        </>
      );
    }
    switch (mode) {
      case "login":
        return t.login;
      case "signup":
        return t.signup;
      case "reset":
        return t.sendResetLink;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-background to-amber-50/30 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToSite}
          </Button>
          <LanguageSwitcher />
        </div>

        <div className="bg-card p-8 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground">
              {getSubtitle()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="ownerCode">{t.ownerCode}</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ownerCode"
                    type="text"
                    placeholder={t.ownerCodePlaceholder}
                    value={ownerCode}
                    onChange={(e) => setOwnerCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase tracking-widest"
                    required
                    maxLength={20}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  maxLength={255}
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t.password}</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      {t.forgotPassword}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                    maxLength={72}
                  />
                </div>
                {mode === "signup" && <PasswordStrengthIndicator password={password} />}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white" 
              disabled={isLoading}
            >
              {getButtonText()}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "reset" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-amber-600 hover:underline text-sm"
              >
                {t.backToLogin}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-amber-600 hover:underline text-sm"
              >
                {mode === "login" ? t.noAccount : t.hasAccount}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerAuth;
