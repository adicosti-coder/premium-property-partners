import { useState, useMemo } from "react";
import { Calculator, TrendingUp, Percent, DollarSign, Home, Sparkles, FileText } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import LeadCaptureForm from "./LeadCaptureForm";

const ProfitCalculator = () => {
  const [adr, setAdr] = useState(80); // Average Daily Rate in EUR
  const [occupancy, setOccupancy] = useState(75); // Occupancy percentage
  const [cleaningCost, setCleaningCost] = useState(25); // Cleaning cost per stay in EUR
  const [managementFee, setManagementFee] = useState(18); // Management fee percentage
  const [platformFee, setPlatformFee] = useState(15); // Platform fee percentage
  const [avgStayDuration, setAvgStayDuration] = useState(3); // Average stay duration in days
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);

  const calculations = useMemo(() => {
    const daysPerMonth = 30;
    const occupiedDays = Math.round((occupancy / 100) * daysPerMonth);
    const numberOfStays = Math.round(occupiedDays / avgStayDuration);
    
    // Gross revenue
    const grossRevenue = adr * occupiedDays;
    
    // Costs
    const totalCleaningCosts = cleaningCost * numberOfStays;
    const totalManagementFee = (managementFee / 100) * grossRevenue;
    const totalPlatformFee = (platformFee / 100) * grossRevenue;
    const totalCosts = totalCleaningCosts + totalManagementFee + totalPlatformFee;
    
    // Net profit
    const netProfit = grossRevenue - totalCosts;
    
    // Yearly projections
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

  return (
    <section id="calculator" className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">Calculator Profit</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Estimează-ți <span className="text-gradient-gold">Venitul Potențial</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ajustează parametrii pentru a vedea cât poți câștiga lunar din închirierea în regim hotelier.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Sliders Section */}
          <div className="space-y-8 bg-card p-8 rounded-2xl border border-border">
            <h3 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Parametri Proprietate
            </h3>
            
            {/* ADR Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-foreground font-medium">Tarif Mediu/Noapte (ADR)</label>
                <span className="text-primary font-bold text-xl">{adr} €</span>
              </div>
              <Slider
                value={[adr]}
                onValueChange={(value) => setAdr(value[0])}
                min={30}
                max={200}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">Prețul mediu pe noapte pentru proprietatea ta</p>
            </div>

            {/* Occupancy Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-foreground font-medium">Rată de Ocupare</label>
                <span className="text-primary font-bold text-xl">{occupancy}%</span>
              </div>
              <Slider
                value={[occupancy]}
                onValueChange={(value) => setOccupancy(value[0])}
                min={30}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">Procentul de zile ocupate pe lună</p>
            </div>

            {/* Average Stay Duration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-foreground font-medium">Durată Medie Sejur</label>
                <span className="text-primary font-bold text-xl">{avgStayDuration} zile</span>
              </div>
              <Slider
                value={[avgStayDuration]}
                onValueChange={(value) => setAvgStayDuration(value[0])}
                min={1}
                max={14}
                step={1}
                className="w-full"
              />
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2 mb-6">
                <Percent className="w-5 h-5 text-primary" />
                Costuri & Comisioane
              </h3>

              {/* Cleaning Cost */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <label className="text-foreground font-medium">Cost Curățenie/Sejur</label>
                  <span className="text-primary font-bold text-xl">{cleaningCost} €</span>
                </div>
                <Slider
                  value={[cleaningCost]}
                  onValueChange={(value) => setCleaningCost(value[0])}
                  min={10}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Management Fee */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <label className="text-foreground font-medium">Comision Management</label>
                  <span className="text-primary font-bold text-xl">{managementFee}%</span>
                </div>
                <Slider
                  value={[managementFee]}
                  onValueChange={(value) => setManagementFee(value[0])}
                  min={10}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Platform Fee */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-foreground font-medium">Comision Platforme</label>
                  <span className="text-primary font-bold text-xl">{platformFee}%</span>
                </div>
                <Slider
                  value={[platformFee]}
                  onValueChange={(value) => setPlatformFee(value[0])}
                  min={10}
                  max={25}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">Airbnb, Booking.com, etc.</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Main KPI Card */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-2xl border border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold">Profit Net Estimat</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl md:text-6xl font-serif font-bold text-foreground">
                    {calculations.netProfit.toLocaleString()}
                  </span>
                  <span className="text-2xl text-foreground/70">€/lună</span>
                </div>
                <p className="text-muted-foreground">
                  Aproximativ <span className="text-primary font-semibold">{calculations.yearlyNet.toLocaleString()} €</span> pe an
                </p>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Venit Brut</span>
                </div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {calculations.grossRevenue.toLocaleString()} €
                </p>
                <p className="text-sm text-muted-foreground">/lună</p>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Costuri Totale</span>
                </div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {calculations.totalCosts.toLocaleString()} €
                </p>
                <p className="text-sm text-muted-foreground">/lună</p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-4">Detalii Costuri Lunare</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Curățenie ({calculations.numberOfStays} sejururi)</span>
                  <span className="text-foreground font-medium">{calculations.cleaningCosts} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comision Management ({managementFee}%)</span>
                  <span className="text-foreground font-medium">{calculations.managementCost} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comision Platforme ({platformFee}%)</span>
                  <span className="text-foreground font-medium">{calculations.platformCost} €</span>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-semibold">Total Costuri</span>
                    <span className="text-primary font-bold">{calculations.totalCosts} €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-serif font-bold text-foreground">{calculations.occupiedDays}</p>
                <p className="text-sm text-muted-foreground">Zile Ocupate/Lună</p>
              </div>
              <div className="bg-secondary/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-serif font-bold text-foreground">{calculations.numberOfStays}</p>
                <p className="text-sm text-muted-foreground">Sejururi/Lună</p>
              </div>
            </div>

            {/* Lead Capture CTA */}
            <Button 
              onClick={() => setIsLeadFormOpen(true)}
              className="w-full py-6 text-lg"
              size="lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              Obține o Analiză Detaliată
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
