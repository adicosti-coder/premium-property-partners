import { useMemo } from "react";
import { Check, X, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordStrengthIndicatorProps {
  password: string;
  onStrengthChange?: (isValid: boolean, strength: number) => void;
}

interface StrengthCriteria {
  label: string;
  test: (password: string) => boolean;
  priority: 'required' | 'recommended';
}

// Lista de parole comune care trebuie blocate
const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "passw0rd", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael", "football", "password1", "password123", "welcome",
  "welcome1", "admin", "login", "princess", "qwerty123", "solo", "1q2w3e4r",
  "1234", "12345", "123456789", "1234567890", "111111", "000000", "parola",
  "parola123", "test", "test123", "guest", "admin123", "root", "user",
  "pass", "pass123", "password!", "!password", "qwerty1", "asdfgh", "zxcvbn",
  "secret", "secret123", "changeme", "changeme1", "default", "temp", "temp123"
];

// Verifică dacă parola este comună sau o variantă simplă
const isCommonPassword = (password: string): boolean => {
  const lowerPass = password.toLowerCase();
  
  // Verifică exact
  if (COMMON_PASSWORDS.includes(lowerPass)) return true;
  
  // Verifică variante cu numere la final (password1, password12, etc.)
  const basePass = lowerPass.replace(/\d+$/, '');
  if (COMMON_PASSWORDS.includes(basePass)) return true;
  
  // Verifică pattern-uri secvențiale
  if (/^(.)\1{5,}$/.test(password)) return true; // aaaaaa, 111111
  if (/^(012|123|234|345|456|567|678|789|890)+/.test(password)) return true;
  if (/^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i.test(password)) return true;
  if (/^(qwerty|asdfgh|zxcvbn)/i.test(password)) return true;
  
  return false;
};

// Verifică dacă parola conține date sau ani comuni
const containsCommonPatterns = (password: string): boolean => {
  // Ani comuni (1950-2025)
  if (/19[5-9]\d|20[0-2]\d/.test(password) && password.length < 10) return true;
  
  // Date în format comun
  if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(password)) return true;
  
  return false;
};

export const validatePassword = (password: string): { isValid: boolean; strength: number; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("min_length");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("uppercase");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("lowercase");
  }
  
  if (!/\d/.test(password)) {
    errors.push("number");
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("special");
  }
  
  if (isCommonPassword(password)) {
    errors.push("common_password");
  }
  
  if (containsCommonPatterns(password)) {
    errors.push("common_pattern");
  }
  
  // Calculăm puterea (0-5)
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  // Reducem puterea pentru parole comune
  if (isCommonPassword(password) || containsCommonPatterns(password)) {
    strength = Math.max(0, strength - 2);
  }
  
  // Parola este validă dacă are minim 8 caractere și nu e comună
  const isValid = password.length >= 8 && 
                  !isCommonPassword(password) && 
                  !containsCommonPatterns(password) &&
                  /[A-Z]/.test(password) &&
                  /[a-z]/.test(password) &&
                  /\d/.test(password);
  
  return { isValid, strength, errors };
};

const PasswordStrengthIndicator = ({ password, onStrengthChange }: PasswordStrengthIndicatorProps) => {
  const { t } = useLanguage();

  const criteria: StrengthCriteria[] = useMemo(() => [
    { label: t.auth.passwordCriteria.minLength, test: (p) => p.length >= 8, priority: 'required' },
    { label: t.auth.passwordCriteria.hasUppercase, test: (p) => /[A-Z]/.test(p), priority: 'required' },
    { label: t.auth.passwordCriteria.hasLowercase, test: (p) => /[a-z]/.test(p), priority: 'required' },
    { label: t.auth.passwordCriteria.hasNumber, test: (p) => /\d/.test(p), priority: 'required' },
    { label: t.auth.passwordCriteria.hasSpecial, test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), priority: 'recommended' },
    { label: t.auth.passwordCriteria.noCommon, test: (p) => !isCommonPassword(p), priority: 'required' },
  ], [t]);

  const validation = useMemo(() => {
    const result = validatePassword(password);
    onStrengthChange?.(result.isValid, result.strength);
    return result;
  }, [password, onStrengthChange]);

  const passedCriteria = useMemo(() => {
    return criteria.filter((c) => c.test(password)).length;
  }, [password, criteria]);

  const strengthLevel = useMemo(() => {
    if (isCommonPassword(password) || containsCommonPatterns(password)) {
      return { level: 0, label: t.auth.passwordStrength.blocked, color: "bg-destructive", icon: ShieldAlert };
    }
    if (passedCriteria <= 2) return { level: 0, label: t.auth.passwordStrength.weak, color: "bg-destructive", icon: ShieldAlert };
    if (passedCriteria <= 3) return { level: 1, label: t.auth.passwordStrength.fair, color: "bg-orange-500", icon: AlertTriangle };
    if (passedCriteria <= 4) return { level: 2, label: t.auth.passwordStrength.good, color: "bg-yellow-500", icon: ShieldCheck };
    if (passedCriteria <= 5) return { level: 3, label: t.auth.passwordStrength.strong, color: "bg-green-500", icon: ShieldCheck };
    return { level: 4, label: t.auth.passwordStrength.veryStrong, color: "bg-emerald-500", icon: ShieldCheck };
  }, [passedCriteria, password, t]);

  const isBlocked = isCommonPassword(password) || containsCommonPatterns(password);
  const hasCommonPattern = containsCommonPatterns(password);

  if (!password) return null;

  const Icon = strengthLevel.icon;

  return (
    <div className="mt-3 space-y-3 animate-fade-in">
      {/* Blocked password warning */}
      {isBlocked && (
        <Alert variant="destructive" className="py-2">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {isCommonPassword(password) 
              ? t.auth.passwordWarnings.commonPassword 
              : t.auth.passwordWarnings.commonPattern}
          </AlertDescription>
        </Alert>
      )}

      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            {t.auth.passwordStrength.label}
          </span>
          <span className={`font-medium ${
            isBlocked ? "text-destructive" :
            strengthLevel.level >= 3 ? "text-green-500" : 
            strengthLevel.level >= 2 ? "text-yellow-500" : 
            "text-destructive"
          }`}>
            {strengthLevel.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= strengthLevel.level ? strengthLevel.color : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-1 gap-1.5">
        {criteria.map((criterion, index) => {
          const passed = criterion.test(password);
          return (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs transition-all duration-200 ${
                passed ? "text-green-500" : 
                criterion.priority === 'required' ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {passed ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>
                {criterion.label}
                {criterion.priority === 'required' && !passed && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {!validation.isValid && password.length >= 4 && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 space-y-1">
          <p className="font-medium text-foreground">{t.auth.passwordRecommendations.title}</p>
          <ul className="list-disc list-inside space-y-0.5">
            {password.length < 12 && (
              <li>{t.auth.passwordRecommendations.longerPassword}</li>
            )}
            {!/[!@#$%^&*(),.?":{}|<>]/.test(password) && (
              <li>{t.auth.passwordRecommendations.addSpecial}</li>
            )}
            {isBlocked && (
              <li>{t.auth.passwordRecommendations.avoidCommon}</li>
            )}
          </ul>
        </div>
      )}

      {/* Success message */}
      {validation.isValid && strengthLevel.level >= 3 && (
        <div className="text-xs text-primary bg-primary/10 rounded-lg p-2.5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {t.auth.passwordRecommendations.strongPassword}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
