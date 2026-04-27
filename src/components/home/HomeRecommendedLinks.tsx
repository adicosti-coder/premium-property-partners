import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

const fallbackRoiArticles = [
  { title: "Analiză ROI Timișoara 2026", slug: "analiza-roi-timisoara-2026", excerpt: "Repere pentru randament, ocupare și zone cu potențial investițional." },
  { title: "Studiu de caz ROI în regim hotelier", slug: "studiu-caz-roi-regim-hotelier", excerpt: "Cum arată diferența dintre chiria clasică și administrarea profesională." },
];

export default function HomeRecommendedLinks() {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const { data: roiArticles = fallbackRoiArticles } = useQuery({
    queryKey: ["homepage-recommended-roi-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("title,title_en,slug,excerpt,excerpt_en,category")
        .eq("is_published", true)
        .or("title.ilike.%ROI%,excerpt.ilike.%ROI%,category.ilike.%invest%")
        .order("published_at", { ascending: false })
        .limit(2);
      if (error || !data?.length) return fallbackRoiArticles;
      return data.map((article: any) => ({
        title: !isRo && article.title_en ? article.title_en : article.title,
        slug: article.slug,
        excerpt: !isRo && article.excerpt_en ? article.excerpt_en : article.excerpt,
      }));
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="py-16 md:py-20 bg-background" aria-labelledby="homepage-recommended-title">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <TrendingUp className="h-4 w-4" /> {isRo ? "Recomandate pentru investitori" : "Recommended for investors"}
            </p>
            <h2 id="homepage-recommended-title" className="text-3xl font-bold text-foreground md:text-4xl">
              {isRo ? "Investiții, catalog și analize ROI" : "Investments, catalog and ROI analysis"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {isRo
                ? "Acces rapid către paginile care explică randamentul RealTrust, oportunitățile verificate și pașii pentru proprietari."
                : "Fast access to verified opportunities, RealTrust yield analysis and owner onboarding."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/catalog-investitii">{isRo ? "Catalog Investiții" : "Investment Catalog"}<ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pentru-proprietari">{isRo ? "Contact Proprietari" : "Owner Contact"}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <TrendingUp className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-foreground">{isRo ? "Pagina Investiții" : "Investment page"}</h3>
              <p className="mb-5 text-sm text-muted-foreground">{isRo ? "Strategia RealTrust pentru investiții imobiliare cu ROI net verificat de 9.4%." : "RealTrust strategy for verified-yield real estate investments."}</p>
              <Button asChild variant="secondary"><Link to="/investitii">{isRo ? "Vezi investițiile" : "View investments"}</Link></Button>
            </CardContent>
          </Card>

          {roiArticles.map((article) => (
            <Link key={article.slug} to={`/blog/${article.slug}`} className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50">
              <BookOpen className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-primary">{article.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {isRo ? "Citește analiza" : "Read analysis"} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}