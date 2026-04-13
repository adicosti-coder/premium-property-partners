import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, TrendingUp, ArrowRight } from "lucide-react";
import { neighborhoods } from "@/data/neighborhoods";
import { Link } from "react-router-dom";

export function NeighborhoodsGrid() {
  const { language } = useLanguage();

  return (
    <section className="w-full bg-background py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {language === "ro" 
              ? "Apartamente pe cartiere în Timișoara" 
              : "Apartments by Neighborhood in Timișoara"}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            {language === "ro"
              ? "Explorează proprietățile disponibile în cele mai căutate zone"
              : "Explore properties available in the most sought-after areas"}
          </p>
        </div>

        {/* Grid of 7 Neighborhood Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {neighborhoods.map((neighborhood) => (
            <Link
              key={neighborhood.slug}
              to={`/imobiliare-timisoara/${neighborhood.slug}`}
              className="group block"
              aria-label={`${neighborhood.fullName} - ${neighborhood.avgPricePerSqm} €/mp`}
            >
              <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 bg-card border-border">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <h3 className="font-semibold text-sm md:text-base text-foreground truncate">
                          {neighborhood.fullName}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <TrendingUp className="w-3 h-3" />
                        <span>
                          {neighborhood.avgPricePerSqm.toLocaleString()} €/mp
                        </span>
                        <span className="mx-1">·</span>
                        <span>
                          {neighborhood.listingsCount} {language === "ro" ? "proprietăți" : "properties"}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {neighborhood.description.slice(0, 80)}...
                      </p>

                      <div className="flex items-center text-xs font-medium text-primary group-hover:text-primary/80 transition-colors">
                        <span>{language === "ro" ? "Vezi apartamente" : "View apartments"}</span>
                        <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-6">
          <Link
            to="/imobiliare-timisoara"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            aria-label={language === "ro" ? "Vezi toate cartierele" : "View all neighborhoods"}
          >
            <span>{language === "ro" ? "Vezi toate cartierele" : "View all neighborhoods"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
