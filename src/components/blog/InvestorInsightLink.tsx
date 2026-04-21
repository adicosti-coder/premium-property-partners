import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";

interface InvestorInsightLinkProps {
  zoneName: string;
  language?: "ro" | "en";
}

/**
 * "Insight pentru Investitori" — internal-link block toward the pillar guide.
 * Used in ZoneLanding (cazare) and NeighborhoodDetail (vanzari) pages.
 */
const InvestorInsightLink = ({ zoneName, language = "ro" }: InvestorInsightLinkProps) => {
  const text =
    language === "en"
      ? {
          badge: "Investor Insight",
          title: `See yield analysis for ${zoneName} in the 2026 Investment Guide`,
          desc: `ROI charts, monthly yield and price appreciation 2020–2026 for ${zoneName}, Timișoara.`,
          cta: "Read the 2026 Investment Guide",
        }
      : {
          badge: "Insight pentru Investitori",
          title: `Vezi analiza randamentului pentru zona ${zoneName} în Ghidul Investițiilor 2026`,
          desc: `Grafice ROI, yield lunar și apreciere preț 2020–2026 pentru ${zoneName}, Timișoara.`,
          cta: "Citește Ghidul Investițiilor 2026",
        };

  return (
    <aside className="my-10 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-primary/5 p-6 md:p-7">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
            {text.badge}
          </span>
          <h3 className="text-base md:text-lg font-semibold text-foreground leading-snug">
            <Link
              to="/blog/ghid-investitii-imobiliare-timisoara-2026"
              className="hover:text-primary transition-colors story-link"
            >
              {text.title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5">{text.desc}</p>
          <Link
            to="/blog/ghid-investitii-imobiliare-timisoara-2026"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline"
          >
            {text.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default InvestorInsightLink;
