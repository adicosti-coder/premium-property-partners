import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

type AuthMode = "login" | "signup" | "reset";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  
  // Get redirect URL and initial mode from query params
  const redirectUrl = searchParams.get('redirect') || '/admin';
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailSchema = z.string().email(t.auth.invalidEmailMessage);
  const passwordSchema = z.string().min(6, t.auth.invalidPasswordMessage);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Navigate to the redirect URL or default to /admin
          navigate(redirectUrl);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate(redirectUrl);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectUrl]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: t.auth.invalidEmail,
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
        title: t.auth.resetEmailSent,
        description: t.auth.resetEmailSentMessage,
      });
      setMode("login");
      setEmail("");
    } catch (error: any) {
      toast({
        title: t.auth.error,
        description: t.auth.genericError,
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

    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: t.auth.invalidEmail,
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: t.auth.invalidPassword,
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: t.auth.loginSuccess });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });
        if (error) throw error;
        toast({
          title: t.auth.signupSuccess,
          description: t.auth.signupSuccessMessage,
        });
        setMode("login");
      }
    } catch (error: any) {
      let message = t.auth.genericError;
      if (error.message?.includes("Invalid login credentials")) {
        message = t.auth.invalidCredentials;
      } else if (error.message?.includes("User already registered")) {
        message = t.auth.alreadyRegistered;
      } else if (error.message?.includes("Email not confirmed")) {
        message = t.auth.emailNotConfirmed;
      }
      toast({
        title: t.auth.error,
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
        return t.auth.login;
      case "signup":
        return t.auth.signup;
      case "reset":
        return t.auth.resetPassword;
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "login":
        return t.auth.loginSubtitle;
      case "signup":
        return t.auth.signupSubtitle;
      case "reset":
        return t.auth.resetPasswordSubtitle;
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {t.auth.processing}
        </>
      );
    }
    switch (mode) {
      case "login":
        return t.auth.login;
      case "signup":
        return t.auth.signup;
      case "reset":
        return t.auth.sendResetLink;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.auth.backToSite}
          </Button>
          <LanguageSwitcher />
        </div>

        <div className="bg-card p-8 rounded-2xl border border-border shadow-elegant">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground">
              {getSubtitle()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
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
                  <Label htmlFor="password">{t.auth.password}</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-primary hover:underline"
                    >
                      {t.auth.forgotPassword}
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {getButtonText()}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "reset" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline text-sm"
              >
                {t.auth.backToLogin}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary hover:underline text-sm"
              >
                {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
