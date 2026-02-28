import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminMFAGuardProps {
  children: React.ReactNode;
}

const ADMIN_PIN_HASH_KEY = "admin_pin_verified";
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

const AdminMFAGuard = ({ children }: AdminMFAGuardProps) => {
  const { language } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = sessionStorage.getItem(ADMIN_PIN_HASH_KEY);
    if (!stored) return false;
    try {
      const { timestamp } = JSON.parse(stored);
      return Date.now() - timestamp < SESSION_DURATION_MS;
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    ro: {
      title: "Verificare Admin",
      desc: "Introdu parola de acces admin pentru a continua.",
      placeholder: "Parola admin",
      verify: "Verifică",
      invalid: "Parolă incorectă. Încearcă din nou.",
      success: "Acces autorizat!",
    },
    en: {
      title: "Admin Verification",
      desc: "Enter the admin access password to continue.",
      placeholder: "Admin password",
      verify: "Verify",
      invalid: "Incorrect password. Try again.",
      success: "Access authorized!",
    },
  };

  const labels = t[language] || t.ro;

  const handleVerify = useCallback(async () => {
    if (!pin.trim()) return;
    setIsSubmitting(true);
    try {
      // Re-authenticate with Supabase using current email + the entered password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No user");

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pin,
      });

      if (error) {
        toast({ title: labels.invalid, variant: "destructive" });
        setPin("");
        return;
      }

      // Verify they're actually admin
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (!isAdmin) {
        toast({ title: labels.invalid, variant: "destructive" });
        setPin("");
        return;
      }

      sessionStorage.setItem(ADMIN_PIN_HASH_KEY, JSON.stringify({ timestamp: Date.now() }));
      toast({ title: labels.success });
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error("Admin verify error:", err);
      toast({ title: labels.invalid, variant: "destructive" });
      setPin("");
    } finally {
      setIsSubmitting(false);
    }
  }, [pin, labels]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder={labels.placeholder}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerify();
            }}
          />
          <Button
            onClick={handleVerify}
            disabled={!pin.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <ShieldCheck className="w-4 h-4 mr-2" />
            {labels.verify}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMFAGuard;
