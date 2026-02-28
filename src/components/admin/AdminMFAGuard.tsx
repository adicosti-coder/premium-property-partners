import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";

interface AdminMFAGuardProps {
  children: React.ReactNode;
}

const SESSION_KEY = "admin_otp_verified";
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

type Step = "idle" | "sending" | "verify" | "authenticated";

const AdminMFAGuard = ({ children }: AdminMFAGuardProps) => {
  const { language } = useLanguage();
  const [step, setStep] = useState<Step>(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return "idle";
    try {
      const { timestamp } = JSON.parse(stored);
      return Date.now() - timestamp < SESSION_DURATION_MS ? "authenticated" : "idle";
    } catch {
      return "idle";
    }
  });
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    ro: {
      title: "Verificare Admin",
      sendDesc: "Vom trimite un cod de verificare pe email-ul tău.",
      sendBtn: "Trimite codul",
      verifyDesc: "Introdu codul de 6 cifre trimis pe",
      verifyBtn: "Verifică",
      resend: "Retrimite codul",
      success: "Acces autorizat!",
      invalid: "Cod invalid sau expirat.",
      sendError: "Eroare la trimiterea codului.",
      sent: "Cod trimis pe email!",
    },
    en: {
      title: "Admin Verification",
      sendDesc: "We'll send a verification code to your email.",
      sendBtn: "Send code",
      verifyDesc: "Enter the 6-digit code sent to",
      verifyBtn: "Verify",
      resend: "Resend code",
      success: "Access authorized!",
      invalid: "Invalid or expired code.",
      sendError: "Error sending code.",
      sent: "Code sent to email!",
    },
  };

  const labels = t[language] || t.ro;

  const sendOtp = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-admin-otp");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMaskedEmail(data.email || "");
      setStep("verify");
      toast({ title: labels.sent });
    } catch (err: any) {
      console.error("Send OTP error:", err);
      toast({ title: labels.sendError, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [labels]);

  const verifyOtp = useCallback(async () => {
    if (code.length !== 6) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-admin-otp", {
        body: { code },
      });
      if (error) throw error;
      if (data?.valid) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
        toast({ title: labels.success });
        setStep("authenticated");
      } else {
        toast({ title: labels.invalid, variant: "destructive" });
        setCode("");
      }
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      toast({ title: labels.invalid, variant: "destructive" });
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  }, [code, labels]);

  if (step === "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {labels.title}
          </CardTitle>
          <CardDescription>
            {step === "verify"
              ? `${labels.verifyDesc} ${maskedEmail}`
              : labels.sendDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "idle" || step === "sending" ? (
            <Button
              onClick={sendOtp}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {labels.sendBtn}
            </Button>
          ) : (
            <>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyOtp();
                }}
              />
              <Button
                onClick={verifyOtp}
                disabled={code.length !== 6 || isSubmitting}
                className="w-full"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <ShieldCheck className="w-4 h-4 mr-2" />
                {labels.verifyBtn}
              </Button>
              <Button
                variant="ghost"
                onClick={sendOtp}
                disabled={isSubmitting}
                className="w-full text-sm"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {labels.resend}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMFAGuard;
