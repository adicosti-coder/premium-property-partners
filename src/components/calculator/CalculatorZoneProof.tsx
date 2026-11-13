import { Star } from "lucide-react";
import type { PortfolioProperty } from "@/lib/portfolioProof";

export function CalculatorZoneProof({ items, zoneLabel, language }: { items: PortfolioProperty[]; zoneLabel: string; language: "ro" | "en" }) {
  if (!items.length) return null;
  const ro = language === "ro";
  return (
    <div className="rounded-2xl border border-border bg-background p-3 md:p-4">
      <p className="text-sm font-semibold text-foreground">{ro ? `Administrăm deja în ${zoneLabel}` : `Already managed by us in ${zoneLabel}`}</p>
      <ul className="mt-2 space-y-2">
        {items.map((p) => (
          <li key={p.slug}>
            <a href={`/proprietate/${p.slug}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-1 py-1 text-sm hover:bg-muted">
              <span className="line-clamp-2 text-foreground">{p.name}</span>
              <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground"><Star className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />{String(p.booking_rating).replace(".", ro ? "," : ".")}/10<span className="text-xs font-normal text-muted-foreground">· {p.booking_review_count} {ro ? "recenzii" : "reviews"}</span></span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
