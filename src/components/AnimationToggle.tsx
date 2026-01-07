import { Sparkles, ZapOff } from "lucide-react";
import { useAnimationPreference } from "@/hooks/useAnimationPreference";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const AnimationToggle = () => {
  const { animationsEnabled, toggleAnimations } = useAnimationPreference();
  const { language } = useLanguage();

  const label = animationsEnabled 
    ? (language === 'ro' ? 'Dezactivează animațiile' : 'Disable animations')
    : (language === 'ro' ? 'Activează animațiile' : 'Enable animations');

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleAnimations}
      className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
      title={label}
    >
      {animationsEnabled ? (
        <Sparkles className="w-4 h-4 transition-transform hover:scale-110" />
      ) : (
        <ZapOff className="w-4 h-4 transition-transform hover:scale-110" />
      )}
    </Button>
  );
};

export default AnimationToggle;
