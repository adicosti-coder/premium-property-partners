import { Card, CardContent } from "@/components/ui/card";

export const StatCard = ({
  label,
  value,
  highlight,
  warn,
  icon,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  warn?: boolean;
  icon?: React.ReactNode;
}) => (
  <Card className={warn ? "border-destructive/40" : highlight ? "border-primary/40" : ""}>
    <CardContent className="pt-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div
        className={`text-2xl font-bold ${
          warn ? "text-destructive" : highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </CardContent>
  </Card>
);
