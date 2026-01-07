import { useState } from "react";
import { Settings, X, Sparkles, Sun, Moon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAnimationPreference } from "@/hooks/useAnimationPreference";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const AccessibilityPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { animationsEnabled, toggleAnimations } = useAnimationPreference();
  const { theme, setTheme } = useTheme();

  const translations = {
    ro: {
      accessibility: "Accesibilitate",
      animations: "Animații",
      animationsOn: "Activate",
      animationsOff: "Dezactivate",
      theme: "Temă",
      light: "Luminoasă",
      dark: "Întunecată",
      language: "Limbă",
      close: "Închide",
    },
    en: {
      accessibility: "Accessibility",
      animations: "Animations",
      animationsOn: "Enabled",
      animationsOff: "Disabled",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      language: "Language",
      close: "Close",
    },
  };

  const tr = translations[language] || translations.en;

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full shadow-lg",
          "bg-gold hover:bg-gold/90 text-primary",
          "transition-all duration-300 ease-out",
          isOpen && "rotate-180 bg-primary text-cream hover:bg-primary/90"
        )}
        size="icon"
        aria-label={tr.accessibility}
      >
        {isOpen ? (
          <X className="w-5 h-5 transition-transform duration-300" />
        ) : (
          <Settings className="w-5 h-5 transition-transform duration-300 animate-[spin_10s_linear_infinite]" />
        )}
      </Button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-40 right-4 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {tr.accessibility}
          </h3>
        </div>

        {/* Settings */}
        <div className="p-4 space-y-4">
          {/* Animations Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              {tr.animations}
            </label>
            <div className="flex gap-2">
              <Button
                variant={animationsEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => !animationsEnabled && toggleAnimations()}
                className={cn(
                  "flex-1 transition-all duration-200",
                  animationsEnabled && "bg-gold text-primary hover:bg-gold/90"
                )}
              >
                {tr.animationsOn}
              </Button>
              <Button
                variant={!animationsEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => animationsEnabled && toggleAnimations()}
                className={cn(
                  "flex-1 transition-all duration-200",
                  !animationsEnabled && "bg-muted-foreground text-background"
                )}
              >
                {tr.animationsOff}
              </Button>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-gold" />
              ) : (
                <Sun className="w-4 h-4 text-gold" />
              )}
              {tr.theme}
            </label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex-1 transition-all duration-200",
                  theme === "light" && "bg-gold text-primary hover:bg-gold/90"
                )}
              >
                <Sun className="w-4 h-4 mr-1" />
                {tr.light}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex-1 transition-all duration-200",
                  theme === "dark" && "bg-gold text-primary hover:bg-gold/90"
                )}
              >
                <Moon className="w-4 h-4 mr-1" />
                {tr.dark}
              </Button>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-gold" />
              {tr.language}
            </label>
            <div className="flex gap-2">
              <Button
                variant={language === "ro" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("ro")}
                className={cn(
                  "flex-1 transition-all duration-200",
                  language === "ro" && "bg-gold text-primary hover:bg-gold/90"
                )}
              >
                🇷🇴 Română
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
                className={cn(
                  "flex-1 transition-all duration-200",
                  language === "en" && "bg-gold text-primary hover:bg-gold/90"
                )}
              >
                🇬🇧 English
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative indicator */}
        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AccessibilityPanel;
