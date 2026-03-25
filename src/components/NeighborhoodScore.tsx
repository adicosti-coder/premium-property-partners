import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Train, GraduationCap, Coffee, MapPin } from "lucide-react";

interface NeighborhoodScoreProps {
  location: string;
  className?: string;
}

// Score calculation based on known Timișoara neighborhoods
const getNeighborhoodScores = (location: string) => {
  const loc = (location || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Default scores
  let transport = 7;
  let education = 6;
  let lifestyle = 7;
  let overallLabel = "Bun";

  // Premium central zones
  if (loc.includes("centru") || loc.includes("unirii") || loc.includes("victori") || loc.includes("operei")) {
    transport = 10; education = 9; lifestyle = 10; overallLabel = "Excelent";
  } else if (loc.includes("iulius") || loc.includes("dambovita") || loc.includes("circumvalat")) {
    transport = 9; education = 8; lifestyle = 10; overallLabel = "Excelent";
  } else if (loc.includes("isho") || loc.includes("iosefin") || loc.includes("josefin")) {
    transport = 9; education = 7; lifestyle = 9; overallLabel = "Foarte Bun";
  } else if (loc.includes("fabric") || loc.includes("badea cartan")) {
    transport = 8; education = 7; lifestyle = 8; overallLabel = "Foarte Bun";
  } else if (loc.includes("complex") || loc.includes("studentesc")) {
    transport = 8; education = 10; lifestyle = 8; overallLabel = "Foarte Bun";
  } else if (loc.includes("aradului") || loc.includes("torontal")) {
    transport = 8; education = 7; lifestyle = 8; overallLabel = "Foarte Bun";
  } else if (loc.includes("lipovei") || loc.includes("buzias")) {
    transport = 7; education = 8; lifestyle = 7; overallLabel = "Bun";
  } else if (loc.includes("giroc") || loc.includes("chisoda") || loc.includes("dumbravita")) {
    transport = 6; education = 6; lifestyle = 7; overallLabel = "Bun";
  } else if (loc.includes("mehala") || loc.includes("fratelia")) {
    transport = 6; education = 5; lifestyle = 6; overallLabel = "Mediu";
  }

  const overall = Math.round((transport + education + lifestyle) / 3 * 10) / 10;
  return { transport, education, lifestyle, overall, overallLabel };
};

const ScoreBar = ({ value, max = 10 }: { value: number; max?: number }) => {
  const pct = (value / max) * 100;
  const color = value >= 8 ? "bg-primary" : value >= 6 ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-foreground w-8 text-right">{value}</span>
    </div>
  );
};

const NeighborhoodScore = ({ location, className = "" }: NeighborhoodScoreProps) => {
  const { language } = useLanguage();
  const scores = getNeighborhoodScores(location);

  const t = language === "ro"
    ? {
        title: "Scorul Cartierului",
        transport: "Transport",
        education: "Educație",
        lifestyle: "Lifestyle",
        overall: "Scor General",
        outOf: "/ 10",
      }
    : {
        title: "Neighborhood Score",
        transport: "Transport",
        education: "Education",
        lifestyle: "Lifestyle",
        overall: "Overall Score",
        outOf: "/ 10",
      };

  return (
    <Card className={`border-primary/10 ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-serif font-semibold text-foreground">{t.title}</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">{scores.overall}</span>
            <span className="text-xs text-muted-foreground">{t.outOf}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Train className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground w-20 shrink-0">{t.transport}</span>
            <ScoreBar value={scores.transport} />
          </div>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground w-20 shrink-0">{t.education}</span>
            <ScoreBar value={scores.education} />
          </div>
          <div className="flex items-center gap-3">
            <Coffee className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground w-20 shrink-0">{t.lifestyle}</span>
            <ScoreBar value={scores.lifestyle} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NeighborhoodScore;
