import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  TrendingUp, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Home,
  Building2,
  Euro,
  Percent,
  Calendar,
  Wrench,
  CreditCard,
  Users,
  ArrowUp,
  RefreshCw,
  Save,
  History,
  Trash2,
  LogIn,
  X,
  BarChart3,
  GitCompare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useParallax } from '@/hooks/useParallax';
import { useAdvancedSimulations, AdvancedSimulationData } from '@/hooks/useAdvancedSimulations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import SimulationCompareModal from './SimulationCompareModal';
import AuthGateOverlay from './AuthGateOverlay';
import { cn } from '@/lib/utils';

type Scenario = 'conservator' | 'piata' | 'optimist';

interface CalculatorInputs {
  classicRent: number;
  daysPerMonth: number;
  nightlyRate: number;
  occupancyWithoutSystem: number;
  rateUpliftWithSystem: number;
  occupancyUpliftWithSystem: number;
  platformCommission: number;
  paymentProcessingFee: number;
  cleaningCostPerStay: number;
  averageStayDuration: number;
  monthlyFixedCosts: number;
  managementFee: number;
}

const scenarioPresets: Record<Scenario, Partial<CalculatorInputs>> = {
  conservator: {
    occupancyWithoutSystem: 50,
    rateUpliftWithSystem: 10,
    occupancyUpliftWithSystem: 8,
  },
  piata: {
    occupancyWithoutSystem: 58,
    rateUpliftWithSystem: 18,
    occupancyUpliftWithSystem: 12,
  },
  optimist: {
    occupancyWithoutSystem: 65,
    rateUpliftWithSystem: 25,
    occupancyUpliftWithSystem: 15,
  },
};

const translations = {
  ro: {
    title: 'Calculator Avansat Venituri',
    subtitle: 'Calculează cu precizie veniturile nete în 3 scenarii diferite',
    classicRent: 'Chirie clasică (NET/lună)',
    classicRentHelp: 'Ce rămâne proprietarului după orice cheltuieli ale chiriașului',
    daysPerMonth: 'Zile/lună (calcul)',
    nightlyRate: 'Tarif/noapte (Fără sistem)',
    occupancyWithoutSystem: 'Ocupare (Fără sistem)',
    rateUpliftWithSystem: 'Uplift tarif cu sistem RealTrust',
    rateUpliftHelp: 'Ex: +18% înseamnă tarif mai mare prin poziționare + optimizare',
    occupancyUpliftWithSystem: 'Uplift ocupare cu sistem RealTrust',
    occupancyUpliftHelp: 'pp = puncte procentuale (ex: 58% → 70%)',
    platformCommission: 'Comision platforme (Booking/Airbnb)',
    paymentProcessingFee: 'Taxe & procesare plăți',
    cleaningCostPerStay: 'Cost curățenie / sejur',
    averageStayDuration: 'Ședere medie',
    monthlyFixedCosts: 'Costuri fixe lunare (utilități, consumabile)',
    managementFee: 'Fee administrare RealTrust (din venit)',
    managementFeeNote: 'Se aplică doar la "Cu sistemul RealTrust"',
    scenario: 'SCENARIU',
    conservator: 'Conservator',
    piata: 'Piață',
    optimist: 'Optimist',
    recalculate: 'Recalculează',
    results: 'Rezultate (NET / lună)',
    resultsHelp: 'Estimare. Ajustează valorile pentru scenariul tău.',
    classicRentResult: 'Chirie clasică',
    withoutSystem: 'Fără sistem',
    withSystem: 'Cu sistemul RealTrust',
    vsClassic: 'vs chirie clasică',
    perYear: 'pe an',
    advancedSettings: 'Setări avansate',
    hideAdvanced: 'Ascunde setările avansate',
    whatsappCTA: 'Obține evaluare personalizată',
    resetToDefaults: 'Resetează la valori implicite',
    saveSimulation: 'Salvează simularea',
    savedSimulations: 'Simulări salvate',
    hideHistory: 'Ascunde istoricul',
    showHistory: 'Arată istoricul',
    deleteSimulation: 'Șterge',
    loadSimulation: 'Încarcă',
    loginToSave: 'Autentifică-te pentru a salva simulările',
    loginButton: 'Autentificare',
    noSimulations: 'Nu ai simulări salvate încă',
    simulationSaved: 'Simulare salvată cu succes!',
    simulationDeleted: 'Simulare ștearsă',
    simulationLoaded: 'Simulare încărcată',
    chartTitle: 'Comparație Vizuală',
    chartClassic: 'Chirie Clasică',
    chartWithout: 'Fără Sistem',
    chartWith: 'Cu RealTrust',
    compareSimulations: 'Compară Simulări',
  },
  en: {
    title: 'Advanced Income Calculator',
    subtitle: 'Precisely calculate net income in 3 different scenarios',
    classicRent: 'Classic rent (NET/month)',
    classicRentHelp: 'What remains for the owner after any tenant expenses',
    daysPerMonth: 'Days/month (calculation)',
    nightlyRate: 'Nightly rate (Without system)',
    occupancyWithoutSystem: 'Occupancy (Without system)',
    rateUpliftWithSystem: 'Rate uplift with RealTrust system',
    rateUpliftHelp: 'Ex: +18% means higher rate through positioning + optimization',
    occupancyUpliftWithSystem: 'Occupancy uplift with RealTrust system',
    occupancyUpliftHelp: 'pp = percentage points (ex: 58% → 70%)',
    platformCommission: 'Platform commission (Booking/Airbnb)',
    paymentProcessingFee: 'Taxes & payment processing',
    cleaningCostPerStay: 'Cleaning cost / stay',
    averageStayDuration: 'Average stay duration',
    monthlyFixedCosts: 'Monthly fixed costs (utilities, supplies)',
    managementFee: 'RealTrust management fee (from revenue)',
    managementFeeNote: 'Applies only to "With RealTrust system"',
    scenario: 'SCENARIO',
    conservator: 'Conservative',
    piata: 'Market',
    optimist: 'Optimistic',
    recalculate: 'Recalculate',
    results: 'Results (NET / month)',
    resultsHelp: 'Estimate. Adjust values for your scenario.',
    classicRentResult: 'Classic rent',
    withoutSystem: 'Without system',
    withSystem: 'With RealTrust system',
    vsClassic: 'vs classic rent',
    perYear: 'per year',
    advancedSettings: 'Advanced settings',
    hideAdvanced: 'Hide advanced settings',
    whatsappCTA: 'Get personalized evaluation',
    resetToDefaults: 'Reset to defaults',
    saveSimulation: 'Save simulation',
    savedSimulations: 'Saved simulations',
    hideHistory: 'Hide history',
    showHistory: 'Show history',
    deleteSimulation: 'Delete',
    loadSimulation: 'Load',
    loginToSave: 'Log in to save simulations',
    loginButton: 'Log in',
    noSimulations: 'No saved simulations yet',
    simulationSaved: 'Simulation saved successfully!',
    simulationDeleted: 'Simulation deleted',
    simulationLoaded: 'Simulation loaded',
    chartTitle: 'Visual Comparison',
    chartClassic: 'Classic Rent',
    chartWithout: 'Without System',
    chartWith: 'With RealTrust',
    compareSimulations: 'Compare Simulations',
  },
};

const defaultInputs: CalculatorInputs = {
  classicRent: 488,
  daysPerMonth: 30,
  nightlyRate: 70,
  occupancyWithoutSystem: 58,
  rateUpliftWithSystem: 18,
  occupancyUpliftWithSystem: 12,
  platformCommission: 15,
  paymentProcessingFee: 3,
  cleaningCostPerStay: 18,
  averageStayDuration: 2.4,
  monthlyFixedCosts: 120,
  managementFee: 20,
};

const AdvancedRentalCalculator = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation();
  const { offset: parallaxOffset } = useParallax({ speed: 0.1 });
  const t = translations[language as keyof typeof translations] || translations.ro;
  const dateLocale = language === 'ro' ? ro : enUS;
  
  const { 
    isAuthenticated, 
    simulations, 
    saveSimulation, 
    deleteSimulation, 
    loadSimulation,
    loading: simulationsLoading 
  } = useAdvancedSimulations();
  
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const [scenario, setScenario] = useState<Scenario>('piata');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (key: keyof CalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleScenarioChange = (newScenario: Scenario) => {
    setScenario(newScenario);
    setInputs(prev => ({
      ...prev,
      ...scenarioPresets[newScenario],
    }));
  };

  const handleRecalculate = () => {
    setIsCalculating(true);
    setTimeout(() => setIsCalculating(false), 800);
  };

  const handleReset = () => {
    setInputs(defaultInputs);
    setScenario('piata');
  };

  const handleSaveSimulation = async () => {
    if (!isAuthenticated) return;
    
    setIsSaving(true);
    const result = await saveSimulation({
      scenario,
      classicRent: inputs.classicRent,
      nightlyRate: inputs.nightlyRate,
      occupancyWithoutSystem: inputs.occupancyWithoutSystem,
      rateUplift: inputs.rateUpliftWithSystem,
      occupancyUplift: inputs.occupancyUpliftWithSystem,
      platformCommission: inputs.platformCommission,
      paymentProcessingFee: inputs.paymentProcessingFee,
      cleaningCostPerStay: inputs.cleaningCostPerStay,
      averageStayDuration: inputs.averageStayDuration,
      monthlyFixedCosts: inputs.monthlyFixedCosts,
      managementFee: inputs.managementFee,
      netWithoutSystem: calculations.netWithoutSystem,
      netWithSystem: calculations.netWithSystem,
      diffVsClassic: calculations.diffVsClassic,
      percentVsClassic: calculations.percentVsClassic,
    });
    setIsSaving(false);
    
    if (!result.error) {
      toast.success(t.simulationSaved);
    } else {
      toast.error('Error saving simulation');
    }
  };

  const handleLoadSimulation = (sim: AdvancedSimulationData) => {
    const loadedInputs = loadSimulation(sim);
    setInputs(loadedInputs);
    setScenario(sim.scenario as Scenario);
    toast.success(t.simulationLoaded);
  };

  const handleDeleteSimulation = async (id: string) => {
    const result = await deleteSimulation(id);
    if (!result.error) {
      toast.success(t.simulationDeleted);
    }
  };

  const calculations = useMemo(() => {
    const {
      classicRent,
      daysPerMonth,
      nightlyRate,
      occupancyWithoutSystem,
      rateUpliftWithSystem,
      occupancyUpliftWithSystem,
      platformCommission,
      paymentProcessingFee,
      cleaningCostPerStay,
      averageStayDuration,
      monthlyFixedCosts,
      managementFee,
    } = inputs;

    // Without system calculations
    const occupiedDaysWithoutSystem = Math.round((occupancyWithoutSystem / 100) * daysPerMonth);
    const staysWithoutSystem = occupiedDaysWithoutSystem / averageStayDuration;
    const grossRevenueWithoutSystem = occupiedDaysWithoutSystem * nightlyRate;
    const platformCostWithoutSystem = grossRevenueWithoutSystem * (platformCommission / 100);
    const paymentCostWithoutSystem = grossRevenueWithoutSystem * (paymentProcessingFee / 100);
    const cleaningCostWithoutSystem = staysWithoutSystem * cleaningCostPerStay;
    const netWithoutSystem = Math.round(
      grossRevenueWithoutSystem - 
      platformCostWithoutSystem - 
      paymentCostWithoutSystem - 
      cleaningCostWithoutSystem - 
      monthlyFixedCosts
    );

    // With RealTrust system calculations
    const upliftedRate = nightlyRate * (1 + rateUpliftWithSystem / 100);
    const upliftedOccupancy = Math.min(occupancyWithoutSystem + occupancyUpliftWithSystem, 95);
    const occupiedDaysWithSystem = Math.round((upliftedOccupancy / 100) * daysPerMonth);
    const staysWithSystem = occupiedDaysWithSystem / averageStayDuration;
    const grossRevenueWithSystem = occupiedDaysWithSystem * upliftedRate;
    const platformCostWithSystem = grossRevenueWithSystem * (platformCommission / 100);
    const paymentCostWithSystem = grossRevenueWithSystem * (paymentProcessingFee / 100);
    const cleaningCostWithSystem = staysWithSystem * cleaningCostPerStay;
    const managementCost = grossRevenueWithSystem * (managementFee / 100);
    const netWithSystem = Math.round(
      grossRevenueWithSystem - 
      platformCostWithSystem - 
      paymentCostWithSystem - 
      cleaningCostWithSystem - 
      monthlyFixedCosts -
      managementCost
    );

    // Comparisons
    const diffVsClassic = netWithSystem - classicRent;
    const yearlyDiff = diffVsClassic * 12;
    const percentVsClassic = classicRent > 0 ? Math.round((diffVsClassic / classicRent) * 100 * 10) / 10 : 0;

    return {
      classicRent,
      netWithoutSystem,
      netWithSystem,
      diffVsClassic,
      yearlyDiff,
      percentVsClassic,
    };
  }, [inputs]);

  const handleWhatsAppClick = async () => {
    // Save lead with properly serialized JSON
    try {
      const simulationData = {
        inputs: { ...inputs },
        scenario,
        calculations: { ...calculations },
        calculatedAt: new Date().toISOString(),
      };
      
      await supabase.from('leads').insert([{
        name: `Calculator Avansat Lead`,
        whatsapp_number: 'pending',
        property_type: 'Apartament',
        property_area: 0,
        calculated_net_profit: calculations.netWithSystem,
        calculated_yearly_profit: calculations.netWithSystem * 12,
        source: 'advanced-rental-calculator',
        simulation_data: JSON.parse(JSON.stringify(simulationData)),
      }]);
    } catch (err) {
      console.error('Error saving lead:', err);
    }

    const message = encodeURIComponent(
      `Bună ziua, RealTrust & ApArt Hotel! Am folosit calculatorul avansat:\n` +
      `📊 Scenariu: ${t[scenario]}\n` +
      `💰 Chirie clasică: ${calculations.classicRent}€\n` +
      `📈 Cu RealTrust & ApArt Hotel: ${calculations.netWithSystem}€/lună\n` +
      `✨ Diferență: +${calculations.diffVsClassic}€/lună (+${calculations.percentVsClassic}%)\n\n` +
      `Vreau o evaluare personalizată pentru proprietatea mea.`
    );
    
    window.open(`https://wa.me/40723154520?text=${message}`, '_blank');
  };

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    suffix, 
    helpText,
    min = 0,
    max = 1000,
    step = 1,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
    helpText?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground flex items-center gap-2">
        {label}
        {suffix && <span className="text-gold font-medium">— {suffix}</span>}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="bg-muted/50 border-border text-foreground"
      />
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );

  return (
    <section 
      ref={ref}
      id="calculator-avansat"
      className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-background via-navy-900/5 to-background"
    >
      {/* Background decorations */}
      <div 
        className="absolute top-20 left-10 w-72 h-72 bg-gold/5 rounded-full blur-3xl"
        style={{ transform: `translateY(${(parallaxOffset ?? 0) * 0.5}px)` }}
      />
      <div 
        className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        style={{ transform: `translateY(${(parallaxOffset ?? 0) * -0.3}px)` }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-6">
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">Calculator Pro pentru Proprietari</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Main Inputs */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Basic Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label={t.classicRent}
                  value={inputs.classicRent}
                  onChange={(v) => handleInputChange('classicRent', v)}
                  suffix="€"
                  helpText={t.classicRentHelp}
                  max={5000}
                />
                <InputField
                  label={t.nightlyRate}
                  value={inputs.nightlyRate}
                  onChange={(v) => handleInputChange('nightlyRate', v)}
                  suffix="€"
                  max={500}
                />
                <InputField
                  label={t.occupancyWithoutSystem}
                  value={inputs.occupancyWithoutSystem}
                  onChange={(v) => handleInputChange('occupancyWithoutSystem', v)}
                  suffix="%"
                  max={100}
                />
                <InputField
                  label={t.rateUpliftWithSystem}
                  value={inputs.rateUpliftWithSystem}
                  onChange={(v) => handleInputChange('rateUpliftWithSystem', v)}
                  suffix="%"
                  helpText={t.rateUpliftHelp}
                  max={100}
                />
              </div>

              {/* Scenario Selector */}
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t.scenario}</Label>
                <div className="flex gap-2">
                  {(['conservator', 'piata', 'optimist'] as Scenario[]).map((s) => (
                    <Button
                      key={s}
                      variant={scenario === s ? 'default' : 'outline'}
                      onClick={() => handleScenarioChange(s)}
                      className={`flex-1 ${
                        scenario === s 
                          ? 'bg-gold hover:bg-gold/90 text-white' 
                          : 'border-border hover:border-gold/50'
                      }`}
                    >
                      {t[s]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                {showAdvanced ? t.hideAdvanced : t.advancedSettings}
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>

              {/* Advanced Settings */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                      <InputField
                        label={t.daysPerMonth}
                        value={inputs.daysPerMonth}
                        onChange={(v) => handleInputChange('daysPerMonth', v)}
                        max={31}
                      />
                      <InputField
                        label={t.occupancyUpliftWithSystem}
                        value={inputs.occupancyUpliftWithSystem}
                        onChange={(v) => handleInputChange('occupancyUpliftWithSystem', v)}
                        suffix="pp"
                        helpText={t.occupancyUpliftHelp}
                        max={50}
                      />
                      <InputField
                        label={t.platformCommission}
                        value={inputs.platformCommission}
                        onChange={(v) => handleInputChange('platformCommission', v)}
                        suffix="%"
                        max={30}
                      />
                      <InputField
                        label={t.paymentProcessingFee}
                        value={inputs.paymentProcessingFee}
                        onChange={(v) => handleInputChange('paymentProcessingFee', v)}
                        suffix="%"
                        max={10}
                      />
                      <InputField
                        label={t.cleaningCostPerStay}
                        value={inputs.cleaningCostPerStay}
                        onChange={(v) => handleInputChange('cleaningCostPerStay', v)}
                        suffix="€"
                        max={100}
                      />
                      <InputField
                        label={t.averageStayDuration}
                        value={inputs.averageStayDuration}
                        onChange={(v) => handleInputChange('averageStayDuration', v)}
                        suffix={language === 'ro' ? 'nopți' : 'nights'}
                        step={0.1}
                        max={14}
                      />
                      <InputField
                        label={t.monthlyFixedCosts}
                        value={inputs.monthlyFixedCosts}
                        onChange={(v) => handleInputChange('monthlyFixedCosts', v)}
                        suffix="€"
                        max={1000}
                      />
                      <InputField
                        label={t.managementFee}
                        value={inputs.managementFee}
                        onChange={(v) => handleInputChange('managementFee', v)}
                        suffix="%"
                        helpText={t.managementFeeNote}
                        max={50}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t.resetToDefaults}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recalculate Button */}
              <Button
                onClick={handleRecalculate}
                className="w-full bg-muted hover:bg-muted/80 text-foreground py-6 text-lg"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  t.recalculate
                )}
              </Button>
            </div>

            {/* Results Section */}
            <div className="bg-muted/30 border-t border-border p-6 md:p-8 relative">
              {/* Auth Gate Overlay - show blur when not authenticated */}
              {!isAuthenticated && (
                <AuthGateOverlay context="calculator" />
              )}

              {/* All results wrapped in blur container */}
              <div className={cn(
                !isAuthenticated && "blur-lg pointer-events-none select-none"
              )}>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-foreground">{t.results}</h3>
                  <p className="text-sm text-muted-foreground">{t.resultsHelp}</p>
                </div>

                {/* Bar Chart Comparison */}
                <motion.div
                  className="mb-6 p-4 rounded-xl bg-card border border-border"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-gold" />
                  <h4 className="font-semibold text-foreground">{t.chartTitle}</h4>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: t.chartClassic,
                          value: calculations.classicRent,
                          fill: 'hsl(var(--muted-foreground))',
                        },
                        {
                          name: t.chartWithout,
                          value: calculations.netWithoutSystem,
                          fill: 'hsl(38 92% 50%)',
                        },
                        {
                          name: t.chartWith,
                          value: calculations.netWithSystem,
                          fill: 'hsl(var(--gold))',
                        },
                      ]}
                      layout="vertical"
                      margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                    >
                      <XAxis 
                        type="number" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickFormatter={(value) => `€${value}`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number) => [`€${value}`, 'Venit NET/lună']}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 8, 8, 0]}
                        maxBarSize={50}
                      >
                        {[
                          { fill: 'hsl(var(--muted-foreground))' },
                          { fill: 'hsl(38 92% 50%)' },
                          { fill: 'hsl(45 93% 58%)' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(value: number) => `€${value}`}
                          style={{ fill: 'hsl(var(--foreground))', fontWeight: 'bold', fontSize: 14 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Visual difference indicator */}
                {calculations.diffVsClassic > 0 && (
                  <motion.div 
                    className="mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">
                      +{calculations.diffVsClassic}€/lună (+{calculations.percentVsClassic}%) {t.vsClassic}
                    </span>
                  </motion.div>
                )}
              </motion.div>

              <div className="space-y-3">
                {/* Classic Rent Result */}
                <motion.div
                  className="p-4 rounded-xl bg-muted/50 border border-border flex justify-between items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="text-muted-foreground font-medium">{t.classicRentResult}</span>
                  <span className="text-2xl font-bold text-foreground">€{calculations.classicRent}</span>
                </motion.div>

                {/* Without System Result */}
                <motion.div
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-amber-400 font-medium">{t.withoutSystem}</span>
                  <span className="text-2xl font-bold text-foreground">€{calculations.netWithoutSystem}</span>
                </motion.div>

                {/* With RealTrust System Result */}
                <motion.div
                  className="p-4 rounded-xl bg-gold/10 border-2 border-gold flex justify-between items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="px-3 py-1 rounded-full bg-gold text-white text-sm font-medium">
                    {t.withSystem}
                  </span>
                  <span className="text-3xl font-bold text-gold">€{calculations.netWithSystem}</span>
                </motion.div>

                {/* Comparison Metrics */}
                <motion.div
                  className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ArrowUp className="w-4 h-4" />
                    <span className="font-bold">+{calculations.diffVsClassic} €/lună {t.vsClassic}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="text-lg">≈</span>
                    <span className="font-bold">≈ {calculations.yearlyDiff.toLocaleString()} €/{t.perYear}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ArrowUp className="w-4 h-4" />
                    <span className="font-bold">+{calculations.percentVsClassic}% {t.vsClassic}</span>
                  </div>
                </motion.div>
              </div>

              {/* Save & History Section */}
              <div className="mt-6 space-y-4">
                {isAuthenticated ? (
                  <>
                    {/* Save Button */}
                    <Button
                      onClick={handleSaveSimulation}
                      disabled={isSaving}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4"
                    >
                      {isSaving ? (
                        <motion.div
                          className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {t.saveSimulation}
                    </Button>

                    {/* Compare Simulations Button */}
                    {simulations.length >= 2 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowCompareModal(true)}
                        className="w-full border-gold/30 text-gold hover:bg-gold/10"
                      >
                        <GitCompare className="w-4 h-4 mr-2" />
                        {t.compareSimulations}
                      </Button>
                    )}

                    {/* History Toggle */}
                    <Button
                      variant="ghost"
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        {showHistory ? t.hideHistory : t.showHistory}
                        {simulations.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                            {simulations.length}
                          </span>
                        )}
                      </span>
                      {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>

                    {/* Saved Simulations List */}
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          {simulations.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {t.noSimulations}
                            </p>
                          ) : (
                            simulations.map((sim) => (
                              <motion.div
                                key={sim.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="p-3 rounded-lg bg-muted/50 border border-border"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gold/20 text-gold capitalize">
                                      {t[sim.scenario as keyof typeof t] || sim.scenario}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(sim.created_at), 'dd MMM yyyy, HH:mm', { locale: dateLocale })}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleLoadSimulation(sim)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      {t.loadSimulation}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSimulation(sim.id)}
                                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    €{sim.nightly_rate}/noapte • {sim.occupancy_without_system}% ocupare
                                  </span>
                                  <span className="font-bold text-gold">
                                    €{sim.net_with_system}/lună
                                  </span>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                    <LogIn className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">{t.loginToSave}</p>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/auth">
                        {t.loginButton}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* WhatsApp CTA */}
                <Button
                  onClick={handleWhatsAppClick}
                  className="w-full mt-6 bg-[#25D366] hover:bg-[#128C7E] text-white py-6 text-lg font-semibold rounded-xl"
                >
                <MessageCircle className="w-5 h-5 mr-2" />
                {t.whatsappCTA}
              </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Compare Modal */}
      <SimulationCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        simulations={simulations}
      />
    </section>
  );
};

export default AdvancedRentalCalculator;
