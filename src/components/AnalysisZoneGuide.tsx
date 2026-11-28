import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ANALYSIS_ZONE_GUIDE } from "@/lib/prioritySeoContent";

/** Practical local guide shared verbatim with the route's prerendered HTML. */
const AnalysisZoneGuide = () => (
  <section className="border-y border-border bg-background py-14 md:py-20" aria-labelledby="analysis-zone-guide-title">
    <div className="container mx-auto px-4">
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase">Ghid local Timișoara</span>
        </div>
        <h2 id="analysis-zone-guide-title" className="text-3xl font-bold text-foreground">
          Cum alegi zona pentru randament
        </h2>
        <p className="mt-3 text-muted-foreground">
          Compară cererea, accesul și costurile pentru adresa exactă. Numele cartierului este un reper, nu o garanție de venit.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ANALYSIS_ZONE_GUIDE.map((zone) => (
          <Card key={zone.slug} className="flex flex-col border-border bg-card">
            <CardContent className="flex flex-1 flex-col p-6">
              <h3 className="text-xl font-semibold leading-snug text-foreground">{zone.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{zone.text}</p>
              <Link
                to={`/imobiliare-timisoara/${zone.slug}`}
                className="mt-5 inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              >
                Vezi analiza zonei <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

export default AnalysisZoneGuide;
