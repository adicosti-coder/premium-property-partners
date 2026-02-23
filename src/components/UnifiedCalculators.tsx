import { lazy, Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, Brain, TrendingUp } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const RentalIncomeCalculator = lazy(() => import("@/components/RentalIncomeCalculator"));
const AdvancedRentalCalculator = lazy(() => import("@/components/AdvancedRentalCalculator"));

const CalculatorSkeleton = () => (
  <div className="min-h-[600px] animate-pulse space-y-6 p-8">
    <div className="h-10 bg-muted rounded-lg w-2/3 mx-auto" />
    <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
    <div className="grid lg:grid-cols-2 gap-8 mt-8">
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-80 bg-muted rounded-2xl" />
    </div>
  </div>
);

const UnifiedCalculators = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("profit");

  const tabs = {
    ro: {
      profit: "Calculator Rapid",
      advanced: "Calculator Avansat",
      rental: "Estimator AI",
    },
    en: {
      profit: "Quick Calculator",
      advanced: "Advanced Calculator",
      rental: "AI Estimator",
    },
  };

  const t = tabs[language as keyof typeof tabs] || tabs.ro;

  return (
    <section id="calculator" className="scroll-mt-24">
      <div className="container mx-auto px-6 pt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 mb-2">
            <TabsTrigger value="profit" className="gap-1.5 text-xs sm:text-sm">
              <Calculator className="w-4 h-4 hidden sm:inline" />
              {t.profit}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 hidden sm:inline" />
              {t.advanced}
            </TabsTrigger>
            <TabsTrigger value="rental" className="gap-1.5 text-xs sm:text-sm">
              <Brain className="w-4 h-4 hidden sm:inline" />
              {t.rental}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profit">
            <Suspense fallback={<CalculatorSkeleton />}>
              <ProfitCalculator />
            </Suspense>
          </TabsContent>

          <TabsContent value="advanced" forceMount className={activeTab !== "advanced" ? "hidden" : ""}>
            <Suspense fallback={<CalculatorSkeleton />}>
              {activeTab === "advanced" && <AdvancedRentalCalculator />}
            </Suspense>
          </TabsContent>

          <TabsContent value="rental" forceMount className={activeTab !== "rental" ? "hidden" : ""}>
            <Suspense fallback={<CalculatorSkeleton />}>
              {activeTab === "rental" && <RentalIncomeCalculator />}
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default UnifiedCalculators;
