import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export interface AdvancedSimulationData {
  id: string;
  scenario: string;
  classic_rent: number;
  nightly_rate: number;
  occupancy_without_system: number;
  rate_uplift: number;
  occupancy_uplift: number;
  platform_commission: number;
  payment_processing_fee: number;
  cleaning_cost_per_stay: number;
  average_stay_duration: number;
  monthly_fixed_costs: number;
  management_fee: number;
  net_without_system: number;
  net_with_system: number;
  diff_vs_classic: number;
  percent_vs_classic: number;
  created_at: string;
}

export function useAdvancedSimulations() {
  const [user, setUser] = useState<User | null>(null);
  const [simulations, setSimulations] = useState<AdvancedSimulationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSimulations();
    } else {
      setSimulations([]);
    }
  }, [user]);

  const fetchSimulations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("advanced_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setSimulations(data as AdvancedSimulationData[]);
    }
  };

  const saveSimulation = async (simulation: {
    scenario: string;
    classicRent: number;
    nightlyRate: number;
    occupancyWithoutSystem: number;
    rateUplift: number;
    occupancyUplift: number;
    platformCommission: number;
    paymentProcessingFee: number;
    cleaningCostPerStay: number;
    averageStayDuration: number;
    monthlyFixedCosts: number;
    managementFee: number;
    netWithoutSystem: number;
    netWithSystem: number;
    diffVsClassic: number;
    percentVsClassic: number;
  }) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase.from("advanced_simulations").insert({
      user_id: user.id,
      scenario: simulation.scenario,
      classic_rent: simulation.classicRent,
      nightly_rate: simulation.nightlyRate,
      occupancy_without_system: simulation.occupancyWithoutSystem,
      rate_uplift: simulation.rateUplift,
      occupancy_uplift: simulation.occupancyUplift,
      platform_commission: simulation.platformCommission,
      payment_processing_fee: simulation.paymentProcessingFee,
      cleaning_cost_per_stay: simulation.cleaningCostPerStay,
      average_stay_duration: simulation.averageStayDuration,
      monthly_fixed_costs: simulation.monthlyFixedCosts,
      management_fee: simulation.managementFee,
      net_without_system: simulation.netWithoutSystem,
      net_with_system: simulation.netWithSystem,
      diff_vs_classic: simulation.diffVsClassic,
      percent_vs_classic: simulation.percentVsClassic,
    });

    if (!error) {
      await fetchSimulations();
    }

    return { error };
  };

  const deleteSimulation = async (id: string) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("advanced_simulations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setSimulations((prev) => prev.filter((s) => s.id !== id));
    }

    return { error };
  };

  const loadSimulation = (simulation: AdvancedSimulationData) => {
    return {
      classicRent: simulation.classic_rent,
      daysPerMonth: 30,
      nightlyRate: simulation.nightly_rate,
      occupancyWithoutSystem: simulation.occupancy_without_system,
      rateUpliftWithSystem: simulation.rate_uplift,
      occupancyUpliftWithSystem: simulation.occupancy_uplift,
      platformCommission: simulation.platform_commission,
      paymentProcessingFee: simulation.payment_processing_fee,
      cleaningCostPerStay: simulation.cleaning_cost_per_stay,
      averageStayDuration: simulation.average_stay_duration,
      monthlyFixedCosts: simulation.monthly_fixed_costs,
      managementFee: simulation.management_fee,
    };
  };

  return {
    user,
    isAuthenticated: !!user,
    loading,
    simulations,
    saveSimulation,
    deleteSimulation,
    loadSimulation,
    refreshSimulations: fetchSimulations,
  };
}
