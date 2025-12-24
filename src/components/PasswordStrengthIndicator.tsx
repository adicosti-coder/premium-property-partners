import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCriteria {
  label: string;
  test: (password: string) => boolean;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const { t } = useLanguage();

  const criteria: StrengthCriteria[] = useMemo(() => [
    { label: t.auth.passwordCriteria.minLength, test: (p) => p.length >= 6 },
    { label: t.auth.passwordCriteria.hasUppercase, test: (p) => /[A-Z]/.test(p) },
    { label: t.auth.passwordCriteria.hasLowercase, test: (p) => /[a-z]/.test(p) },
    { label: t.auth.passwordCriteria.hasNumber, test: (p) => /\d/.test(p) },
    { label: t.auth.passwordCriteria.hasSpecial, test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ], [t]);

  const passedCriteria = useMemo(() => {
    return criteria.filter((c) => c.test(password)).length;
  }, [password, criteria]);

  const strengthLevel = useMemo(() => {
    if (passedCriteria <= 1) return { level: 0, label: t.auth.passwordStrength.weak, color: "bg-destructive" };
    if (passedCriteria <= 2) return { level: 1, label: t.auth.passwordStrength.fair, color: "bg-orange-500" };
    if (passedCriteria <= 3) return { level: 2, label: t.auth.passwordStrength.good, color: "bg-yellow-500" };
    if (passedCriteria <= 4) return { level: 3, label: t.auth.passwordStrength.strong, color: "bg-green-500" };
    return { level: 4, label: t.auth.passwordStrength.veryStrong, color: "bg-emerald-500" };
  }, [passedCriteria, t]);

  if (!password) return null;

  return (
    <div className="mt-3 space-y-3 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t.auth.passwordStrength.label}</span>
          <span className={`font-medium ${strengthLevel.level >= 3 ? "text-green-500" : strengthLevel.level >= 2 ? "text-yellow-500" : "text-destructive"}`}>
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
                passed ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              {passed ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>{criterion.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;