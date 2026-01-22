import { useState, useEffect } from "react";
import { Settings, X, Sparkles, Sun, Moon, Globe, Type, Contrast, Zap, Volume2, VolumeX, Volume1, RotateCcw, Eye, BookOpen, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAnimationPreference } from "@/hooks/useAnimationPreference";
import { useTheme } from "@/hooks/useTheme";
import { useUISound } from "@/hooks/useUISound";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type FontSize = "small" | "normal" | "large" | "xlarge";

const AccessibilityPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { animationsEnabled, toggleAnimations } = useAnimationPreference();
  const { theme, setTheme } = useTheme();
  
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fontSize") as FontSize) || "normal";
    }
    return "normal";
  });
  
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("highContrast") === "true";
    }
    return false;
  });
  
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("reducedMotion");
      if (stored !== null) return stored === "true";
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ui-sound-preference") !== "false";
    }
    return true;
  });

  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ui-sound-volume");
      return stored !== null ? parseFloat(stored) : 0.15;
    }
    return 0.15;
  });

  const { playSound } = useUISound({ volume: soundVolume });

  // Show button on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    const sizes = {
      small: "14px",
      normal: "16px",
      large: "18px",
      xlarge: "20px"
    };
    root.style.fontSize = sizes[fontSize];
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  // Apply high contrast
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    localStorage.setItem("highContrast", String(highContrast));
  }, [highContrast]);

  // Apply reduced motion
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.classList.add("reduce-motion");
      // Also sync with animations preference
      if (animationsEnabled) {
        toggleAnimations();
      }
    } else {
      root.classList.remove("reduce-motion");
    }
    localStorage.setItem("reducedMotion", String(reducedMotion));
  }, [reducedMotion]);

  // Presets configuration
  type PresetKey = "default" | "easyReading" | "maxContrast" | "focused";
  
  const presets: Record<PresetKey, {
    fontSize: FontSize;
    highContrast: boolean;
    reducedMotion: boolean;
    theme: "light" | "dark";
  }> = {
    default: { fontSize: "normal", highContrast: false, reducedMotion: false, theme: "dark" },
    easyReading: { fontSize: "large", highContrast: false, reducedMotion: false, theme: "light" },
    maxContrast: { fontSize: "large", highContrast: true, reducedMotion: false, theme: "light" },
    focused: { fontSize: "normal", highContrast: false, reducedMotion: true, theme: "dark" },
  };

  const applyPreset = (presetKey: PresetKey) => {
    const preset = presets[presetKey];
    setFontSize(preset.fontSize);
    setHighContrast(preset.highContrast);
    setReducedMotion(preset.reducedMotion);
    setTheme(preset.theme);
    playSound("success");
  };

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
      fontSize: "Dimensiune text",
      small: "Mic",
      normal: "Normal",
      large: "Mare",
      xlarge: "F. Mare",
      highContrast: "Contrast ridicat",
      on: "Activat",
      off: "Dezactivat",
      reducedMotion: "Reducere mișcare",
      sounds: "Sunete UI",
      volume: "Volum",
      quickPresets: "Preseturi rapide",
      default: "Standard",
      easyReading: "Citire ușoară",
      maxContrast: "Contrast max",
      focused: "Concentrat",
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
      fontSize: "Font size",
      small: "Small",
      normal: "Normal",
      large: "Large",
      xlarge: "X-Large",
      highContrast: "High contrast",
      on: "On",
      off: "Off",
      reducedMotion: "Reduce motion",
      sounds: "UI Sounds",
      volume: "Volume",
      quickPresets: "Quick Presets",
      default: "Default",
      easyReading: "Easy Reading",
      maxContrast: "Max Contrast",
      focused: "Focused",
    },
  };

  const tr = translations[language] || translations.en;

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-40 right-4 z-50 w-12 h-12 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-500 ease-out",
          isOpen && "rotate-180 bg-accent text-accent-foreground hover:bg-accent/90",
          isVisible 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-8 scale-75 pointer-events-none"
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
          "fixed bottom-56 right-4 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl",
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
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {tr.quickPresets}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("default")}
                className="flex items-center gap-1.5 text-xs h-9"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {tr.default}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("easyReading")}
                className="flex items-center gap-1.5 text-xs h-9"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {tr.easyReading}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("maxContrast")}
                className="flex items-center gap-1.5 text-xs h-9"
              >
                <Eye className="w-3.5 h-3.5" />
                {tr.maxContrast}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("focused")}
                className="flex items-center gap-1.5 text-xs h-9"
              >
                <Focus className="w-3.5 h-3.5" />
                {tr.focused}
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Font Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              {tr.fontSize}
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(["small", "normal", "large", "xlarge"] as FontSize[]).map((size) => (
                <Button
                  key={size}
                  variant={fontSize === size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFontSize(size)}
                  className={cn(
                    "transition-all duration-200 text-xs px-2",
                    fontSize === size && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {tr[size]}
                </Button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Contrast className="w-4 h-4 text-primary" />
              {tr.highContrast}
            </label>
            <div className="flex gap-2">
              <Button
                variant={highContrast ? "default" : "outline"}
                size="sm"
                onClick={() => setHighContrast(true)}
                className={cn(
                  "flex-1 transition-all duration-200",
                  highContrast && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {tr.on}
              </Button>
              <Button
                variant={!highContrast ? "default" : "outline"}
                size="sm"
                onClick={() => setHighContrast(false)}
                className={cn(
                  "flex-1 transition-all duration-200",
                  !highContrast && "bg-muted-foreground text-background"
                )}
              >
                {tr.off}
              </Button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {tr.reducedMotion}
            </label>
            <div className="flex gap-2">
              <Button
                variant={reducedMotion ? "default" : "outline"}
                size="sm"
                onClick={() => setReducedMotion(true)}
                className={cn(
                  "flex-1 transition-all duration-200",
                  reducedMotion && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {tr.on}
              </Button>
              <Button
                variant={!reducedMotion ? "default" : "outline"}
                size="sm"
                onClick={() => setReducedMotion(false)}
                className={cn(
                  "flex-1 transition-all duration-200",
                  !reducedMotion && "bg-muted-foreground text-background"
                )}
              >
                {tr.off}
              </Button>
            </div>
          </div>

          {/* UI Sounds */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-primary" />
              )}
              {tr.sounds}
            </label>
            <div className="flex gap-2">
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSoundEnabled(true);
                  localStorage.setItem("ui-sound-preference", "true");
                  setTimeout(() => playSound("success"), 50);
                }}
                className={cn(
                  "flex-1 transition-all duration-200",
                  soundEnabled && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Volume2 className="w-4 h-4 mr-1" />
                {tr.on}
              </Button>
              <Button
                variant={!soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSoundEnabled(false);
                  localStorage.setItem("ui-sound-preference", "false");
                }}
                className={cn(
                  "flex-1 transition-all duration-200",
                  !soundEnabled && "bg-muted-foreground text-background"
                )}
              >
                <VolumeX className="w-4 h-4 mr-1" />
                {tr.off}
              </Button>
            </div>
            
            {/* Volume Slider */}
            {soundEnabled && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Volume1 className="w-3 h-3" />
                    {tr.volume}
                  </span>
                  <span className="font-mono">{Math.round(soundVolume * 100)}%</span>
                </div>
                <Slider
                  value={[soundVolume * 100]}
                  onValueChange={(value) => {
                    const newVolume = value[0] / 100;
                    setSoundVolume(newVolume);
                    localStorage.setItem("ui-sound-volume", String(newVolume));
                  }}
                  onValueCommit={() => {
                    playSound("pop");
                  }}
                  min={5}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-primary" />
              ) : (
                <Sun className="w-4 h-4 text-primary" />
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
                  theme === "light" && "bg-primary text-primary-foreground hover:bg-primary/90"
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
                  theme === "dark" && "bg-primary text-primary-foreground hover:bg-primary/90"
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
              <Globe className="w-4 h-4 text-primary" />
              {tr.language}
            </label>
            <div className="flex gap-2">
              <Button
                variant={language === "ro" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("ro")}
                className={cn(
                  "flex-1 transition-all duration-200",
                  language === "ro" && "bg-primary text-primary-foreground hover:bg-primary/90"
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
                  language === "en" && "bg-primary text-primary-foreground hover:bg-primary/90"
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
