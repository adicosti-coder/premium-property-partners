import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, Home, Sparkles, TrendingUp, MessageCircle, Check, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useParallax } from '@/hooks/useParallax';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import AuthGateOverlay from './AuthGateOverlay';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

interface CalculatorData {
  city: string;
  rooms: string;
  locationType: string;
  phone: string;
}

const cities = [
  { id: 'timisoara', name: 'Timișoara', icon: Building2 },
  { id: 'arad', name: 'Arad', icon: Building2 },
  { id: 'oradea', name: 'Oradea', icon: Building2 },
];

const roomTypes = [
  { id: 'studio', name: 'Studio', icon: Home, baseValue: 1000 },
  { id: '2-camere', name: '2 Camere', icon: Home, baseValue: 1400 },
  { id: '3-camere', name: '3 Camere', icon: Home, baseValue: 2000 },
];

const locationTypes = [
  { id: 'ultracentral', name: 'Ultracentral', multiplier: 1.2, description: 'Zona istorică, centrul orașului' },
  { id: 'near-mall', name: 'Lângă Mall', multiplier: 1.1, description: 'Aproape de centre comerciale' },
  { id: 'rezidential', name: 'Rezidențial', multiplier: 1.0, description: 'Cartier rezidențial clasic' },
  { id: 'periferie', name: 'Periferie', multiplier: 0.85, description: 'Marginea orașului' },
];

const RentalIncomeCalculator = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation();
  const { offset: parallaxOffset } = useParallax({ speed: 0.1 });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<CalculatorData>({
    city: '',
    rooms: '',
    locationType: '',
    phone: '',
  });

  const isAuthenticated = !!user;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const totalSteps = 3;

  const calculateIncome = () => {
    const room = roomTypes.find(r => r.id === data.rooms);
    const location = locationTypes.find(l => l.id === data.locationType);
    
    if (!room || !location) return { min: 0, max: 0, base: 0, longTermRent: 0 };
    
    const baseIncome = room.baseValue * location.multiplier;
    const min = Math.round(baseIncome * 0.9);
    const max = Math.round(baseIncome * 1.1);
    const longTermRent = Math.round(room.baseValue / 2.5);
    const percentageIncrease = Math.round(((baseIncome - longTermRent) / longTermRent) * 100);
    
    return { min, max, base: Math.round(baseIncome), longTermRent, percentageIncrease };
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Start calculating animation
      setIsCalculating(true);
      setTimeout(() => {
        setIsCalculating(false);
        setShowResults(true);
      }, 2500);
    }
  };

  const handleSelectCity = (cityId: string) => {
    setData({ ...data, city: cityId });
    setTimeout(() => handleNextStep(), 300);
  };

  const handleSelectRooms = (roomId: string) => {
    setData({ ...data, rooms: roomId });
    setTimeout(() => handleNextStep(), 300);
  };

  const handleSelectLocation = (locationId: string) => {
    setData({ ...data, locationType: locationId });
    setTimeout(() => {
      setIsCalculating(true);
      setTimeout(() => {
        setIsCalculating(false);
        setShowResults(true);
      }, 2500);
    }, 300);
  };

  const saveLeadToDatabase = async () => {
    if (leadSaved) return; // Prevent duplicate saves
    
    const city = cities.find(c => c.id === data.city)?.name || '';
    const location = locationTypes.find(l => l.id === data.locationType)?.name || '';
    const room = roomTypes.find(r => r.id === data.rooms);
    const locationData = locationTypes.find(l => l.id === data.locationType);
    const income = calculateIncome();

    const simulationData = {
      city: data.city,
      cityName: city,
      rooms: data.rooms,
      roomName: room?.name || '',
      locationType: data.locationType,
      locationName: location,
      multiplier: locationData?.multiplier || 1,
      baseValue: room?.baseValue || 0,
      estimatedMin: income.min,
      estimatedMax: income.max,
      estimatedBase: income.base,
      longTermRent: income.longTermRent,
      percentageIncrease: income.percentageIncrease,
      calculatedAt: new Date().toISOString(),
    };

    setIsSavingLead(true);
    
    try {
      // Save lead via secure edge function
      const { error } = await supabase.functions.invoke('submit-lead', {
        body: {
          name: `Calculator Lead - ${city}`,
          whatsapp_number: 'pending',
          property_type: room?.name || data.rooms,
          property_area: room?.baseValue || 0,
          calculated_net_profit: income.base,
          calculated_yearly_profit: income.base * 12,
          source: 'rental-calculator',
          simulation_data: simulationData,
          send_notification: true,
        },
      });

      if (error) {
        console.error('Error saving lead:', error);
        toast.error('Eroare la salvarea datelor');
      } else {
        setLeadSaved(true);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleWhatsAppClick = async () => {
    // Save lead to database first
    await saveLeadToDatabase();
    
    const city = cities.find(c => c.id === data.city)?.name || '';
    const location = locationTypes.find(l => l.id === data.locationType)?.name || '';
    const income = calculateIncome();
    
    const message = encodeURIComponent(
      `Bună ziua, RealTrust & ApArt Hotel! Tocmai am calculat venitul pentru apartamentul meu din ${location}, ${city}. Estimarea este de ${income.base}€/lună. Vreau mai multe detalii.`
    );
    
    window.open(`https://wa.me/40723154520?text=${message}`, '_blank');
  };

  const handleReset = () => {
    setCurrentStep(1);
    setShowResults(false);
    setIsCalculating(false);
    setLeadSaved(false);
    setData({ city: '', rooms: '', locationType: '', phone: '' });
  };

  const income = calculateIncome();

  const chartData = [
    { name: 'Chirie Standard', value: income.longTermRent, fill: 'hsl(var(--muted-foreground))' },
    { name: 'RealTrust', value: income.base, fill: 'hsl(var(--gold))' },
  ];

  const progressPercentage = showResults ? 100 : ((currentStep - 1) / totalSteps) * 100 + (currentStep <= totalSteps ? 33 : 0);

  return (
    <section 
      ref={ref}
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
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">Estimator AI pentru Proprietari</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4">
            Calculator Venituri din Chirii
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Află în 30 de secunde cât poți câștiga cu apartamentul tău prin RealTrust Management
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          {/* Calculator Card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Progress Bar */}
            <div className="bg-muted/50 p-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {showResults ? 'Rezultat' : `Pasul ${currentStep} din ${totalSteps}`}
                </span>
                <span className="text-sm font-medium text-gold">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold to-gold/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {/* Step indicators */}
              <div className="flex justify-between mt-3">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      currentStep > step || showResults
                        ? 'bg-gold text-white'
                        : currentStep === step
                        ? 'bg-gold/20 text-gold border-2 border-gold'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentStep > step || showResults ? <Check className="w-4 h-4" /> : step}
                    </div>
                    <span className="hidden sm:inline text-xs text-muted-foreground">
                      {step === 1 ? 'Oraș' : step === 2 ? 'Camere' : 'Zonă'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8 min-h-[400px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {/* Step 1: City Selection */}
                {currentStep === 1 && !isCalculating && !showResults && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-8">
                      <MapPin className="w-12 h-12 text-gold mx-auto mb-4" />
                      <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                        În ce oraș se află apartamentul?
                      </h3>
                      <p className="text-muted-foreground">Selectează orașul pentru a continua</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {cities.map((city) => (
                        <motion.button
                          key={city.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectCity(city.id)}
                          className={`p-6 rounded-xl border-2 transition-all ${
                            data.city === city.id
                              ? 'border-gold bg-gold/10'
                              : 'border-border hover:border-gold/50 hover:bg-muted/50'
                          }`}
                        >
                          <city.icon className="w-10 h-10 text-gold mx-auto mb-3" />
                          <span className="text-lg font-semibold text-foreground">{city.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Room Selection */}
                {currentStep === 2 && !isCalculating && !showResults && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-8">
                      <Home className="w-12 h-12 text-gold mx-auto mb-4" />
                      <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                        Câte camere are apartamentul?
                      </h3>
                      <p className="text-muted-foreground">Alege tipul apartamentului</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {roomTypes.map((room) => (
                        <motion.button
                          key={room.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectRooms(room.id)}
                          className={`p-6 rounded-xl border-2 transition-all ${
                            data.rooms === room.id
                              ? 'border-gold bg-gold/10'
                              : 'border-border hover:border-gold/50 hover:bg-muted/50'
                          }`}
                        >
                          <room.icon className="w-10 h-10 text-gold mx-auto mb-3" />
                          <span className="text-lg font-semibold text-foreground">{room.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Location Type */}
                {currentStep === 3 && !isCalculating && !showResults && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-8">
                      <Building2 className="w-12 h-12 text-gold mx-auto mb-4" />
                      <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                        În ce tip de zonă se află?
                      </h3>
                      <p className="text-muted-foreground">Selectează locația pentru estimare precisă</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {locationTypes.map((location) => (
                        <motion.button
                          key={location.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectLocation(location.id)}
                          className={`p-5 rounded-xl border-2 text-left transition-all ${
                            data.locationType === location.id
                              ? 'border-gold bg-gold/10'
                              : 'border-border hover:border-gold/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center">
                              <MapPin className="w-6 h-6 text-gold" />
                            </div>
                            <div>
                              <span className="text-lg font-semibold text-foreground block">{location.name}</span>
                              <span className="text-sm text-muted-foreground">{location.description}</span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Calculating Animation */}
                {isCalculating && (
                  <motion.div
                    key="calculating"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-12"
                  >
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <motion.div
                        className="absolute inset-0 border-4 border-gold/20 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-2 border-4 border-t-gold border-r-transparent border-b-transparent border-l-transparent rounded-full"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <Brain className="absolute inset-0 m-auto w-10 h-10 text-gold" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                      Analizăm datele de piață...
                    </h3>
                    <p className="text-muted-foreground">
                      Calculăm venitul optim pentru proprietatea ta
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-3 h-3 bg-gold rounded-full"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Results Screen */}
                {showResults && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    {/* Auth Gate Overlay - show blur when not authenticated */}
                    {!isAuthenticated && (
                      <AuthGateOverlay context="calculator" />
                    )}

                    {/* All results wrapped in blur container */}
                    <div className={cn(
                      !isAuthenticated && "blur-lg pointer-events-none select-none"
                    )}>
                      <div className="text-center mb-8">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                          className="w-16 h-16 rounded-full bg-gradient-to-r from-gold to-gold/80 mx-auto mb-4 flex items-center justify-center"
                        >
                          <Sparkles className="w-8 h-8 text-white" />
                        </motion.div>
                        <h3 className="text-xl font-medium text-muted-foreground mb-2">
                          Venitul tău lunar estimat
                        </h3>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                          className="text-5xl md:text-6xl font-bold text-gold mb-2"
                        >
                          {income.min}€ - {income.max}€
                        </motion.div>
                        <p className="text-muted-foreground">
                          {roomTypes.find(r => r.id === data.rooms)?.name} • {locationTypes.find(l => l.id === data.locationType)?.name} • {cities.find(c => c.id === data.city)?.name}
                        </p>
                      </div>

                      {/* Comparison Chart */}
                      <div className="bg-muted/30 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-gold" />
                          <h4 className="font-semibold text-foreground">Comparație Venituri</h4>
                        </div>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="text-center mt-4 text-foreground"
                        >
                          Aceasta este cu <span className="font-bold text-gold">+{income.percentageIncrease}%</span> mai mare decât chiria medie pe termen lung de <span className="font-bold">{income.longTermRent}€</span> în {cities.find(c => c.id === data.city)?.name}
                        </motion.p>
                      </div>

                      {/* CTA Buttons */}
                      <div className="space-y-3">
                        <Button
                          onClick={handleWhatsAppClick}
                          disabled={isSavingLead}
                          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-6 text-lg font-semibold rounded-xl disabled:opacity-70"
                        >
                          {isSavingLead ? (
                            <>
                              <motion.div
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              Se salvează...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-5 h-5 mr-2" />
                              Obțineți Raportul Complet pe WhatsApp
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="w-full py-4"
                        >
                          Calculează din nou
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gold" />
              <span>Estimare bazată pe date reale</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gold" />
              <span>Fără obligații</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gold" />
              <span>Răspuns în 24h</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default RentalIncomeCalculator;
