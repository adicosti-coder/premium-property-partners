import { TrendingUp, ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const MarketPulse = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Pulsul Pieței Imobiliare — Timișoara
            </h2>
          </div>

          {/* Main stat */}
          <div className="flex items-end gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Preț mediu/mp Timișoara</p>
              <p className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                1.978 <span className="text-xl font-normal text-muted-foreground">€/mp</span>
              </p>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-semibold mb-1">
              <ArrowUpRight className="w-4 h-4" />
              +11% față de martie 2025
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">Cel mai scump cartier</p>
              </div>
              <p className="font-semibold text-foreground">
                Tipografilor — <span className="text-primary">1.751 €/mp</span>
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-accent-foreground" />
                <p className="text-sm text-muted-foreground">Cel mai accesibil</p>
              </div>
              <p className="font-semibold text-foreground">
                Steaua — <span className="text-accent-foreground">1.260 €/mp</span>
              </p>
            </div>
          </div>

          {/* Source + CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border pt-4">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Sursă: Storia.ro, Imobiliare.ro — Martie 2026</p>
              <p>Actualizat: Aprilie 2026</p>
            </div>
            <Link
              to="/cartiere"
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Vezi toate cartierele →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketPulse;
