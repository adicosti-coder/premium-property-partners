import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, ArrowLeft, CheckCircle, Check, X } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PasswordStrengthIndicator, { validatePassword } from "@/components/PasswordStrengthIndicator";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const passwordSchema = z.string().min(8, t.auth.invalidPasswordMessage);

  const handlePasswordStrengthChange = useCallback((isValid: boolean) => {
    setIsPasswordValid(isValid);
  }, []);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
      
      setIsChecking(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
          setIsChecking(false);
        }
      }
    );

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: t.auth.invalidPassword,
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        title: t.auth.weakPassword,
        description: t.auth.weakPasswordMessage,
        variant: "destructive",
      });
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      toast({
        title: t.auth.error,
        description: t.auth.passwordsDoNotMatch,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: t.auth.passwordUpdated,
        description: t.auth.passwordUpdatedMessage,
      });

      // Redirect to admin after 2 seconds
      setTimeout(() => {
        navigate("/admin");
      }, 2000);
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

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession && !isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="absolute top-6 right-6">
            <LanguageSwitcher />
          </div>
          <div className="bg-card p-8 rounded-2xl border border-border shadow-elegant text-center">
            <h1 className="text-2xl font-serif font-semibold text-foreground mb-4">
              {t.auth.invalidResetLink}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t.auth.invalidResetLinkMessage}
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              {t.auth.backToLogin}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-elegant text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
              {t.auth.passwordUpdated}
            </h1>
            <p className="text-muted-foreground">
              {t.auth.redirectingMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              {t.auth.setNewPassword}
            </h1>
            <p className="text-muted-foreground">
              {t.auth.setNewPasswordSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.newPassword}</Label>
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
                  minLength={8}
                  maxLength={72}
                />
              </div>
              <PasswordStrengthIndicator 
                password={password} 
                onStrengthChange={handlePasswordStrengthChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 pr-10 ${
                    confirmPassword && password
                      ? password === confirmPassword
                        ? "border-green-500 focus-visible:ring-green-500"
                        : "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  required
                  minLength={8}
                  maxLength={72}
                />
                {/* Password match indicator */}
                {confirmPassword && password && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {password === confirmPassword ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {/* Password match message */}
              {confirmPassword && password && (
                <p className={`text-xs flex items-center gap-1 ${
                  password === confirmPassword ? "text-green-500" : "text-destructive"
                }`}>
                  {password === confirmPassword ? (
                    <>
                      <Check className="w-3 h-3" />
                      {t.auth.passwordsMatch}
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" />
                      {t.auth.passwordsDoNotMatch}
                    </>
                  )}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isPasswordValid || password !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.auth.processing}
                </>
              ) : (
                t.auth.updatePassword
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
