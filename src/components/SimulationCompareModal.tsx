import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  GitCompare, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Euro,
  Percent,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { AdvancedSimulationData } from '@/hooks/useAdvancedSimulations';
import { format } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface SimulationCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulations: AdvancedSimulationData[];
}

const translations = {
  ro: {
    title: 'Compară Simulări',
    subtitle: 'Selectează două simulări pentru a le compara',
    selectFirst: 'Selectează prima simulare',
    selectSecond: 'Selectează a doua simulare',
    simulation: 'Simulare',
    scenario: 'Scenariu',
    conservator: 'Conservator',
    piata: 'Piață',
    optimist: 'Optimist',
    date: 'Data',
    nightlyRate: 'Tarif/noapte',
    occupancy: 'Ocupare',
    classicRent: 'Chirie clasică',
    withoutSystem: 'Fără sistem',
    withSystem: 'Cu RealTrust',
    difference: 'Diferență',
    betterBy: 'mai bun cu',
    worseBy: 'mai slab cu',
    equal: 'egal',
    compareChart: 'Grafic Comparativ',
    perMonth: '/lună',
    close: 'Închide',
    noSimulations: 'Ai nevoie de cel puțin 2 simulări salvate pentru a compara.',
  },
  en: {
    title: 'Compare Simulations',
    subtitle: 'Select two simulations to compare',
    selectFirst: 'Select first simulation',
    selectSecond: 'Select second simulation',
    simulation: 'Simulation',
    scenario: 'Scenario',
    conservator: 'Conservative',
    piata: 'Market',
    optimist: 'Optimistic',
    date: 'Date',
    nightlyRate: 'Nightly rate',
    occupancy: 'Occupancy',
    classicRent: 'Classic rent',
    withoutSystem: 'Without system',
    withSystem: 'With RealTrust',
    difference: 'Difference',
    betterBy: 'better by',
    worseBy: 'worse by',
    equal: 'equal',
    compareChart: 'Comparison Chart',
    perMonth: '/month',
    close: 'Close',
    noSimulations: 'You need at least 2 saved simulations to compare.',
  },
};

const SimulationCompareModal: React.FC<SimulationCompareModalProps> = ({
  isOpen,
  onClose,
  simulations,
}) => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.ro;
  const dateLocale = language === 'ro' ? ro : enUS;

  const [selectedFirst, setSelectedFirst] = useState<string | null>(null);
  const [selectedSecond, setSelectedSecond] = useState<string | null>(null);

  const firstSimulation = simulations.find(s => s.id === selectedFirst);
  const secondSimulation = simulations.find(s => s.id === selectedSecond);

  const getScenarioLabel = (scenario: string) => {
    const scenarioKey = scenario as keyof typeof t;
    return t[scenarioKey] || scenario;
  };

  const renderDifference = (val1: number, val2: number, suffix: string = '€') => {
    const diff = val1 - val2;
    if (diff === 0) {
      return (
        <span className="text-muted-foreground flex items-center gap-1">
          <Minus className="w-3 h-3" />
          {t.equal}
        </span>
      );
    }
    const isPositive = diff > 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? '+' : ''}{diff}{suffix}
      </span>
    );
  };

  const chartData = firstSimulation && secondSimulation ? [
    {
      name: t.classicRent,
      [t.simulation + ' 1']: firstSimulation.classic_rent,
      [t.simulation + ' 2']: secondSimulation.classic_rent,
    },
    {
      name: t.withoutSystem,
      [t.simulation + ' 1']: firstSimulation.net_without_system,
      [t.simulation + ' 2']: secondSimulation.net_without_system,
    },
    {
      name: t.withSystem,
      [t.simulation + ' 1']: firstSimulation.net_with_system,
      [t.simulation + ' 2']: secondSimulation.net_with_system,
    },
  ] : [];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <GitCompare className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {simulations.length < 2 ? (
              <div className="text-center py-12">
                <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t.noSimulations}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Simulation Selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">
                      {t.selectFirst}
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {simulations.map((sim) => (
                        <button
                          key={`first-${sim.id}`}
                          onClick={() => {
                            if (sim.id !== selectedSecond) {
                              setSelectedFirst(sim.id);
                            }
                          }}
                          disabled={sim.id === selectedSecond}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            selectedFirst === sim.id
                              ? 'border-gold bg-gold/10'
                              : sim.id === selectedSecond
                              ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                              : 'border-border hover:border-gold/50 bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary capitalize">
                              {getScenarioLabel(sim.scenario)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(sim.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              €{sim.nightly_rate}/noapte • {sim.occupancy_without_system}%
                            </span>
                            <span className="font-bold text-gold">€{sim.net_with_system}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Second Simulation Selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">
                      {t.selectSecond}
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {simulations.map((sim) => (
                        <button
                          key={`second-${sim.id}`}
                          onClick={() => {
                            if (sim.id !== selectedFirst) {
                              setSelectedSecond(sim.id);
                            }
                          }}
                          disabled={sim.id === selectedFirst}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            selectedSecond === sim.id
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : sim.id === selectedFirst
                              ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                              : 'border-border hover:border-emerald-500/50 bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary capitalize">
                              {getScenarioLabel(sim.scenario)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(sim.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              €{sim.nightly_rate}/noapte • {sim.occupancy_without_system}%
                            </span>
                            <span className="font-bold text-emerald-400">€{sim.net_with_system}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comparison Results */}
                {firstSimulation && secondSimulation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Comparison Chart */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-gold" />
                        <h4 className="font-semibold text-foreground">{t.compareChart}</h4>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                          >
                            <XAxis 
                              type="number" 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              tickFormatter={(value) => `€${value}`}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={80}
                              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`€${value}`, '']}
                            />
                            <Legend />
                            <Bar 
                              dataKey={t.simulation + ' 1'} 
                              fill="hsl(45 93% 58%)" 
                              radius={[0, 4, 4, 0]}
                              maxBarSize={25}
                            />
                            <Bar 
                              dataKey={t.simulation + ' 2'} 
                              fill="hsl(160 84% 39%)" 
                              radius={[0, 4, 4, 0]}
                              maxBarSize={25}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Detailed Comparison Table */}
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-3 text-left text-sm font-medium text-muted-foreground">Metric</th>
                            <th className="p-3 text-center text-sm font-medium text-gold">{t.simulation} 1</th>
                            <th className="p-3 text-center text-sm font-medium text-emerald-400">{t.simulation} 2</th>
                            <th className="p-3 text-center text-sm font-medium text-muted-foreground">{t.difference}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr className="bg-card">
                            <td className="p-3 text-sm text-muted-foreground">{t.scenario}</td>
                            <td className="p-3 text-center text-sm font-medium text-foreground capitalize">
                              {getScenarioLabel(firstSimulation.scenario)}
                            </td>
                            <td className="p-3 text-center text-sm font-medium text-foreground capitalize">
                              {getScenarioLabel(secondSimulation.scenario)}
                            </td>
                            <td className="p-3 text-center">-</td>
                          </tr>
                          <tr className="bg-muted/30">
                            <td className="p-3 text-sm text-muted-foreground">{t.nightlyRate}</td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              €{firstSimulation.nightly_rate}
                            </td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              €{secondSimulation.nightly_rate}
                            </td>
                            <td className="p-3 text-center text-sm">
                              {renderDifference(firstSimulation.nightly_rate, secondSimulation.nightly_rate)}
                            </td>
                          </tr>
                          <tr className="bg-card">
                            <td className="p-3 text-sm text-muted-foreground">{t.occupancy}</td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              {firstSimulation.occupancy_without_system}%
                            </td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              {secondSimulation.occupancy_without_system}%
                            </td>
                            <td className="p-3 text-center text-sm">
                              {renderDifference(firstSimulation.occupancy_without_system, secondSimulation.occupancy_without_system, '%')}
                            </td>
                          </tr>
                          <tr className="bg-muted/30">
                            <td className="p-3 text-sm text-muted-foreground">{t.classicRent}</td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              €{firstSimulation.classic_rent}
                            </td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              €{secondSimulation.classic_rent}
                            </td>
                            <td className="p-3 text-center text-sm">
                              {renderDifference(firstSimulation.classic_rent, secondSimulation.classic_rent)}
                            </td>
                          </tr>
                          <tr className="bg-card">
                            <td className="p-3 text-sm text-muted-foreground">{t.withoutSystem}</td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              €{firstSimulation.net_without_system}
                            </td>
                            <td className="p-3 text-center text-sm font-medium text-foreground">
                              €{secondSimulation.net_without_system}
                            </td>
                            <td className="p-3 text-center text-sm">
                              {renderDifference(firstSimulation.net_without_system, secondSimulation.net_without_system)}
                            </td>
                          </tr>
                          <tr className="bg-gold/5 border-t-2 border-gold/30">
                            <td className="p-3 text-sm font-semibold text-gold">{t.withSystem}</td>
                            <td className="p-3 text-center text-lg font-bold text-gold">
                              €{firstSimulation.net_with_system}
                            </td>
                            <td className="p-3 text-center text-lg font-bold text-emerald-400">
                              €{secondSimulation.net_with_system}
                            </td>
                            <td className="p-3 text-center text-sm font-semibold">
                              {renderDifference(firstSimulation.net_with_system, secondSimulation.net_with_system)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            <Button variant="outline" onClick={onClose} className="w-full">
              {t.close}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Label component for local use
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={className}>{children}</label>
);

export default SimulationCompareModal;
