import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Train, GraduationCap, Coffee, MapPin } from "lucide-react";
import { getNeighborhoodScores } from "@/utils/propertyGeo";

interface NeighborhoodScoreProps {
  location?: string;
  propertySlug?: string | null;
  propertyName?: string;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}

const ScoreBar = ({ value, max = 10 }: { value: number; max?: number }) => {
  const pct = (value / max) * 100;
  const color = value >= 9 ? "bg-primary" : value >= 8 ? "bg-accent" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-foreground w-8 text-right">{value}</span>
    </div>
  );
};

const NeighborhoodScore = ({ location, propertySlug, propertyName, latitude, longitude, className = "" }: NeighborhoodScoreProps) => {
  const { language } = useLanguage();
  const scores = getNeighborhoodScores({ slug: propertySlug, name: propertyName, location, latitude, longitude });

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
