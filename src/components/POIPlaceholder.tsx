import React from 'react';
import { 
  UtensilsCrossed, 
  Coffee, 
  Landmark, 
  ShoppingBag, 
  TreePine,
  Music,
  Bus,
  Heart,
  Clapperboard,
  MapPin,
  Dumbbell,
  Wrench
} from 'lucide-react';

interface POIPlaceholderProps {
  category: string;
  name?: string;
  className?: string;
}

const categoryConfig: Record<string, { 
  icon: React.ElementType; 
  gradient: string;
  iconColor: string;
}> = {
  restaurant: { 
    icon: UtensilsCrossed, 
    gradient: 'from-rose-500/30 via-rose-600/20 to-rose-500/10',
    iconColor: 'text-rose-100'
  },
  cafe: { 
    icon: Coffee, 
    gradient: 'from-amber-500/30 via-amber-600/20 to-amber-500/10',
    iconColor: 'text-amber-100'
  },
  attraction: { 
    icon: Landmark, 
    gradient: 'from-violet-500/30 via-violet-600/20 to-violet-500/10',
    iconColor: 'text-violet-100'
  },
  shopping: { 
    icon: ShoppingBag, 
    gradient: 'from-pink-500/30 via-pink-600/20 to-pink-500/10',
    iconColor: 'text-pink-100'
  },
  nature: { 
    icon: TreePine, 
    gradient: 'from-emerald-500/30 via-emerald-600/20 to-emerald-500/10',
    iconColor: 'text-emerald-100'
  },
  nightlife: { 
    icon: Music, 
    gradient: 'from-indigo-500/30 via-indigo-600/20 to-indigo-500/10',
    iconColor: 'text-indigo-100'
  },
  transport: { 
    icon: Bus, 
    gradient: 'from-blue-500/30 via-blue-600/20 to-blue-500/10',
    iconColor: 'text-blue-100'
  },
  health: { 
    icon: Heart, 
    gradient: 'from-red-500/30 via-red-600/20 to-red-500/10',
    iconColor: 'text-red-100'
  },
  entertainment: { 
    icon: Clapperboard, 
    gradient: 'from-teal-500/30 via-teal-600/20 to-teal-500/10',
    iconColor: 'text-teal-100'
  },
  sports: { 
    icon: Dumbbell, 
    gradient: 'from-cyan-500/30 via-cyan-600/20 to-cyan-500/10',
    iconColor: 'text-cyan-100'
  },
  services: { 
    icon: Wrench, 
    gradient: 'from-slate-500/30 via-slate-600/20 to-slate-500/10',
    iconColor: 'text-slate-100'
  },
};

const POIPlaceholder: React.FC<POIPlaceholderProps> = ({ category, name, className = '' }) => {
  const config = categoryConfig[category] || {
    icon: MapPin,
    gradient: 'from-primary/30 via-primary/20 to-primary/10',
    iconColor: 'text-primary-foreground'
  };
  
  const Icon = config.icon;

  return (
    <div 
      className={`relative w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 left-4">
          <Icon className="w-8 h-8" />
        </div>
        <div className="absolute bottom-4 right-4">
          <Icon className="w-8 h-8" />
        </div>
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2">
          <Icon className="w-6 h-6" />
        </div>
        <div className="absolute top-1/4 right-1/4">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {/* Central icon */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        {name && (
          <span className="text-xs font-medium text-foreground/70 max-w-[100px] text-center line-clamp-1">
            {name}
          </span>
        )}
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 blur-xl" />
    </div>
  );
};

export default POIPlaceholder;
