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
      className="relative w-9 h-9 p-0 text-muted-foreground hover:text-foreground transition-colors overflow-hidden"
      aria-label={label}
      title={label}
    >
      {/* Icon container with flip animation */}
      <div className="relative w-4 h-4">
        <Sparkles 
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ease-out ${
            animationsEnabled 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-180 scale-50'
          }`} 
        />
        <ZapOff 
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ease-out ${
            animationsEnabled 
              ? 'opacity-0 rotate-180 scale-50' 
              : 'opacity-100 rotate-0 scale-100'
          }`} 
        />
      </div>
      
      {/* Status indicator dot with pulse animation on change */}
      <span 
        className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background transition-all duration-300 ${
          animationsEnabled 
            ? 'bg-green-500 scale-100' 
            : 'bg-muted-foreground/50 scale-90'
        }`}
      >
        {/* Pulse ring effect */}
        <span 
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            animationsEnabled 
              ? 'bg-green-500/50 animate-ping' 
              : ''
          }`}
          style={{ animationIterationCount: 1, animationDuration: '0.6s' }}
        />
      </span>
    </Button>
  );
};

export default AnimationToggle;
