import { useState, useMemo, useEffect } from "react";
import { Calculator, TrendingUp, Percent, DollarSign, Home, Sparkles, FileText, History, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import LeadCaptureForm from "./LeadCaptureForm";
import AuthGateOverlay from "./AuthGateOverlay";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";
import { useSimulations } from "@/hooks/useSimulations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ProfitCalculator = () => {
  const { t, language } = useLanguage();
  const [adr, setAdr] = useState(80);
  const [occupancy, setOccupancy] = useState(75);
  const [cleaningCost, setCleaningCost] = useState(25);
  const [managementFee, setManagementFee] = useState(20);
  const [platformFee, setPlatformFee] = useState(15);
  const [avgStayDuration, setAvgStayDuration] = useState(3);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [showSimulationHistory, setShowSimulationHistory] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [simulationSaved, setSimulationSaved] = useState(false);

  const { user, isAuthenticated, simulations, saveSimulation, deleteSimulation } = useSimulations();

  // Scroll animations
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: slidersRef, isVisible: slidersVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: resultsRef, isVisible: resultsVisible } = useScrollAnimation({ threshold: 0.05 });
  
  // Parallax effects
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.15, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.1, direction: 'down' });

  const calculations = useMemo(() => {
    const daysPerMonth = 30;
    const occupiedDays = Math.round((occupancy / 100) * daysPerMonth);
    const numberOfStays = Math.round(occupiedDays / avgStayDuration);
    
    const grossRevenue = adr * occupiedDays;
    
    const totalCleaningCosts = cleaningCost * numberOfStays;
    const totalManagementFee = (managementFee / 100) * grossRevenue;
    const totalPlatformFee = (platformFee / 100) * grossRevenue;
    const totalCosts = totalCleaningCosts + totalManagementFee + totalPlatformFee;
    
    const netProfit = grossRevenue - totalCosts;
    
    const yearlyGross = grossRevenue * 12;
    const yearlyNet = netProfit * 12;
    
    return {
      grossRevenue: Math.round(grossRevenue),
      totalCosts: Math.round(totalCosts),
      netProfit: Math.round(netProfit),
      occupiedDays,
      numberOfStays,
      yearlyGross: Math.round(yearlyGross),
      yearlyNet: Math.round(yearlyNet),
      cleaningCosts: Math.round(totalCleaningCosts),
      managementCost: Math.round(totalManagementFee),
      platformCost: Math.round(totalPlatformFee),
    };
  }, [adr, occupancy, cleaningCost, managementFee, platformFee, avgStayDuration]);

  // Track when user interacts with sliders
  const handleSliderInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      setSimulationSaved(false);
    }
  };

  // Auto-save simulation when authenticated user interacts
  useEffect(() => {
    if (isAuthenticated && hasInteracted && !simulationSaved) {
      const saveTimeout = setTimeout(async () => {
        const { error } = await saveSimulation({
          city: "Timișoara",
          rooms: "2 Camere",
          location: "General",
          monthlyIncome: calculations.grossRevenue,
          yearlyIncome: calculations.yearlyGross,
          realtrustIncome: calculations.netProfit,
          realtrustYearly: calculations.yearlyNet,
        });
        
        if (!error) {
          setSimulationSaved(true);
          toast.success(
            language === 'ro' 
              ? "Simularea a fost salvată în istoricul tău!" 
              : "Simulation saved to your history!"
          );
        }
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(saveTimeout);
    }
  }, [isAuthenticated, hasInteracted, calculations, simulationSaved]);

  const handleDeleteSimulation = async (id: string) => {
    const { error } = await deleteSimulation(id);
    if (!error) {
      toast.success(
        language === 'ro' 
          ? "Simularea a fost ștearsă!" 
          : "Simulation deleted!"
      );
    }
  };

  // Translations for new elements
  const localT = {
    ro: {
      viewHistory: "Vezi istoric",
      hideHistory: "Ascunde istoric",
      simulationHistory: "Istoricul simulărilor",
      noSimulations: "Nu ai încă simulări salvate",
      monthly: "/lună",
      yearly: "/an",
      deleteSimulation: "Șterge",
    },
    en: {
      viewHistory: "View history",
      hideHistory: "Hide history",
      simulationHistory: "Simulation history",
      noSimulations: "No saved simulations yet",
      monthly: "/month",
      yearly: "/year",
      deleteSimulation: "Delete",
    },
  };

  const lt = localT[language as keyof typeof localT] || localT.ro;

  return (
    <section id="calculator" className="section-padding bg-background relative overflow-hidden">
      {/* Background decorations with parallax */}
      <div 
        className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100" 
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.calculator.badge}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.calculator.title} <span className="text-gradient-gold">{t.calculator.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.calculator.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
          {/* Sliders Section */}
          <div 
            ref={slidersRef}
            className={`space-y-8 bg-card p-8 rounded-2xl border border-border transition-all duration-700 ${
              slidersVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
          >
            <h3 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              {t.calculator.propertyParams}
            </h3>
            
            {/* ADR Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-foreground font-medium">{t.calculator.adr}</label>
                <span className="text-primary font-bold text-xl">{adr} €</span>
              </div>
              <Slider
                value={[adr]}
                onValueChange={(value) => {
                  setAdr(value[0]);
                  handleSliderInteraction();
                }}
                min={30}
                max={200}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">{t.calculator.adrDescription}</p>
            </div>

            {/* Occupancy Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-foreground font-medium">{t.calculator.occupancy}</label>
                <span className="text-primary font-bold text-xl">{occupancy}%</span>
              </div>
              <Slider
                value={[occupancy]}
                onValueChange={(value) => {
                  setOccupancy(value[0]);
                  handleSliderInteraction();
                }}
                min={30}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">{t.calculator.occupancyDescription}</p>
            </div>

            {/* Average Stay Duration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-foreground font-medium">{t.calculator.avgStay}</label>
                <span className="text-primary font-bold text-xl">{avgStayDuration} {t.calculator.days}</span>
              </div>
              <Slider
                value={[avgStayDuration]}
                onValueChange={(value) => {
                  setAvgStayDuration(value[0]);
                  handleSliderInteraction();
                }}
                min={1}
                max={14}
                step={1}
                className="w-full"
              />
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2 mb-6">
                <Percent className="w-5 h-5 text-primary" />
                {t.calculator.costsSection}
              </h3>

              {/* Cleaning Cost */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <label className="text-foreground font-medium">{t.calculator.cleaningCost}</label>
                  <span className="text-primary font-bold text-xl">{cleaningCost} €</span>
                </div>
                <Slider
                  value={[cleaningCost]}
                  onValueChange={(value) => {
                    setCleaningCost(value[0]);
                    handleSliderInteraction();
                  }}
                  min={10}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Management Fee */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <label className="text-foreground font-medium">{t.calculator.managementFee}</label>
                  <span className="text-primary font-bold text-xl">{managementFee}%</span>
                </div>
                <Slider
                  value={[managementFee]}
                  onValueChange={(value) => {
                    setManagementFee(value[0]);
                    handleSliderInteraction();
                  }}
                  min={10}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Platform Fee */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-foreground font-medium">{t.calculator.platformFee}</label>
                  <span className="text-primary font-bold text-xl">{platformFee}%</span>
                </div>
                <Slider
                  value={[platformFee]}
                  onValueChange={(value) => {
                    setPlatformFee(value[0]);
                    handleSliderInteraction();
                  }}
                  min={10}
                  max={25}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">{t.calculator.platformFeeDescription}</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div 
            ref={resultsRef}
            className={cn(
              "space-y-6 transition-all duration-700 delay-150 relative",
              resultsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            )}
          >
            {/* Auth Gate Overlay - show blur when user has interacted but not authenticated */}
            {hasInteracted && !isAuthenticated && (
              <AuthGateOverlay />
            )}

            {/* History toggle button for authenticated users */}
            {isAuthenticated && simulations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSimulationHistory(!showSimulationHistory)}
                className="mb-2"
              >
                <History className="w-4 h-4 mr-2" />
                {showSimulationHistory ? lt.hideHistory : lt.viewHistory} ({simulations.length})
              </Button>
            )}

            {/* Simulation History */}
            {isAuthenticated && showSimulationHistory && (
              <div className="bg-card p-4 rounded-xl border border-border mb-4 space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  {lt.simulationHistory}
                </h4>
                {simulations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{lt.noSimulations}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {simulations.slice(0, 5).map((sim) => (
                      <div
                        key={sim.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {sim.realtrurst_income.toLocaleString()} €{lt.monthly}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sim.created_at).toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-US')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSimulation(sim.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Main KPI Card */}
            <div className={cn(
              "bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-2xl border border-primary/30 relative overflow-hidden transition-all duration-500 delay-300",
              resultsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
              hasInteracted && !isAuthenticated && "blur-sm pointer-events-none select-none"
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold">{t.calculator.netProfit}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl md:text-6xl font-serif font-bold text-foreground">
                    {calculations.netProfit.toLocaleString()}
                  </span>
                  <span className="text-2xl text-foreground/70">€{t.calculator.perMonth}</span>
                </div>
                <p className="text-muted-foreground">
                  {t.calculator.approximately} <span className="text-primary font-semibold">{calculations.yearlyNet.toLocaleString()} €</span> {t.calculator.perYear}
                </p>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className={cn(
              "grid grid-cols-2 gap-4",
              hasInteracted && !isAuthenticated && "blur-sm pointer-events-none select-none"
            )}>
              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t.calculator.grossRevenue}</span>
                </div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {calculations.grossRevenue.toLocaleString()} €
                </p>
                <p className="text-sm text-muted-foreground">{t.calculator.perMonth}</p>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">{t.calculator.totalCosts}</span>
                </div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {calculations.totalCosts.toLocaleString()} €
                </p>
                <p className="text-sm text-muted-foreground">{t.calculator.perMonth}</p>
              </div>
            </div>

            {/* Cost Breakdown with Chart */}
            <div className={cn(
              "bg-card p-6 rounded-xl border border-border",
              hasInteracted && !isAuthenticated && "blur-sm pointer-events-none select-none"
            )}>
              <h4 className="font-semibold text-foreground mb-4">{t.calculator.costBreakdown}</h4>
              
              {/* Donut Chart */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-32 h-32 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t.calculator.cleaning, value: calculations.cleaningCosts, color: "hsl(var(--chart-1))" },
                          { name: t.calculator.managementCommission, value: calculations.managementCost, color: "hsl(var(--chart-2))" },
                          { name: t.calculator.platformCommission, value: calculations.platformCost, color: "hsl(var(--chart-3))" },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { color: "hsl(var(--chart-1))" },
                          { color: "hsl(var(--chart-2))" },
                          { color: "hsl(var(--chart-3))" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} €`, '']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend & Breakdown */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                    <div className="flex-1 flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.calculator.cleaning}</span>
                      <span className="text-sm font-medium text-foreground">{calculations.cleaningCosts} €</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                    <div className="flex-1 flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.calculator.managementCommission?.split(' ')[0] || 'Management'}</span>
                      <span className="text-sm font-medium text-foreground">{calculations.managementCost} €</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
                    <div className="flex-1 flex justify-between">
                      <span className="text-sm text-muted-foreground">{t.calculator.platformCommission?.split(' ')[0] || 'Platforme'}</span>
                      <span className="text-sm font-medium text-foreground">{calculations.platformCost} €</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Percentage bars */}
              <div className="space-y-2">
                {calculations.totalCosts > 0 && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t.calculator.cleaning} ({calculations.numberOfStays} {t.calculator.stays})</span>
                        <span className="text-foreground">{Math.round((calculations.cleaningCosts / calculations.totalCosts) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(calculations.cleaningCosts / calculations.totalCosts) * 100}%`,
                            backgroundColor: "hsl(var(--chart-1))"
                          }} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t.calculator.managementCommission} ({managementFee}%)</span>
                        <span className="text-foreground">{Math.round((calculations.managementCost / calculations.totalCosts) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(calculations.managementCost / calculations.totalCosts) * 100}%`,
                            backgroundColor: "hsl(var(--chart-2))"
                          }} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t.calculator.platformCommission} ({platformFee}%)</span>
                        <span className="text-foreground">{Math.round((calculations.platformCost / calculations.totalCosts) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(calculations.platformCost / calculations.totalCosts) * 100}%`,
                            backgroundColor: "hsl(var(--chart-3))"
                          }} 
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Total */}
              <div className="border-t border-border pt-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-semibold">{t.calculator.totalCostsLabel}</span>
                  <span className="text-primary font-bold text-lg">{calculations.totalCosts} €</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={cn(
              "grid grid-cols-2 gap-4",
              hasInteracted && !isAuthenticated && "blur-sm pointer-events-none select-none"
            )}>
              <div className="bg-secondary/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-serif font-bold text-foreground">{calculations.occupiedDays}</p>
                <p className="text-sm text-muted-foreground">{t.calculator.occupiedDays}</p>
              </div>
              <div className="bg-secondary/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-serif font-bold text-foreground">{calculations.numberOfStays}</p>
                <p className="text-sm text-muted-foreground">{t.calculator.staysPerMonth}</p>
              </div>
            </div>

            {/* Lead Capture CTA */}
            <Button 
              onClick={() => setIsLeadFormOpen(true)}
              className={cn(
                "w-full py-6 text-lg",
                hasInteracted && !isAuthenticated && "blur-sm pointer-events-none"
              )}
              size="lg"
              disabled={hasInteracted && !isAuthenticated}
            >
              <FileText className="w-5 h-5 mr-2" />
              {t.calculator.getAnalysis}
            </Button>
          </div>
        </div>
      </div>

      <LeadCaptureForm
        isOpen={isLeadFormOpen}
        onClose={() => setIsLeadFormOpen(false)}
        calculatedNetProfit={calculations.netProfit}
        calculatedYearlyProfit={calculations.yearlyNet}
        simulationData={{
          adr,
          occupancy,
          cleaningCost,
          managementFee,
          platformFee,
          avgStayDuration,
        }}
      />
    </section>
  );
};

export default ProfitCalculator;