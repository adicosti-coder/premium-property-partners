import { Wifi, Key, Smartphone, Zap, Shield } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface SmartFeaturesBadgeProps {
  features: string[];
  className?: string;
  variant?: "compact" | "full";
}

const SmartFeaturesBadge = ({ features, className = "", variant = "compact" }: SmartFeaturesBadgeProps) => {
  const { language } = useLanguage();
  
  // Map features to smart badges
  const smartFeatures = [];
  
  // Check for WiFi
  const hasWifi = features.some(f => 
    f.toLowerCase().includes('wifi') || 
    f.toLowerCase().includes('wi-fi')
  );
  if (hasWifi) {
    smartFeatures.push({
      icon: Wifi,
      label: language === 'ro' ? 'WiFi Rapid' : 'High-Speed WiFi',
      shortLabel: 'High Speed',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    });
  }
  
  // Check for Auto check-in / Keyless
  const hasKeyless = features.some(f => 
    f.toLowerCase().includes('auto check-in') || 
    f.toLowerCase().includes('self check-in') ||
    f.toLowerCase().includes('keyless')
  );
  if (hasKeyless) {
    smartFeatures.push({
      icon: Key,
      label: language === 'ro' ? 'Acces Smart' : 'Keyless Entry',
      shortLabel: 'Smart',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    });
  }
  
  // Check for Smart TV
  const hasSmartTv = features.some(f => 
    f.toLowerCase().includes('smart tv') ||
    f.toLowerCase().includes('smart-tv')
  );
  if (hasSmartTv) {
    smartFeatures.push({
      icon: Smartphone,
      label: language === 'ro' ? 'Smart TV' : 'Smart TV',
      shortLabel: 'TV',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    });
  }
  
  if (smartFeatures.length === 0) return null;
  
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {smartFeatures.slice(0, 2).map((feature, index) => (
          <div
            key={index}
            className={`flex items-center gap-1 px-2 py-1 rounded-full ${feature.bgColor} border ${feature.borderColor} backdrop-blur-sm`}
          >
            <feature.icon className={`w-3 h-3 ${feature.color}`} />
            <span className={`text-[10px] font-semibold ${feature.color}`}>
              {feature.shortLabel}
            </span>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {smartFeatures.map((feature, index) => (
        <div
          key={index}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${feature.bgColor} border ${feature.borderColor}`}
        >
          <feature.icon className={`w-4 h-4 ${feature.color}`} />
          <span className={`text-xs font-medium ${feature.color}`}>
            {feature.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SmartFeaturesBadge;
