import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Smartphone, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface AdminMFAGuardProps {
  children: React.ReactNode;
}

type MFAStep = "loading" | "enroll" | "verify" | "authenticated";

const AdminMFAGuard = ({ children }: AdminMFAGuardProps) => {
  const { language } = useLanguage();
  const [step, setStep] = useState<MFAStep>("loading");
  const [qrUri, setQrUri] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const t = {
    ro: {
      enrollTitle: "Configurează Autentificarea în 2 Pași",
      enrollDesc: "Scanează codul QR cu Google Authenticator sau altă aplicație TOTP, apoi introdu codul de 6 cifre.",
      verifyTitle: "Verificare Autentificator",
      verifyDesc: "Introdu codul de 6 cifre din aplicația ta de autentificare.",
      codePlaceholder: "000000",
      verify: "Verifică",
      activate: "Activează 2FA",
      showSecret: "Arată codul manual",
      hideSecret: "Ascunde codul",
      manualEntry: "Cod manual:",
      success2FA: "2FA activat cu succes!",
      verified: "Verificare reușită!",
      invalidCode: "Cod invalid. Încearcă din nou.",
      errorEnroll: "Eroare la configurarea 2FA",
    },
    en: {
      enrollTitle: "Set Up Two-Factor Authentication",
      enrollDesc: "Scan the QR code with Google Authenticator or another TOTP app, then enter the 6-digit code.",
      verifyTitle: "Authenticator Verification",
      verifyDesc: "Enter the 6-digit code from your authenticator app.",
      codePlaceholder: "000000",
      verify: "Verify",
      activate: "Activate 2FA",
      showSecret: "Show manual code",
      hideSecret: "Hide code",
      manualEntry: "Manual code:",
      success2FA: "2FA activated successfully!",
      verified: "Verification successful!",
      invalidCode: "Invalid code. Try again.",
      errorEnroll: "Error setting up 2FA",
    },
  };

  const labels = t[language] || t.ro;

  const checkMFAStatus = useCallback(async () => {
    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aalData.currentLevel === "aal2") {
        setStep("authenticated");
        return;
      }

      // Check if user has a TOTP factor enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactors = factorsData?.totp || [];
      const verifiedFactor = totpFactors.find(f => f.status === "verified");

      if (verifiedFactor) {
        // Has factor, needs to verify this session
        setFactorId(verifiedFactor.id);
        setStep("verify");
      } else {
        // No factor, needs to enroll
        setStep("enroll");
      }
    } catch (err) {
      console.error("MFA check error:", err);
      setStep("enroll");
    }
  }, []);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  const handleEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "RealTrust Admin",
      });
      if (error) throw error;

      setQrUri(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      console.error("Enroll error:", err);
      toast({ title: labels.errorEnroll, description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (step === "enroll" && !qrUri) {
      handleEnroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleVerifyAndActivate = async () => {
    if (code.length !== 6) return;
    setIsSubmitting(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      toast({ title: step === "enroll" ? labels.success2FA : labels.verified });
      setStep("authenticated");
    } catch (err: any) {
      console.error("Verify error:", err);
      toast({ title: labels.invalidCode, variant: "destructive" });
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "authenticated") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {step === "enroll" ? (
              <QrCode className="w-8 h-8 text-primary" />
            ) : (
              <Smartphone className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {step === "enroll" ? labels.enrollTitle : labels.verifyTitle}
          </CardTitle>
          <CardDescription>
            {step === "enroll" ? labels.enrollDesc : labels.verifyDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "enroll" && qrUri && (
            <div className="space-y-4">
              <div className="flex justify-center bg-white p-8 rounded-lg">
                <img src={qrUri} alt="QR Code" style={{ width: '280px', height: '280px', minWidth: '280px', minHeight: '280px', imageRendering: 'pixelated' }} />
              </div>
              <div className="text-center">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  {showSecret ? labels.hideSecret : labels.showSecret}
                </button>
                {showSecret && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all select-all">
                    {labels.manualEntry} {secret}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={labels.codePlaceholder}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerifyAndActivate();
              }}
            />
            <Button
              onClick={handleVerifyAndActivate}
              disabled={code.length !== 6 || isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ShieldCheck className="w-4 h-4 mr-2" />
              {step === "enroll" ? labels.activate : labels.verify}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMFAGuard;
