import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export interface SimulationData {
  id: string;
  city: string;
  rooms: string;
  location: string;
  property_area: number | null;
  monthly_income: number;
  yearly_income: number;
  realtrurst_income: number;
  realtrust_yearly: number;
  created_at: string;
}

export function useSimulations() {
  const [user, setUser] = useState<User | null>(null);
  const [simulations, setSimulations] = useState<SimulationData[]>([]);
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
      .from("user_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setSimulations(data as SimulationData[]);
    }
  };

  const saveSimulation = async (simulation: {
    city: string;
    rooms: string;
    location: string;
    propertyArea?: number;
    monthlyIncome: number;
    yearlyIncome: number;
    realtrustIncome: number;
    realtrustYearly: number;
  }) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase.from("user_simulations").insert({
      user_id: user.id,
      city: simulation.city,
      rooms: simulation.rooms,
      location: simulation.location,
      property_area: simulation.propertyArea || null,
      monthly_income: simulation.monthlyIncome,
      yearly_income: simulation.yearlyIncome,
      realtrurst_income: simulation.realtrustIncome,
      realtrust_yearly: simulation.realtrustYearly,
    });

    if (!error) {
      await fetchSimulations();
    }

    return { error };
  };

  const deleteSimulation = async (id: string) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("user_simulations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setSimulations((prev) => prev.filter((s) => s.id !== id));
    }

    return { error };
  };

  return {
    user,
    isAuthenticated: !!user,
    loading,
    simulations,
    saveSimulation,
    deleteSimulation,
    refreshSimulations: fetchSimulations,
  };
}
