import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "rt_visitor_session_id";

const getOrCreateSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};

export interface VisitorMemory {
  id: string;
  session_id: string;
  user_id: string | null;
  viewed_properties: any[];
  search_history: any[];
  budget_min: number | null;
  budget_max: number | null;
  preferred_neighborhoods: string[];
  preferred_listing_type: string | null;
  preferred_rooms: number | null;
  chatbot_summary: string | null;
  last_intent: string | null;
  lead_score: number;
}

export function useVisitorMemory() {
  const [memory, setMemory] = useState<VisitorMemory | null>(null);
  const sessionId = getOrCreateSessionId();

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.functions.invoke("visitor-memory", {
      body: { action: "get", sessionId, userId: user?.id || null },
    });
    if (data?.memory) setMemory(data.memory);
  }, [sessionId]);

  const track = useCallback(async (event: { type: "view" | "search" | "preference" | "intent"; data: any }) => {
    if (!sessionId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.functions.invoke("visitor-memory", {
      body: { action: "track", sessionId, userId: user?.id || null, event },
    });
    if (data?.memory) setMemory(data.memory);
  }, [sessionId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { memory, sessionId, track, refresh };
}
